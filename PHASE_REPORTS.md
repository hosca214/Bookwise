# Phase 6 — Reports

**Route:** `/reports` **File:** `app/reports/page.tsx`

---

## Rules (reports-relevant)

1. No em dashes anywhere.
2. Every financial label calls `t()` from IQContext — EXCEPT when `accountantMode` is true (returns raw key).
3. Currency: always `$X.XX` format.
4. Exclude `is_personal=true` from all calculations.
5. "accounting" must not appear in UI — the toggle label is "Accountant View" (only allowed exception).
6. Tax rate displayed as "recommended safety rate. Confirm with your CPA." Never a guarantee.
7. CSV always includes disclaimer: "Always review with a licensed CPA before filing."

---

## Design Tokens

```
--color-background, --color-card, --color-border
--color-foreground, --color-muted-foreground, --color-muted
--color-primary (net profit positive, active pills)
--color-primary-foreground (text on primary bg)
--color-danger (net profit negative)
--color-accent (tax estimate amount)
--color-ink (page header)
```

Cards: 12px radius, `box-shadow: 0 1px 8px rgba(0,0,0,0.06)`.
Buttons: 10px radius, min 48px height. Pill date buttons: 999px radius.
Layout: mobile-first, max-width 480px centered, paddingBottom 80px.

---

## IQ Load Order

1. Fetch `profiles.industry` + `profiles.practice_name` on mount.
2. `setIndustry(profile.industry)` before rendering any financial label.
3. `t()` returns IQ-mapped label. In `accountantMode`, returns raw key unchanged.

---

## Page Header

- Left: `<h1>` Fraunces 28px — `t('Profit and Loss')` (renders as industry-mapped term)
- Subhead: 13px muted — `practiceName`
- Right: language toggle (see below)

---

## Language Toggle

Segmented control, two options: "My Language" | "Accountant View"

```tsx
onClick={() => { if ((mode === 'Accountant View') !== accountantMode) toggleAccountantMode() }}
```

- Active segment: `var(--color-card)` bg, `var(--color-foreground)` text, subtle shadow.
- Inactive: transparent bg, `var(--color-muted-foreground)` text.
- Outer container: `var(--color-muted)` bg, 10px radius, 3px padding.

---

## Date Range Controls

Row below header, flex wrap:

1. **This Month** pill — sets `rangeStart = monthStart(0)`, `rangeEnd = monthEnd(monthStart(0))`.
2. **Last Month** pill — sets `rangeStart = monthStart(-1)`, `rangeEnd = monthEnd(monthStart(-1))`.
3. Custom `<input type="date">` from + `<input type="date">` to — min 36px height.

Active pill: `var(--color-primary)` bg + border, `var(--color-primary-foreground)` text.
Inactive pill: `var(--color-card)` bg, `var(--color-border)` border.

---

## P&L Card

Background `var(--color-card)`, 12px radius, 20px padding, `box-shadow`.

**Structure:**

```
[Practice name] [t('Profit and Loss')]        ← 11px uppercase muted label

t('Gross Income')                  $X.XX      ← 600 weight, profit color
  t(category_key)      [Sch.C line?]  $X.XX  ← 14px muted, 16px paddingLeft
  ...

──────────────────────────────────────────

t('Total Expenses')                $X.XX      ← 600 weight, muted-foreground
  t(category_key)      [Sch.C line?]  $X.XX  ← 14px muted, 16px paddingLeft
  ...

──────────────────────────────────────────

t('Net Profit')               $X.XX           ← Fraunces 18px label, 28px amount
                                               ← positive: --color-primary
                                               ← negative: --color-danger

[Tax Estimate box]
  t('Tax Estimate')             $X.XX         ← 14px label, 16px amount --color-accent
  "25% is a recommended safety rate. Confirm with your CPA."   ← 12px muted
```

**Accountant View additions:**
- `t()` returns raw key (no translation).
- Each line item: show `SCHEDULE_C_MAP[cat].line` muted beside the category name.
- Import `SCHEDULE_C_MAP` from `lib/iqMaps.ts`.

**Schedule C map (reference):**

| Category Key | Schedule C Line |
|---|---|
| Session/Appointment/Package/Retainer/Membership Income | Line 1 — Gross Receipts |
| Tip / Other Income | Line 6 — Other Income |
| Supplies / Equipment | Line 22 — Supplies |
| Software | Line 18 — Office Expense |
| Rent | Line 20b — Rent on Business Property |
| Insurance | Line 15 — Insurance |
| Continuing Education | Line 27a — Other Expense |
| Marketing | Line 8 — Advertising |
| Mileage | Line 9 — Car and Truck |
| Meals | Line 24b — Meals (50%) |
| Professional Services | Line 17 — Legal and Professional |
| Utilities / Phone / Internet | Line 26 — Utilities |
| Other Expense | Line 27a — Other Expense |

---

## Calculations

```typescript
const businessTxns = transactions.filter((tx) => !tx.is_personal)
const grossIncome   = businessTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
const totalExpenses = businessTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
const netProfit     = grossIncome - totalExpenses
const taxEstimate   = Math.max(0, netProfit * 0.25)
```

`groupByCategory(txns, type)` — returns `[categoryKey, total][]` sorted descending by amount.

---

## Export Button

- Label: "Export for My CPA"
- Style: full width, min 52px, `var(--color-primary)` border + text, transparent bg.
- Only visible when `!loading && !error && businessTxns.length > 0`.
- On click: `generateCPAExport(transactions, practiceName, label)` → `downloadCSV(filename, csv)`.
- Filename: `bookwise-{YYYY-MM}.csv`

**CSV format** (from `lib/csv.ts`):
```
Bookwise Export -- [Practice Name] -- [Month Label]
Always review with a licensed CPA before filing.
[blank line]
Date,Description,Category,Schedule C Category,Schedule C Line,Amount,Type,Receipt URL
...rows...
```

---

## Empty / Error States

- Loading: 8 `SkeletonRow` components. Never spinner.
- Error: "Could not load your data. Try again." centered, muted.
- No transactions: "No transactions for this period." + link to `/ledger` "Add entries in your Ledger".

---

## Components Used

- `components/ui/BottomNav.tsx`
- `context/IQContext.tsx` — `t()`, `setIndustry`, `accountantMode`, `toggleAccountantMode`
- `lib/csv.ts` — `generateCPAExport`, `downloadCSV`
- `lib/iqMaps.ts` — `SCHEDULE_C_MAP`
- `lib/supabase.ts` — `createClient()`, `Transaction` type
