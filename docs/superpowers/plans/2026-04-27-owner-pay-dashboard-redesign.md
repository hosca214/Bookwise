# Owner's Pay, Dashboard Redesign, and Wins Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Owner's Pay goal tracking, rename and rebuild the Transfer Done flow with a celebration modal and Wins log, add explainer tiles for all buckets, redesign the tax tile, add month-over-month reporting, and fix the time input backspace bug in onboarding.

**Architecture:** Schema-first — migrate Supabase, update TypeScript types, then layer UI changes bottom-up: CSS vars → onboarding → dashboard → reports → settings. Dashboard page absorbs most new components inline, matching existing patterns.

**Tech Stack:** Next.js 15 App Router, Supabase (MCP migration), Tailwind CSS v4 with CSS custom properties, Framer Motion (onboarding), inline SVG (trend chart).

**Spec:** `docs/superpowers/specs/2026-04-27-owner-pay-dashboard-redesign.md`

---

## File Map

| File | Change |
|------|--------|
| `lib/supabase.ts` | Add `pay_target`, `transfer_day` to `Profile`; add `pay_funded`, `celebration_note` to `Bucket` |
| `styles/globals.css` | Add `--color-pay` to both vibe blocks |
| `app/onboarding/page.tsx` | Add steps 7 (pay target) + 8 (transfer day), fix time input backspace, update `handleComplete`, `TOTAL_STEPS` → 10 |
| `app/dashboard/page.tsx` | Add Owner's Pay card, update reservoirs ($ below circles), rename button, replace modal with celebration modal, add explainer tiles, redesign tax tile |
| `app/reports/page.tsx` | Add month-over-month trend chart, comparison card, Wins log |
| `app/settings/page.tsx` | Add pay goal and transfer day fields |

---

## Task 1: Schema Migration

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Apply migration via Supabase MCP**

Run this SQL against the project (use `mcp__claude_ai_Supabase__apply_migration` or `mcp__claude_ai_Supabase__execute_sql`):

```sql
alter table profiles add column if not exists pay_target numeric default 0;
alter table profiles add column if not exists transfer_day text default 'Monday';
alter table buckets add column if not exists pay_funded numeric default 0;
alter table buckets add column if not exists celebration_note text;
```

- [ ] **Step 2: Update TypeScript types in `lib/supabase.ts`**

Replace the `Profile` type:

```typescript
export type Profile = {
  id: string
  practice_name: string | null
  industry: 'coach' | 'trainer' | 'bodyworker' | null
  vibe: string
  daily_pulse_time: string
  google_drive_folder_id: string | null
  tax_rate: number
  onboarding_complete: boolean
  created_at: string
  profit_pct: number | null
  tax_pct: number | null
  pay_target: number
  transfer_day: string
}
```

Replace the `Bucket` type:

```typescript
export type Bucket = {
  id: string
  user_id: string
  month: string
  profit_target: number
  profit_funded: number
  tax_target: number
  tax_funded: number
  ops_target: number
  ops_funded: number
  pay_funded: number
  celebration_note: string | null
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add pay_target, transfer_day, pay_funded, celebration_note to schema and types"
```

---

## Task 2: CSS Variable

**Files:**
- Modify: `styles/globals.css`

- [ ] **Step 1: Add `--color-pay` to both vibe blocks**

In the `[data-vibe="sage"], :root` block, after `--color-ops: #4E6E52;`:
```css
--color-pay: #9B7DB5;
```

In the `[data-vibe="midnight"]` block, after the existing `--color-ops` line:
```css
--color-pay: #B09FCC;
```

(Midnight uses the same purple already used for `--color-primary`, which fits the palette.)

- [ ] **Step 2: Commit**

```bash
git add styles/globals.css
git commit -m "feat: add --color-pay CSS variable to both vibes"
```

---

## Task 3: Onboarding — Pay Target Step

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Add `payTarget` and `hourRaw`/`minuteRaw` state**

After `const [minute, setMinute] = useState(0)` (line ~68), add:

```typescript
const [payTarget, setPayTarget] = useState('')
const [hourRaw, setHourRaw] = useState('')
const [minuteRaw, setMinuteRaw] = useState('')
```

- [ ] **Step 2: Add `payTargetDisplay` computed value**

After the `displayH` line:
```typescript
const payTargetNum = parseFloat(payTarget.replace(/[^0-9.]/g, '')) || 0
```

- [ ] **Step 3: Update `TOTAL_STEPS` to 10**

```typescript
const TOTAL_STEPS = 10
```

- [ ] **Step 4: Renumber existing steps 7 and 8 to 9 and 10**

In `renderStep()`, change `case 7:` to `case 9:` and `case 8:` to `case 10:`.

- [ ] **Step 5: Insert new case 7 — Pay Target**

After `case 6:` (integrations) closing brace, insert:

```typescript
// ── Step 7: Pay Target ────────────────────────────────────────────────
case 7:
  return (
    <div>
      <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
        What do you want to take home each month?
      </h2>
      <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginBottom: 40, lineHeight: 1.5 }}>
        Set a monthly pay target. You can adjust this anytime in Settings.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        <span className="font-serif" style={{ fontSize: 40, fontWeight: 700, color: 'var(--color-muted-foreground)' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={payTarget}
          placeholder="0"
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setPayTarget(raw)
          }}
          style={{
            width: 160, minHeight: 72, fontSize: 40, fontWeight: 700,
            textAlign: 'center', borderRadius: 10,
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-card)', color: 'var(--color-ink)',
            outline: 'none', fontFamily: 'var(--font-serif)', padding: 0,
          }}
        />
      </div>
      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 48 }}>
        per month
      </p>

      <button onClick={next} style={primaryBtn}>
        {payTarget && payTargetNum > 0 ? 'Continue' : 'Skip for now'}
      </button>
    </div>
  )
```

- [ ] **Step 6: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: add pay target step to onboarding (step 7 of 10)"
```

---

## Task 4: Onboarding — Transfer Day Step

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Add `transferDay` state**

After `const [payTarget, setPayTarget] = useState('')`, add:
```typescript
const [transferDay, setTransferDay] = useState('Monday')
```

- [ ] **Step 2: Insert new case 8 — Transfer Day**

After the closing brace of `case 7:`, insert:

```typescript
// ── Step 8: Transfer Day ──────────────────────────────────────────────
case 8: {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return (
    <div>
      <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
        Pick your transfer day.
      </h2>
      <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginBottom: 40, lineHeight: 1.5 }}>
        Choose one day a week to move your funds and record it in Bookwise. Making it a habit is what makes it stick.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 48 }}>
        {days.map(day => (
          <button
            key={day}
            onClick={() => setTransferDay(day)}
            style={{
              minHeight: 52, borderRadius: 10, fontSize: 16, fontWeight: 600,
              border: `1.5px solid ${transferDay === day ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: transferDay === day ? 'var(--color-primary)' : 'var(--color-card)',
              color: transferDay === day ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
          >
            {day}
          </button>
        ))}
      </div>

      <button onClick={next} style={primaryBtn}>Continue</button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: add transfer day picker step to onboarding (step 8 of 10)"
```

---

## Task 5: Onboarding — Time Input Bug Fix + handleComplete Update

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Initialize `hourRaw` and `minuteRaw` from display values**

Update the declarations added in Task 3:
```typescript
const [hourRaw, setHourRaw] = useState(String(displayH))
const [minuteRaw, setMinuteRaw] = useState('00')
```

Note: these must be declared AFTER `displayH` is computed. Move them after the `const displayH` line.

- [ ] **Step 2: Replace the hour input in case 9 (was case 7)**

Find the hour `<input>` in the pulse time step (case 9). Replace it:

```tsx
<input
  type="text"
  inputMode="numeric"
  maxLength={2}
  value={hourRaw}
  onChange={e => setHourRaw(e.target.value.replace(/\D/g, ''))}
  onBlur={() => {
    const n = parseInt(hourRaw)
    if (!isNaN(n) && n >= 1 && n <= 12) {
      setHour(ampm === 'PM' ? (n === 12 ? 12 : n + 12) : (n === 12 ? 0 : n))
      setHourRaw(String(n))
    } else {
      setHourRaw(String(displayH))
    }
  }}
  style={timeInputBase}
/>
```

- [ ] **Step 3: Replace the minute input in case 9**

Find the minute `<input>` and replace its `value`, `onChange`, and add `onBlur`:

```tsx
<input
  type="text"
  inputMode="numeric"
  maxLength={2}
  value={minuteRaw}
  onChange={e => setMinuteRaw(e.target.value.replace(/\D/g, ''))}
  onBlur={() => {
    const n = parseInt(minuteRaw)
    if (!isNaN(n) && n >= 0 && n <= 59) {
      setMinute(n)
      setMinuteRaw(n === 0 ? '00' : String(n).padStart(2, '0'))
    } else {
      setMinuteRaw(minute === 0 ? '00' : String(minute).padStart(2, '0'))
    }
  }}
  style={timeInputBase}
/>
```

- [ ] **Step 4: Sync `hourRaw` when `ampm` button is tapped**

In `handleAmPm`, after the `setHour` calls, add:
```typescript
setTimeout(() => setHourRaw(String(
  hour >= 12 ? (hour === 12 ? 12 : hour - 12) : (hour === 0 ? 12 : hour)
)), 0)
```

Actually, simpler: just reset from `displayH` on each render. Add a `useEffect`:
```typescript
useEffect(() => { setHourRaw(String(displayH)) }, [displayH])
```

- [ ] **Step 5: Update `handleComplete` to save new fields**

In the `supabase.from('profiles').upsert({...})` call, add:
```typescript
pay_target: payTargetNum,
transfer_day: transferDay,
```

- [ ] **Step 6: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "fix: time input backspace bug; save pay_target and transfer_day in onboarding"
```

---

## Task 6: Dashboard — Owner's Pay Card

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add `payPeriod` state and derived pay values**

After `const [securing, setSecuring] = useState(false)`, add:
```typescript
const [payPeriod, setPayPeriod] = useState<'monthly' | 'weekly'>('monthly')
const [showOwnerPayInfo, setShowOwnerPayInfo] = useState(false)
```

Add computed values after the existing `profitFrac`/`taxFrac`/`opsFrac` block:
```typescript
const profitFrac = (profile?.profit_pct ?? 10) / 100
const taxFrac = (profile?.tax_pct ?? 25) / 100
const opsFrac = 1 - profitFrac - taxFrac

const payTarget = profile?.pay_target ?? 0
const payTargetDisplay = payPeriod === 'weekly' ? payTarget / 4.33 : payTarget
const payActual = Math.min(monthIncome, payTarget)
const payActualDisplay = payPeriod === 'weekly' ? payActual / 4.33 : payActual
const payProgress = payTarget > 0 ? Math.min(100, (payActual / payTarget) * 100) : 0
```

Note: these computed values depend on `profile` and `monthIncome` from state — place them inside the render (not in useEffect), derived from state values.

- [ ] **Step 2: Add Owner's Pay card JSX above the reservoirs section**

Insert before `{/* Reservoirs */}`:

```tsx
{/* Owner's Pay */}
<section style={{ ...cardStyle, marginBottom: 16 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
      {t('Take-Home')}
    </span>
    <div style={{ display: 'flex', background: 'var(--color-muted)', borderRadius: 999, padding: 2, gap: 2 }}>
      {(['monthly', 'weekly'] as const).map(p => (
        <button
          key={p}
          onClick={() => setPayPeriod(p)}
          style={{
            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: payPeriod === p ? 'var(--color-card)' : 'transparent',
            color: payPeriod === p ? 'var(--color-ink)' : 'var(--color-muted-foreground)',
            boxShadow: payPeriod === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'background 0.15s',
          }}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  </div>

  {payTarget > 0 ? (
    <>
      <p className="font-serif" style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-pay)', margin: '4px 0 10px', lineHeight: 1 }}>
        ${payActualDisplay.toFixed(2)}
      </p>
      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${payProgress}%`, background: 'var(--color-pay)', borderRadius: 3, transition: 'width 1.2s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted-foreground)' }}>
        <span>${payActualDisplay.toFixed(0)} so far</span>
        <span>Goal: <strong style={{ color: 'var(--color-ink)' }}>${payTargetDisplay.toFixed(0)}{payPeriod === 'monthly' ? '/mo' : '/wk'}</strong></span>
      </div>
    </>
  ) : (
    <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: '8px 0 0' }}>
      Set a monthly pay goal to track your take-home.{' '}
      <a href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Go to Settings</a>
    </p>
  )}

  <button
    onClick={() => setShowOwnerPayInfo(v => !v)}
    style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', padding: '8px 0 0', textDecoration: 'underline' }}
  >
    {showOwnerPayInfo ? 'Hide' : 'What is Owner\'s Pay?'}
  </button>
  {showOwnerPayInfo && (
    <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginTop: 6, lineHeight: 1.6 }}>
      This is your monthly take-home target — the amount you want to move from your business account to your personal account.
      As income comes in, this card shows how close you are. Adjust your goal anytime in Settings.
    </p>
  )}
</section>
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add Owner's Pay card to dashboard with monthly/weekly toggle and progress bar"
```

---

## Task 7: Dashboard — Reservoir Dollar Amounts Below Circles

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Compute dollar amounts for each bucket**

After the bucket state is loaded, add derived values (these are already available via `bucket` state):
```typescript
const profitTarget = (bucket?.profit_target ?? 0)
const profitFunded = (bucket?.profit_funded ?? 0)
const taxTarget = (bucket?.tax_target ?? 0)
const taxFunded = (bucket?.tax_funded ?? 0)
const opsTarget = (bucket?.ops_target ?? 0)
const opsFunded = (bucket?.ops_funded ?? 0)
```

These already exist in the dashboard — confirm they are in scope. If derived inside `loadDashboard`, expose via state or keep as derived from `bucket` state inline.

- [ ] **Step 2: Wrap each Reservoir in a column with name and dollar amounts below**

Replace the three `<Reservoir>` components and their wrapping `<div>`:

```tsx
<div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
  {[
    { key: 'profit', label: t('Profit Bucket'), current: profitFunded, goal: Math.max(1, profitTarget), tone: 'profit' as const },
    { key: 'tax',    label: t('Tax Bucket'),    current: taxFunded,    goal: Math.max(1, taxTarget),    tone: 'tax' as const },
    { key: 'ops',    label: t('Operations Bucket'), current: opsFunded, goal: Math.max(1, opsTarget),  tone: 'ops' as const },
  ].map(({ key, label, current, goal, tone }) => (
    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <Reservoir label="" current={current} goal={goal} tone={tone} />
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted-foreground)', textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)', textAlign: 'center' }}>
        <strong style={{ color: 'var(--color-ink)' }}>${current.toFixed(0)}</strong> / ${goal.toFixed(0)}
      </span>
    </div>
  ))}
</div>
```

Note: pass `label=""` to Reservoir since the label is now rendered below, not inside the circle. Check the Reservoir component (`components/dashboard/Reservoir.tsx`) to confirm `label` is rendered inside; if it renders inside the circle, either suppress it or remove the label prop.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: show dollar amounts below reservoir circles"
```

---

## Task 8: Dashboard — Transfer Done Button and Celebration Modal

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add celebration modal state**

Add after existing state declarations:
```typescript
const [showCelebration, setShowCelebration] = useState(false)
const [celebrationNote, setCelebrationNote] = useState('')
const [savingCelebration, setSavingCelebration] = useState(false)
const CELEBRATION_CHIPS = ['A long bath', 'A nice meal out', 'A morning off', 'A new book']
```

- [ ] **Step 2: Update `handleSecurePay` to open celebration modal instead of toasting**

Replace the end of `handleSecurePay` (after `setBucket(...)`) with:
```typescript
setShowPayModal(false)
setConfettiTrigger(n => n + 1)
setShowCelebration(true)
setSecuring(false)
```

Remove the `toast.success(...)` line from `handleSecurePay`.

- [ ] **Step 3: Add `handleSaveCelebration` function**

```typescript
async function handleSaveCelebration(skip = false) {
  if (!bucket) { setShowCelebration(false); return }
  setSavingCelebration(true)
  await supabase
    .from('buckets')
    .update({ celebration_note: skip ? null : celebrationNote })
    .eq('id', bucket.id)
  setBucket(prev => prev ? { ...prev, celebration_note: skip ? null : celebrationNote } : prev)
  setSavingCelebration(false)
  setShowCelebration(false)
  toast.success('Done. You paid yourself this month. That is worth celebrating.')
}
```

- [ ] **Step 4: Rename the button and update the note below it**

Find `Secure My Pay` in the JSX and replace with `Transfer Done`.

Replace the `<p>` note below the button:
```tsx
<p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 32, lineHeight: 1.5 }}>
  Move your funds to your dedicated accounts first, then tap here to record it.
  Come back every <strong style={{ color: 'var(--color-ink)' }}>{profile?.transfer_day ?? 'Monday'}</strong> to keep your numbers clean.
</p>
```

- [ ] **Step 5: Replace the existing modal with the celebration modal**

Remove the entire `{showPayModal && (...)}` block. Replace with two modals:

**Confirmation modal** (existing pattern, now just confirms intent before opening celebration):
```tsx
{showPayModal && (
  <div role="dialog" aria-modal="true" aria-labelledby="pay-modal-title"
    style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    onClick={() => { if (!securing) setShowPayModal(false) }}
  >
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
      onClick={e => e.stopPropagation()}
    >
      <h3 id="pay-modal-title" className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8, marginTop: 0 }}>
        Move these funds
      </h3>
      <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 24, lineHeight: 1.5 }}>
        Transfer these amounts to your separate accounts, then confirm below.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {[
          { label: t('Take-Home'),           amount: payTarget,             color: 'var(--color-pay)' },
          { label: t('Tax Bucket'),           amount: monthIncome * taxFrac,  color: 'var(--color-tax)' },
          { label: t('Profit Bucket'),        amount: monthIncome * profitFrac, color: 'var(--color-profit)' },
          { label: t('Operations Bucket'),    amount: monthIncome * opsFrac,  color: 'var(--color-ops)' },
        ].map(({ label, amount, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 15, color: 'var(--color-foreground)' }}>{label}</span>
            <span className="font-serif" style={{ fontSize: 20, fontWeight: 700, color }}>${amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <button onClick={handleSecurePay} disabled={securing}
        style={{ width: '100%', minHeight: 52, background: securing ? 'var(--color-muted)' : 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: securing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}
      >
        {securing ? 'Saving...' : 'Transfer Done'}
      </button>
      <button onClick={() => setShowPayModal(false)} disabled={securing}
        style={{ width: '100%', minHeight: 44, background: 'none', border: 'none', color: 'var(--color-muted-foreground)', fontSize: 14, cursor: 'pointer', marginTop: 8, fontFamily: 'var(--font-sans)' }}
      >
        Not yet
      </button>
    </div>
  </div>
)}
```

**Celebration modal:**
```tsx
{showCelebration && (
  <div role="dialog" aria-modal="true" aria-labelledby="celebration-title"
    style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
  >
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
      <p style={{ fontSize: 32, textAlign: 'center', margin: '0 0 8px' }}>🎉</p>
      <h3 id="celebration-title" className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8, marginTop: 0, textAlign: 'center' }}>
        You paid yourself this month.
      </h3>
      <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 20, lineHeight: 1.5, textAlign: 'center' }}>
        That is worth celebrating. What is one small thing you will do for yourself?
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {CELEBRATION_CHIPS.map(chip => (
          <button key={chip} onClick={() => setCelebrationNote(chip)}
            style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: `1.5px solid ${celebrationNote === chip ? 'var(--color-pay)' : 'var(--color-border)'}`, background: celebrationNote === chip ? 'var(--color-pay)' : 'var(--color-card)', color: celebrationNote === chip ? '#fff' : 'var(--color-muted-foreground)', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {chip}
          </button>
        ))}
      </div>
      <textarea
        value={celebrationNote}
        onChange={e => setCelebrationNote(e.target.value)}
        placeholder="Write your own..."
        rows={2}
        style={{ width: '100%', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-ink)', fontSize: 13, padding: '10px 12px', fontFamily: 'var(--font-sans)', resize: 'none', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
      />
      <button onClick={() => handleSaveCelebration(false)} disabled={savingCelebration}
        style={{ width: '100%', minHeight: 48, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8, fontFamily: 'var(--font-sans)' }}
      >
        {savingCelebration ? 'Saving...' : 'Save and Celebrate'}
      </button>
      <button onClick={() => handleSaveCelebration(true)}
        style={{ width: '100%', background: 'none', border: 'none', fontSize: 13, color: 'var(--color-muted-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
      >
        Skip for now
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: rename to Transfer Done, add celebration modal with chips and note saving"
```

---

## Task 9: Dashboard — Explainer Tiles + Tax Tile Redesign

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add expand/collapse state for each tile**

```typescript
const [showGrowthInfo, setShowGrowthInfo] = useState(false)
const [showTaxInfo, setShowTaxInfo] = useState(false)
const [showOpsInfo, setShowOpsInfo] = useState(false)
```

- [ ] **Step 2: Add "What is this?" link + tile below each reservoir column**

After the closing `</div>` of the reservoir row, add:

```tsx
{/* Explainer tiles */}
<div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
  {[
    {
      key: 'growth', show: showGrowthInfo, toggle: () => setShowGrowthInfo(v => !v),
      label: t('Profit Bucket'), color: 'var(--color-profit)',
      current: profitFunded, goal: Math.max(1, profitTarget),
      body: 'Reinvest in your practice — new training, tools, or equipment. Keep this in a dedicated business savings account, separate from your operating funds.',
    },
    {
      key: 'tax', show: showTaxInfo, toggle: () => setShowTaxInfo(v => !v),
      label: t('Tax Bucket'), color: 'var(--color-tax)',
      current: null, goal: null,
      body: null,
    },
    {
      key: 'ops', show: showOpsInfo, toggle: () => setShowOpsInfo(v => !v),
      label: t('Operations Bucket'), color: 'var(--color-ops)',
      current: opsFunded, goal: Math.max(1, opsTarget),
      body: 'Covers your business expenses — supplies, rent, software, insurance. This is the largest bucket because your practice runs on it every day.',
    },
  ].map(({ key, show, toggle, label, color, current, goal, body }) => (
    <div key={key} style={{ flex: 1, textAlign: 'center' }}>
      <button onClick={toggle}
        style={{ background: 'none', border: 'none', fontSize: 10, color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}
      >
        {show ? 'Hide' : 'What is this?'}
      </button>
    </div>
  ))}
</div>
```

For the tax tile, render it as a full-width card separately since it has more content. Add after the flex row above:

```tsx
{(showGrowthInfo || showOpsInfo) && (
  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
    {showGrowthInfo && (
      <div style={{ ...cardStyle, flex: 1, marginBottom: 0, padding: '12px 14px' }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 4px' }}>{t('Profit Bucket')}</p>
        <p className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-profit)', margin: '0 0 4px' }}>
          ${profitFunded.toFixed(0)} <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-sans)' }}>of ${profitTarget.toFixed(0)}</span>
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.5 }}>
          Reinvest in your practice — new training, tools, or equipment. Keep this in a dedicated business savings account.
        </p>
      </div>
    )}
    {showOpsInfo && (
      <div style={{ ...cardStyle, flex: 1, marginBottom: 0, padding: '12px 14px' }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 4px' }}>{t('Operations Bucket')}</p>
        <p className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ops)', margin: '0 0 4px' }}>
          ${opsFunded.toFixed(0)} <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-sans)' }}>of ${opsTarget.toFixed(0)}</span>
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.5 }}>
          Covers your business expenses — supplies, rent, software, insurance. This is the largest bucket because your practice runs on it every day.
        </p>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Replace the tax countdown section entirely**

Find the `{/* Tax Deadline Countdown */}` section and replace with:

```tsx
{/* Tax Set-Aside Info */}
{showTaxInfo && (
  <section style={{ ...cardStyle }}>
    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 8px', fontWeight: 600 }}>
      {t('Tax Bucket')}
    </p>
    <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: '0 0 10px' }}>
      As a self-employed practitioner, no employer withholds taxes for you. Bookwise recommends you set aside{' '}
      <strong style={{ color: 'var(--color-ink)' }}>25% of your income</strong> into a dedicated tax-savings account.
      Making quarterly estimated payments on time helps you avoid IRS underpayment penalties.
    </p>
    <div style={{ background: 'var(--color-background)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--color-primary-dark)' }}>Pro tip:</strong>{' '}
        Keep your tax savings in a high-yield savings account. Your money earns interest before it goes to the IRS.
      </p>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 2px' }}>{taxDeadline.name}</p>
        <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: 0 }}>Due {taxDeadline.label}</p>
      </div>
      <div style={{ background: 'var(--color-background)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
        <p className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', margin: 0, lineHeight: 1 }}>{taxDeadline.days}</p>
        <p style={{ fontSize: 9, color: 'var(--color-muted-foreground)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>days away</p>
      </div>
    </div>
    <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: '10px 0 0', fontStyle: 'italic' }}>
      Always confirm your payment with a licensed CPA before filing.
    </p>
  </section>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add explainer tiles for all buckets, redesign tax tile as expandable education card"
```

---

## Task 10: Settings — Pay Goal and Transfer Day

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Read current settings structure**

Check how `settings/page.tsx` loads and saves profile data. It uses `supabase.from('profiles')`. Find the save/update function name.

- [ ] **Step 2: Add `payTarget` and `transferDay` state**

After existing profile state declarations, add:
```typescript
const [payTarget, setPayTarget] = useState('')
const [transferDay, setTransferDay] = useState('Monday')
```

- [ ] **Step 3: Populate from profile on load**

In the profile load effect, after setting existing state values, add:
```typescript
setPayTarget(String(profileData.pay_target ?? 0))
setTransferDay(profileData.transfer_day ?? 'Monday')
```

- [ ] **Step 4: Add pay goal and transfer day UI section**

Find a logical location (after the vibe section, before or after services). Add a new section:

```tsx
{/* Pay and Transfer Settings */}
<section style={{ ...cardStyle, marginBottom: 16 }}>
  <h3 className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 16, marginTop: 0 }}>
    Pay and Transfer
  </h3>

  <div style={{ marginBottom: 20 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
      Monthly Pay Goal
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-muted-foreground)' }}>$</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={payTarget}
        onChange={e => setPayTarget(e.target.value.replace(/[^0-9]/g, ''))}
        style={{ width: 120, minHeight: 48, fontSize: 24, fontWeight: 700, textAlign: 'center', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-serif)', padding: 0 }}
      />
    </div>
  </div>

  <div style={{ marginBottom: 20 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
      Weekly Transfer Day
    </label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
        <button
          key={day}
          onClick={() => setTransferDay(day)}
          style={{
            minHeight: 40, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: `1.5px solid ${transferDay === day ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: transferDay === day ? 'var(--color-primary)' : 'var(--color-card)',
            color: transferDay === day ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s',
          }}
        >
          {day}
        </button>
      ))}
    </div>
  </div>

  <button
    onClick={async () => {
      if (!profile?.id) return
      await supabase.from('profiles').update({
        pay_target: parseFloat(payTarget) || 0,
        transfer_day: transferDay,
      }).eq('id', profile.id)
      toast.success('Pay settings saved.')
    }}
    style={{ minHeight: 48, padding: '0 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
  >
    Save
  </button>
</section>
```

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: add pay goal and transfer day settings"
```

---

## Task 11: Reports — Month-over-Month and Wins Log

**Files:**
- Modify: `app/reports/page.tsx`

- [ ] **Step 1: Check existing reports data loading**

Read `app/reports/page.tsx` to understand how transactions are fetched. The page currently fetches transactions for a date range. For 6-month trend, we need to fetch all transactions for the last 6 months grouped by month.

- [ ] **Step 2: Add 6-month data fetch**

Add a new Supabase query in the load function (alongside the existing one):

```typescript
const sixMonthsAgo = new Date()
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
const sixMonthStart = sixMonthsAgo.toISOString().slice(0, 8) + '01'

const { data: trendTxns } = await supabase
  .from('transactions')
  .select('date, amount, type')
  .eq('user_id', user.id)
  .eq('is_personal', false)
  .gte('date', sixMonthStart)
  .order('date', { ascending: true })

// Group by month
const monthMap: Record<string, { income: number; expenses: number }> = {}
trendTxns?.forEach(tx => {
  const month = tx.date.slice(0, 7)
  if (!monthMap[month]) monthMap[month] = { income: 0, expenses: 0 }
  if (tx.type === 'income') monthMap[month].income += Number(tx.amount)
  else monthMap[month].expenses += Number(tx.amount)
})
const trendMonths = Object.entries(monthMap)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, { income, expenses }]) => ({
    month,
    label: new Date(month + '-02').toLocaleString('default', { month: 'short' }),
    income,
    expenses,
    takeHome: income - expenses,
  }))
setTrendData(trendMonths)
```

Add state: `const [trendData, setTrendData] = useState<TrendMonth[]>([])`

Add type above component:
```typescript
type TrendMonth = { month: string; label: string; income: number; expenses: number; takeHome: number }
```

- [ ] **Step 3: Fetch Wins data (buckets with pay_funded > 0)**

```typescript
const { data: winsData } = await supabase
  .from('buckets')
  .select('month, pay_funded, celebration_note')
  .eq('user_id', user.id)
  .gt('pay_funded', 0)
  .order('month', { ascending: false })
setWins(winsData ?? [])
```

Add state: `const [wins, setWins] = useState<WinRecord[]>([])`

Add type:
```typescript
type WinRecord = { month: string; pay_funded: number; celebration_note: string | null }
```

Also fetch profile for `pay_target`:
```typescript
const payTarget = profileData?.pay_target ?? 0
setPayTargetForReports(payTarget)
```

State: `const [payTargetForReports, setPayTargetForReports] = useState(0)`

- [ ] **Step 4: Render SVG trend chart**

Add below the P&L card:

```tsx
{trendData.length >= 2 && (
  <section style={{ ...cardStyle }}>
    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 14px', fontWeight: 600 }}>
      6-Month Trend
    </p>
    {(() => {
      const W = 300, H = 120, PAD = 12
      const allVals = trendData.flatMap(m => [m.income, m.expenses, m.takeHome])
      const maxVal = Math.max(...allVals, 1)
      const xStep = (W - PAD * 2) / Math.max(trendData.length - 1, 1)
      const yScale = (v: number) => PAD + (1 - v / maxVal) * (H - PAD * 2)
      const pts = (key: keyof TrendMonth) =>
        trendData.map((m, i) => `${PAD + i * xStep},${yScale(Number(m[key]))}`).join(' ')
      return (
        <div style={{ overflowX: 'auto' }}>
          <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
            <polyline points={pts('income')}   fill="none" stroke="var(--color-profit)" strokeWidth={2} strokeLinejoin="round" />
            <polyline points={pts('expenses')} fill="none" stroke="var(--color-muted-foreground)" strokeWidth={2} strokeLinejoin="round" strokeDasharray="4 3" />
            <polyline points={pts('takeHome')} fill="none" stroke="var(--color-pay)" strokeWidth={2} strokeLinejoin="round" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${PAD}px`, marginTop: 4 }}>
            {trendData.map(m => (
              <span key={m.month} style={{ fontSize: 10, color: 'var(--color-muted-foreground)' }}>{m.label}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Income',    color: 'var(--color-profit)', dash: false },
              { label: 'Expenses',  color: 'var(--color-muted-foreground)', dash: true },
              { label: 'Take-Home', color: 'var(--color-pay)', dash: false },
            ].map(({ label, color, dash }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width={20} height={10}>
                  <line x1={0} y1={5} x2={20} y2={5} stroke={color} strokeWidth={2} strokeDasharray={dash ? '4 3' : undefined} />
                </svg>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    })()}
  </section>
)}
```

- [ ] **Step 5: Render month-over-month comparison card**

Add after the trend chart:

```tsx
{trendData.length >= 2 && (() => {
  const cur = trendData[trendData.length - 1]
  const prev = trendData[trendData.length - 2]
  const rows = [
    { label: 'Income',    cur: cur.income,    prev: prev.income,    better: (c: number, p: number) => c >= p },
    { label: 'Expenses',  cur: cur.expenses,  prev: prev.expenses,  better: (c: number, p: number) => c <= p },
    { label: 'Take-Home', cur: cur.takeHome,  prev: prev.takeHome,  better: (c: number, p: number) => c >= p },
  ]
  return (
    <section style={{ ...cardStyle }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 12px', fontWeight: 600 }}>
        {cur.label} vs {prev.label}
      </p>
      {rows.map(({ label, cur: c, prev: p, better }) => {
        const delta = c - p
        const isGood = better(c, p)
        return (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 14, color: 'var(--color-muted-foreground)' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>${p.toFixed(0)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: isGood ? 'var(--color-profit)' : 'var(--color-danger)' }}>
                {delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(0)}
              </span>
              <span className="font-serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>${c.toFixed(0)}</span>
            </div>
          </div>
        )
      })}
    </section>
  )
})()}
```

- [ ] **Step 6: Render Wins log**

Add after the comparison card:

```tsx
{/* Wins Log */}
<section>
  <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 10px', fontWeight: 600 }}>
    Your Wins
  </p>

  {/* Streak banner */}
  {wins.length >= 2 && (() => {
    let streak = 1
    for (let i = 1; i < wins.length; i++) {
      const [ay, am] = wins[i - 1].month.split('-').map(Number)
      const [by, bm] = wins[i].month.split('-').map(Number)
      const prev = new Date(ay, am - 2)
      if (prev.getFullYear() === by && prev.getMonth() + 1 === bm) streak++
      else break
    }
    if (streak < 2) return null
    const earliest = wins[streak - 1].month
    const earliestLabel = new Date(earliest + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-muted)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>🔥</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 1px' }}>
            {streak} months in a row
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: 0 }}>
            You have paid yourself every month since {earliestLabel}.
          </p>
        </div>
      </div>
    )
  })()}

  {wins.length === 0 ? (
    <div style={{ border: '1.5px dashed var(--color-border)', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: 22, margin: '0 0 6px' }}>🏆</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px' }}>Your wins will appear here.</p>
      <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.5 }}>
        After your first Transfer Done, this log starts filling in.
      </p>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {wins.map(win => {
        const isGoalReached = win.pay_funded >= payTargetForReports && payTargetForReports > 0
        const monthLabel = new Date(win.month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })
        return (
          <div key={win.month} style={{ ...cardStyle, marginBottom: 0, borderLeft: `3px solid ${isGoalReached ? 'var(--color-pay)' : 'var(--color-accent)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span className="font-serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{monthLabel}</span>
              <span className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-pay)' }}>${win.pay_funded.toFixed(2)}</span>
            </div>
            {win.celebration_note && (
              <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontStyle: 'italic', margin: '0 0 8px', lineHeight: 1.4 }}>
                "{win.celebration_note}"
              </p>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: isGoalReached ? '#e8f0e8' : 'var(--color-muted)', color: isGoalReached ? 'var(--color-primary-dark)' : 'var(--color-accent)', border: isGoalReached ? 'none' : '1px solid var(--color-border)' }}>
                {isGoalReached ? 'Goal reached' : 'Partial pay'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )}
</section>
```

- [ ] **Step 7: Commit**

```bash
git add app/reports/page.tsx
git commit -m "feat: add month-over-month trend chart, comparison card, and Wins log to Reports"
```

---

## Task 12: Push to GitHub and Verify Vercel Build

- [ ] **Step 1: Run build check locally**

```bash
cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
npm run build
```

Expected: build completes with no errors. Fix any TypeScript or lint errors before continuing.

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Confirm Vercel deployment**

Use `mcp__claude_ai_Vercel__list_deployments` to check the latest deployment status after pushing. Wait for status `READY`.

---

## Self-Review

**Spec coverage check:**
- [x] Schema: `pay_target`, `transfer_day`, `pay_funded`, `celebration_note` — Task 1
- [x] CSS `--color-pay` — Task 2
- [x] Onboarding step 7 (pay target) — Task 3
- [x] Onboarding step 8 (transfer day) — Task 4
- [x] Time input backspace fix — Task 5
- [x] `handleComplete` updated with new fields — Task 5
- [x] Owner's Pay card on dashboard — Task 6
- [x] Reservoir $ below circles — Task 7
- [x] Transfer Done rename + note with transfer_day — Task 8
- [x] Celebration modal with chips — Task 8
- [x] `handleSaveCelebration` saves `celebration_note` — Task 8
- [x] Explainer tiles (Growth, Ops) — Task 9
- [x] Tax tile redesign — Task 9
- [x] Settings: pay goal + transfer day — Task 10
- [x] 6-month trend chart — Task 11
- [x] Month vs last month comparison — Task 11
- [x] Wins log with streak banner — Task 11
- [x] Owner's Pay explainer tile (inline in Task 6)

**No placeholders found.**

**Type consistency:** `TrendMonth`, `WinRecord` defined before use. `Profile` and `Bucket` types updated in Task 1 before any component uses the new fields.
