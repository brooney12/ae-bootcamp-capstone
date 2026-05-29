# QA Test Planner — GitHub Actions Workflow

Agentic QA workflow: when a PR is opened, a bot prompts the QE reviewer. When they comment `/generate-test-plan`, the agent fetches the PR diff and linked issue, calls **GitHub Models (gpt-4o)**, saves the plan to the **project Wiki**, and posts a summary back on the PR.

---

## Setup

### 1. Enable GitHub Models

Your repo needs access to GitHub Models. In your organization:

**Settings → Copilot → Policies → Enable GitHub Models**

No additional secrets needed — the workflow uses the built-in `GITHUB_TOKEN`.

### 2. Enable the Wiki

In your repo: **Settings → Features → Wikis ✓**

The workflow will create and maintain a `QA-Test-Plans` index page automatically.

### 3. Add the files to your repo

Copy these files into your repository:

```
.github/
  workflows/
    pr-opened.yml          ← Posts the QE prompt on new PRs
    generate-test-plan.yml ← Fires when /generate-test-plan is commented
scripts/
  generate_test_plan.js    ← The agent logic
```

### 4. Workflow permissions

The `generate-test-plan.yml` workflow needs write access to contents and pull requests.

Go to: **Settings → Actions → General → Workflow permissions**

Set to: **Read and write permissions** ✓

---

## How it works end-to-end

```
1. Developer opens a PR
        ↓
2. pr-opened.yml fires
   → Posts bot comment: "Comment /generate-test-plan to generate a test plan"
        ↓
3. QE reviewer reads the PR diff and linked issue
   → Comments: /generate-test-plan
        ↓
4. generate-test-plan.yml fires
   → Adds 👀 reaction to the comment (acknowledges it)
   → Runs scripts/generate_test_plan.js
        ↓
5. generate_test_plan.js (the agent):
   a. Fetches PR metadata + changed files (with diffs)
   b. Parses linked issue number from PR body (Closes #123, Fixes #456, etc.)
   c. Fetches issue acceptance criteria
   d. Calls GitHub Models (gpt-4o) with the full context
   e. Streams the response
   f. Saves the plan to the Wiki as: Test-Plan-PR-{number}-{title}.md
   g. Updates QA-Test-Plans.md (audit index)
   h. Posts a PR comment with the distribution table + Wiki links
        ↓
6. PR comment shows:
   - Test count by tier (Unit / Integration / E2E)
   - Link to full Wiki page
   - Link to audit index
```

---

## Linking issues to PRs

The agent looks for these patterns in the PR body:

```
Closes #123
Fixes #456
Resolves #789
https://github.com/owner/repo/issues/123
```

If no issue is found, the agent infers acceptance criteria from the PR title and description.

---

## Wiki pages created

Each generated plan creates two Wiki entries:

| Page | Contents |
|---|---|
| `Test-Plan-PR-{N}-{title}` | Full test plan with metadata header |
| `QA-Test-Plans` | Audit index — one row per generated plan |

---

## Test pyramid output format

The agent always outputs plans in three tiers:

| Tier | Target | What it covers |
|---|---|---|
| **Unit** | ~70% | Business logic, pure functions, edge cases, error handling |
| **Integration** | ~20% | APIs, DB, service contracts, external deps |
| **UI / E2E** | ~10% | Critical user workflows only |

Every test case includes: what to test, why it belongs at that tier, which AC it covers, and scenario type.

---

## Re-running

The QE can comment `/generate-test-plan` multiple times (e.g. after the PR is updated). Each run creates a new Wiki page; the audit index accumulates all entries.

---

## Files

| File | Purpose |
|---|---|
| `.github/workflows/pr-opened.yml` | Triggers on PR open/reopen, posts QE prompt |
| `.github/workflows/generate-test-plan.yml` | Triggers on `/generate-test-plan` comment |
| `scripts/generate_test_plan.js` | Agent — GitHub API + GitHub Models + Wiki push |
