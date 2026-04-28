# Ledger Enhancements Design

**Date:** 2026-04-27
**Status:** Approved

## Summary

Enhance `app/ledger/page.tsx` with search, multi-select category filtering, month filtering, real-time totals, a more prominent add button, and a receipt red dot indicator. All changes are client-side — no new API routes or schema changes required.

---

## Filter Bar

Always visible below the page header. Three rows:

1. **Search input** — full-width, searches across `category_key` (IQ-translated display value) and `notes`. Filters in real time as the user types.

2. **Type toggle** — segmented control with three options: `All` | `Income` | `Expenses`. Single select. Styled as a pill row with distinct active colors: All = dark ink, Income = `--color-profit`, Expenses = `--color-danger`.

3. **Category chips** — horizontal scrollable row. Only visible when `Income` or `Expenses` is selected. Shows the categories for the active type (income categories or expense categories). Each chip toggles independently — multiple can be selected simultaneously. Selecting multiple chips shows transactions matching ANY of the selected categories (OR logic). Chips use the IQ-translated label via `t()`. Active income chips: `--color-profit` tint. Active expense chips: `--color-danger` tint.

4. **Month chips** — always visible. Shows the last 3 months + "All time". Single select. Active month uses dark ink fill.

Income categories: Session Income, Package Income, Retainer Income, Tip Income, Other Income.
Expense categories: Supplies, Equipment, Software, Rent, Facility Fee, Insurance, Continuing Education, Marketing, Mileage, Meals, Professional Services, Utilities, Phone, Internet, Other Expense.

---

## Totals Strip

Sits between the filter bar and the transaction list. Always reflects the currently filtered set (not all transactions).

- **When `All` type:** shows Income (+$X.XX) | Expenses (-$X.XX) | Net ($X.XX)
- **When `Income`:** shows Filtered (N cats or "All") | Income (+$X.XX) | Count (N entries)
- **When `Expenses`:** shows Filtered (N cats or "All") | Expenses (-$X.XX) | % of total expenses

Excludes `is_personal = true` transactions from all totals (consistent with existing dashboard logic).

---

## Transaction List

Filtering is pure client-side — `transactions` array from Supabase is fetched once on mount (all transactions for the user, newest first). A `filtered` derived value is computed from the active search, type, category, and month selections. No re-fetching on filter change.

Empty filtered state: "No entries match your filters." with a "Clear filters" link that resets all filter state.

---

## Receipt Red Dot

On each expense transaction row, the camera icon gets a small red dot badge when `tx.receipt_url === null`. The dot uses `--color-danger`. It disappears as soon as `receipt_url` is set on that row (optimistic update on upload success). Income rows never show the dot.

Current behavior (camera icon green when receipt exists, muted when not) is retained. The red dot is additive — it overlays the top-right corner of the camera icon.

---

## Add Entry Button

The floating `+` button (56px circle) gains an "Add Entry" text label below it. Font: Jakarta 9px bold, `--color-primary-dark`. Shadow increases to `0 4px 24px rgba(0,0,0,0.22)` to lift it more visually. Button position and size unchanged.

---

## Filter State

All filter state is local React state — no URL params, no persistence across sessions. Resets on page reload.

```ts
const [search, setSearch] = useState('')
const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
const [categoryFilter, setCategoryFilter] = useState<string[]>([])
const [monthFilter, setMonthFilter] = useState<string>(currentYearMonth) // 'YYYY-MM'
```

When `typeFilter` changes, `categoryFilter` resets to `[]`.

---

## Constraints

- All financial labels go through `t()` — category chip labels and transaction row labels.
- `is_personal = true` transactions are excluded from totals but still rendered in the list (at reduced opacity, consistent with current behavior).
- No spinwheels — filter UI uses tap targets only.
- Min tap target 48px for type toggle buttons and month chips.
- Body text minimum 16px rule: transaction category labels stay at 15px (existing) — this is a display list, not body copy.
