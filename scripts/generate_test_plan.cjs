/**
 * generate_test_plan.js
 *
 * Agentic workflow script — runs inside GitHub Actions.
 * 1. Fetches PR diff and linked issue acceptance criteria via GitHub REST API
 * 2. Calls GitHub Models (gpt-4o) to generate a structured test plan
 * 3. Pushes the plan as a Wiki page (git push to the wiki repo)
 * 4. Posts a comment on the PR with the Wiki link
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── Config from environment ──────────────────────────────────────────────────
const {
  GITHUB_TOKEN,
  PR_NUMBER,
  REPO_OWNER,
  REPO_NAME,
  TRIGGERED_BY,
  TRIGGER_COMMENT,
  MODEL_INPUT_COST_PER_1M = '5',
  MODEL_OUTPUT_COST_PER_1M = '15',
  GITHUB_SERVER_URL = 'https://github.com',
} = process.env;

if (!GITHUB_TOKEN || !PR_NUMBER || !REPO_OWNER || !REPO_NAME) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const GH_API = 'api.github.com';
const MODELS_HOST = 'models.inference.ai.azure.com';
const MODEL = 'gpt-4o';
const prNumber = parseInt(PR_NUMBER, 10);
const INPUT_COST_PER_1M = Number(MODEL_INPUT_COST_PER_1M);
const OUTPUT_COST_PER_1M = Number(MODEL_OUTPUT_COST_PER_1M);

// ─── GitHub API helpers ───────────────────────────────────────────────────────

function ghRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: GH_API,
      path,
      method,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'qa-test-planner-action',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`GitHub API ${res.statusCode} on ${method} ${path}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchPR() {
  console.log(`Fetching PR #${prNumber}...`);
  return ghRequest('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}`);
}

async function fetchPRFiles() {
  console.log('Fetching PR diff...');
  const files = await ghRequest('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/files?per_page=50`);
  return files.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch ? truncateLines(f.patch, 80) : '(binary or no diff)',
  }));
}

async function fetchIssue(issueNumber) {
  console.log(`Fetching linked issue #${issueNumber}...`);
  return ghRequest('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`);
}

async function postComment(body) {
  return ghRequest('POST', `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`, { body });
}

// ─── Issue number parser ──────────────────────────────────────────────────────

function parseIssueNumber(prBody) {
  if (!prBody) return null;
  const patterns = [
    /(?:closes?|fixes?|resolves?)\s+#(\d+)/i,
    /(?:closes?|fixes?|resolves?)\s+https?:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/i,
    /#(\d+)/,
  ];
  for (const p of patterns) {
    const m = prBody.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function parseReviewerGuidance(commentBody) {
  if (!commentBody) return '';

  const command = '/generate-test-plan';
  if (!commentBody.startsWith(command)) return '';

  const rest = commentBody.slice(command.length).trim();
  if (!rest) return '';

  return rest.slice(0, 1500);
}

// ─── GitHub Models (streaming) ────────────────────────────────────────────────

function callGitHubModels(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 3000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const options = {
      hostname: MODELS_HOST,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'qa-test-planner-action',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 400) {
        let err = '';
        res.on('data', (c) => (err += c));
        res.on('end', () => reject(new Error(`GitHub Models ${res.statusCode}: ${err}`)));
        return;
      }
      let fullText = '';
      let usage = null;
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.usage) {
              usage = parsed.usage;
            }
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              process.stdout.write(delta);
              fullText += delta;
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      });
      res.on('end', () => {
        console.log('\n');
        resolve({ text: fullText, usage });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function loadAgentInstructions() {
  const agentPath = path.resolve(__dirname, '..', '.github', 'agents', 'qa-test-planner.agent.md');
  try {
    const raw = fs.readFileSync(agentPath, 'utf8');
    // Strip YAML frontmatter (--- ... ---) so only the instruction body is used.
    return raw.replace(/^---[\s\S]*?---\s*/m, '').trim();
  } catch (err) {
    console.warn(`Could not load qa-test-planner agent instructions: ${err.message}. Falling back to built-in system prompt.`);
    return null;
  }
}

const FALLBACK_SYSTEM_PROMPT = `You are a senior QA engineer and test architect. Generate precise, actionable test plans from pull request context and GitHub issue acceptance criteria.

Follow the test pyramid:
- **Unit tests (~70%)**: Pure functions, business logic, edge cases, error handling, isolated components
- **Integration tests (~20%)**: API endpoints, database interactions, service contracts, external dependencies  
- **UI/E2E tests (~10%)**: Critical user-facing workflows only — never duplicate what unit/integration tests cover

Rules:
- Map every test case to a specific acceptance criterion or code change
- Name the exact function, class, endpoint, or component under test
- Only recommend UI/E2E when the AC explicitly describes a user workflow
- Explain WHY each test belongs at its pyramid tier
- If reviewer guidance is provided, explicitly incorporate it
- If no issue linked, infer acceptance criteria from the PR title, description, and diff

Output in this EXACT markdown structure. STRICT RULES:
- Each test section header must be followed IMMEDIATELY by the table header row - no blank lines, no blockquotes, no introductory text between the ## heading and the table row.
- Every test section MUST use a markdown table. Never use bullet points or numbered lists in test sections.
- If no tests apply in a section, still include the table header row with a single row saying | None | N/A | N/A | N/A |.

## Summary
2-3 sentence overview of changes and testing strategy.

## Unit Tests
| Test | Why Unit | AC | Scenario |
|---|---|---|---|
| [What to test] | [Why this belongs at unit tier] | [Which criterion] | [Happy / edge / error] |

## Integration Tests
| Test | Why Integration | AC | Scenario |
|---|---|---|---|
| [What to test] | [Why this belongs at integration tier] | [Which criterion] | [What to validate] |

## UI / E2E Tests
| Test | Why E2E | AC | Steps |
|---|---|---|---|
| [What to test] | [Why not testable lower] | [Which criterion] | [Brief step outline] |

## Coverage Rationale
Overall strategy and any deliberately excluded areas.`;

function buildSystemPrompt() {
  const agentInstructions = loadAgentInstructions();
  if (!agentInstructions) return FALLBACK_SYSTEM_PROMPT;

  // Append the required output format to the agent instructions.
  return `${agentInstructions}

---

Output in this EXACT markdown structure. STRICT RULES:
- Each test section header must be followed IMMEDIATELY by the table header row — no blank lines, no blockquotes, no introductory text between the \`##\` heading and the \`|\` table row.
- Every test section MUST use a markdown table. Never use bullet points or numbered lists in test sections.
- If no tests apply in a section, still include the table header row with a single row saying \`| None | N/A | N/A | N/A |\`.

## Summary
2-3 sentence overview of changes and testing strategy.

## Unit Tests
| Test | Why Unit | AC | Scenario |
|---|---|---|---|
| [What to test] | [Why this belongs at unit tier] | [Which criterion] | [Happy / edge / error] |

## Integration Tests
| Test | Why Integration | AC | Scenario |
|---|---|---|---|
| [What to test] | [Why this belongs at integration tier] | [Which criterion] | [What to validate] |

## UI / E2E Tests
| Test | Why E2E | AC | Steps |
|---|---|---|---|
| [What to test] | [Why not testable lower] | [Which criterion] | [Brief step outline] |

## Coverage Rationale
Overall strategy and any deliberately excluded areas.`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

function buildUserPrompt(pr, files, issue, reviewerGuidance) {
  const issueSection = issue
    ? `## Linked Issue #${issue.number}: ${issue.title}\n\n${issue.body || 'No description.'}`
    : `## No linked issue\nInfer acceptance criteria from the PR description and diff.`;

  const guidanceSection = reviewerGuidance
    ? `## Reviewer Guidance\n${reviewerGuidance}`
    : `## Reviewer Guidance\nNone provided.`;

  const filesSection = files
    .map(
      (f) =>
        `### ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n\`\`\`diff\n${f.patch}\n\`\`\``
    )
    .join('\n\n');

  return `# Pull Request #${pr.number}: ${pr.title}

## PR Description
${pr.body || 'No description provided.'}

## Branch
\`${pr.head?.ref}\` → \`${pr.base?.ref}\`

## Changed Files (${files.length} total)
${filesSection}

${issueSection}

${guidanceSection}

---
Generate the complete test plan.`;
}

// ─── Wiki helpers ─────────────────────────────────────────────────────────────

function saveToWiki(prNumber, prTitle, content, usage, cost) {
  const wikiRepo = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}.wiki.git`;
  const wikiDir = '/tmp/wiki';
  const safeTitle = prTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  const pageSlug = `Test-Plan-PR-${prNumber}-${safeTitle}`.slice(0, 100);
  const pageFile = `${pageSlug}.md`;

  console.log(`Cloning wiki from ${wikiRepo}...`);

  // Configure git identity for the commit
  execSync(`git config --global user.email "github-actions[bot]@users.noreply.github.com"`);
  execSync(`git config --global user.name "github-actions[bot]"`);

  // Clone the wiki (create first page if wiki doesn't exist yet)
  try {
    execSync(
      `git clone https://x-access-token:${GITHUB_TOKEN}@${wikiRepo.replace('https://', '')} ${wikiDir}`,
      { stdio: 'pipe' }
    );
  } catch (e) {
    // Wiki may not exist yet — initialize it
    console.log('Wiki not initialized, creating...');
    execSync(`mkdir -p ${wikiDir}`);
    execSync(`cd ${wikiDir} && git init && git remote add origin https://x-access-token:${GITHUB_TOKEN}@${wikiRepo.replace('https://', '')}`);
  }

  const fullContent = buildWikiPage(prNumber, prTitle, content, usage, cost);
  fs.writeFileSync(`${wikiDir}/${pageFile}`, fullContent);

  // Update the index page
  updateWikiIndex(wikiDir, prNumber, prTitle, pageSlug);

  execSync(`cd ${wikiDir} && git add -A`);
  execSync(`cd ${wikiDir} && git commit -m "Add test plan for PR #${prNumber}: ${prTitle}"`, {
    stdio: 'pipe',
  });
  execSync(`cd ${wikiDir} && git push origin HEAD:master --force`, { stdio: 'pipe' });

  console.log(`Wiki page saved: ${pageFile}`);
  return { pageSlug, pageFile };
}

function buildWikiPage(prNumber, prTitle, planContent, usage, cost) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const prUrl = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}/pull/${prNumber}`;
  const promptTokens = usage.promptTokens ?? 'N/A';
  const completionTokens = usage.completionTokens ?? 'N/A';
  const totalTokens = usage.totalTokens ?? 'N/A';

  return `# Test Plan: PR #${prNumber}

| Field | Value |
|---|---|
| **PR** | [#${prNumber} — ${prTitle}](${prUrl}) |
| **Generated** | ${now} |
| **Triggered by** | @${TRIGGERED_BY || 'unknown'} |
| **Model** | GitHub Models · ${MODEL} |
| **Prompt tokens** | ${promptTokens} |
| **Completion tokens** | ${completionTokens} |
| **Total tokens** | ${totalTokens} |
| **Estimated cost (USD)** | ${formatUsd(cost.totalCostUsd)} |

---

${planContent}

---
*Auto-generated by the QA Test Planner workflow. Review and update as implementation proceeds.*
`;
}

function updateWikiIndex(wikiDir, prNumber, prTitle, pageSlug) {
  const indexPath = `${wikiDir}/QA-Test-Plans.md`;
  const now = new Date().toISOString().slice(0, 10);
  const newRow = `| [#${prNumber}](${pageSlug}) | ${prTitle} | ${now} | @${TRIGGERED_BY || 'unknown'} |`;

  let index;
  if (fs.existsSync(indexPath)) {
    index = fs.readFileSync(indexPath, 'utf8');
    // Append new row before the end
    index = index.trimEnd() + '\n' + newRow + '\n';
  } else {
    index = `# QA Test Plans

Audit log of all generated test plans.

| PR | Title | Date | Triggered by |
|---|---|---|---|
${newRow}
`;
  }
  fs.writeFileSync(indexPath, index);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function truncateLines(text, max) {
  const lines = text.split('\n');
  if (lines.length <= max) return text;
  return lines.slice(0, max).join('\n') + `\n... (${lines.length - max} more lines truncated)`;
}

function countTests(markdown, section) {
  // Allow for any trailing decorators on the heading line (e.g. "_(critical flows only)_")
  const match = markdown.match(new RegExp(`## ${section}[^\\n]*\\n[\\s\\S]*?(?=\\n## |$)`));
  if (!match) return 0;
  const content = match[0];
  // Count table data rows only: exclude separator rows (|---|...|) and the header row
  const tableRows = (content.match(/^\|.+\|/gm) || [])
    .filter(row => !/^\|[\s|:\-]+\|/.test(row));  // remove separator rows
  // tableRows[0] is the header row, so subtract 1 for data rows only
  // Also exclude the "None" placeholder row that signals zero real tests
  const dataRows = tableRows.slice(1).filter(row => !/^\|\s*None\s*\|/.test(row));
  return dataRows.length;
}

function normalizeUsage(rawUsage) {
  if (!rawUsage) {
    return {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    };
  }

  return {
    promptTokens: typeof rawUsage.prompt_tokens === 'number' ? rawUsage.prompt_tokens : null,
    completionTokens: typeof rawUsage.completion_tokens === 'number' ? rawUsage.completion_tokens : null,
    totalTokens: typeof rawUsage.total_tokens === 'number' ? rawUsage.total_tokens : null,
  };
}

function formatUsd(amount) {
  if (amount === null) return 'N/A';
  return `$${amount.toFixed(4)}`;
}

function estimateCost(usage) {
  const hasUsage = usage.promptTokens !== null && usage.completionTokens !== null;
  const hasPricing = Number.isFinite(INPUT_COST_PER_1M) && Number.isFinite(OUTPUT_COST_PER_1M);

  if (!hasUsage || !hasPricing) {
    return {
      inputCostUsd: null,
      outputCostUsd: null,
      totalCostUsd: null,
    };
  }

  const inputCostUsd = (usage.promptTokens / 1000000) * INPUT_COST_PER_1M;
  const outputCostUsd = (usage.completionTokens / 1000000) * OUTPUT_COST_PER_1M;

  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== QA Test Planner — PR #${prNumber} ===\n`);

  // 1. Fetch PR metadata
  const pr = await fetchPR();
  if (pr.state !== 'open') {
    console.log('PR is not open — skipping.');
    process.exit(0);
  }

  // 2. Fetch changed files
  const files = await fetchPRFiles();
  console.log(`  ${files.length} files changed`);

  // 3. Fetch linked issue (if any)
  const issueNumber = parseIssueNumber(pr.body);
  let issue = null;
  if (issueNumber) {
    try {
      issue = await fetchIssue(issueNumber);
      console.log(`  Linked issue: #${issue.number} — ${issue.title}`);
    } catch (e) {
      console.warn(`  Could not fetch issue #${issueNumber}: ${e.message}`);
    }
  } else {
    console.log('  No linked issue found — will infer AC from PR body');
  }

  // 4. Call GitHub Models
  console.log('\nCalling GitHub Models (gpt-4o)...\n---');
  const reviewerGuidance = parseReviewerGuidance(TRIGGER_COMMENT);
  if (reviewerGuidance) {
    console.log(`  Reviewer guidance detected: ${reviewerGuidance}`);
  }
  const userPrompt = buildUserPrompt(pr, files, issue, reviewerGuidance);
  const modelResponse = await callGitHubModels(SYSTEM_PROMPT, userPrompt);
  const testPlan = modelResponse.text;
  const usage = normalizeUsage(modelResponse.usage);
  const cost = estimateCost(usage);

  // 5. Save to Wiki
  console.log('Saving to Wiki...');
  const { pageSlug } = saveToWiki(prNumber, pr.title, testPlan, usage, cost);

  // 6. Build stats for PR comment
  const unitCount = countTests(testPlan, 'Unit Tests');
  const integrationCount = countTests(testPlan, 'Integration Tests');
  const e2eCount = countTests(testPlan, 'UI / E2E Tests');
  const totalCount = unitCount + integrationCount + e2eCount;

  const wikiUrl = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}/wiki/${pageSlug}`;
  const wikiIndexUrl = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}/wiki/QA-Test-Plans`;

  // 7. Post PR comment
  const issueRef = issue ? ` (issue #${issue.number})` : '';
  const guidanceRef = reviewerGuidance ? `\n\n### ✍️ Reviewer guidance applied\n> ${reviewerGuidance}` : '';
  const promptTokens = usage.promptTokens ?? 'N/A';
  const completionTokens = usage.completionTokens ?? 'N/A';
  const totalTokensForComment = usage.totalTokens ?? 'N/A';
  const inputCostForComment = formatUsd(cost.inputCostUsd);
  const outputCostForComment = formatUsd(cost.outputCostUsd);
  const totalCostForComment = formatUsd(cost.totalCostUsd);
  const comment = [
    `## ✅ QA Test Plan Generated`,
    ``,
    `A test plan has been generated for this PR based on the diff${issueRef} and saved to the project Wiki.`,
    ``,
    `### 📊 Test distribution`,
    `| Tier | Count | Target |`,
    `|---|---|---|`,
    `| 🟢 Unit | ${unitCount} | ~70% |`,
    `| 🟡 Integration | ${integrationCount} | ~20% |`,
    `| 🔴 UI / E2E | ${e2eCount} | ~10% |`,
    `| **Total** | **${totalCount}** | |`,
    ``,
    `### 🔢 Model usage`,
    `| Metric | Value |`,
    `|---|---|`,
    `| Prompt tokens | ${promptTokens} |`,
    `| Completion tokens | ${completionTokens} |`,
    `| Total tokens | ${totalTokensForComment} |`,
    `| Input cost (USD, est.) | ${inputCostForComment} |`,
    `| Output cost (USD, est.) | ${outputCostForComment} |`,
    `| Total cost (USD, est.) | ${totalCostForComment} |`,
    ``,
    `### � Cost comparison`,
    `| Approach | Model | Billing | This run | Typical/run |`,
    `|---|---|---|---|---|`,
    `| 📊 **API** _(this run)_ | ${MODEL} | Tokens | ${promptTokens} in + ${completionTokens} out · ${totalCostForComment} | ~4,500 tokens · ${formatUsd(((3000 / 1e6) * INPUT_COST_PER_1M) + ((1500 / 1e6) * OUTPUT_COST_PER_1M))} |`,
    `| 🤖 **MCP** | gh copilot + GitHub MCP | Premium requests | N/A | 2–10 req (~\\$0.08–\\$0.40) |`,
    ``,
    `> **API** charges per token at \\$${INPUT_COST_PER_1M}/1M input + \\$${OUTPUT_COST_PER_1M}/1M output (GitHub Models). **MCP** is billed per [Copilot premium request](https://docs.github.com/en/copilot/using-github-copilot/ai-models/about-github-copilot-and-ai-models) (one agentic tool call = one request). Trigger MCP with \`/generate-test-plan-mcp\`.`,
    ``,
    `### �📖 Links`,
    `- [View full test plan on Wiki](${wikiUrl})`,
    `- [QA Test Plans audit log](${wikiIndexUrl})`,
    guidanceRef,
    ``,
    `> _Triggered by @${TRIGGERED_BY || 'unknown'} · GitHub Models · ${MODEL}_`,
  ].join('\n');

  await postComment(comment);
  console.log('PR comment posted.');
  console.log(`\nDone! Wiki page: ${wikiUrl}\n`);
}

main().catch((e) => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
