# Phase 4 — Ledger

**Route:** `/ledger` **File:** `app/ledger/page.tsx`

---

## Rules (ledger-relevant)

1. No em dashes anywhere.
2. No number spinwheels. Amount uses `TapKeypad.tsx` only.
3. Body text minimum 16px. Section labels 11px uppercase.
4. Every `category_key` label calls `t()` from IQContext.
5. Currency: always `$X.XX` format.
6. Exclude `is_personal=true` from financial calculations (personal rows dimmed, not hidden).
7. No hardcoded category strings in JSX — always pass through `t()`.

---

## Design Tokens

```
--color-background, --color-card, --color-border
--color-foreground, --color-muted-foreground, --color-muted
--color-primary, --color-profit (income amounts)
--color-danger (red dot, destructive actions)
--color-accent (personal toggle active state)
```

Cards: 12px radius, `box-shadow: 0 1px 8px rgba(0,0,0,0.06)`.
Buttons: 10px radius, min 48px height.
Inputs: 8px radius, min 48px height, 1.5px border `var(--color-border)`.
Layout: mobile-first, max-width 480px centered, paddingBottom 80px (BottomNav clearance).

---

## IQ Load Order

1. Fetch `profiles.industry` on mount.
2. `setIndustry(profile.industry)` before rendering any category label.
3. Never render `t(category_key)` before industry is loaded.

---

## Transaction List

- Order: newest first (`order('date', { ascending: false })`).
- Each row:
  - Date — 13px, `var(--color-muted-foreground)`
  - `t(tx.category_key)` — 15px, `var(--color-foreground)`
  - Amount — income: `var(--color-profit)`, expense: `var(--color-muted-foreground)`, format `$X.XX`
  - Source badge — pill, 11px: "Manual" / "Stripe" / "Plaid"
  - Red dot — show only if `tx.date === today && !tx.pulse_matched`
  - Personal toggle — pill switch; when personal, row opacity 0.45
- Empty state: "No entries yet." + "Add your first entry" button (primary style).

---

## Floating Add Button

- 56px circle, fixed bottom-right, above BottomNav (bottom: 76px).
- Background `var(--color-primary)`, `+` icon white.
- Opens the add sheet.

---

## Add Sheet

- Slides up from bottom via CSS `transform: translateY()` transition (no Framer Motion needed).
- `max-height: 92vh`, `overflow-y: auto`, safe-area-inset padding bottom.
- Background `var(--color-card)`, 20px top radius, drag handle bar at top.

**Fields in order:**

1. **Date** — `<input type="date">`, min 48px, prefilled today.
2. **Type toggle** — Income | Expense pill toggle.
3. **Category** — `<select>` with IQ-mapped options via `t(cat)`. See category lists below.
4. **Amount** — `<TapKeypad>` component only. No keyboard input for amount.
5. **Notes** — `<input type="text">`, optional.
6. **Personal toggle** — labeled "Personal expense?" with pill switch.
7. **Scan Receipt** button — opens file input `accept="image/*" capture="environment"`.
8. **Save** button — full width, primary style, min 48px.

**Income categories (raw keys):**
`Session Income`, `Package Income`, `Retainer Income`, `Tip Income`, `Other Income`

**Expense categories (raw keys):**
`Supplies`, `Equipment`, `Software`, `Rent`, `Facility Fee`, `Insurance`,
`Continuing Education`, `Marketing`, `Mileage`, `Meals`, `Professional Services`,
`Utilities`, `Phone`, `Internet`, `Other Expense`

All rendered as `<option value={cat}>{t(cat)}</option>`.

---

## Receipt Scan Flow

1. User taps "Scan Receipt" → hidden `<input type="file" accept="image/*" capture="environment">` triggers.
2. On file selected:
   a. Upload file to Supabase Storage: `receipts/{user_id}/{YYYY-MM}/{filename}`.
   b. Get public URL from storage.
   c. POST `{ imageUrl }` to `/api/ocr`.
   d. Response `{ vendor, date, amount }` → auto-populate amount, date, notes fields.
3. Loading state: show RefreshCw spin icon + "Scanning..." text on the button.
4. On failure: toast "Could not read receipt. Fill in manually." — leave fields unchanged.

---

## Save Logic

```typescript
await supabase.from('transactions').insert({
  user_id,
  date: txDate,
  amount: parseFloat(txAmount),
  type: txType,
  category_key: txCategory,
  notes: txNotes,
  is_personal: txPersonal,
  source: 'manual',
  pulse_matched: false,
})
```

After save: optimistically prepend to list, close sheet, reset form fields, toast success.

---

## Personal Toggle (inline, on existing rows)

- Tap toggle → optimistic UI update → `supabase.from('transactions').update({ is_personal: next }).eq('id', tx.id)`.

---

## Error / Loading States

- Loading: skeleton rows using `className="skeleton"`. Never spinner.
- Save error: toast "Could not save. Try again." — do not close sheet.
- Toggle error: silently revert optimistic update.
- Auth error: redirect `/login`.

---

## Components Used

- `components/ui/TapKeypad.tsx` — amount entry
- `components/ui/BottomNav.tsx` — fixed bottom navigation
- `context/IQContext.tsx` — `t()`, `setIndustry`
- `lib/supabase.ts` — `createClient()`
- `lib/supabase.ts` — `Transaction` type
