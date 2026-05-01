# Dashboard Period Toggle + Weekly Transfer System — Design Spec
Date: 2026-04-30

## Overview

Add a global "This Week / This Month" toggle to the dashboard header, replace the confusing fire emoji streak with a quiet consistency tracker, introduce weekly bucket summaries that auto-archive every Monday, and add a Weekly Transfer History report section.

The app's tone throughout: gentle, non-punitive, data-preserving. Whether or not the user makes a transfer, their numbers are always saved.

---

## Section 1: Header

**Layout (sticky, two lines):**

Line 1: "My Dash" (Lora 28px, left) + pill toggle (right): `[This Week] [This Month]`
Line 2: Practice name (muted, Jakarta 13px) + active period date range

- This Week active: `"Apr 28 – May 4"`
- This Month active: `"May 2026"`

**Toggle pill specs:**
- Container: pill shape, `var(--color-muted)` background
- Active pill: `var(--color-card)` background, `var(--color-foreground)` text, subtle shadow
- Inactive: `var(--color-muted-foreground)` text
- "This Week" appears before "This Month"
- One global state — `payPeriod: 'week' | 'month'` — affects all cards simultaneously

**Removed from header:** Win streak badge (🔥 and "X months strong") is gone entirely.

---

## Section 2: Data Layer and Card Behavior

**Week definition:** Monday 00:00 through Sunday 23:59 local time.

**Week start derivation:**
```typescript
const now = new Date()
const dayOfWeek = now.getDay() // 0=Sun, 1=Mon
const weekStart = new Date(now)
weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
// weekEnd = weekStart + 6 days
```

**Per-card behavior:**

| Card | This Week | This Month |
|---|---|---|
| Take-Home | `weekIncome × (1 - taxFrac - profitFrac) - weekExpenses` | `monthIncome × (1 - taxFrac - profitFrac) - monthExpenses`. Shows "X% of your $Y monthly goal" subtitle. |
| Tax Set-Aside | `weekIncome × taxFrac` vs weekly target | Cumulative `buckets.tax_funded` vs monthly target |
| Business Expenses | `weekExpenses` vs `weekIncome × opsFrac` | `monthExpenses` vs `monthIncome × opsFrac` |
| Growth Fund | `weekIncome × profitFrac` vs weekly target | Cumulative `buckets.profit_funded` vs monthly target |
| Cost to Show Up | Always monthly (fixed cost ÷ monthly income) | Same |
| Daily Pulse | Always today | Same |
| Sage Insight | Uses period label in prompt context | Same |
| Tax Deadline Countdown | Static | Same |

**Cards that do not change by period:** Cost to Show Up, Daily Pulse, Sage Insight, Tax Deadline Countdown.

---

## Section 3: Make a Transfer Modal

**Button:**
- Label: "Make a Transfer"
- Sublabel: "Tap to track your transfer streak."

**Modal:**
- Header: "This week's transfers"
- Subheader: `"Apr 28 – May 4 — these amounts will reset when you tap 'I did it.'"`
- Four rows with calculated amounts:
  - Tax Set-Aside — `weekIncome × taxFrac`
  - Business Expenses — `weekExpenses`
  - Growth Fund — `weekIncome × profitFrac`
  - Pay Myself — `weekIncome × (1 - taxFrac - profitFrac) - weekExpenses`
- If Pay Myself = $0: row shows `$0.00` with note "Expenses exceeded income this week. Nothing to pay yourself."
- Footer note (small, muted): "We've already saved these numbers. You can find them in Reports."
- Button: "I did it"

**On "I did it":**
1. Confetti fires
2. Modal closes
3. `buckets.*_funded` increments by each week's amount (monthly totals update)
4. `weekly_summaries` row for current week: `transferred = true`, `transferred_at = now()`
5. Weekly reservoir circles reset to zero
6. Streak count increments

**The modal always shows THIS WEEK's amounts regardless of which toggle is active.**

---

## Section 4: Weekly Auto-Archive and Consistency Tracker

**New table: `weekly_summaries`**

```sql
create table weekly_summaries (
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
```

**Weekly reset (automatic, on dashboard load):**

On load, compute current `week_start`. If no row exists for that `week_start`:
1. Finalize previous week's row as-is (transferred stays whatever it was — no change)
2. Upsert a new row for current week with freshly computed income/expense/bucket amounts
3. Weekly reservoir circles show zero fill (new week, nothing transferred yet)

This is silent. No prompt, no warning, no animation. The previous week's data is already in the report.

**Streak logic:**
- Streak = count of consecutive past completed weeks where `transferred = true`
- Current (in-progress) week is never counted
- Missing a transfer in a completed week resets the streak to 0
- Streak is purely a habit signal — financial data is preserved regardless of streak state

**Streak display:**
- Placement: below the Make a Transfer button
- Copy: `"X weeks of consistently paying yourself."` — Lora italic, `var(--color-muted-foreground)`, 14px
- Hidden when streak < 2 (no "0 weeks" or failure state ever shown)
- When streak breaks: tracker disappears silently, reappears next time user hits 2+ consecutive weeks

---

## Section 5: Weekly Transfer History (Reports)

**Location:** Separate section in `/reports`, below the existing P&L card. Not combined with P&L.

**Title:** "Weekly Transfer History"

**Table columns:** Week of | Income | Tax | Expenses | Growth | Pay Myself | Status

**Status values:**
- Transferred (checkmark, primary color)
- Saved (muted text) — for weeks where `transferred = false`

**Saved row copy:** No judgment. "Saved" is the full status label. No "missed" or "skipped" language.

**Export:** "Download" button exports CSV of all `weekly_summaries` rows for the user.

**CSV columns:** Week Start, Week End, Income, Tax Amount, Expenses, Growth Amount, Pay Myself Amount, Transferred, Transferred At

---

## Database Changes Required

1. Create `weekly_summaries` table (new migration)
2. Add RLS policy: `own weekly_summaries` for all using `auth.uid() = user_id`
3. `demo-seed.sql`: add 4 weeks of `weekly_summaries` rows for demo account (3 transferred, 1 not — demonstrates both states)

---

## Out of Scope

- Push notifications or scheduled reminders for weekly transfers
- Ability to retroactively mark a past week as transferred
- Partial transfers (all-or-nothing per week)
- Weekly average calculations in Reports (deferred to future phase)
