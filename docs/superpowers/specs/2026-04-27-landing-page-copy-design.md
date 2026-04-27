# Landing Page Copy Update — Design Spec
**Date:** 2026-04-27
**Approach:** B — Copy rewrite + IQ Engine elevation
**Source guidance:** BOARD.md advisors (Sabrina, April, Tara, Maya, Tobias, Jordan, Keila)

---

## App-Wide Font Change

Replace Fraunces with **Lora** for all serif/header usage across the entire app.

- In `app/layout.tsx`: swap `Fraunces` import for `Lora` (weights 400, 600, 700) from `next/font/google`
- Update the `--font-serif` CSS variable assignment to use the Lora variable
- Applies to: all page headers, metric numbers, card titles, pull quotes, and any element using `var(--font-serif)` or `font-family: var(--font-serif)`
- Body font (Plus Jakarta Sans) stays unchanged

---

## Structural Change

Move the IQ Engine demo section from position 4 to position 2 (immediately after the hero). This surfaces the product's positioning moat — the IQ Engine — before any other content, which is the single most important change for the buildathon demo.

**New section order:**
1. Nav
2. Hero
3. IQ Engine Demo
4. Stats
5. Pull Quote
6. Features
7. Who It's For
8. FAQ
9. Waitlist
10. Final CTA
11. Footer

---

## Section-by-Section Copy

### Nav
No changes.

---

### Hero

**Badge:** "Built for wellness professionals" (unchanged)

**Headline:**
> Keep more of what you earn.

**Subheadline:**
> Most practitioners track income in a notebook and guess at taxes every quarter. Bookwise gives you the clear picture your practice has always needed. No spreadsheets. No jargon. No anxiety.

**CTAs:** "Start free" + "See how it works" (unchanged)

---

### IQ Engine Demo

**Section label:** Your language

**Headline:**
> Your numbers, translated.

**Subheadline:**
> Bookwise translates your business numbers into plain language for your profession, so you always know where you stand.

**Demo card:** unchanged (industry toggle + animated label rows)

---

### Stats

| Stat | Descriptor |
|------|------------|
| 3 | industries supported out of the box |
| 100% | mobile, no desktop required |
| 1 | export, organized by tax category for your CPA |

---

### Pull Quote
No changes.
> "I used to avoid looking at my numbers. Now I check them every morning."
> — Massage therapist, 8 years in practice

---

### Features

New order: Money Buckets, Tax Set-Aside, Sage Insights, Receipt Scanning, Google Drive Sync, CPA Export.

**Money Buckets**
> Every dollar you earn flows into three buckets: Growth Fund, Tax Set-Aside, and Daily Operations, so you always know at a glance whether your practice is working for you.

**Tax Set-Aside**
> Based on your monthly income, Bookwise shows you exactly how much to set aside for taxes using a recommended 25% safety rate, so you always know what to put away before the quarterly deadline.

**Sage Insights**
> Sage reads your numbers each day and tells you what it sees: patterns in your income, shifts in your expenses, and observations explained in plain language anyone can understand.

**Receipt Scanning**
> Snap a photo of any receipt and Sage reads the amount, date, and category for you, then files it automatically into your connected Google Drive account.

**Google Drive Sync**
> Your receipts and exports are automatically organized in a dedicated Google Drive folder, so your records are always backed up and audit ready.

**CPA Export**
> One tap generates a clean export organized by Schedule C line, with every transaction dated, categorized, and noted, so your CPA can prepare your taxes faster instead of sorting your files.

---

### Who It's For

**Headline:**
> Made for practitioners, not accountants.

**Cards:** unchanged (Coaches, Trainers, Bodyworkers with emoji and bullet lines)

---

### FAQ

Fix only: data safety answer double hyphen replaced with a period.

**Before:** "Your data lives in Supabase with row-level security -- only you can access your records."
**After:** "Your data lives in Supabase with row-level security. Only you can access your records. We never sell or share your data."

All other Q&A pairs unchanged.

---

### Waitlist

**Headline:**
> Your practice deserves better than a notebook.

**Subheadline:**
> Join the waitlist and be first in when we open. Founding members lock in their rate before we go public.

**Form and success state:** unchanged

---

### Final CTA

**Headline:**
> Keep more of what you earn.

**Subheadline:**
> Start free, no credit card required. Your first entry takes less than a minute.

**Button:** "Get started free" (unchanged)

---

### Footer
No changes.

---

## Board Alignment Notes

- **Sabrina:** IQ Engine elevated to position 2 — the unfair advantage is the first scroll after the hero.
- **April:** Headline leads with practitioner benefit not product capability. "Made for practitioners, not accountants" is explicit positioning.
- **Tara:** Hero subheadline leads with the emotional problem (notebook, guessing at taxes). Waitlist headline reinforces that the practitioner's situation deserves better.
- **Maya:** No accounting jargon in any headline. "Snap a photo" not "point your camera." Plain language throughout.
- **Tobias:** Sage is never described as AI. No "AI companion" language anywhere.
- **Jordan:** 25% is framed as "recommended safety rate" not a guarantee. No "will," "should," or "guaranteed" anywhere.
- **Keila:** Tax Set-Aside copy clarifies this is a recommendation for the user to act on, not automatic fund movement.

---

## Mobile and Desktop Optimization

The landing page must render correctly at all common breakpoints. The existing 768px breakpoint handles mobile vs. desktop layout switches but must be verified and fixed for:

- Desktop (1024px+): max-width container centered, stats in a single row, WHO cards in a 3-column grid, hero text at full size, feature cards readable at wider widths
- Tablet (768px–1023px): same as desktop layout, padding adjusted
- Mobile (375px–767px): single column, reduced font sizes, stacked CTAs, 2-column stats grid

Implementation must test at 375px, 768px, and 1280px viewports before marking complete.

---

## What Does Not Change

- Section layout, animations, and component structure
- IQ demo interaction (industry toggle, animated rows)
- All form logic (waitlist, session check)
- Footer disclaimer
- Pull quote
- WHO card content (emoji, titles, bullet lines)
- Nav button labels and links
- CTA button labels and links
