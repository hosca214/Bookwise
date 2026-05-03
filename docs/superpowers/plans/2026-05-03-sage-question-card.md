# Sage Has a Question — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two ambiguous demo transactions and replace the "Needs a category" pulse block with a "Sage Has a Question" card that shows AI-suggested categories, an accept flow, and a freeflow describe-it path.

**Architecture:** Two nullable columns (`ai_suggested_category`, `ai_suggestion_reason`) are added to `transactions`. The demo seed populates them for two raw-bank-note transactions. The dashboard reads them alongside existing fields, adds minimal state for selection/edit/reason-toggle, and renders the new review card. A new `categorize` branch in `/api/sage` handles freeflow descriptions and returns `{ category_key }` (distinct from all other Sage types which return `{ insight }`).

**Tech Stack:** Next.js 15 App Router, Supabase JS client, Anthropic SDK (`claude-sonnet-4-20250514`), TypeScript, Playwright

---

## File Map

| File | Change |
|---|---|
| `lib/schema.sql` | Add two columns to `transactions` CREATE TABLE definition |
| `lib/supabase.ts` | Add `ai_suggested_category` and `ai_suggestion_reason` to `Transaction` type |
| `lib/demo-seed.sql` | Add 2 ambiguous current-month transactions with suggestion fields |
| `app/api/sage/route.ts` | Add `categorize` type — returns `{ category_key }` not `{ insight }` |
| `app/dashboard/page.tsx` | Update select query, state type, 4 new state vars, replace UI block lines 1007-1057 |
| `tests/bookwise.spec.ts` | Add Dashboard test for "Sage Has a Question" section |

---

## Task 1: DB Migration

**Files:**
- Modify: `lib/schema.sql:29-44` (update CREATE TABLE definition)
- Run in Supabase SQL editor (ALTER TABLE for existing database)

- [ ] **Step 1: Update schema.sql transactions table**

  Replace lines 29-44 in `lib/schema.sql`:

  ```sql
  create table transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id) on delete cascade,
    date date not null,
    amount numeric not null,
    type text check (type in ('income','expense')),
    category_key text not null,
    notes text,
    is_personal boolean default false,
    source text default 'manual',
    external_id text,
    receipt_url text,
    receipt_filename text,
    pulse_matched boolean default false,
    ai_suggested_category text,
    ai_suggestion_reason text,
    created_at timestamptz default now()
  );
  ```

- [ ] **Step 2: Run migration in Supabase SQL editor**

  Open the Supabase project SQL editor and run:

  ```sql
  alter table transactions add column if not exists ai_suggested_category text;
  alter table transactions add column if not exists ai_suggestion_reason text;
  ```

  Expected: `ALTER TABLE` success message, no errors.

- [ ] **Step 3: Commit schema change**

  ```bash
  cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
  git add lib/schema.sql
  git commit -m "feat: add ai_suggested_category and ai_suggestion_reason columns to transactions"
  ```

---

## Task 2: Update TypeScript Transaction Type

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Add fields to Transaction type**

  In `lib/supabase.ts`, find the `Transaction` type and add two fields after `receipt_filename`:

  ```typescript
  export type Transaction = {
    id: string
    user_id: string
    date: string
    amount: number
    type: 'income' | 'expense'
    category_key: string
    notes: string | null
    is_personal: boolean
    source: string
    external_id: string | null
    receipt_url: string | null
    receipt_filename: string | null
    pulse_matched: boolean
    ai_suggested_category: string | null
    ai_suggestion_reason: string | null
    created_at: string
    service_id: string | null
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add lib/supabase.ts
  git commit -m "feat: add ai suggestion fields to Transaction type"
  ```

---

## Task 3: Update Demo Seed Data

**Files:**
- Modify: `lib/demo-seed.sql`

- [ ] **Step 1: Add 2 ambiguous transactions to the current month income/expense blocks**

  In `lib/demo-seed.sql`, find the comment `-- Current month expenses (5 transactions, total $935)` and add two new rows — one expense and one income — to the existing current-month INSERT statements.

  Append to the current month income INSERT (after the `(demo_id, cur_month + 20, ...)` row, before the semicolon):

  ```sql
  (demo_id, cur_month + 10, 130.00, 'income', 'Other Income', 'VENMO PAYMENT D MORRISON', 'manual', 'Session Income', 'Looks like a client payment. If this was for an appointment, mark it as Appointment Income.')
  ```

  Append to the current month expenses INSERT (after the `(demo_id, cur_month + 19, ...)` row, before the semicolon):

  ```sql
  (demo_id, cur_month + 12,  89.47, 'expense', 'Other Expense', 'AMZN MKTP US*BT7R4 SEATTLE WA', 'manual', 'Supplies', 'Looks like an online product purchase. Linens, oils, and tools often come through here.')
  ```

  Both INSERTs need their column list updated to include the new fields. The column list for the income INSERT becomes:

  ```sql
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source, ai_suggested_category, ai_suggestion_reason) VALUES
  ```

  And for the expense INSERT:

  ```sql
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source, ai_suggested_category, ai_suggestion_reason) VALUES
  ```

  All existing rows in those INSERTs do not have the new columns, so they need `DEFAULT, DEFAULT` appended, or more cleanly the new rows are added as a separate INSERT statement at the end of the current-month block:

  ```sql
  -- Current month: ambiguous transactions needing review (2 transactions)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source, ai_suggested_category, ai_suggestion_reason) VALUES
    (demo_id, cur_month + 10, 130.00, 'income',  'Other Income',  'VENMO PAYMENT D MORRISON',          'manual', 'Session Income', 'Looks like a client payment. If this was for an appointment, mark it as Appointment Income.'),
    (demo_id, cur_month + 12,  89.47, 'expense', 'Other Expense', 'AMZN MKTP US*BT7R4 SEATTLE WA',     'manual', 'Supplies',       'Looks like an online product purchase. Linens, oils, and tools often come through here.');
  ```

  Add this block directly after the existing current-month expenses INSERT, before the `-- Previous month income` comment.

- [ ] **Step 2: Commit**

  ```bash
  git add lib/demo-seed.sql
  git commit -m "feat: add two ambiguous demo transactions with AI suggestions"
  ```

- [ ] **Step 3: Re-run the demo seed**

  Open the Supabase SQL editor, paste and run the full contents of `lib/demo-seed.sql`.

  Expected: `RAISE NOTICE: Demo seed complete for user: <uuid>` with no errors.

---

## Task 4: Add `categorize` Handler to Sage API

**Files:**
- Modify: `app/api/sage/route.ts`

- [ ] **Step 1: Add the categorize branch before the generic prompt lookup**

  In `app/api/sage/route.ts`, add a new block immediately after the `const vocab = ...` line and before `const system = ...`:

  ```typescript
  if (type === 'categorize') {
    const expenseKeys = ['Supplies', 'Equipment', 'Software', 'Rent', 'Insurance', 'Marketing', 'Mileage', 'Meals', 'Professional Services', 'Continuing Education', 'Other Expense']
    const incomeKeys = ['Session Income', 'Package Income', 'Tip Income', 'Other Income']
    const validKeys = context.transactionType === 'income' ? incomeKeys : expenseKeys

    const categorizePrompt = `You are categorizing a financial transaction for a solo wellness practitioner.
Raw bank note: "${context.rawNote}"
User description: "${context.userDescription}"
Transaction type: ${context.transactionType}

Return ONLY a JSON object with one key. Choose the single best match from this list:
${validKeys.join(', ')}

Example: {"category_key": "Supplies"}
No other text.`

    const anthropic = new Anthropic()
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 60,
        system: 'You are a financial categorization assistant. Return JSON only. No explanation.',
        messages: [{ role: 'user', content: categorizePrompt }],
      })
      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
      const parsed = JSON.parse(text)
      if (validKeys.includes(parsed.category_key)) {
        return Response.json({ category_key: parsed.category_key })
      }
      return Response.json({ category_key: context.transactionType === 'income' ? 'Other Income' : 'Other Expense' })
    } catch {
      return Response.json({ category_key: context.transactionType === 'income' ? 'Other Income' : 'Other Expense' })
    }
  }
  ```

- [ ] **Step 2: Verify the existing types still compile**

  ```bash
  cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/sage/route.ts
  git commit -m "feat: add categorize type to Sage API returning category_key"
  ```

---

## Task 5: Update Dashboard Query and State

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Expand the needsReviewTxs state type (line 137)**

  Replace:

  ```typescript
  const [needsReviewTxs, setNeedsReviewTxs] = useState<Array<{ id: string; date: string; amount: number; type: string; category_key: string; notes: string | null }>>([])
  ```

  With:

  ```typescript
  const [needsReviewTxs, setNeedsReviewTxs] = useState<Array<{
    id: string
    date: string
    amount: number
    type: string
    category_key: string
    notes: string | null
    ai_suggested_category: string | null
    ai_suggestion_reason: string | null
  }>>([])
  ```

- [ ] **Step 2: Add 4 new state variables** (add after the existing `needsReviewTxs` state line)

  ```typescript
  const [txSelected, setTxSelected] = useState<Record<string, string>>({})
  const [txShowReason, setTxShowReason] = useState<Record<string, boolean>>({})
  const [txEditOpen, setTxEditOpen] = useState<Record<string, boolean>>({})
  const [txEditText, setTxEditText] = useState<Record<string, string>>({})
  const [txAsking, setTxAsking] = useState<Record<string, boolean>>({})
  ```

- [ ] **Step 3: Update the transactions select query**

  Find the transactions select inside `loadDashboard` (the line starting with `supabase.from('transactions').select('id, amount, type, category_key, notes, date, external_id')`).

  Replace `'id, amount, type, category_key, notes, date, external_id'` with:

  ```typescript
  'id, amount, type, category_key, notes, date, external_id, ai_suggested_category, ai_suggestion_reason'
  ```

- [ ] **Step 4: Update setNeedsReviewTxs and initialize txSelected (around line 284)**

  Replace:

  ```typescript
  setNeedsReviewTxs((txns ?? [])
    .filter(tx => tx.category_key === 'Other Expense' || tx.category_key === 'Other Income')
    .map(tx => ({ id: tx.id, date: tx.date, amount: Number(tx.amount), type: tx.type, category_key: tx.category_key, notes: tx.notes }))
  )
  ```

  With:

  ```typescript
  const reviewTxs = (txns ?? [])
    .filter(tx => tx.category_key === 'Other Expense' || tx.category_key === 'Other Income')
    .map(tx => ({
      id: tx.id,
      date: tx.date,
      amount: Number(tx.amount),
      type: tx.type,
      category_key: tx.category_key,
      notes: tx.notes,
      ai_suggested_category: tx.ai_suggested_category ?? null,
      ai_suggestion_reason: tx.ai_suggestion_reason ?? null,
    }))
  setNeedsReviewTxs(reviewTxs)
  const initialSel: Record<string, string> = {}
  for (const tx of reviewTxs) {
    if (tx.ai_suggested_category) initialSel[tx.id] = tx.ai_suggested_category
  }
  setTxSelected(initialSel)
  ```

- [ ] **Step 5: Add confirmCategory and askSageCategory handlers**

  Add these two functions inside the component, after the `savePulse` function:

  ```typescript
  async function confirmCategory(txId: string, fallback: string) {
    const cat = txSelected[txId] ?? fallback
    if (!cat) return
    await supabase.from('transactions').update({ category_key: cat }).eq('id', txId)
    setNeedsReviewTxs(prev => prev.filter(t => t.id !== txId))
  }

  async function askSageCategory(txId: string, rawNote: string, txType: string) {
    const description = txEditText[txId] ?? ''
    if (!description.trim() || !profile) return
    setTxAsking(prev => ({ ...prev, [txId]: true }))
    try {
      const res = await fetch('/api/sage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'categorize',
          context: {
            industry: profile.industry,
            rawNote,
            userDescription: description,
            transactionType: txType,
          },
        }),
      })
      if (!res.ok) throw new Error('Sage unavailable')
      const data = await res.json()
      if (data.category_key) {
        await supabase.from('transactions').update({ category_key: data.category_key }).eq('id', txId)
        setNeedsReviewTxs(prev => prev.filter(t => t.id !== txId))
      }
    } catch {
      toast.error('Sage could not read that. Try a category above.')
    } finally {
      setTxAsking(prev => ({ ...prev, [txId]: false }))
    }
  }
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add app/dashboard/page.tsx
  git commit -m "feat: update dashboard query and state for sage-has-a-question card"
  ```

---

## Task 6: Replace the UI Block

**Files:**
- Modify: `app/dashboard/page.tsx:1007-1057`

- [ ] **Step 1: Replace the "Needs a category" block**

  Find and remove lines 1007-1057 (the entire `{needsReviewTxs.length > 0 && (...)}`  block inside the Daily Pulse section).

  Replace with:

  ```tsx
  {needsReviewTxs.length > 0 && (
    <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Sage Has a Question
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Help Sage learn. Confirming these keeps your numbers accurate.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {needsReviewTxs.map(tx => {
          const cats = tx.type === 'expense'
            ? ['Supplies', 'Software', 'Rent', 'Insurance', 'Marketing', 'Mileage', 'Meals', 'Professional Services', 'Continuing Education']
            : ['Session Income', 'Package Income', 'Tip Income']
          const selectedCat = txSelected[tx.id]
          const isAsking = txAsking[tx.id] ?? false
          const editOpen = txEditOpen[tx.id] ?? false
          const showReason = txShowReason[tx.id] ?? false

          return (
            <div key={tx.id} style={{ background: 'var(--color-background)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 8, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted-foreground)', marginBottom: 2 }}>
                    {new Date(tx.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted-foreground)', fontFamily: 'monospace' }}>
                    {tx.notes}
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-serif)', color: tx.type === 'expense' ? 'var(--color-danger)' : 'var(--color-profit)', whiteSpace: 'nowrap' as const }}>
                  {tx.type === 'expense' ? '-' : '+'}{fmt(tx.amount)}
                </span>
              </div>

              {tx.ai_suggested_category && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                    Sage thinks:
                  </span>
                  <button
                    onClick={() => setTxSelected(prev => ({ ...prev, [tx.id]: tx.ai_suggested_category! }))}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 999,
                      background: selectedCat === tx.ai_suggested_category
                        ? 'color-mix(in srgb, var(--color-primary) 15%, var(--color-card))'
                        : 'var(--color-card)',
                      border: `1.5px solid ${selectedCat === tx.ai_suggested_category ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      color: 'var(--color-primary-dark)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <span>&#10003;</span> {t(tx.ai_suggested_category)}
                  </button>
                  <button
                    onClick={() => setTxShowReason(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))}
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '1.5px solid var(--color-border)', background: 'none',
                      fontSize: 10, color: 'var(--color-muted-foreground)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-sans)', flexShrink: 0, padding: 0,
                    }}
                  >
                    i
                  </button>
                </div>
              )}

              {showReason && tx.ai_suggestion_reason && (
                <div style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-card))', borderRadius: 8, padding: '8px 12px', marginBottom: 10, borderLeft: '2px solid var(--color-primary)' }}>
                  <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--color-muted-foreground)', lineHeight: 1.5, margin: 0 }}>
                    {tx.ai_suggestion_reason}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {cats.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTxSelected(prev => ({ ...prev, [tx.id]: cat }))}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                      border: `1.5px solid ${selectedCat === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: selectedCat === cat
                        ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-card))'
                        : 'var(--color-card)',
                      color: 'var(--color-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {t(cat)}
                  </button>
                ))}
              </div>

              {!editOpen ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontStyle: 'italic' }}>
                    Or tell Sage what this is...
                  </span>
                  <button
                    onClick={() => setTxEditOpen(prev => ({ ...prev, [tx.id]: true }))}
                    style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-sans)' }}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <textarea
                    value={txEditText[tx.id] ?? ''}
                    onChange={e => setTxEditText(prev => ({ ...prev, [tx.id]: e.target.value }))}
                    placeholder="Describe this transaction..."
                    rows={2}
                    style={{
                      width: '100%', borderRadius: 8, border: '1.5px solid var(--color-border)',
                      background: 'var(--color-card)', color: 'var(--color-ink)',
                      fontSize: 14, padding: '10px 12px', fontFamily: 'var(--font-sans)',
                      resize: 'none' as const, outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const,
                    }}
                  />
                  <button
                    onClick={() => askSageCategory(tx.id, tx.notes ?? '', tx.type)}
                    disabled={isAsking || !(txEditText[tx.id] ?? '').trim()}
                    style={{
                      width: '100%', minHeight: 40,
                      background: isAsking || !(txEditText[tx.id] ?? '').trim() ? 'var(--color-muted)' : 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)',
                      border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                      cursor: isAsking || !(txEditText[tx.id] ?? '').trim() ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {isAsking ? 'Thinking...' : 'Ask Sage'}
                  </button>
                </div>
              )}

              <button
                onClick={() => confirmCategory(tx.id, tx.ai_suggested_category ?? '')}
                disabled={!selectedCat}
                style={{
                  width: '100%', minHeight: 48,
                  background: selectedCat ? 'var(--color-primary)' : 'var(--color-muted)',
                  color: 'var(--color-primary-foreground)',
                  border: 'none', borderRadius: 10,
                  fontSize: 16, fontWeight: 700,
                  cursor: selectedCat ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                Confirm
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )}
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/dashboard/page.tsx
  git commit -m "feat: replace Needs a Category with Sage Has a Question card"
  ```

---

## Task 7: Playwright Test

**Files:**
- Modify: `tests/bookwise.spec.ts`

- [ ] **Step 1: Add test to the Dashboard describe block**

  In `tests/bookwise.spec.ts`, inside the `test.describe('Dashboard', ...)` block, add after the last existing dashboard test:

  ```typescript
  test('sage has a question section visible with demo data', async ({ page }) => {
    await page.waitForSelector('text=Sage Has a Question', { timeout: 15_000 })
    await expect(page.getByText('Sage Has a Question')).toBeVisible()
    await expect(page.getByText('Help Sage learn')).toBeVisible()
  })

  test('sage question card shows suggestion pill', async ({ page }) => {
    await page.waitForSelector('text=Sage thinks:', { timeout: 15_000 })
    await expect(page.getByText('Sage thinks:').first()).toBeVisible()
  })
  ```

- [ ] **Step 2: Run the tests**

  ```bash
  cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
  npx playwright test tests/bookwise.spec.ts --grep "sage" 2>&1 | tail -20
  ```

  Expected: 2 tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/bookwise.spec.ts
  git commit -m "test: add playwright tests for Sage Has a Question section"
  ```

---

## Task 8: Final Verification and Push

- [ ] **Step 1: Run full build**

  ```bash
  cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
  npm run build 2>&1 | tail -20
  ```

  Expected: `Route (app)` table with no errors. Exit code 0.

- [ ] **Step 2: Run full test suite**

  ```bash
  npx playwright test 2>&1 | tail -20
  ```

  Expected: all tests pass or pre-existing failures only (none from this feature).

- [ ] **Step 3: Push to remote**

  ```bash
  git push
  ```

  Expected: branch pushed to origin, Vercel deploy triggered.

---

## Self-Review Checklist

- [x] **Spec coverage:** DB columns (Task 1), TypeScript type (Task 2), demo seed (Task 3), Sage API categorize (Task 4), dashboard query/state (Task 5), UI replacement (Task 6), test (Task 7), push (Task 8)
- [x] **No placeholders:** All steps have exact code
- [x] **Type consistency:** `txSelected`, `txShowReason`, `txEditOpen`, `txEditText`, `txAsking` defined in Task 5 and used in Task 6. `confirmCategory` and `askSageCategory` defined in Task 5, called in Task 6. `ai_suggested_category` and `ai_suggestion_reason` defined in Task 2, selected in Task 5, rendered in Task 6.
- [x] **Return shape:** `categorize` returns `{ category_key }`. Client reads `data.category_key` in `askSageCategory`. All other types return `{ insight }` and are unaffected.
- [x] **IQ mapping:** All category pill labels go through `t(cat)`. Suggestion pills go through `t(tx.ai_suggested_category)`. Raw `category_key` values (canonical keys) are used in DB writes.
