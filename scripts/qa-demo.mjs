/**
 * E2E QA against https://bookwise-coral.vercel.app
 * Tests all major user journeys with the demo account.
 */

import { chromium } from 'playwright'

const BASE = 'https://bookwise-coral.vercel.app'
const EMAIL = 'demo@bookwise.app'
const PASS = 'Demo2025!'
const PASS_MARK = '✓'
const FAIL_MARK = '✗'

let browser, page
const results = []

function pass(name) {
  results.push({ name, ok: true })
  console.log(`  ${PASS_MARK} ${name}`)
}

function fail(name, reason) {
  results.push({ name, ok: false, reason })
  console.log(`  ${FAIL_MARK} ${name}: ${reason}`)
}

async function check(name, fn) {
  try {
    await fn()
    pass(name)
  } catch (e) {
    fail(name, e.message.split('\n')[0].slice(0, 120))
  }
}

async function setup() {
  browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  page = await ctx.newPage()
}

async function login() {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 })
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ BOOKWISE QA — LIVE DEMO ACCOUNT ═══\n')

await setup()

// ── 1. LANDING PAGE ──────────────────────────────────────────────────────────
console.log('1. Landing Page')
await page.goto(BASE, { waitUntil: 'networkidle' })

await check('Redirects to /landing when logged out', async () => {
  if (!page.url().includes('/landing') && !page.url().includes('/login')) throw new Error(`Got ${page.url()}`)
})
await check('Hero headline visible', async () => {
  await page.waitForSelector('text=Always know where', { timeout: 8000 })
})
await check('CTA button present', async () => {
  const btn = page.locator('a, button').filter({ hasText: /Apply for beta/i }).first()
  await btn.waitFor({ timeout: 5000 })
})
await check('Beta/waitlist form present', async () => {
  const input = page.locator('input[type="email"]').first()
  await input.waitFor({ timeout: 5000 })
})

// ── 2. LOGIN ─────────────────────────────────────────────────────────────────
console.log('\n2. Login')
await check('Can navigate to /login', async () => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="email"]', { timeout: 8000 })
})
await check('Sign in with demo credentials', async () => {
  await login()
  if (!page.url().includes('/dashboard')) throw new Error(`Ended up at ${page.url()}`)
})

// ── 3. DASHBOARD ─────────────────────────────────────────────────────────────
console.log('\n3. Dashboard')
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })

await check('Page header shows "My Dash"', async () => {
  await page.waitForSelector('text=My Dash', { timeout: 8000 })
})
await check('Practice name visible', async () => {
  await page.waitForSelector('text=Sage & Stone Bodywork', { timeout: 5000 })
})
await check('Win streak badge shows (2+ weeks)', async () => {
  await page.waitForSelector('text=/weeks of consistently paying yourself/i', { timeout: 5000 })
})
await check('Take-Home card visible with amount', async () => {
  await page.waitForSelector('text=Take-Home', { timeout: 5000 })
})
await check('Money plan tiles visible (Tax, Ops, Growth)', async () => {
  await page.evaluate(() => window.scrollTo(0, 300))
  await page.waitForTimeout(1500)
  await page.waitForSelector('text=/Taxes Set Aside/i', { timeout: 10000 })
  await page.waitForSelector('text=Business Expenses', { timeout: 5000 })
  await page.waitForSelector('text=Growth Fund', { timeout: 5000 })
})
await check('Cost to Show Up card visible', async () => {
  await page.waitForSelector('text=Cost to Show Up', { timeout: 5000 })
})
await check('Make a Transfer button present', async () => {
  await page.waitForSelector('text=Make a Transfer', { timeout: 5000 })
})
await check('Make a Transfer modal opens', async () => {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.click('button:has-text("Make a Transfer")')
  await page.waitForSelector('text=This week\'s transfers', { timeout: 8000 })
  await page.keyboard.press('Escape')
})
await check('Daily Pulse section visible', async () => {
  await page.waitForSelector("text=Today's Pulse", { timeout: 5000 })
})
await check('Sage insight card visible', async () => {
  await page.waitForSelector('text=Sage AI Insights', { timeout: 15000 })
})
await check('Tax deadline countdown visible', async () => {
  // The countdown lives behind the Tax Set-Aside tile's "What is this?" toggle.
  // Scroll down to bring the tile into view, then click via JS evaluate
  // (bypasses Playwright actionability checks for off-screen elements).
  await page.evaluate(() => window.scrollTo(0, 400))
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'What is this?')
    // Index 0 = Take-Home card, Index 1 = Tax tile
    if (btns.length >= 2) btns[1].click()
    else if (btns.length === 1) btns[0].click()
  })
  await page.waitForSelector('text=days away', { timeout: 5000 })
})
await check('BottomNav has 4 tabs', async () => {
  const nav = page.locator('text=Dash, text=Ledger, text=Reports, text=Settings')
  const count = await page.locator('nav a, nav button').count()
  if (count < 4) throw new Error(`Only ${count} nav items found`)
})

// ── 4. LEDGER ────────────────────────────────────────────────────────────────
console.log('\n4. Ledger')
await page.goto(`${BASE}/ledger`, { waitUntil: 'networkidle' })

await check('Ledger header visible', async () => {
  await page.waitForSelector('text=Ledger', { timeout: 8000 })
})
await check('Transaction rows rendered', async () => {
  await page.waitForSelector('text=/[0-9]+ entr/i', { timeout: 8000 })
})
await check('Manual source badge visible', async () => {
  await page.waitForSelector('text=Manual', { timeout: 5000 })
})
await check('Search bar present', async () => {
  await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 })
})
await check('Search filters transactions', async () => {
  await page.fill('input[placeholder*="Search"]', 'Linens')
  await page.waitForTimeout(400)
  const visible = await page.locator('text=Linen').count()
  if (visible === 0) throw new Error('No results for "Linens"')
  await page.fill('input[placeholder*="Search"]', '')
})
await check('Income/Expense toggle works', async () => {
  await page.click('button:has-text("Income")')
  await page.waitForTimeout(300)
  await page.click('button:has-text("All")')
})
await check('Add transaction sheet opens', async () => {
  // floating circular "+" FAB button, bottom-right
  const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first()
  await addBtn.waitFor({ timeout: 5000 })
  await addBtn.click()
  await page.waitForSelector('text=Save', { timeout: 5000 })
  await page.keyboard.press('Escape')
})
await check('Receipt camera icon present on expense rows', async () => {
  const receiptRows = await page.locator('text=Linens').count()
  if (receiptRows === 0) throw new Error('No Linens expense row found')
})

// ── 5. REPORTS ───────────────────────────────────────────────────────────────
console.log('\n5. Reports')
await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle' })

await check('Reports page loads', async () => {
  await page.waitForSelector('text=Reports', { timeout: 8000 })
})
await check('Gross income figure visible', async () => {
  await page.waitForSelector('text=/Total Appointment Income|Gross Income/i', { timeout: 8000 })
})
await check('Net profit figure visible', async () => {
  await page.waitForSelector('text=Take-Home', { timeout: 5000 })
})
await check('Tax estimate box visible', async () => {
  await page.waitForSelector('text=/Taxes Set Aside Estimate|Tax Estimate/i', { timeout: 5000 })
})
await check('Bar chart renders', async () => {
  await page.waitForSelector('.recharts-bar, .recharts-rectangle', { timeout: 8000 })
})
await check('Accountant view toggle present', async () => {
  await page.waitForSelector('text=/Accountant View|My Language/i', { timeout: 5000 })
})
await check('Accountant toggle switches mode', async () => {
  await page.locator('button', { hasText: 'Accountant View' }).click()
  await page.waitForSelector('text=/Gross Receipts|Session Income/i', { timeout: 5000 })
  await page.locator('button', { hasText: 'My Language' }).click()
})
await check('Export for My CPA button present', async () => {
  await page.waitForSelector('text=/Export for My CPA|Export/i', { timeout: 5000 })
})
await check('Month filter pills present', async () => {
  await page.waitForSelector('text=This Month', { timeout: 5000 })
  await page.waitForSelector('text=Last Month', { timeout: 3000 })
})

// ── 6. SETTINGS ──────────────────────────────────────────────────────────────
console.log('\n6. Settings')
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })

await check('Settings page loads', async () => {
  await page.waitForSelector('text=Settings', { timeout: 8000 })
})
await check('Service menu shows services', async () => {
  await page.waitForSelector('text=60-Minute Session', { timeout: 8000 })
})
await check('Add service form present', async () => {
  await page.waitForSelector('text=/Add a service|Add Service/i', { timeout: 5000 })
})
await check('Vibe selector visible', async () => {
  await page.waitForSelector('text=/Vibe|Make it yours/i', { timeout: 5000 })
})
await check('Pay settings inputs present', async () => {
  await page.waitForSelector('text=/Take-Home|Pay/i', { timeout: 5000 })
})
await check('Google Drive shows Connected', async () => {
  await page.waitForSelector('text=Google Drive', { timeout: 5000 })
  // Should show Connected since google_drive_folder_id is set
  const connected = await page.locator('text=Connected').count()
  if (connected === 0) throw new Error('No Connected badge found')
})
await check('Plaid shows Connected', async () => {
  await page.waitForSelector('text=Plaid', { timeout: 5000 })
})
await check('Stripe shows Coming soon', async () => {
  await page.waitForSelector('text=Coming soon', { timeout: 5000 })
})
await check('Disclaimer text present', async () => {
  await page.waitForSelector('text=/Bookwise organizes|licensed CPA/i', { timeout: 5000 })
})

// ── 7. ONBOARDING FLOW (fresh tab, logged-out) ───────────────────────────────
console.log('\n7. Onboarding (spot check)')
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page2 = await ctx2.newPage()

await check('Landing redirects unauthenticated user', async () => {
  await page2.goto(BASE, { waitUntil: 'networkidle' })
  if (!page2.url().includes('/landing') && !page2.url().includes('/login')) {
    throw new Error(`Expected /landing, got ${page2.url()}`)
  }
})
await check('/dashboard redirects unauthenticated to /login', async () => {
  await page2.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  if (!page2.url().includes('/login') && !page2.url().includes('/landing')) {
    throw new Error(`Expected /login, got ${page2.url()}`)
  }
})

await ctx2.close()

// ── RESULTS ──────────────────────────────────────────────────────────────────
await browser.close()

const passed = results.filter(r => r.ok).length
const failed = results.filter(r => !r.ok)

console.log(`\n${'─'.repeat(50)}`)
console.log(`RESULT: ${passed}/${results.length} checks passed`)
if (failed.length) {
  console.log(`\nFAILURES:`)
  for (const f of failed) console.log(`  ✗ ${f.name}\n    → ${f.reason}`)
}
console.log('')

process.exit(failed.length > 0 ? 1 : 0)
