# /test-loop

Run Playwright specs against localhost, read failures, fix code, repeat until green — up to 10 iterations without asking.

## Steps

### 1. Confirm dev server is running

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If not 200, run `npm run dev` in the background and wait for it to be ready.

### 2. Run the suite

```bash
npx playwright test --reporter=list 2>&1
```

Parse the output for failures. If 0 failures: go to Step 5.

### 3. Fix failures (up to 10 iterations)

For each failing test:
- Read the error message and the relevant source file
- Make the minimal code change that fixes the root cause
- Do NOT skip or weaken the test — fix the implementation

After fixing, re-run:
```bash
npx playwright test --reporter=list 2>&1
```

Track iteration count in a TaskUpdate. If still failing after 10 iterations, stop and report what's blocking.

### 4. If requirements are genuinely ambiguous

Stop and ask the user one specific question. Do not loop on ambiguity.

### 5. Report

**All green:** Tell the user the pass count and which files were changed.
**Partial failure after 10 iterations:** Show the remaining failures, what you tried, and what the blocker is. Do not claim success.
