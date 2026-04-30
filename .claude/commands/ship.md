# /ship — Autonomous Deployment Workflow

Ship pending changes to production, verify the deployment is healthy, and roll back automatically if anything breaks.

**Project:** Bookwise Starter
**Production URL:** https://bookwise-coral.vercel.app
**Repo:** https://github.com/hosca214/Bookwise.git
**Smoke tests config:** `.claude/smoke-tests.yaml`

---

## Pre-flight

Read `.claude/smoke-tests.yaml` now. You will need the test definitions, credentials, and screenshot directory throughout this command.

Create the screenshot directory before starting:
```bash
mkdir -p /tmp/bookwise-smoke
```

---

## Step 1 — Commit and push pending changes

Run `git status --short` to see what is pending.

If there are no changes (clean working tree), skip to Step 3 and note "No new commits — re-verifying last deployment."

If there are changes:

1. Stage all modified and new files that belong to the project (never stage `.env*`, `*.local`, or secrets):
   ```bash
   git add -A
   git status --short
   ```

2. Generate a commit message by reading the diff:
   ```bash
   git diff --cached --stat
   ```
   Write a concise commit message summarizing what changed. Use present tense. No em dashes. End with:
   ```
   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```

3. Commit:
   ```bash
   git commit -m "<your generated message>"
   ```

4. Push:
   ```bash
   git push origin main
   ```

Record the commit SHA:
```bash
git rev-parse HEAD
```

---

## Step 2 — Detect the new Vercel deployment

Wait 10 seconds for Vercel to detect the push, then find the deployment triggered by this commit:

```bash
sleep 10 && vercel ls --json 2>/dev/null | head -c 4000
```

Parse the JSON to get the URL of the newest deployment (highest `createdAt`). Record it as `DEPLOY_URL`.

---

## Step 3 — Wait for deployment to reach READY

Poll the deployment every 15 seconds until it either reaches state `READY` or `ERROR`. Time out after 8 minutes total.

```bash
vercel inspect "$DEPLOY_URL" 2>/dev/null
```

Look for `"readyState": "READY"` or `"readyState": "ERROR"` in the output.

If `ERROR`: stop immediately, skip smoke tests, jump to **Rollback** with reason "Vercel build failed."

If `READY`: continue to Step 4.

If timeout exceeded: treat as ERROR — jump to **Rollback** with reason "Deployment timed out after 8 minutes."

---

## Step 4 — Run smoke tests using Playwright MCP

Run each test from `.claude/smoke-tests.yaml` in order. For each test:

1. Print: `Running: <test name>`
2. Follow the steps using Playwright MCP tools
3. Take the screenshots listed in the test definition and save them to `/tmp/bookwise-smoke/<filename>`
4. Evaluate all assertions
5. Record: PASS or FAIL, with reason on failure

### Test execution notes

**Navigation:** Use `mcp__playwright__browser_navigate` with the full production URL, e.g. `https://bookwise-coral.vercel.app/landing`.

**Screenshots:** Use `mcp__playwright__browser_take_screenshot` and note the path.

**Filling forms:** Use `mcp__playwright__browser_fill_form` or `mcp__playwright__browser_type` into selectors.

**Clicking:** Use `mcp__playwright__browser_click`.

**Waiting for skeleton to disappear:** After navigating to the dashboard, poll the snapshot with `mcp__playwright__browser_snapshot` until no element with class containing `skeleton`, `shimmer`, or `animate-pulse` is present. If they are still present after 5000ms, mark the `dashboard-load` test as FAILED with reason "Skeleton persisted past 5s timeout."

**Auth carry-over:** The `ledger-page` test uses the session established in `dashboard-load`. Do not close the browser between tests. If the browser session is lost, re-authenticate before running ledger.

**Session reset:** After the ledger test completes, navigate to the production URL's logout endpoint (or clear cookies) so the browser is clean for future runs.

### Screenshot inventory

After all tests run, list the screenshots taken:
```bash
ls -la /tmp/bookwise-smoke/
```

---

## Step 5 — Check Vercel runtime logs

Fetch the last 2 minutes of runtime logs for the new deployment:

```bash
vercel logs "$DEPLOY_URL" --since 120s 2>/dev/null | tail -100
```

Scan for lines containing: `Error`, `error`, `TypeError`, `Unhandled`, `500`, `FATAL`, `panic`, `Exception`.

If any are found: record them as a WARN. If the errors indicate a broken page (5xx responses, unhandled exceptions in page code), add them to the failure list.

---

## Step 6 — Evaluate results

Tally the results:

- Smoke tests: X/Y passed
- Log scan: CLEAN or ERRORS FOUND

**If all smoke tests passed AND log scan is clean:** Jump to **Success Report**.

**If any smoke test failed OR critical log errors found:** Jump to **Rollback**.

---

## Rollback

Run:
```bash
vercel rollback --yes 2>&1
```

Wait for the rollback to complete (up to 3 minutes). Verify the rollback succeeded:
```bash
vercel ls --limit 2 2>/dev/null
```

Then print the **Diagnostic Summary** (see format below).

---

## Success Report

Print this when all checks pass:

```
SHIP COMPLETE

Commit:   <SHA>
Deploy:   <DEPLOY_URL>
Smoke:    <X>/<Y> tests passed
Logs:     Clean (no errors in last 2 min)

Screenshots:
  <list each screenshot path with test name>

Production is healthy.
```

---

## Diagnostic Summary (on failure or rollback)

Print this when any check fails:

```
SHIP FAILED — ROLLED BACK

Commit:      <SHA>
Deploy:      <DEPLOY_URL>
Rolled back: YES / NO (reason if no)

Failed checks:
  <test name>: <reason>
  ...

Log errors:
  <line> (if any)

Screenshots captured before failure:
  <list each screenshot path>

Next steps:
  1. Review the failed test and log lines above.
  2. Fix the issue locally and run /ship again.
  3. If rollback did not complete, run: vercel rollback --yes
```

---

## Smoke test quick reference

| Test | Route | Key assertion |
|------|-------|---------------|
| landing-load | /landing | Nav visible, "Sign In" and "Pricing" present |
| landing-nav | /landing | Anchor scrolls work for #how-it-works and #pricing |
| sign-in-flow | /login | Email + password inputs visible, Google button present |
| dashboard-load | /login → /dashboard | Skeleton gone within 5s of reaching /dashboard |
| ledger-page | /ledger (auth) | Transaction list/table rendered, skeleton gone |
