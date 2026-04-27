# Owner's Pay, Dashboard Redesign, and Wins Log
**Date:** 2026-04-27
**Status:** Approved for implementation

---

## Overview

This spec covers six interconnected changes:
1. Owner's Pay card on the dashboard (new)
2. Transfer Done button (renamed + habit note + celebration modal)
3. Explainer tiles for all four buckets
4. Wins log on Reports page with streak tracking
5. Onboarding additions: pay target step, weekly transfer day, time input bug fix
6. Tax tile redesign
7. Month-over-month performance section on Reports

---

## 1. Schema Changes

### `profiles` table — two new columns
```sql
alter table profiles add column pay_target numeric default 0;
alter table profiles add column transfer_day text default 'Monday';
```

- `pay_target` — monthly take-home goal, set in onboarding, adjustable in Settings
- `transfer_day` — day of week the user commits to moving funds (e.g. "Monday")

### `buckets` table — two new columns
```sql
alter table buckets add column pay_funded numeric default 0;
alter table buckets add column celebration_note text;
```

- `pay_funded` — set to `pay_target` when user taps Transfer Done
- `celebration_note` — free-text note saved from the celebration modal

---

## 2. Owner's Pay Card (Dashboard)

Sits above the three reservoir circles. Not a reservoir — it is a goal-vs-actual card.

**Data:**
- `pay_target` from `profiles`
- Monthly actual = net income for the current month (income minus expenses, `is_personal=false`)
- Weekly actual = monthly actual / 4.33
- Monthly goal = `pay_target`
- Weekly goal = `pay_target` / 4.33

**Layout:**
- Section label: `t('Owner\'s Pay')` (uppercase, muted, 10px)
- Toggle pills: Monthly / Weekly (pill nav style, 999px radius)
- Large dollar amount (Fraunces 36px, `var(--color-pay)` = `#9B7DB5`)
- Progress bar (`var(--color-pay)` fill, 6px height)
- Sub-labels: "$X so far" left / "Goal: $Y" right (9px muted)
- "What is Owner's Pay?" collapsed explainer link below card

**Explainer tile (collapsed by default):**
> Owner's Pay is your monthly take-home target — the amount you want to move from your business account to your personal account. As income comes in, this card shows how close you are. Adjust your goal anytime in Settings.

**Empty state (pay_target = 0):**
> "Set a monthly pay goal to track your take-home." with link to Settings.

**CSS:**
Add `--color-pay: #9B7DB5` to both `[data-vibe="sage"]` and `[data-vibe="midnight"]` blocks in `globals.css`.

---

## 3. Reservoir Updates

**Circles:** Percentage only inside (`font-size: 14px`, Fraunces bold). Remove dollar amounts from inside the circle.

**Below each circle:**
- Name label (9px, muted, semibold)
- Dollar amounts: `$285 / of $439` (9px, muted, `$285` in `var(--sage-fg)`)

Format: current funded amount / of target amount.

---

## 4. Transfer Done Button

**Rename:** `Secure My Pay` becomes `Transfer Done` everywhere.

**Note below button** (10px muted, centered, `var(--color-muted-foreground)`):
> "Move your funds to your dedicated accounts first, then tap here to record it. Come back every [transfer_day] to keep your numbers clean."

Where `[transfer_day]` is pulled from `profiles.transfer_day`.

**On tap — celebration modal:**
1. Confetti fires
2. Modal appears over dashboard:
   - Heading (Fraunces): "You paid yourself this month."
   - Subtext: "That is worth celebrating. What is one small thing you will do for yourself?"
   - Suggestion chips (tap to select, tap again to deselect): "A long bath", "A nice meal out", "A morning off", "A new book", "Something else..."
   - Free-text field: pre-filled with selected chip text, editable
   - Primary button: "Save and Celebrate" — saves `celebration_note` to `buckets`, sets `pay_funded = pay_target`
   - Skip link: "Skip for now" — sets `pay_funded = pay_target`, saves no note

---

## 5. Explainer Tiles (All Four Sections)

All four tiles are collapsed behind a "What is this?" link below each section. Tapping expands the tile inline. Tapping again collapses. No separate page.

**Growth Fund tile:**
- Current: `$X / of $Y goal`
- Copy: "Reinvest in your practice — new training, tools, or equipment. Keep this in a dedicated business savings account, separate from your operating funds."

**Tax Set-Aside tile:**
- No dollar amount (reservoir owns that)
- Copy: "As a self-employed practitioner, no employer withholds taxes for you. Bookwise recommends you set aside 25% of your income into a dedicated tax-savings account. Making quarterly estimated payments on time helps you avoid IRS underpayment penalties."
- Tip block: "Keep your tax savings in a high-yield savings account. Your money earns interest before it goes to the IRS."
- Deadline row: deadline name / due date / days away badge
- CPA note (italic, 10px): "Always confirm your payment with a licensed CPA before filing."

**Daily Ops tile:**
- Current: `$X / of $Y goal`
- Copy: "Covers your business expenses — supplies, rent, software, insurance. This is the largest bucket because your practice runs on it every day."

**Owner's Pay tile:** (described in section 2 above)

---

## 6. Onboarding Changes

### New Step: Pay Target
Insert after current bucket sliders step (before the pulse time step).

- Heading (Fraunces): "What do you want to take home each month?"
- Subtext: "Set a target for your monthly pay. You can adjust this anytime."
- Amount input: `TapKeypad` component (no number spinners per rule 2)
- Skip: defaults to `$0` (empty state shown on dashboard until set)

### New Step: Weekly Transfer Day
Combine with the pulse time step OR add as a separate step after pulse time.

- Heading: "Pick your transfer day."
- Subtext: "Choose one day a week to move your funds and record it in Bookwise. Making it a habit is what makes it stick."
- Day picker: 7 pill buttons (Mon Tue Wed Thu Fri Sat Sun), single-select, 48px min height
- Default: Monday

### Time Input Bug Fix (Step 7 — Pulse Time)

**Problem:** `handleHourInput` early-returns when value is `""` (backspace clears field), snapping input back.

**Fix:** Add `hourRaw` and `minuteRaw` string state. Update these freely on `onChange`. Validate and commit to `hour`/`minute` on `onBlur` only.

```typescript
const [hourRaw, setHourRaw] = useState(String(displayH))
const [minuteRaw, setMinuteRaw] = useState(minute === 0 ? '00' : String(minute))

// onChange: update raw only
onChange={e => setHourRaw(e.target.value)}

// onBlur: validate and commit
onBlur={() => {
  const n = parseInt(hourRaw.replace(/\D/g, ''))
  if (!isNaN(n) && n >= 1 && n <= 12) {
    setHour(ampm === 'PM' ? (n === 12 ? 12 : n + 12) : (n === 12 ? 0 : n))
  }
  setHourRaw(String(displayH))
}}
```

Same pattern for minute field.

---

## 7. Tax Tile Redesign

Replace the current countdown tile entirely. New tile shows education + deadline only — no dollar amount, no progress bar (reservoir owns those).

Structure:
1. Section label: "Tax Set-Aside"
2. Explainer copy (see section 5 above)
3. HYSA tip block
4. Deadline row: deadline name / due date / "47 days away" badge
5. CPA note

---

## 8. Settings Changes

Add two new editable fields to Settings:

- **Monthly pay goal:** Label "Monthly pay goal" + `TapKeypad` for dollar input
- **Transfer day:** Label "Weekly transfer day" + 7 pill buttons (same as onboarding)

---

## 9. Month-over-Month Reports (Reports Page)

Two new sections below the existing P&L card.

### Trend Chart
- X-axis: last 6 months
- Three lines: Income (green), Expenses (muted), Take-Home (purple)
- Use a lightweight SVG line chart — no external charting library
- Section label: "6-Month Trend"

### Comparison Card
- "This Month vs Last Month"
- Three rows: Income / Expenses / Take-Home
- Each row shows: this month amount / last month amount / delta with up/down arrow and color (green = better, `var(--color-danger)` = worse)

---

## 10. Wins Log (Reports Page)

New section below month-over-month, always visible.

**Streak banner** (shown if 2+ consecutive months with `pay_funded > 0`):
- Icon + "X months in a row"
- Subtext: "You have paid yourself every month since [month]."

**Win cards** (one per month, newest first):
- Month name + year (Fraunces)
- Amount transferred (`pay_funded`, `var(--color-pay)`)
- Celebration note in italic with quote marks (if saved)
- Badges: "Goal reached" (green) or "Partial pay" (`var(--color-accent)`) + "Transferred [date]"

**Empty state:**
- Dashed border card
- "Your wins will appear here after your first transfer."

---

## Polish Checklist

- [ ] `--color-pay` added to both vibes in `globals.css`
- [ ] `pay_target` and `transfer_day` saved in `handleComplete` onboarding upsert
- [ ] `pay_funded` and `celebration_note` written on Transfer Done confirm
- [ ] Transfer Done note uses live `transfer_day` from profile
- [ ] Owner's Pay empty state shown when `pay_target = 0`
- [ ] Partial pay win card shown when `pay_funded > 0` but `pay_funded < pay_target`
- [ ] Time input accepts backspace without snapping
- [ ] All new labels go through `t()`
- [ ] Test all three industries on new onboarding steps
- [ ] Test Midnight Orchid on all new components
- [ ] Test 375px viewport
- [ ] `next build` passes clean
