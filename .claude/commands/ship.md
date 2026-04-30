# /ship

Ship pending changes to production. You write the commit message. The script handles everything else.

## Steps

### 1. Commit and push

```bash
git diff --stat && git status --short
```

If the working tree is clean, skip to Step 2 with a note.

Otherwise, generate a concise commit message (present tense, no em dashes), then:

```bash
git add -A
git commit -m "<message>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

### 2. Run the ship script

```bash
node scripts/ship.mjs
```

This waits for Vercel READY, runs the 47-check QA suite against production, scans runtime logs for errors, and rolls back automatically if anything fails.

### 3. Report

**Exit 0:** Tell the user the deployment URL and QA result.

**Exit 1:** Read the full output. Find the root cause — build error, specific failing QA check name, or runtime log error. Tell the user exactly what broke and what to fix. The rollback already ran.
