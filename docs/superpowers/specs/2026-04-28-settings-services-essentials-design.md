# Settings Overhaul, Services Integration, and Essentials — Design Spec

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

Seven connected changes that upgrade the Settings page, wire services into the Ledger, surface essential cost tracking across Onboarding and Dashboard, and add a schema column for per-transaction service attribution.

---

## 1. Schema Changes

Two migrations required before any UI work.

```sql
-- Add service attribution to transactions
alter table transactions
  add column service_id uuid references services(id) on delete set null;

-- Add monthly essential cost to profiles
alter table profiles
  add column monthly_essential_cost numeric default 0;
```

`service_id` is nullable. Only populated when a user quick-adds from a service in the Ledger. No backfill needed.

`monthly_essential_cost` defaults to 0. Set during Onboarding and editable in Settings.

---

## 2. Settings Page — Reordered Sections

New section order (top to bottom):

1. Vibe
2. Pay and Transfer
3. Money Plan *(new)*
4. Your Services *(renamed, moved from top)*
5. Connected Apps
6. About Bookwise
7. Account

---

## 3. Settings — Vibe Section

No structural change to the vibe cards. One layout change: replace the 2-column grid with a **horizontal scroll row**. Same card size (140px wide, 120px tall). Overflow scrolls left-right. All 5 skins visible by scrolling — Ethereal Sage, Midnight Orchid, Desert Rose, Ocean Mist, Golden Hour.

Selected skin has `2px solid var(--color-primary)` border. Tapping a card previews live (already implemented). Save button appears below when staged vibe differs from saved vibe (already implemented).

---

## 4. Settings — Pay and Transfer Section

Existing card gains a second field below Monthly Pay Goal.

**New field: "Cost to show up each month"**

- Label: `"Cost to show up each month"` (fieldLabel style)
- Hint below label: `"Think: room rent, supplies, insurance, software."` — 12px, muted foreground
- Input: same style as pay goal input — `$` prefix, numeric, Fraunces 24px
- Bound to `monthly_essential_cost` on the profile
- Saved with the existing Save button (no separate save)

State additions:
```ts
const [essentialCost, setEssentialCost] = useState('')
```

Load from `profile.monthly_essential_cost`. Save as `parseFloat(essentialCost) || 0` alongside `pay_target` and `transfer_day`.

---

## 5. Settings — Money Plan Section (new)

Placed between Pay and Transfer and Your Services.

**Stacked color bar** — 10px tall, fully rounded, no gaps between segments:
- Growth Fund: `var(--color-profit)`, width = `${profitPct}%`
- Tax Set-Aside: `var(--color-tax)`, width = `${taxPct}%`
- Daily Operations: `var(--color-ops)`, width = `${opsPct}%`

Width transitions: `transition: width 0.25s ease`.

**Single card** — same card style as Pay and Transfer (12px radius, 1px border, 20px 16px padding). Three rows separated by 1px dividers:

| Row | Left | Right |
|-----|------|-------|
| Growth Fund | `●` dot (color-profit) + `t('Profit Bucket')` label | `−` btn · Fraunces 28px bold `profitPct%` (color-profit) · `+` btn |
| Tax Set-Aside | `●` dot (color-tax) + `t('Tax Bucket')` label | `−` btn · Fraunces 28px bold `taxPct%` (color-tax) · `+` btn |
| Daily Operations | `●` dot (color-ops) + `t('Operations Bucket')` label (muted) | Fraunces 28px bold `opsPct%` (color-ops) — no buttons |

Stepper buttons: 44×44px, 10px radius, 1.5px border (`var(--color-border)`), `var(--color-card)` background.

Increment: 5% steps.

Constraints:
- `profitPct` min 0, `+` disabled when `opsPct <= 0`
- `taxPct` min 0, `+` disabled when `opsPct <= 0`
- `opsPct = 100 - profitPct - taxPct` (always derived, never stored directly)
- `−` disabled at 0 for each bucket

**Save button** below card: full width, 48px, primary style, label `"Save Money Plan"`.

Saves `profit_pct` and `tax_pct` to `profiles`. Toast: `"Money plan saved."`.

State additions:
```ts
const [profitPct, setProfitPct] = useState(10)
const [taxPct, setTaxPct] = useState(25)
const [savingPlan, setSavingPlan] = useState(false)
```

Load from `profile.profit_pct ?? 10` and `profile.tax_pct ?? 25`.

---

## 6. Settings — Your Services Section

Renamed from "Service Menu." Moved to position 4 (after Money Plan).

**Compact row layout** per service:

```
[Service name]          [duration badge]  [$price]  [8x badge]  [×]
```

- Name: 15px, 600 weight, `var(--color-foreground)`
- Duration badge: small pill — `60 min`, 12px, muted background, muted foreground
- Price: 15px, 600 weight, tabular-nums, `var(--color-foreground)`
- Booking count badge: small pill — `8x`, 12px, `var(--color-primary)` background (10% opacity), `var(--color-primary)` text. Hidden (not rendered) when count is 0.
- Remove button: `X` icon, 16px, muted foreground

Services sorted by booking count descending (count of `transactions` where `service_id = service.id`). Zero-count services sorted alphabetically at the bottom.

Booking count query added to the existing `load()` function:
```ts
const { data: bookingCounts } = await supabase
  .from('transactions')
  .select('service_id')
  .eq('user_id', user.id)
  .not('service_id', 'is', null)
```
Reduce into a `Record<string, number>` keyed by service_id.

**Add service form** — unchanged in fields and behavior. No structural change.

---

## 7. Onboarding — Pay Target Step (Step 7)

Add a second field to the existing Pay Target screen.

Below the existing `$` amount input and "per month" label, add:

```
[16px gap]

What does it cost to keep your practice running each month?
Think: room rent, supplies, insurance, software.

$  [____]  per month
```

- Question: 16px, muted foreground, line-height 1.5
- Hint: 13px, muted foreground, italic — same pattern as other onboarding helper text
- Input: same style as pay goal input on this step

State additions to `OnboardingPage`:
```ts
const [essentialCost, setEssentialCost] = useState('')
const essentialCostNum = parseFloat(essentialCost.replace(/[^0-9.]/g, '')) || 0
```

Add to `handleComplete` upsert:
```ts
monthly_essential_cost: essentialCostNum,
```

Button label: `"Skip for now"` when both pay and essential are 0. `"Continue"` otherwise. Essential cost is optional — the user can skip.

---

## 8. Dashboard — Essentials Card

**Rename:** Card section label changes from `"Must-Pay Coverage"` to `"Cost to Show Up"`.

**Logic change:** Coverage bar now compares `monthIncome` to `profile.monthly_essential_cost` (the user-defined fixed cost) instead of `monthExpenses`. If `monthly_essential_cost` is 0, fall back to `monthExpenses` with a note.

```ts
const essentialBase = (profile?.monthly_essential_cost ?? 0) > 0
  ? profile.monthly_essential_cost
  : monthExpenses

const essentialCoverage = essentialBase > 0
  ? Math.min(100, Math.round((monthIncome / essentialBase) * 100))
  : 0
```

**Explainer toggle** — same `"What is this?"` pattern already used on bucket tiles:

> "This shows how much of your monthly must-pays your income covers. When you reach 100%, you have broken even — every dollar above this builds your funds."

**Settings link** — below the income/expense row at the bottom of the card:

```
Does this look off?  [Update in Settings →]
```

12px, muted foreground, link in `var(--color-primary)`. Routes to `/settings`.

**Empty state** — when `monthly_essential_cost === 0` and `monthExpenses === 0`:

> "Add your monthly must-pays in Settings to see how your income measures up."

Link: `"Go to Settings"`.

---

## 9. Ledger — Quick Add from Service (B-flow)

When the user selects **Income** in the add sheet, a "Your Services" section appears above the existing category list.

**Service chips** — horizontally scrollable row. One chip per active service, sorted by booking count descending.

Chip contents: `[Service name · $price]`
- If booking count > 0: append ` · Nx` (e.g., `60-min Massage · $120 · 8x`)
- 13px, 600 weight
- Border: 1.5px `var(--color-border)`, 999px radius, `var(--color-card)` background
- Selected chip: `var(--color-primary)` border + background (10% opacity)
- Min height 40px, padding `0 14px`

Tapping a chip sets:
```ts
setAmount(String(service.price))
setNotes(service.name)
setCategoryKey('Session Income')
setSelectedServiceId(service.id)
```

All fields remain editable before Save. Tapping a different chip updates all four values.

State addition to `LedgerPage`:
```ts
const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
const [services, setServices] = useState<Service[]>([])
```

Services loaded once in `load()` alongside transactions:
```ts
const { data: svcData } = await supabase
  .from('services')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_active', true)
```

Booking counts derived from existing transactions in state (count `service_id` matches).

`handleSave` passes `service_id: selectedServiceId` when inserting the transaction. Reset `selectedServiceId` to `null` on sheet close.

If no services defined: "Your Services" section is omitted entirely. The existing income categories appear as normal.

---

## Polish and Compliance

- All bucket and service labels go through `t()`.
- "Cost to show up" is practitioner language — never "fixed expenses," never "minimum costs."
- Breakeven explainer: never say "breakeven" in the UI. Use "broken even" only in the explainer body, never as a label.
- `monthly_essential_cost` never appears in UI copy — always rendered as `"Cost to show up each month"`.
- Settings link on dashboard card is a soft suggestion, never a prompt or warning.

---

## Files Changed

| File | Change |
|------|--------|
| `app/settings/page.tsx` | Reorder sections, add Money Plan, rename Your Services, add essential cost field, vibe horizontal scroll |
| `app/onboarding/page.tsx` | Add essential cost field to Step 7 |
| `app/dashboard/page.tsx` | Rename card, update coverage logic, add explainer + Settings link |
| `app/ledger/page.tsx` | Add Quick Add from Service chips, load services, pass service_id on save |
| `lib/supabase.ts` | Add `service_id` and `monthly_essential_cost` to types |
| Supabase migrations | Two `alter table` statements |
