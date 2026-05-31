const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

const {
  GITHUB_TOKEN,
  COPILOT_TOKEN,
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

// Prevent a broken runner stdout/stderr pipe from crashing the process with
// a raw 'write EPIPE' before our own error handling can run.
process.stdout.on('error', (err) => { if (err.code === 'EPIPE') process.exit(1); });
process.stderr.on('error', (err) => { if (err.code === 'EPIPE') process.exit(1); });

const prNumber = parseInt(PR_NUMBER, 10);
const premiumRequestUnitCost = Number(MCP_PREMIUM_REQUEST_COST_USD);
const copilotAuthToken = COPILOT_TOKEN || GITHUB_TOKEN;

if (typeof COPILOT_TOKEN === 'string' && COPILOT_TOKEN.startsWith('ghp_')) {
  console.error(
    [
      'Invalid COPILOT_TOKEN: classic PATs (ghp_) are not supported by Copilot CLI.',
      'Use a fine-grained PAT for COPILOT_TOKEN, or remove COPILOT_TOKEN to let the workflow use GITHUB_TOKEN.',
    ].join(' ')
  );
  process.exit(1);
}

// Post a comment on the PR via the gh CLI — no direct HTTPS needed.
function postComment(body) {
  const result = spawnSync(
    'gh',
    ['api', `repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`,
     '--method', 'POST', '--input', '-'],
    {
      input: JSON.stringify({ body }),
      encoding: 'utf8',
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN, GH_PAGER: 'cat' },
    }
  );
  if (result.status !== 0) {
    throw new Error(`Failed to post PR comment: ${result.stderr || result.stdout}`);
  }
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

function normalizeCopilotContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (!part || typeof part !== 'object') return '';
        if (typeof part.text === 'string') return part.text;
        if (typeof part.content === 'string') return part.content;
        if (typeof part.value === 'string') return part.value;
        if (typeof part.markdown === 'string') return part.markdown;
        return '';
      })
      .join('');
  }
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.content === 'string') return content.content;
    if (typeof content.value === 'string') return content.value;
  }
  return '';
}

function parseCopilotJsonl(rawOutput) {
  const events = rawOutput
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
    const data = event.data || {};
    if (typeof data.outputTokens === 'number') {
      outputTokens += data.outputTokens;
    }
    if (typeof data.model === 'string' && data.model) {
      model = data.model;
    }

    const candidateContent = [
      data.content,
      data.message?.content,
      data.delta?.content,
      event.content,
      event.message?.content,
    ];

    for (const content of candidateContent) {
      const normalized = normalizeCopilotContent(content).trim();
      // Keep the richest body we see; streaming variants may emit partial chunks first.
      if (normalized.length > testPlan.length) {
        testPlan = normalized;
      }
    }
  }

  const resultEvent = events.find((event) => event.type === 'result');
  const usage = resultEvent?.usage || {};

  if (!testPlan) {
    const eventTypes = [...new Set(events.map((event) => event.type).filter(Boolean))].join(', ');
    throw new Error(
      `Copilot MCP run did not produce a test plan body. Observed event types: ${eventTypes || 'none'}`
    );
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
  const baseArgs = [
    'copilot',
    '--',
    '-p',
    prompt,
    '--allow-all-tools',
    '--enable-all-github-mcp-tools',
    '--output-format',
    'json',
    '--model',
    MCP_MODEL,
  ];

  const invokeCopilot = (args) =>
    spawnSync('gh', args, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        GH_TOKEN: copilotAuthToken,
        GITHUB_TOKEN: copilotAuthToken,
        // Prevent gh from piping output through a pager (e.g. `less`) in CI.
        // A pager that exits before gh finishes writing is the primary cause of
        // 'write EPIPE' in non-interactive GitHub Actions runners.
        GH_PAGER: 'cat',
        PAGER: 'cat',
        NO_COLOR: '1',
        GH_NO_PROMPT: '1',
        TERM: 'dumb',
        CI: 'true',
      },
    });

  const parsePlainCopilotOutput = (rawOutput) => {
    const text = (rawOutput || '').trim();
    if (!text) {
      throw new Error('gh copilot plain-text fallback produced no output.');
    }

    return {
      testPlan: text,
      model: MCP_MODEL,
      outputTokens: null,
      premiumRequests: null,
      totalApiDurationMs: null,
      sessionDurationMs: null,
    };
  };

  const isEpipeFailure = (result) => {
    const errorText = [
      result?.error?.message,
      result?.stderr,
      result?.stdout,
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
    return result?.error?.code === 'EPIPE' || errorText.includes('write epipe');
  };

  const invokeCopilotWithRetry = (args, maxAttempts = 3) => {
    let lastResult = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const current = invokeCopilot(args);
      lastResult = current;

      // Retry transient pipe failures from the gh child process.
      if (isEpipeFailure(current) && attempt < maxAttempts) {
        console.warn(`gh copilot hit EPIPE (attempt ${attempt}/${maxAttempts}); retrying...`);
        continue;
      }
      return current;
    }
    return lastResult;
  };

  const argVariants = [
    [...baseArgs, '--stream', 'off'],
    [...baseArgs],
    [...baseArgs, '--stream'],
  ];

  let usedArgs = argVariants[0];
  let result = invokeCopilotWithRetry(usedArgs);

  const outputFor = (spawnResult) => `${spawnResult?.stderr || ''}\n${spawnResult?.stdout || ''}`;

  const unknownStreamFlag = (output) =>
    /unknown option '--no-stream'|unknown option '--stream'/i.test(output || '');

  // Support older/newer gh copilot CLI variants that disagree on stream flags.
  if (result.status !== 0 && unknownStreamFlag(outputFor(result))) {
    for (let i = 1; i < argVariants.length; i += 1) {
      usedArgs = argVariants[i];
      result = invokeCopilotWithRetry(usedArgs);
      if (result.status === 0 || !unknownStreamFlag(outputFor(result))) {
        break;
      }
    }
  }
  const combinedOutput = outputFor(result);
  const installedDuringRun = combinedOutput.includes('Copilot CLI installed successfully');

  // Fresh GitHub-hosted runners may install Copilot on first invocation and exit non-zero.
  if (result.status !== 0 && installedDuringRun) {
    result = invokeCopilotWithRetry(usedArgs);
  }
  const failedWithEpipe = isEpipeFailure(result);
  const failedWithoutEpipe = Boolean(result.error) && !failedWithEpipe;

  if (failedWithoutEpipe) {
    throw result.error;
  }

  if (result.status !== 0 || failedWithEpipe) {
    const stderr = result.stderr || '';
    const stdout = result.stdout || '';
    const combined = `${stderr}\n${stdout}`;

    // If output is usable despite a non-zero exit, continue with parsed content.
    try {
      const recovered = parseCopilotJsonl(combined);
      if (recovered.testPlan) {
        console.warn('gh copilot exited non-zero, but recoverable MCP output was found. Continuing.');
        return recovered;
      }
    } catch {
      // Fall through to actionable error below.
    }

    const authHints = ['authentication', 'auth', 'login', 'token', 'forbidden', 'unauthorized'];
    const outputLower = combined.toLowerCase();
    const likelyAuthFailure = authHints.some((hint) => outputLower.includes(hint));
    const mcpConnectedThenAborted = outputLower.includes('session.mcp_server_status_changed');
    const missingCopilotRequestsPerm =
      outputLower.includes('copilot requests') ||
      (outputLower.includes('authentication failed') && outputLower.includes('fine-grained pat'));

    if (missingCopilotRequestsPerm) {
      throw new Error(
        [
          'gh copilot authentication failed for a fine-grained PAT.',
          'Update COPILOT_TOKEN to a fine-grained PAT that has repository access and the "Copilot Requests" permission enabled.',
          'Also ensure the token owner has an active Copilot seat and SSO is authorized for the org if required.',
          `Raw output: ${stderr || stdout}`,
        ].join(' ')
      );
    }

    if (mcpConnectedThenAborted) {
      throw new Error(
        [
          `gh copilot exited with code ${result.status} after MCP connection was established.`,
          `Args used: ${usedArgs.join(' ')}`,
          'This usually indicates Copilot session authorization/policy failure in Actions, or missing tool/session permissions.',
          'Verify repository secret COPILOT_TOKEN is set to a fine-grained PAT from a Copilot-licensed user with "Copilot Requests" permission, and that org policy allows Copilot in Actions.',
          `Raw output: ${stderr || stdout}`,
        ].join(' ')
      );
    }

    if (likelyAuthFailure && !COPILOT_TOKEN) {
      throw new Error(
        [
          'gh copilot authentication failed in CI.',
          'Set a repository secret named COPILOT_TOKEN and map it in the workflow env.',
          'Using the default GITHUB_TOKEN is often insufficient for MCP-enabled Copilot CLI calls in GitHub Actions.',
          `Original error: ${stderr || stdout}`,
        ].join(' ')
      );
    }

    if (failedWithEpipe) {
      console.warn('gh copilot JSON mode failed with EPIPE; attempting plain-text MCP fallback.');

      const plainArgs = [
        'copilot',
        '--',
        '-p',
        prompt,
        '--allow-all-tools',
        '--enable-all-github-mcp-tools',
        '--model',
        MCP_MODEL,
      ];

      const plainResult = invokeCopilotWithRetry(plainArgs, 2);
      if (!plainResult.error && plainResult.status === 0) {
        return parsePlainCopilotOutput(plainResult.stdout || '');
      }

      const plainCombined = `${plainResult.stderr || ''}\n${plainResult.stdout || ''}`;

      try {
        const recovered = parseCopilotJsonl(plainCombined);
        if (recovered.testPlan) {
          return recovered;
        }
      } catch {
        // Fall through to hard failure below.
      }

      throw new Error(
        [
          'gh copilot failed with EPIPE after retries in both JSON and plain-text modes.',
          `JSON args: ${usedArgs.join(' ')}`,
          `Plain args: ${plainArgs.join(' ')}`,
          'This usually indicates a runner transport issue or gh copilot instability in non-interactive CI.',
          `Raw output: ${stderr || stdout || (result.error && result.error.message) || 'none'}`,
          `Plain fallback output: ${plainCombined || (plainResult.error && plainResult.error.message) || 'none'}`,
        ].join(' ')
      );
    }

    throw new Error(
      `gh copilot exited with code ${result.status} (args: ${usedArgs.join(' ')}): ${stderr || stdout}`
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
  const wikiRemoteUrl = `https://x-access-token:${GITHUB_TOKEN}@${wikiRepo.replace('https://', '')}`;
  const safeTitle = prTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  const pageSlug = `Test-Plan-MCP-PR-${prNumber}-${safeTitle}`.slice(0, 100);
  const pageFile = `${pageSlug}.md`;

  execSync(`git config --global user.email "github-actions[bot]@users.noreply.github.com"`);
  execSync(`git config --global user.name "github-actions[bot]"`);
  // Retries in the same runner can leave stale repo state in /tmp/wiki.
  execSync(`rm -rf ${wikiDir}`);

  try {
    execSync(`git clone ${wikiRemoteUrl} ${wikiDir}`, { stdio: 'pipe' });
  } catch {
    execSync(`mkdir -p ${wikiDir}`);
    execSync(`cd ${wikiDir} && git init`);
    execSync(
      `cd ${wikiDir} && (git remote get-url origin >/dev/null 2>&1 && git remote set-url origin ${wikiRemoteUrl} || git remote add origin ${wikiRemoteUrl})`
    );
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

  const { pageSlug } = saveToWiki(`PR #${prNumber}`, mcpResult.testPlan, runMeta);
  const wikiUrl = `${GITHUB_SERVER_URL}/${REPO_OWNER}/${REPO_NAME}/wiki/${pageSlug}`;

  const unitCount = countTests(mcpResult.testPlan, 'Unit Tests');
  const integrationCount = countTests(mcpResult.testPlan, 'Integration Tests');
  const e2eCount = countTests(mcpResult.testPlan, 'UI / E2E Tests');
  const totalCount = unitCount + integrationCount + e2eCount;

  const guidanceRef = reviewerGuidance
    ? `\n\n### ✍️ Reviewer guidance applied\n> ${reviewerGuidance}`
    : '';

  // Cost comparison reference: API flow uses gpt-4o via GitHub Models (token billing).
  const apiInputCostPer1M = 5;    // USD per 1M input tokens (gpt-4o, GitHub Models)
  const apiOutputCostPer1M = 15;  // USD per 1M output tokens
  const apiTypicalInput = 3000;
  const apiTypicalOutput = 1500;
  const apiTypicalCostUsd = ((apiTypicalInput / 1e6) * apiInputCostPer1M)
    + ((apiTypicalOutput / 1e6) * apiOutputCostPer1M);

  const comment = [
    `## ✅ QA MCP Test Plan Generated`,
    '',
    `A test plan was generated via GitHub MCP tooling and saved to the project Wiki.`,
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
    `### 💰 Cost comparison`,
    `| Approach | Model | Billing | This run | Typical/run |`,
    `|---|---|---|---|---|`,
    `| 🤖 **MCP** _(this run)_ | ${runMeta.model} | Premium requests | ${runMeta.premiumRequests ?? 'N/A'} req · ${formatUsd(runMeta.estimatedCostUsd)} | 2–10 req |`,
    `| 📊 **API** | gpt-4o | Tokens | N/A | ~${apiTypicalInput + apiTypicalOutput} tokens · ${formatUsd(apiTypicalCostUsd)} |`,
    ``,
    `> **MCP** is billed per [Copilot premium request](https://docs.github.com/en/copilot/using-github-copilot/ai-models/about-github-copilot-and-ai-models) (one agentic tool call = one request). **API** charges per token at \$${apiInputCostPer1M}/1M input + \$${apiOutputCostPer1M}/1M output via GitHub Models. Actual cost scales with PR diff size.`,
    '',
    `### 📖 Links`,
    `- [View MCP test plan on Wiki](${wikiUrl})`,
    guidanceRef,
    '',
    `> _Triggered by @${TRIGGERED_BY || 'unknown'} · GitHub MCP via Copilot CLI_`,
  ].join('\n');

  postComment(comment);
  console.log('PR comment posted.');
  console.log(`Done! Wiki page: ${wikiUrl}`);
}

main().catch((error) => {
  console.error('\nFATAL:', error.message);
  process.exit(1);
});
