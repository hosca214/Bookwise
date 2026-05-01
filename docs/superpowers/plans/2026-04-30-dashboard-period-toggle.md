# Dashboard Period Toggle + Weekly Transfer System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the approximate monthly/weekly toggle with a real Mon-Sun weekly data layer, move the global toggle to the sticky header, auto-archive weekly summaries, and add a Weekly Transfer History report.

**Architecture:** A new `weekly_summaries` table stores each week's computed amounts and transfer status. The dashboard queries both the current week's transactions and the current week's summary row on every load, auto-upserting the summary in the background. The global `payPeriod` toggle (moved to the header) switches all cards between real weekly and real monthly data. The Reports page gains a standalone Weekly Transfer History section with CSV export.

**Tech Stack:** Next.js 15 App Router, Supabase (postgres + RLS), TypeScript, React inline styles, Fraunces/Lora + Plus Jakarta Sans fonts.

---

## File Map

| File | Action | What changes |
|---|---|---|
| Supabase DB | Migration | Create `weekly_summaries` table + RLS |
| `lib/supabase.ts` | Modify | Add `WeeklySummary` type |
| `lib/weekUtils.ts` | Create | Week computation helpers |
| `app/dashboard/page.tsx` | Modify | Header, toggle, weekly data, cards, modal, streak |
| `app/reports/page.tsx` | Modify | Weekly Transfer History section + CSV |
| `lib/demo-seed.sql` | Modify | Add 4 weeks of weekly_summaries rows |

---

## Task 1: Database migration — weekly_summaries

**Files:**
- Supabase SQL editor (or MCP)

- [ ] **Step 1: Run migration**

```sql
create table if not exists weekly_summaries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  income numeric default 0,
  expenses numeric default 0,
  tax_amount numeric default 0,
  profit_amount numeric default 0,
  ops_amount numeric default 0,
  pay_amount numeric default 0,
  transferred boolean default false,
  transferred_at timestamptz,
  unique(user_id, week_start)
);

alter table weekly_summaries enable row level security;

create policy "own weekly_summaries" on weekly_summaries
  for all using (auth.uid() = user_id);
```

- [ ] **Step 2: Verify table exists**

Run: `select count(*) from weekly_summaries;`
Expected: returns `0` with no error.

- [ ] **Step 3: Commit**

```bash
git add lib/demo-seed.sql
git commit -m "chore: weekly_summaries migration applied to production DB"
```

---

## Task 2: TypeScript type — WeeklySummary

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Add WeeklySummary type**

Append to the end of `lib/supabase.ts`:

```typescript
export type WeeklySummary = {
  id: string
  user_id: string
  week_start: string
  week_end: string
  income: number
  expenses: number
  tax_amount: number
  profit_amount: number
  ops_amount: number
  pay_amount: number
  transferred: boolean
  transferred_at: string | null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add WeeklySummary type"
```

---

## Task 3: Week utilities

**Files:**
- Create: `lib/weekUtils.ts`

- [ ] **Step 1: Create the file**

```typescript
export function getWeekStart(from: Date = new Date()): Date {
  const d = new Date(from)
  const day = d.getDay() // 0=Sun, 1=Mon
  d.setDate(d.getDate() - ((day + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function formatWeekRange(weekStart: Date): string {
  const end = getWeekEnd(weekStart)
  const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = end.getMonth() === weekStart.getMonth()
    ? end.toLocaleDateString('en-US', { day: 'numeric' })
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export function formatMonthLabel(monthStart: string): string {
  return new Date(monthStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/weekUtils.ts
git commit -m "feat: add week utility helpers"
```

---

## Task 4: Dashboard — state, data loading, weekly queries

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add imports at top of file**

After the existing imports (around line 1-20), add:

```typescript
import { getWeekStart, getWeekEnd, toDateStr, formatWeekRange, formatMonthLabel } from '@/lib/weekUtils'
import type { WeeklySummary } from '@/lib/supabase'
```

- [ ] **Step 2: Add module-level week constants**

Replace the existing:
```typescript
const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 8) + '01'
```

With:
```typescript
const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 8) + '01'
const _weekStart = getWeekStart(new Date())
const _weekEnd = getWeekEnd(_weekStart)
const WEEK_START_STR = toDateStr(_weekStart)
const WEEK_END_STR = toDateStr(_weekEnd)
const WEEK_RANGE_LABEL = formatWeekRange(_weekStart)
const MONTH_LABEL = formatMonthLabel(currentMonth)
```

- [ ] **Step 3: Replace payPeriod state + add new state variables**

Change:
```typescript
const [payPeriod, setPayPeriod] = useState<'monthly' | 'weekly'>('monthly')
```
To:
```typescript
const [payPeriod, setPayPeriod] = useState<'week' | 'month'>('week')
const [weekIncome, setWeekIncome] = useState(0)
const [weekExpenses, setWeekExpenses] = useState(0)
const [weekStreak, setWeekStreak] = useState(0)
const [currentWeekSummary, setCurrentWeekSummary] = useState<WeeklySummary | null>(null)
```

Remove the `winStreak` state line entirely:
```typescript
// DELETE THIS LINE:
const [winStreak, setWinStreak] = useState(0)
```

- [ ] **Step 4: Update the parallel data fetch in loadDashboard**

In the `Promise.all` block (around line 218), add two more queries and replace the wins query:

Replace:
```typescript
const [
  { data: profileData },
  { data: txns },
  { data: pulseData },
  { data: monthPulse },
  { data: winsData },
  { data: existingBucket },
] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', user.id).single(),
  supabase.from('transactions').select('amount, type, category_key, notes, date, external_id').eq('user_id', user.id).eq('is_personal', false).gte('date', currentMonth).order('date', { ascending: false }),
  supabase.from('daily_pulse').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
  supabase.from('daily_pulse').select('date').eq('user_id', user.id).gte('date', currentMonth).lte('date', today),
  supabase.from('buckets').select('month').eq('user_id', user.id).gt('pay_funded', 0).order('month', { ascending: false }),
  supabase.from('buckets').select('*').eq('user_id', user.id).eq('month', currentMonth).maybeSingle(),
])
```

With:
```typescript
const [
  { data: profileData },
  { data: txns },
  { data: weekTxns },
  { data: pulseData },
  { data: monthPulse },
  { data: existingBucket },
  { data: existingWeekSummary },
  { data: pastWeeks },
] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', user.id).single(),
  supabase.from('transactions').select('amount, type, category_key, notes, date, external_id').eq('user_id', user.id).eq('is_personal', false).gte('date', currentMonth).order('date', { ascending: false }),
  supabase.from('transactions').select('amount, type').eq('user_id', user.id).eq('is_personal', false).gte('date', WEEK_START_STR).lte('date', WEEK_END_STR),
  supabase.from('daily_pulse').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
  supabase.from('daily_pulse').select('date').eq('user_id', user.id).gte('date', currentMonth).lte('date', today),
  supabase.from('buckets').select('*').eq('user_id', user.id).eq('month', currentMonth).maybeSingle(),
  supabase.from('weekly_summaries').select('*').eq('user_id', user.id).eq('week_start', WEEK_START_STR).maybeSingle(),
  supabase.from('weekly_summaries').select('week_start, transferred').eq('user_id', user.id).lt('week_start', WEEK_START_STR).order('week_start', { ascending: false }).limit(12),
])
```

- [ ] **Step 5: Compute weekly income/expenses and set state**

After the existing income/expenses loop (after `setMonthIncome` / `setMonthExpenses`), add:

```typescript
let wIncome = 0
let wExpenses = 0
weekTxns?.forEach(tx => {
  if (tx.type === 'income') wIncome += Number(tx.amount)
  else wExpenses += Number(tx.amount)
})
setWeekIncome(wIncome)
setWeekExpenses(wExpenses)
```

- [ ] **Step 6: Compute streak from pastWeeks and remove old winStreak logic**

Delete the old streak block (the one computing `winStreak` from `winsData` using month-based consecutive logic).

Add in its place:

```typescript
// Compute weekly streak from past weekly_summaries
if (pastWeeks && pastWeeks.length > 0) {
  let streak = 0
  for (const row of pastWeeks) {
    if (row.transferred) streak++
    else break
  }
  setWeekStreak(streak)
}
```

- [ ] **Step 7: Auto-upsert weekly_summaries after profile/fracs are known**

After `const profitFrac / taxFrac / opsFrac` are computed (around line 315), add a background upsert:

```typescript
// Auto-archive current week — runs in background, does not block render
const wTax = wIncome * taxFrac
const wProfit = wIncome * profitFrac
const wPay = Math.max(0, wIncome * (1 - taxFrac - profitFrac) - wExpenses)
const wOps = wExpenses
if (!existingWeekSummary) {
  supabase.from('weekly_summaries').upsert({
    user_id: user.id,
    week_start: WEEK_START_STR,
    week_end: WEEK_END_STR,
    income: wIncome,
    expenses: wExpenses,
    tax_amount: wTax,
    profit_amount: wProfit,
    ops_amount: wOps,
    pay_amount: wPay,
    transferred: false,
  }, { onConflict: 'user_id,week_start' }).then(() => {})
} else {
  setCurrentWeekSummary(existingWeekSummary)
  // Update amounts (income may have changed since last load)
  supabase.from('weekly_summaries').update({
    income: wIncome,
    expenses: wExpenses,
    tax_amount: wTax,
    profit_amount: wProfit,
    ops_amount: wOps,
    pay_amount: wPay,
  }).eq('id', existingWeekSummary.id).then(() => {})
}
```

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/page.tsx lib/weekUtils.ts lib/supabase.ts
git commit -m "feat: add weekly data queries and auto-archive to dashboard"
```

---

## Task 5: Dashboard — header redesign

**Files:**
- Modify: `app/dashboard/page.tsx` (header section, ~lines 540-562)

- [ ] **Step 1: Replace the entire header block**

Replace:
```tsx
<header style={{
  padding: '20px 24px 16px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-background)',
  position: 'sticky', top: 0, zIndex: 30,
}}>
  <div style={{ maxWidth: 480, margin: '0 auto' }}>
    <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1, margin: 0 }}>
      My Dash
    </h1>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
      <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: 0 }}>
        {profile?.practice_name ?? 'My Practice'}
      </p>
      {winStreak >= 2 && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-muted)', borderRadius: 999, padding: '2px 10px' }}>
          🔥 {winStreak} months strong
        </span>
      )}
    </div>
  </div>
</header>
```

With:
```tsx
<header style={{
  padding: '16px 24px 14px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-background)',
  position: 'sticky', top: 0, zIndex: 30,
}}>
  <div style={{ maxWidth: 480, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1, margin: 0 }}>
        My Dash
      </h1>
      <div style={{ display: 'flex', background: 'var(--color-muted)', borderRadius: 999, padding: 3, gap: 2 }}>
        {(['week', 'month'] as const).map(p => (
          <button key={p} onClick={() => setPayPeriod(p)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: payPeriod === p ? 'var(--color-card)' : 'transparent',
              color: payPeriod === p ? 'var(--color-ink)' : 'var(--color-muted-foreground)',
              boxShadow: payPeriod === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'background 0.15s', fontFamily: 'var(--font-sans)',
            }}
          >
            {p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>
    </div>
    <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '4px 0 0' }}>
      {profile?.practice_name ?? 'My Practice'} &middot; {payPeriod === 'week' ? WEEK_RANGE_LABEL : MONTH_LABEL}
    </p>
  </div>
</header>
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: move period toggle to dashboard header, remove fire streak badge"
```

---

## Task 6: Dashboard — Take-Home card uses real weekly data

**Files:**
- Modify: `app/dashboard/page.tsx` (Take-Home card section)

- [ ] **Step 1: Remove the toggle from the Take-Home card**

Find the card section starting with `{/* My Take-Home Pay */}`. Remove the inner toggle div (the `{(['monthly', 'weekly'] as const).map(...)` block).

The card label row becomes:
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
  <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
    My Take-Home Pay
  </span>
</div>
```

- [ ] **Step 2: Update computed values for weekly/monthly**

Before the JSX block add (near the other derived values around line 495):

```typescript
const weekTakeHome = Math.max(0, weekIncome * (1 - taxFrac - profitFrac) - weekExpenses)
const displayIncome = payPeriod === 'week' ? weekIncome : monthIncome
const displayTakeHome = payPeriod === 'week' ? weekTakeHome : takeHome
const displayPayTarget = payPeriod === 'week' ? payTarget / 4.33 : payTarget
const displayPayProgress = displayPayTarget > 0 ? Math.min(100, (displayTakeHome / displayPayTarget) * 100) : 0
```

- [ ] **Step 3: Update the Take-Home amount display**

Replace:
```tsx
<p className="font-serif" style={{ fontSize: 36, fontWeight: 700, color: takeHome === 0 ? 'var(--color-muted-foreground)' : 'var(--color-pay)', margin: '4px 0 2px', lineHeight: 1 }}>
  ${(payPeriod === 'weekly' ? takeHome / 4.33 : takeHome).toFixed(2)}
</p>
<p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: '0 0 8px', lineHeight: 1.4 }}>
  After Taxes Set Aside, Business Expenses, and Growth Fund
</p>
{takeHome === 0 ? (
  <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 4px', fontStyle: 'italic' }}>
    Your expenses exceeded your income this month.
  </p>
) : payTarget > 0 ? (
  <>
    <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
      <div style={{ height: '100%', width: `${payProgress}%`, background: 'var(--color-pay)', borderRadius: 3, transition: 'width 1.2s ease' }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted-foreground)' }}>
      <span>${(payPeriod === 'weekly' ? takeHome / 4.33 : takeHome).toFixed(0)} this month</span>
      <span>Goal: <strong style={{ color: 'var(--color-ink)' }}>${(payPeriod === 'weekly' ? payTarget / 4.33 : payTarget).toFixed(0)}{payPeriod === 'monthly' ? '/mo' : '/wk'}</strong></span>
    </div>
  </>
) : null}
```

With:
```tsx
<p className="font-serif" style={{ fontSize: 36, fontWeight: 700, color: displayTakeHome === 0 ? 'var(--color-muted-foreground)' : 'var(--color-pay)', margin: '4px 0 2px', lineHeight: 1 }}>
  ${displayTakeHome.toFixed(2)}
</p>
<p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: '0 0 8px', lineHeight: 1.4 }}>
  After Taxes Set Aside, Business Expenses, and Growth Fund
</p>
{displayTakeHome === 0 ? (
  <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 4px', fontStyle: 'italic' }}>
    {payPeriod === 'week' ? 'Expenses exceeded income this week.' : 'Your expenses exceeded your income this month.'}
  </p>
) : displayPayTarget > 0 ? (
  <>
    <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
      <div style={{ height: '100%', width: `${displayPayProgress}%`, background: 'var(--color-pay)', borderRadius: 3, transition: 'width 1.2s ease' }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted-foreground)' }}>
      <span>${displayTakeHome.toFixed(0)} {payPeriod === 'week' ? 'this week' : 'this month'}</span>
      <span>Goal: <strong style={{ color: 'var(--color-ink)' }}>${displayPayTarget.toFixed(0)}{payPeriod === 'month' ? '/mo' : '/wk'}</strong></span>
    </div>
  </>
) : null}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: Take-Home card uses real weekly data from transaction queries"
```

---

## Task 7: Dashboard — bucket tiles respond to toggle

**Files:**
- Modify: `app/dashboard/page.tsx` (Tax, Business Expenses, Growth Fund tiles)

- [ ] **Step 1: Add week-aware display values before JSX**

Near the other derived values (after `const opsFrac` etc.), add:

```typescript
const weekTaxAmount = weekIncome * taxFrac
const weekProfitAmount = weekIncome * profitFrac
const weekOpsActual = weekExpenses
const weekOpsTarget = weekIncome * opsFrac
const weekOverBudget = weekOpsTarget > 0 && weekOpsActual > weekOpsTarget
const weekOverAmount = Math.max(0, weekOpsActual - weekOpsTarget)

const displayTaxAmount = payPeriod === 'week' ? weekTaxAmount : taxFunded
const displayTaxTarget = payPeriod === 'week' ? weekTaxAmount : taxTarget
const displayProfitAmount = payPeriod === 'week' ? weekProfitAmount : profitFunded
const displayProfitTarget = payPeriod === 'week' ? weekProfitAmount : profitTarget
const displayOpsActual = payPeriod === 'week' ? weekOpsActual : opsActual
const displayOpsTarget = payPeriod === 'week' ? weekOpsTarget : opsTarget
const displayOverBudget = payPeriod === 'week' ? weekOverBudget : overBudget
const displayOverAmount = payPeriod === 'week' ? weekOverAmount : overAmount
```

- [ ] **Step 2: Update Tax Set-Aside tile**

Replace the amount display:
```tsx
<p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-tax)', margin: '0 0 8px', lineHeight: 1 }}>
  ${taxFunded.toFixed(2)}
</p>
<div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
  <div style={{ height: '100%', width: `${taxTarget > 0 ? Math.min(100, (taxFunded / taxTarget) * 100) : 0}%`, background: 'var(--color-tax)', borderRadius: 99, transition: 'width 1.2s ease' }} />
</div>
```
With:
```tsx
<p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-tax)', margin: '0 0 8px', lineHeight: 1 }}>
  ${displayTaxAmount.toFixed(2)}
</p>
<div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
  <div style={{ height: '100%', width: `${displayTaxTarget > 0 ? Math.min(100, (displayTaxAmount / displayTaxTarget) * 100) : 0}%`, background: 'var(--color-tax)', borderRadius: 99, transition: 'width 1.2s ease' }} />
</div>
```

- [ ] **Step 3: Update Business Expenses tile**

Replace the amount, progress bar, and over-budget alert:
```tsx
<p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: overBudget ? 'var(--color-danger)' : 'var(--color-ops)', margin: '0 0 8px', lineHeight: 1 }}>
  ${opsActual.toFixed(2)}
</p>
<div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
  <div style={{ height: '100%', width: `${opsTarget > 0 ? Math.min(100, (opsActual / opsTarget) * 100) : 0}%`, background: opsActual >= opsTarget ? 'var(--color-danger)' : opsActual >= opsTarget * 0.85 ? '#C4A882' : 'var(--color-ops)', borderRadius: 99, transition: 'width 1.2s ease' }} />
</div>
{overBudget && (
  <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: '0 0 6px', lineHeight: 1.5 }}>
    Over budget by $${overAmount.toFixed(2)}, which is coming directly out of your take-home.
  </p>
)}
```
With:
```tsx
<p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: displayOverBudget ? 'var(--color-danger)' : 'var(--color-ops)', margin: '0 0 8px', lineHeight: 1 }}>
  ${displayOpsActual.toFixed(2)}
</p>
<div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
  <div style={{ height: '100%', width: `${displayOpsTarget > 0 ? Math.min(100, (displayOpsActual / displayOpsTarget) * 100) : 0}%`, background: displayOpsActual >= displayOpsTarget ? 'var(--color-danger)' : displayOpsActual >= displayOpsTarget * 0.85 ? '#C4A882' : 'var(--color-ops)', borderRadius: 99, transition: 'width 1.2s ease' }} />
</div>
{displayOverBudget && (
  <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: '0 0 6px', lineHeight: 1.5 }}>
    Over budget by ${displayOverAmount.toFixed(2)}, which is coming directly out of your take-home.
  </p>
)}
```

- [ ] **Step 4: Update Growth Fund tile**

Replace:
```tsx
<p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-profit)', margin: '0 0 8px', lineHeight: 1 }}>
  ${profitFunded.toFixed(2)}
</p>
<div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
  <div style={{ height: '100%', width: `${profitTarget > 0 ? Math.min(100, (profitFunded / profitTarget) * 100) : 0}%`, background: 'var(--color-profit)', borderRadius: 99, transition: 'width 1.2s ease' }} />
</div>
```
With:
```tsx
<p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-profit)', margin: '0 0 8px', lineHeight: 1 }}>
  ${displayProfitAmount.toFixed(2)}
</p>
<div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
  <div style={{ height: '100%', width: `${displayProfitTarget > 0 ? Math.min(100, (displayProfitAmount / displayProfitTarget) * 100) : 0}%`, background: 'var(--color-profit)', borderRadius: 99, transition: 'width 1.2s ease' }} />
</div>
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: all bucket tiles respond to weekly/monthly toggle"
```

---

## Task 8: Dashboard — Transfer button, modal, streak tracker

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Update the Make a Transfer button section**

Replace the button + sublabel block:
```tsx
<button
  onClick={() => setShowPayModal(true)}
  ...
>
  Make a Transfer
</button>
<p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 32, lineHeight: 1.5 }}>
  Every <strong style={{ color: 'var(--color-ink)' }}>{profile?.transfer_day ?? 'Monday'}</strong>, open your bank app and move each amount to its own account. Tap when you are done.
</p>
```

With:
```tsx
<button
  onClick={() => setShowPayModal(true)}
  style={{
    width: '100%', minHeight: 52,
    background: 'var(--color-primary)',
    color: 'var(--color-primary-foreground)',
    border: 'none', borderRadius: 12,
    fontSize: 18, fontWeight: 700,
    cursor: 'pointer', marginBottom: 4,
    fontFamily: 'var(--font-serif)',
  }}
>
  Make a Transfer
</button>
<p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 8px', lineHeight: 1.5 }}>
  Tap to track your transfer streak.
</p>
{weekStreak >= 2 && (
  <p className="font-serif" style={{ textAlign: 'center', fontSize: 14, fontStyle: 'italic', color: 'var(--color-muted-foreground)', margin: '0 0 24px' }}>
    {weekStreak} weeks of consistently paying yourself.
  </p>
)}
{weekStreak < 2 && <div style={{ marginBottom: 24 }} />}
```

- [ ] **Step 2: Replace the transfer modal content**

Replace the modal inner content (everything inside the modal's inner div, after `onClick={e => e.stopPropagation()}`):

```tsx
<h3 id="pay-modal-title" className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4, marginTop: 0 }}>
  This week's transfers
</h3>
<p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 20, lineHeight: 1.5 }}>
  {WEEK_RANGE_LABEL} — these amounts will reset when you tap "I did it."
</p>
<div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
  {[
    { label: 'Pay Myself',          amount: weekTakeHome,      color: 'var(--color-pay)' },
    { label: t('Tax Bucket'),       amount: weekTaxAmount,     color: 'var(--color-tax)' },
    { label: t('Profit Bucket'),    amount: weekProfitAmount,  color: 'var(--color-profit)' },
    { label: t('Operations Bucket'), amount: weekOpsActual,   color: 'var(--color-ops)' },
  ].map(({ label, amount, color }) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 15, color: 'var(--color-foreground)' }}>{label}</span>
      <span className="font-serif" style={{ fontSize: 20, fontWeight: 700, color }}>
        {amount === 0 ? <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>$0.00</span> : `$${amount.toFixed(2)}`}
      </span>
    </div>
  ))}
</div>
{weekTakeHome === 0 && (
  <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 16, lineHeight: 1.5, fontStyle: 'italic' }}>
    Expenses exceeded income this week. Nothing to pay yourself.
  </p>
)}
<p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 20, lineHeight: 1.5 }}>
  We have already saved these numbers. You can find them in Reports.
</p>
<button onClick={handleSecurePay} disabled={securing}
  style={{ width: '100%', minHeight: 52, background: securing ? 'var(--color-muted)' : 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: securing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}
>
  {securing ? 'Saving...' : 'I did it'}
</button>
<button onClick={() => setShowPayModal(false)} disabled={securing}
  style={{ width: '100%', minHeight: 44, background: 'none', border: 'none', color: 'var(--color-muted-foreground)', fontSize: 14, cursor: 'pointer', marginTop: 8, fontFamily: 'var(--font-sans)' }}
>
  Not yet
</button>
```

- [ ] **Step 3: Update handleSecurePay to write weekly_summaries**

Replace the existing `handleSecurePay` function:

```typescript
async function handleSecurePay() {
  if (!profile || !bucket) return
  setSecuring(true)

  const profitTarget = monthIncome * profitFrac
  const taxTarget = monthIncome * taxFrac

  // Update monthly buckets
  const { error: bucketError } = await supabase
    .from('buckets')
    .update({
      profit_funded: profitTarget,
      profit_target: profitTarget,
      tax_funded: taxTarget,
      tax_target: taxTarget,
      ops_funded: opsActual,
      ops_target: opsTarget,
      pay_funded: takeHome,
    })
    .eq('id', bucket.id)

  if (bucketError) {
    toast.error('Could not save. Try again.')
    setSecuring(false)
    return
  }

  // Mark this week as transferred in weekly_summaries
  await supabase.from('weekly_summaries').upsert({
    user_id: profile.id,
    week_start: WEEK_START_STR,
    week_end: WEEK_END_STR,
    income: weekIncome,
    expenses: weekExpenses,
    tax_amount: weekTaxAmount,
    profit_amount: weekProfitAmount,
    ops_amount: weekOpsActual,
    pay_amount: weekTakeHome,
    transferred: true,
    transferred_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_start' })

  setBucket(prev => prev ? {
    ...prev,
    profit_funded: profitTarget,
    profit_target: profitTarget,
    tax_funded: taxTarget,
    tax_target: taxTarget,
    ops_funded: opsActual,
    ops_target: opsTarget,
    pay_funded: takeHome,
  } : prev)
  setWeekStreak(s => s + 1)
  setShowPayModal(false)
  setConfettiTrigger(n => n + 1)
  setCelebrationNote('')
  setShowCelebration(true)
  setSecuring(false)
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: transfer modal shows weekly amounts, writes weekly_summaries on I did it"
```

---

## Task 9: Reports — Weekly Transfer History

**Files:**
- Modify: `app/reports/page.tsx`

- [ ] **Step 1: Add WeeklySummary import**

At the top of `app/reports/page.tsx`, add:
```typescript
import type { WeeklySummary } from '@/lib/supabase'
import { formatWeekRange } from '@/lib/weekUtils'
```

- [ ] **Step 2: Add state**

In the `ReportsPage` component, add alongside other state:
```typescript
const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([])
```

- [ ] **Step 3: Add weekly_summaries fetch to the load effect**

Inside the `Promise.all` in the load effect, add:
```typescript
supabase.from('weekly_summaries').select('*').eq('user_id', user.id).order('week_start', { ascending: false }).limit(52),
```

Destructure it as `{ data: weeklyData }` and after the existing state setters add:
```typescript
setWeeklySummaries(weeklyData ?? [])
```

- [ ] **Step 4: Add download helper**

Add this function inside the component (before the return):
```typescript
function downloadWeeklyCSV() {
  const header = 'Week Start,Week End,Income,Tax,Expenses,Growth,Pay Myself,Transferred,Transferred At\n'
  const rows = weeklySummaries.map(w =>
    [
      w.week_start, w.week_end,
      w.income.toFixed(2), w.tax_amount.toFixed(2),
      w.expenses.toFixed(2), w.profit_amount.toFixed(2),
      w.pay_amount.toFixed(2),
      w.transferred ? 'Yes' : 'No',
      w.transferred_at ? w.transferred_at.slice(0, 10) : '',
    ].join(',')
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bookwise-weekly-transfers-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 5: Add the Weekly Transfer History section to the JSX**

Add this section after the existing Win Record section (before the closing `</main>` tag):

```tsx
{/* Weekly Transfer History */}
{weeklySummaries.length > 0 && (
  <section style={{ ...cardStyle, padding: '24px', marginTop: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <p style={{ ...sectionLabel, marginBottom: 0 }}>Weekly Transfer History</p>
      <button
        onClick={downloadWeeklyCSV}
        style={{
          padding: '6px 14px', borderRadius: 8, border: '1.5px solid var(--color-border)',
          background: 'var(--color-card)', color: 'var(--color-primary)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}
      >
        Download
      </button>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {weeklySummaries.map(w => (
        <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-foreground)', margin: '0 0 2px' }}>
              {formatWeekRange(new Date(w.week_start + 'T12:00:00'))}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0 }}>
              Income ${w.income.toFixed(2)} &middot; Pay Myself ${w.pay_amount.toFixed(2)}
            </p>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px',
            background: w.transferred ? 'var(--color-muted)' : 'transparent',
            color: w.transferred ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            border: w.transferred ? 'none' : '1px solid var(--color-border)',
          }}>
            {w.transferred ? 'Transferred' : 'Saved'}
          </span>
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 6: Commit**

```bash
git add app/reports/page.tsx lib/weekUtils.ts
git commit -m "feat: Weekly Transfer History section in Reports with CSV download"
```

---

## Task 10: Demo seed update

**Files:**
- Modify: `lib/demo-seed.sql`

- [ ] **Step 1: Add weekly_summaries to the seed**

At the end of the `DO $$` block (before `RAISE NOTICE`), add:

```sql
-- ── Weekly Summaries ───────────────────────────────────────────────────────
DELETE FROM weekly_summaries WHERE user_id = demo_id;

INSERT INTO weekly_summaries (user_id, week_start, week_end, income, expenses, tax_amount, profit_amount, ops_amount, pay_amount, transferred, transferred_at) VALUES
  (demo_id, cur_month - 21, cur_month - 15, 285.00, 80.00, 71.25, 28.50, 80.00, 105.25, true,  (cur_month - 15)::timestamptz + interval '18 hours'),
  (demo_id, cur_month - 14, cur_month -  8, 440.00, 35.00, 110.00, 44.00, 35.00, 251.00, true,  (cur_month - 8)::timestamptz + interval '17 hours'),
  (demo_id, cur_month -  7, cur_month -  1, 165.00, 45.00, 41.25, 16.50, 45.00, 62.25, true,  (cur_month - 1)::timestamptz + interval '16 hours'),
  (demo_id, cur_month,      cur_month +  6, 285.00, 835.00, 71.25, 28.50, 835.00, 0.00, false, NULL);
```

- [ ] **Step 2: Re-run the seed against Supabase**

Execute the full `lib/demo-seed.sql` against the production database via Supabase MCP or SQL editor. Verify by running:
```sql
select week_start, transferred, pay_amount from weekly_summaries where user_id = (select id from auth.users where email = 'demo@bookwise.app') order by week_start;
```
Expected: 4 rows, 3 with `transferred = true`, 1 with `transferred = false`.

- [ ] **Step 3: Commit**

```bash
git add lib/demo-seed.sql
git commit -m "feat: add weekly_summaries demo data (3 transferred, 1 saved)"
```

---

## Task 11: TypeScript check + push

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.next/"
```
Expected: no output (clean).

- [ ] **Step 2: Push to production**

```bash
git push
```

- [ ] **Step 3: Verify on production**

Navigate to https://bookwise-coral.vercel.app/dashboard and confirm:
- Sticky header shows "This Week" / "This Month" toggle (This Week selected by default)
- Practice name + date range on second line
- No fire emoji anywhere
- All bucket tiles show weekly amounts when "This Week" is active
- Make a Transfer modal shows "This week's transfers" header + week date range
- Reports page shows Weekly Transfer History section

---

## Self-Review

**Spec coverage check:**
- Header redesign (toggle in header, week-first, date range, no fire) — Tasks 4+5 ✓
- Real weekly Mon-Sun queries — Task 4 ✓
- All cards respond to toggle — Tasks 6+7 ✓
- weekly_summaries table + auto-upsert — Tasks 1+4 ✓
- Transfer modal shows weekly amounts — Task 8 ✓
- "I did it" writes weekly_summaries — Task 8 ✓
- Consistency streak tracker (≥2 weeks, "X weeks of consistently paying yourself.") — Task 8 ✓
- Weekly Transfer History in Reports + CSV — Task 9 ✓
- Demo seed update — Task 10 ✓

**Type consistency:**
- `payPeriod: 'week' | 'month'` used consistently throughout
- `weekTakeHome`, `weekTaxAmount`, `weekProfitAmount`, `weekOpsActual` defined before use in modal
- `WeeklySummary` imported from `lib/supabase.ts` in both dashboard and reports
- `formatWeekRange` imported from `lib/weekUtils.ts` in both dashboard and reports
