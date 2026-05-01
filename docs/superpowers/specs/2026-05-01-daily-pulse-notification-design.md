# Daily Pulse Notification Mockup — Landing Page

**Date:** 2026-05-01
**Section:** Nervous System (dark section, `app/landing/page.tsx`)
**Scope:** Add an inline notification + Sage insight visual within the existing dark Nervous System section. No new page sections. No image files.

---

## Goal

Show visitors the complete daily habit loop — Bookwise notifies you, you log in 60 seconds, Sage responds with an insight — using a minimal inline mockup that lives inside the existing dark Nervous System section.

---

## Placement

Inside the Nervous System section (`background: INK`), between the paragraph text and the habit chips row. The mockup is centered, max-width 480px, with `margin: '0 auto 52px'` matching the paragraph's bottom spacing before the chips.

---

## Visual Components

Two cards rendered side by side (desktop) or stacked (mobile), no phone frame.

### Card 1 — Push Notification

Styled like an iOS notification banner. Dark frosted glass matching the section's existing chip style.

```
background: rgba(245,242,236,0.07)
border: 1px solid rgba(245,242,236,0.12)
borderRadius: 16px
padding: 14px 18px
```

Layout:
- Top row: Bell icon (18px, `var(--color-primary)` / SAGE) + **"Bookwise"** label (12px, 600, CREAM) + "now" (11px, MUTED right-aligned)
- Body: "Your 5 PM check-in is ready. Sixty seconds and you're done. How did today go?" (14px, `rgba(245,242,236,0.75)`, lineHeight 1.55)

### Connector

On desktop: a small ArrowRight icon (14px, MUTED) between the two cards, vertically centered.
On mobile: hidden (cards stack, arrow implied by order).

### Card 2 — Sage Insight Response

Same frosted glass style as Card 1.

Layout:
- Top row: MessageCircle icon (14px, SAGE) + **"Sage AI insight"** label (11px, 600, SAGE)
- Body: "Income up 12% this week. Your busiest Tuesday yet." (14px, CREAM, lineHeight 1.55)

---

## Responsive Behavior

- **Desktop:** Cards side by side in a flex row, `gap: 12px`, `alignItems: center`. ArrowRight connector visible between them.
- **Mobile:** Cards stacked in a flex column, `gap: 10px`. ArrowRight hidden.
- Both cards: `flex: 1` on desktop, `width: 100%` on mobile.

---

## Icons Used

All already imported in `app/landing/page.tsx`:
- `Bell` (from lucide-react) — notification card
- `ArrowRight` — connector
- `MessageCircle` — Sage card

Verify `Bell` is in the existing import block. If not, add it to the lucide-react import.

---

## Copy

**Notification body:**
"Your 5 PM check-in is ready. Sixty seconds and you're done. How did today go?"

**Sage insight body:**
"Income up 12% this week. Your busiest Tuesday yet."

---

## What Does Not Change

- The paragraph above (the condensed nervous system copy) stays untouched.
- The three habit chips row (`Clock`, `TrendingUp`, `Shield`) stays at the bottom of the section, unchanged.
- No existing cards are removed from the Features section.
- No image files are added to `public/`.

---

## Implementation Notes

- The paragraph above the notification group currently has `margin: '0 0 52px'`. Reduce it to `'0 0 32px'` since the notification group now carries the spacing before the chips.
- Give the notification group wrapper `margin: '0 0 40px'` to space it from the habit chips row.
- Wrap both cards and the connector in a `FadeIn` component (already defined in the file) with `delay={0.1}`.
- The two-card group sits between the `<p>` paragraph and the `<div>` habit chips row in the Nervous System section JSX.
- Do not use Tailwind classes for layout. All styles are inline `React.CSSProperties` objects, consistent with the rest of the file.
- The `Bell` icon may need to be added to the lucide-react import. Check line ~4 of the file before editing.
