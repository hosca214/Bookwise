# Phase 7 — Settings

**Route:** `/settings` **File:** `app/settings/page.tsx`

---

## Rules (settings-relevant)

1. No em dashes anywhere.
2. No number spinwheels. Duration uses ChevronUp/Down increment buttons. Price uses `TapKeypad.tsx`.
3. Body text minimum 16px. Section labels 11px uppercase.
4. "accounting" must not appear anywhere on this page.
5. Currency: always `$X.XX` format for service prices.
6. Compliance disclaimer text is fixed — do not alter wording.

---

## Design Tokens

```
--color-background, --color-card, --color-border
--color-foreground, --color-muted-foreground, --color-muted
--color-primary, --color-primary-foreground
--color-profit (Connected badge text)
--color-ink (page header)
--color-danger (remove X button)
```

Cards: 12px radius, `box-shadow: 0 1px 8px rgba(0,0,0,0.06)`.
Buttons: 10px radius, min 48px height.
Inputs: 8px radius, min 48px height, 1.5px border `var(--color-border)`.
Layout: mobile-first, max-width 480px centered, paddingBottom 80px.

---

## IQ Load Order

1. Fetch `profiles.industry` + `profiles.vibe` on mount.
2. `setIndustry(profile.industry)` — settings has no IQ-translated financial labels, but industry must be set for correct vibe behavior and BottomNav.
3. `setVibe(profile.vibe)` — sets `data-vibe` on `<html>` for live skin preview.

---

## Page Structure

Four sections in order:

1. Service Menu
2. Vibe
3. Connected Apps
4. About Bookwise (disclaimer)

---

## Section 1 — Service Menu

**Section label:** "Service Menu" (11px uppercase muted)

**Service list:**
- Fetch `services` where `user_id = userId AND is_active = true`, order by name.
- Each row: service name (15px 500) + duration if present (13px muted) + price (16px 600 tabular-nums) + X remove button.
- Remove: soft delete — `update({ is_active: false }).eq('id', id)`. Optimistic removal from list.
- Divider `1px var(--color-border)` between rows.

**Empty state (no services, add form closed):**
"No services yet. Add your first below." — 14px muted.

**Add Service button (when form closed):**
- Full width, dashed border `1.5px dashed var(--color-border)`, 10px radius.
- `+` icon + "Add a service" label — 14px 600 muted.

**Add Service form (when open):**
Card: `var(--color-card)` bg, 12px radius, 16px padding, 1.5px border.

Fields:

1. **Service name** — `<input type="text">`, 16px, min 48px, placeholder "60-min Massage".
2. **Price** — `<TapKeypad>` component. Label "Price".
3. **Duration** — ChevronUp/Down stepper. Step 15 minutes. Min 15 min. Default 60 min.
   ```tsx
   <button onClick={() => setSvcDuration((d) => Math.max(15, d - 15))}>-</button>
   <span>{svcDuration} min</span>
   <button onClick={() => setSvcDuration((d) => d + 15)}>+</button>
   ```
   Buttons: 44x44px, 10px radius, 1.5px border.

Action buttons (row):
- Cancel — flex 1, transparent, border, 15px 600.
- Add Service — flex 2, `var(--color-primary)` bg, no border, 15px 700. Shows "Saving..." while saving.

**Save logic:**
```typescript
await supabase.from('services').insert({
  user_id, name: svcName.trim(), price, duration_minutes: svcDuration
}).select().single()
```
Optimistically append to sorted list. Toast "Service added." on success.

---

## Section 2 — Vibe

**Section label:** "Vibe" (11px uppercase muted)

**Vibe cards:** 2-column grid, 12px gap.

Each card:
- Background: `v.bg` (the skin's background color)
- Border: 2px solid — selected: `var(--color-primary)`, unselected: `var(--color-border)`
- 12px radius, 16px 12px padding
- Three color swatches (18px circles) from `v.swatches`
- Vibe name: 13px 600 — sage skin uses dark text `#2C3528`, midnight uses light `#EEEEF4`
- Tap = `setStagedVibe(v.id)` — live preview fires via `useEffect`

**Live preview:** `useEffect(() => { if (stagedVibe !== vibe) setVibe(stagedVibe) }, [stagedVibe])`

**Save Vibe button:** only visible when `stagedVibe !== vibe`.
- Full width, min 48px, `var(--color-primary)` bg.
- `await supabase.from('profiles').update({ vibe: stagedVibe }).eq('id', userId)`
- Toast "Vibe saved."

**VIBES array** (from `context/VibeContext.tsx`):
```typescript
{ id: 'sage',     name: 'Ethereal Sage',   swatches: ['#F5F2EC', '#7C9A7E', '#C4A882'] }
{ id: 'midnight', name: 'Midnight Orchid', swatches: ['#1E1E26', '#B09FCC', '#C8C8D0'] }
```

---

## Section 3 — Connected Apps

**Section label:** "Connected Apps" (11px uppercase muted)

Static list card (`var(--color-card)` bg, 12px radius, 1px border, overflow hidden):
- Stripe — "Demo mode" — "Connected" badge
- Plaid — "Demo mode" — "Connected" badge
- Google Drive — "Demo mode" — "Connected" badge

Row dividers between items (except last).
Badge: 12px 600, `var(--color-muted)` bg, `var(--color-profit)` text, 999px radius, 4px 10px padding.

Caption below card: "Live connections available after launch." — 12px muted.

---

## Section 4 — About Bookwise

**Section label:** "About Bookwise" (11px uppercase muted)

Card with fixed disclaimer text (do not alter):
> "Bookwise organizes and presents your financial data. Sage shares observations, not advice. Work with a licensed CPA before filing."

14px, `var(--color-muted-foreground)`, line-height 1.6.

---

## Error / Loading States

- Services loading: single skeleton row 48px height. Never spinner.
- Save error (service): toast "Could not add service."
- Vibe save error: toast "Could not save. Try again."
- Auth error: redirect `/login`.

---

## Components Used

- `components/ui/TapKeypad.tsx` — service price entry
- `components/ui/BottomNav.tsx`
- `context/IQContext.tsx` — `setIndustry`
- `context/VibeContext.tsx` — `vibe`, `setVibe`, `VIBES`
- `lib/supabase.ts` — `createClient()`, `Service` type
- `lucide-react` — `Plus`, `X`
