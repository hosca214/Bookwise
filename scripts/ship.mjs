#!/usr/bin/env node
/**
 * ship.mjs — post-push deployment guard
 * Called by /ship after git push. Waits for Vercel READY, runs QA,
 * checks runtime logs, rolls back on any failure.
 * Exit 0 = all clear. Exit 1 = failure (output is structured for Claude to diagnose).
 */

import { execSync, spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local so SEED_DEMO_SECRET is available when running locally
try {
  const envLocal = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local'), 'utf8')
  for (const line of envLocal.split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0) {
      const k = line.slice(0, eq).trim()
      const v = line.slice(eq + 1).trim()
      if (k && !process.env[k]) process.env[k] = v
    }
  }
} catch { /* no .env.local — fine */ }

const __dir = path.dirname(fileURLToPath(import.meta.url))
const DEPLOY_TIMEOUT_MS = 8 * 60 * 1000
const POLL_MS = 15_000

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch (e) {
    return ((e.stdout ?? '') + (e.stderr ?? '')).trim()
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── 1. Detect new deployment ──────────────────────────────────────────────────
process.stdout.write('Waiting for Vercel to pick up push')
for (let i = 0; i < 12; i++) { await sleep(1000); process.stdout.write('.') }
console.log()

const lsOut = sh('vercel ls 2>&1')
const urlMatch = lsOut.match(/https:\/\/bookwise-starter[^\s]+\.vercel\.app/)

if (!urlMatch) {
  console.error('Could not find a deployment URL in `vercel ls` output.')
  console.error('Raw output:\n' + lsOut)
  process.exit(1)
}

const deployUrl = urlMatch[0]
console.log('Deployment detected:', deployUrl)

// ── 2. Poll until READY ───────────────────────────────────────────────────────
const deadline = Date.now() + DEPLOY_TIMEOUT_MS
let buildState = 'BUILDING'

while (Date.now() < deadline) {
  const info = sh(`vercel inspect "${deployUrl}" 2>&1`)
  if (/ready/i.test(info) && !/not.ready/i.test(info)) { buildState = 'READY'; break }
  if (/\b(error|failed|canceled)\b/i.test(info)) { buildState = 'ERROR'; break }
  console.log(`  Building... (${Math.round((deadline - Date.now()) / 1000)}s left)`)
  await sleep(POLL_MS)
}

if (buildState !== 'READY') {
  console.log(`\nBUILD ${buildState} — rolling back...`)
  console.log(sh('vercel rollback --yes 2>&1'))
  console.log('\nDIAGNOSTIC: Deployment never reached READY state.')
  console.log('Check Vercel build logs at: https://vercel.com/hosca214/bookwise-starter')
  process.exit(1)
}

console.log('Build READY. Seeding demo account...')
try {
  const seedRes = await fetch(`${deployUrl}/api/seed-demo`, { method: 'POST' })
  const seedBody = await seedRes.json().catch(() => ({}))
  if (seedRes.ok) {
    console.log(`Demo seed OK — ${seedBody.transactions ?? '?'} transactions written.`)
  } else {
    console.warn(`Demo seed returned ${seedRes.status}: ${JSON.stringify(seedBody)} — continuing anyway.`)
  }
} catch (e) {
  console.warn('Demo seed request failed:', e.message, '— continuing anyway.')
}
console.log('\nRunning QA suite...\n')

// ── 3. Run QA suite ───────────────────────────────────────────────────────────
let qaOk = true
let qaOutput = ''

try {
  qaOutput = execSync(`node "${path.join(__dir, 'qa-demo.mjs')}"`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 5 * 60 * 1000,
  })
} catch (e) {
  qaOutput = ((e.stdout ?? '') + (e.stderr ?? '')).trim()
  qaOk = false
}

process.stdout.write(qaOutput + '\n')

// ── 4. Check runtime logs ─────────────────────────────────────────────────────
console.log('Checking runtime logs (last 2 min)...')
const logs = sh(`vercel logs "${deployUrl}" --since 120s 2>&1`)
const logErrors = logs.split('\n').filter(l =>
  /\b(error|TypeError|Unhandled|FATAL|panic)\b/i.test(l) || / 5\d\d /.test(l)
)

// ── 5. Evaluate and report ────────────────────────────────────────────────────
const criticalLogs = logErrors.filter(l => /Unhandled|FATAL| 5\d\d /i.test(l))

if (qaOk && criticalLogs.length === 0) {
  const summary = qaOutput.match(/RESULT: \d+\/\d+ checks passed/)?.[0] ?? 'QA passed'
  console.log('\n=== SHIP COMPLETE ===')
  console.log('Deployment:', deployUrl)
  console.log(summary)
  if (logErrors.length) console.log(`Logs: ${logErrors.length} minor warning(s), no critical errors`)
  else console.log('Logs: clean')
  process.exit(0)
}

// ── 6. Rollback ───────────────────────────────────────────────────────────────
console.log('\n=== FAILURE — ROLLING BACK ===')
console.log(sh('vercel rollback --yes 2>&1'))

console.log('\nDIAGNOSTIC SUMMARY:')
if (!qaOk) {
  const failures = [...qaOutput.matchAll(/✗ (.+)/g)].map(m => '  ' + m[1])
  console.log('QA failures:')
  failures.forEach(f => console.log(f))
}
if (criticalLogs.length) {
  console.log('Runtime errors:')
  criticalLogs.forEach(l => console.log(' ', l))
}

console.log('\nFix the issues above and run /ship again.')
process.exit(1)
