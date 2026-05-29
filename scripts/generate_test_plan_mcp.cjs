const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const https = require('https');

const {
  GITHUB_TOKEN,
  PR_NUMBER,
  REPO_OWNER,
  REPO_NAME,
  TRIGGERED_BY,
  TRIGGER_COMMENT,
  MCP_MODEL = 'gpt-5.3-codex',
  MCP_PREMIUM_REQUEST_COST_USD,
  GITHUB_SERVER_URL = 'https://github.com',
} = process.env;

if (!GITHUB_TOKEN || !PR_NUMBER || !REPO_OWNER || !REPO_NAME) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const GH_API = 'api.github.com';
const prNumber = parseInt(PR_NUMBER, 10);
const premiumRequestUnitCost = Number(MCP_PREMIUM_REQUEST_COST_USD);

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
        'User-Agent': 'qa-test-planner-mcp-action',
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
  return ghRequest('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}`);
}

async function postComment(body) {
  return ghRequest('POST', `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`, { body });
}

function parseReviewerGuidance(commentBody) {
  if (!commentBody) return '';
  const command = '/generate-test-plan-mcp';
  if (!commentBody.startsWith(command)) return '';
  const rest = commentBody.slice(command.length).trim();
  if (!rest) return '';
  return rest.slice(0, 1500);
}

function buildCopilotPrompt(guidance) {
  const guidanceSection = guidance
    ? `Reviewer guidance (must incorporate): ${guidance}`
    : 'Reviewer guidance: none provided.';

  return [
    `Generate a QA test plan for GitHub repo ${REPO_OWNER}/${REPO_NAME}, pull request #${prNumber}.`,
    `Use GitHub MCP tools to inspect PR metadata, changed files/patches, and linked issue context before answering.`,
    guidanceSection,
    '',
    'Output markdown with this exact section structure:',
    '## Summary',
    '## Unit Tests',
    '## Integration Tests',
    '## UI / E2E Tests',
    '## Coverage Rationale',
    '',
    'Rules:',
    '- Map each test to acceptance criteria or specific code change.',
    '- Prioritize test pyramid balance: unit first, then integration, minimal E2E.',
    '- Include edge/error cases where relevant.',
  ].join('\n');
}

function parseCopilotJsonl(stdout) {
  const events = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  let testPlan = '';
  let outputTokens = 0;
  let model = MCP_MODEL;

  for (const event of events) {
    if (event.type === 'assistant.message') {
      const data = event.data || {};
      if (typeof data.outputTokens === 'number') {
        outputTokens += data.outputTokens;
      }
      if (typeof data.model === 'string' && data.model) {
        model = data.model;
      }
      if (typeof data.content === 'string' && data.content.trim()) {
        testPlan = data.content;
      }
    }
  }

  const resultEvent = events.find((event) => event.type === 'result');
  const usage = resultEvent?.usage || {};

  if (!testPlan) {
    throw new Error('Copilot MCP run did not produce a test plan body');
  }

  return {
    testPlan,
    model,
    outputTokens,
    premiumRequests:
      typeof usage.premiumRequests === 'number' ? usage.premiumRequests : null,
    totalApiDurationMs:
      typeof usage.totalApiDurationMs === 'number' ? usage.totalApiDurationMs : null,
    sessionDurationMs:
      typeof usage.sessionDurationMs === 'number' ? usage.sessionDurationMs : null,
  };
}

function runCopilotMcp(prompt) {
  const args = [
    'copilot',
    '--',
    '-p',
    prompt,
    '--allow-all-tools',
    '--enable-all-github-mcp-tools',
    '--output-format',
    'json',
    '--stream',
    'off',
    '--model',
    MCP_MODEL,
  ];

  const invokeCopilot = () =>
    spawnSync('gh', args, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        GH_TOKEN: GITHUB_TOKEN,
      },
    });

  let result = invokeCopilot();

  if (result.error) {
    throw result.error;
  }

  const combinedOutput = `${result.stderr || ''}\n${result.stdout || ''}`;
  const installedDuringRun = combinedOutput.includes('Copilot CLI installed successfully');

  // Fresh GitHub-hosted runners may install Copilot on first invocation and exit non-zero.
  if (result.status !== 0 && installedDuringRun) {
    result = invokeCopilot();
    if (result.error) {
      throw result.error;
    }
  }
  if (result.status !== 0) {
    throw new Error(
      `gh copilot exited with code ${result.status}: ${result.stderr || result.stdout}`
    );
  }

  return parseCopilotJsonl(result.stdout || '');
}

function estimateMcpCost(premiumRequests) {
  const canEstimate = Number.isFinite(premiumRequestUnitCost);
  if (!canEstimate || premiumRequests === null) return null;
  return premiumRequests * premiumRequestUnitCost;
}

function formatUsd(amount) {
  if (amount === null) return 'N/A';
  return `$${amount.toFixed(4)}`;
}

function countTests(markdown, section) {
  const match = markdown.match(new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`));
  if (!match) return 0;
  return (match[0].match(/^- \*\*Test\*\*/gm) || []).length;
}

function saveToWiki(prTitle, planContent, runMeta) {
  const wikiRepo = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}.wiki.git`;
  const wikiDir = '/tmp/wiki';
  const safeTitle = prTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  const pageSlug = `Test-Plan-MCP-PR-${prNumber}-${safeTitle}`.slice(0, 100);
  const pageFile = `${pageSlug}.md`;

  execSync(`git config --global user.email "github-actions[bot]@users.noreply.github.com"`);
  execSync(`git config --global user.name "github-actions[bot]"`);

  try {
    execSync(
      `git clone https://x-access-token:${GITHUB_TOKEN}@${wikiRepo.replace('https://', '')} ${wikiDir}`,
      { stdio: 'pipe' }
    );
  } catch {
    execSync(`mkdir -p ${wikiDir}`);
    execSync(`cd ${wikiDir} && git init && git remote add origin https://x-access-token:${GITHUB_TOKEN}@${wikiRepo.replace('https://', '')}`);
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const prUrl = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}/pull/${prNumber}`;

  const page = `# MCP Test Plan: PR #${prNumber}

| Field | Value |
|---|---|
| **PR** | [#${prNumber} — ${prTitle}](${prUrl}) |
| **Generated** | ${now} |
| **Triggered by** | @${TRIGGERED_BY || 'unknown'} |
| **Provider** | MCP via GitHub Copilot CLI |
| **Model** | ${runMeta.model} |
| **Premium requests** | ${runMeta.premiumRequests ?? 'N/A'} |
| **Output tokens** | ${runMeta.outputTokens ?? 'N/A'} |
| **Estimated cost (USD)** | ${formatUsd(runMeta.estimatedCostUsd)} |

---

${planContent}
`;

  fs.writeFileSync(`${wikiDir}/${pageFile}`, page);
  execSync(`cd ${wikiDir} && git add -A`);
  execSync(`cd ${wikiDir} && git commit -m "Add MCP test plan for PR #${prNumber}: ${prTitle}"`, {
    stdio: 'pipe',
  });
  execSync(`cd ${wikiDir} && git push origin HEAD:master --force`, { stdio: 'pipe' });

  return { pageSlug };
}

async function main() {
  console.log(`\n=== QA MCP Test Planner — PR #${prNumber} ===\n`);

  const pr = await fetchPR();
  if (pr.state !== 'open') {
    console.log('PR is not open — skipping.');
    process.exit(0);
  }

  const reviewerGuidance = parseReviewerGuidance(TRIGGER_COMMENT);
  if (reviewerGuidance) {
    console.log(`Reviewer guidance detected: ${reviewerGuidance}`);
  }

  const prompt = buildCopilotPrompt(reviewerGuidance);
  const mcpResult = runCopilotMcp(prompt);
  const estimatedCostUsd = estimateMcpCost(mcpResult.premiumRequests);

  const runMeta = {
    ...mcpResult,
    estimatedCostUsd,
  };

  const { pageSlug } = saveToWiki(pr.title, mcpResult.testPlan, runMeta);
  const wikiUrl = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}/wiki/${pageSlug}`;

  const unitCount = countTests(mcpResult.testPlan, 'Unit Tests');
  const integrationCount = countTests(mcpResult.testPlan, 'Integration Tests');
  const e2eCount = countTests(mcpResult.testPlan, 'UI / E2E Tests');
  const totalCount = unitCount + integrationCount + e2eCount;

  const guidanceRef = reviewerGuidance
    ? `\n\n### ✍️ Reviewer guidance applied\n> ${reviewerGuidance}`
    : '';

  const comment = [
    `## ✅ QA MCP Test Plan Generated`,
    '',
    `A test plan was generated via MCP tooling and saved to the project Wiki.`,
    '',
    `### 📊 Test distribution`,
    `| Tier | Count |`,
    `|---|---|`,
    `| 🟢 Unit | ${unitCount} |`,
    `| 🟡 Integration | ${integrationCount} |`,
    `| 🔴 UI / E2E | ${e2eCount} |`,
    `| **Total** | **${totalCount}** |`,
    '',
    `### 🔢 MCP usage`,
    `| Metric | Value |`,
    `|---|---|`,
    `| Model | ${runMeta.model} |`,
    `| Premium requests | ${runMeta.premiumRequests ?? 'N/A'} |`,
    `| Output tokens | ${runMeta.outputTokens ?? 'N/A'} |`,
    `| API duration (ms) | ${runMeta.totalApiDurationMs ?? 'N/A'} |`,
    `| Session duration (ms) | ${runMeta.sessionDurationMs ?? 'N/A'} |`,
    `| Estimated cost (USD) | ${formatUsd(runMeta.estimatedCostUsd)} |`,
    '',
    `### 📖 Links`,
    `- [View MCP test plan on Wiki](${wikiUrl})`,
    guidanceRef,
    '',
    `> _Triggered by @${TRIGGERED_BY || 'unknown'} · MCP via Copilot CLI_`,
  ].join('\n');

  await postComment(comment);
  console.log('PR comment posted.');
  console.log(`Done! Wiki page: ${wikiUrl}`);
}

main().catch((error) => {
  console.error('\nFATAL:', error.message);
  process.exit(1);
});
