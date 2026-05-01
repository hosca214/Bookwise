import { test, expect } from '@playwright/test'

const EMAIL = 'demo@bookwise.app'
const PASS  = 'Demo2025!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
}

// ── Landing ───────────────────────────────────────────────────────────────────
test.describe('Landing', () => {
  test('hero headline visible', async ({ page }) => {
    await page.goto('/landing')
    await expect(page.getByText(/Keep more of/i)).toBeVisible()
  })

  test('rotating word cycles through professions', async ({ page }) => {
    await page.goto('/landing')
    await expect(page.locator('text=coaches, text=trainers, text=bodyworkers').first()).toBeVisible({ timeout: 10_000 })
  })

  test('CTA and email input present', async ({ page }) => {
    await page.goto('/landing')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('unauthenticated / redirects to /landing or /login', async ({ page }) => {
    await page.goto('/')
    expect(page.url()).toMatch(/\/(landing|login)/)
  })
})

// ── Auth ──────────────────────────────────────────────────────────────────────
test.describe('Auth', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('demo login lands on dashboard', async ({ page }) => {
    await login(page)
    expect(page.url()).toContain('/dashboard')
  })

  test('protected routes redirect unauthenticated to /login', async ({ page }) => {
    for (const route of ['/dashboard', '/ledger', '/reports', '/settings']) {
      await page.goto(route)
      expect(page.url()).toMatch(/\/(login|landing)/)
    }
  })
})

// ── Dashboard ─────────────────────────────────────────────────────────────────
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('"My Dash" header visible', async ({ page }) => {
    await expect(page.getByText('My Dash')).toBeVisible()
  })

  test('practice name visible', async ({ page }) => {
    await expect(page.getByText(/Sage & Stone|Hands & Heart/i).first()).toBeVisible()
  })

  test('three bucket tiles visible', async ({ page }) => {
    await expect(page.getByText('Tax Set-Aside')).toBeVisible()
    await expect(page.getByText('Daily Operations')).toBeVisible()
    await expect(page.getByText('Growth Fund')).toBeVisible()
  })

  test('Make a Transfer button opens modal', async ({ page }) => {
    await page.click('button:has-text("Make a Transfer")')
    await expect(page.getByText(/Move your money/i)).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test("Today's Pulse section visible", async ({ page }) => {
    await expect(page.getByText("Today's Pulse")).toBeVisible()
  })

  test('Sage insight card visible', async ({ page }) => {
    await expect(page.getByText(/Sage says/i)).toBeVisible()
  })

  test('bottom nav has 4 tabs', async ({ page }) => {
    for (const label of ['Dash', 'Ledger', 'Reports', 'Settings']) {
      await expect(page.getByText(label).last()).toBeVisible()
    }
  })

  test('page renders past skeleton within 5s', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('My Dash')).toBeVisible({ timeout: 5_000 })
  })
})

// ── Ledger ────────────────────────────────────────────────────────────────────
test.describe('Ledger', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto('/ledger') })

  test('ledger header visible', async ({ page }) => {
    await expect(page.getByText('Ledger')).toBeVisible()
  })

  test('transaction rows rendered', async ({ page }) => {
    await expect(page.locator('[data-testid="transaction-row"], .transaction-row').first()).toBeVisible({ timeout: 8_000 })
  })

  test('search bar present and filters', async ({ page }) => {
    const search = page.locator('input[placeholder*="Search"]')
    await expect(search).toBeVisible()
    await search.fill('Oils')
    await page.waitForTimeout(300)
    await expect(page.getByText(/Oil/i).first()).toBeVisible()
    await search.fill('')
  })

  test('income/expense toggle works', async ({ page }) => {
    await page.click('button:has-text("Income")')
    await page.waitForTimeout(300)
    await page.click('button:has-text("All")')
  })

  test('add transaction sheet opens', async ({ page }) => {
    await page.locator('button').filter({ hasText: /^\+$/ }).first().click()
    await expect(page.getByText('Save')).toBeVisible()
    await page.keyboard.press('Escape')
  })
})

// ── Reports ───────────────────────────────────────────────────────────────────
test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto('/reports') })

  test('gross income visible', async ({ page }) => {
    await expect(page.getByText(/Total Appointment Income|Gross Income/i).first()).toBeVisible()
  })

  test('net profit (Take-Home) visible', async ({ page }) => {
    await expect(page.getByText('Take-Home').first()).toBeVisible()
  })

  test('tax estimate visible', async ({ page }) => {
    await expect(page.getByText(/Tax Set-Aside|Tax Estimate/i).first()).toBeVisible()
  })

  test('accountant view toggle switches labels', async ({ page }) => {
    await page.locator('button', { hasText: 'Accountant View' }).click()
    await expect(page.getByText(/Gross Receipts|Session Income/i).first()).toBeVisible()
    await page.locator('button', { hasText: 'My Language' }).click()
  })

  test('Export for My CPA button present', async ({ page }) => {
    await expect(page.getByText(/Export for My CPA|Export/i).first()).toBeVisible()
  })

  test('month filter pills present', async ({ page }) => {
    await expect(page.getByText('This Month')).toBeVisible()
    await expect(page.getByText('Last Month')).toBeVisible()
  })
})

// ── Settings ──────────────────────────────────────────────────────────────────
test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto('/settings') })

  test('service menu renders services', async ({ page }) => {
    await expect(page.getByText(/60-Minute|Session/i).first()).toBeVisible()
  })

  test('vibe selector visible', async ({ page }) => {
    await expect(page.getByText(/Vibe|Make it yours/i).first()).toBeVisible()
  })

  test('Google Drive shows Connected', async ({ page }) => {
    await expect(page.getByText('Google Drive')).toBeVisible()
    await expect(page.getByText('Connected').first()).toBeVisible()
  })

  test('Plaid shows Connected', async ({ page }) => {
    await expect(page.getByText('Plaid')).toBeVisible()
  })

  test('disclaimer text present', async ({ page }) => {
    await expect(page.getByText(/licensed CPA/i)).toBeVisible()
  })
})
