# Take-Home Pay + Expense Budget Tracking

**Date:** 2026-04-30
**Status:** Approved

---

## Problem

The current take-home pay card tracks progress toward a user-set monthly income *goal* — it does not show what the user actually pockets. If expenses exceed the budgeted allocation, the take-home number is unaffected. This gives a false sense of financial health.

The user needs to see their real take-home: income minus taxes set aside, minus actual expenses, minus growth fund contribution.

---

## Solution Overview

Add `ops_pct` to profiles with industry-specific defaults. Rewrite the take-home calculation to use actual expense transactions as the ops spend. Alert the user when real expenses exceed their ops budget. Give Sage AI the context to surface this automatically.

---

## Schema Change

```sql
ALTER TABLE profiles ADD COLUMN ops_pct numeric DEFAULT 27;
```

Industry defaults applied at onboarding when the user selects their practice type:

| Industry | ops_pct default |
|---|---|
| coach | 20 |
| trainer | 27 |
| bodyworker | 32 |

These reflect typical overhead-to-income ratios: coaches have minimal overhead (digital tools only), trainers carry moderate costs (insurance, CE credits, facility rental), bodyworkers carry the highest (room rental, linens, oils, CE credits).

---

## Calculations

All computed from live data on the dashboard — no additional stored values needed.

```
taxFrac       = profile.tax_pct / 100          // default 0.25
profitFrac    = profile.profit_pct / 100        // default 0.10
opsFrac       = profile.ops_pct / 100           // default varies by industry

opsTarget     = monthIncome × opsFrac           // budgeted expense ceiling
opsActual     = sum of expense transactions (type='expense', is_personal=false, current month)
overBudget    = opsActual > opsTarget
overAmount    = max(0, opsActual - opsTarget)

takeHome      = monthIncome × (1 - taxFrac - profitFrac) - opsActual
takeHome      = max(0, takeHome)                // floor at zero for display
```

`opsActual` comes from `monthExpenses`, which is already computed on the dashboard from the transactions table. No new query needed.

---

## Dashboard Changes

### Taxes Set Aside Tile

No calculation changes. "What is this?" copy (already in dashboard, keep as-is):
> "Set this aside so you are never surprised at tax time. Keep it in a dedicated savings account, separate from your spending, so it is ready when your quarterly payment is due. Always confirm your payment amount with a licensed CPA."

### Growth Fund Tile

No calculation changes. Update "What is this?" copy (current text is too vague):
> "This is your practice reinvestment fund. Each month, set this amount aside in a dedicated savings account. Use it for continuing education and training, new equipment, or saving toward bigger goals like expanding your space or adding a second location. Moving this money consistently is what separates a practice that grows from one that stays stuck."

### Business Expenses Tile (formerly Daily Operations)

- Section label: `t('Operations Bucket')` — resolves to "Business Expenses"
- Shows `opsActual` as the primary dollar amount (Lora 28px)
- Progress bar: `opsActual / opsTarget × 100%`
  - Under 85%: `var(--color-ops)` (green)
  - 85–99%: amber `#C4A882`
  - 100% and above: danger `var(--color-danger)` (red)
- When `overBudget`:
  ```
  You are $X over your expense budget. Your take-home is reduced by $X.
  ```
  Shown inline beneath the progress bar in `var(--color-danger)` at 13px.
- "What is this?" expander copy:
  > "This is your monthly budget for business costs — supplies, rent, software, insurance, and anything else it takes to run your practice. Your budget is based on the typical overhead for your type of practice. When your actual spending stays within this amount, your take-home pay stays predictable. Spending above this budget comes directly out of what you pocket."

### My Take-Home Pay Tile

- Section label: "My Take-Home Pay"
- Primary amount: `takeHome` dollar value (Lora 28px, `var(--color-pay)`)
- Sub-label beneath amount: *"After Taxes Set Aside, expenses, and Growth Fund"*
- Progress bar: `takeHome / pay_target × 100%` (pay_target remains as motivational income goal)
- When `takeHome` is $0 due to expense overage: show $0 with note *"Your expenses exceeded your income this month."* in muted color
- "What is this?" expander copy:
  > "This is what you actually pocket — your income after Taxes Set Aside, Business Expenses, and your Growth Fund are accounted for. When your expenses stay within budget, this number is predictable. When expenses run over, this number drops. Keeping an eye on it each month is how you make sure your practice is actually paying you."

---

## Sage AI Auto-Alert

When `opsActual > opsTarget`, inject into the daily insight system prompt context:

```
⚠️ Expense alert: actual expenses this month ($X) exceed the ops budget ($Y) by $Z.
This is reducing the user's take-home pay.
```

Sage AI surfaces this in its daily insight without the user asking. Sage follows existing vocabulary rules — no "you should", no directives. Example framing:

> "Your expenses this month are running $240 above your budget. That extra spend is coming directly out of what you take home."

---

## Settings: Money Plan Section

Current behavior: ops_pct is display-only (shows calculated remainder).
New behavior: ops_pct is a stepper (+/− 1%), same pattern as tax_pct and profit_pct.

- Label: `t('Operations Bucket')` (IQ-mapped)
- Helper text beneath: *"Industry default: X%"* (shows the default for their industry)
- Saves `ops_pct` to profiles on change
- The Take-Home row below the three steppers shows the calculated remainder read-only:
  ```
  Take-Home: {100 - tax_pct - profit_pct - ops_pct}%
  ```
  If the four values sum above 100%, show a validation warning: *"Your allocations exceed 100%. Reduce one to continue."* Disable save.

---

## Onboarding Step 5

Current: three rows (Growth Fund adjustable, Taxes Set Aside adjustable, Daily Operations display-only remainder).
New: four rows.

| Row | Adjustable | Default (coach / trainer / bodyworker) |
|---|---|---|
| Taxes Set Aside | Yes | 25% / 25% / 25% |
| Expense Coverage | Yes | 20% / 27% / 32% |
| Growth Fund | Yes | 10% / 10% / 10% |
| Take-Home | No (calculated) | 45% / 38% / 33% |

The Take-Home row updates live as the user adjusts the other three. Sliders are range inputs with `accentColor`. Cannot save if allocations exceed 100%.

Industry defaults are applied when `setIndustry()` is called in Step 3 — so by the time the user reaches Step 5, the defaults are already pre-filled.

**Onboarding upsert fields** (add to existing): `ops_pct`

---

## IQ Maps

Add `ops_pct` default to the onboarding industry selection handler, not to IQ_MAPS (ops_pct is numeric data, not a label). The mapping lives in the onboarding step 3 handler:

```typescript
const OPS_PCT_DEFAULTS: Record<Industry, number> = {
  coach: 20,
  trainer: 27,
  bodyworker: 32,
}
```

---

## CLAUDE.md Updates Required

- Phase 2 Step 5: update to four-row layout with ops_pct
- Phase 3 Take-Home card: update calculation description
- Phase 3 Money Plan tiles: update ops tile behavior (actual spend vs budget)
- Phase 7 Settings Money Plan: update ops_pct from display-only to stepper
- Database schema: add `ops_pct` column
