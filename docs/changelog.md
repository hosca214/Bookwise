# Bookwise Changelog

Tracks every change pushed to `main` on hosca214/Bookwise, in reverse chronological order.

---

## Apr 28, 2026 — Commit 2be395e

**Landing page redesign, dashboard updates, minor fixes**

### Landing Page (`app/landing/page.tsx`)
- Full visual redesign: alternating cream and dark (INK) sections separated by SVG wave dividers
- Hero converted to two-column layout: marketing copy left, animated phone mockup right (desktop only)
- Grain overlay component added for premium paper texture
- Rotating inline profession word (coaches / trainers / bodyworkers) cycles every 2.6s
- Color system migrated from CSS variables to named constants (INK, CREAM, SAGE, GOLD, DANGER, etc.)
- All phone mockups updated from donut/ring charts to BucketRow + MiniBar flat cards, matching real dashboard UI
- Feature preview modal phone screens updated to match
- Waitlist CTA section converted to full dark panel

### Dashboard (`app/dashboard/page.tsx`)
- Various tile and layout updates from prior session work

### Login / Settings
- Minor copy and style fixes

### BOARD.md
- Advisory framework notes added

---

## Apr 28, 2026 — Commit 158b81a

**Schedule C surface, Sage pay_yourself mode, onboarding copy, year-at-a-glance chart**

### Change 1: Schedule C in Ledger (`app/ledger/page.tsx`)
- Add transaction form: helper text appears below category select when a mapping exists: "For your taxes, this goes under: [category name] (Schedule C)"
- Transaction rows: quiet pill badge showing the plain-English Schedule C category name (no "Schedule C" label on badge itself)
- No mapping = nothing shown. No tooltips, no modals, no required fields.

### Change 2: Sage pay_yourself mode (`app/api/sage/route.ts`)
- New `pay_yourself` mode added (distinct from existing `pay_guidance`)
- Tone: warm and direct, like a financially literate friend. Leads with what they CAN do.
- If numbers support paying: says so clearly with the specific dollar amount
- If leaner month: acknowledges without alarm, notes tax reserve status
- Never says "recommend" or "you should consider." Ends with one specific encouraging line.
- New `seasonality_insight` mode also added (used by reports year chart Sage callout)

### Change 3: Onboarding language audit (`app/onboarding/page.tsx`)
Three strings rewritten to remove finance jargon:

| Step | Before | After |
|---|---|---|
| Step 2, account card | "business income and expenses in a dedicated account" | "business income and spending in a separate account" |
| Step 5, subtitle | "Operations covers what remains" | "Your day-to-day costs cover what remains" |
| Step 5, Operations desc | "This is your cost of doing business each month." | "This is what it costs to keep your practice running each month." |

### Change 4: Year at a Glance in Reports (`app/reports/page.tsx`)
- New section added below the P&L card: "Your Year at a Glance" (Fraunces heading)
- 12-month income bar chart for current calendar year, excluding personal transactions
- Income axis labeled using `t('Income')` from IQ Engine, never the word "revenue"
- Sage callout card below chart: calls `/api/sage` with `seasonality_insight` type
  - Identifies two lowest and two highest months, gives one practical sentence
  - If fewer than 3 months of data: shows "Once you have a few months in, Sage will start spotting patterns. Keep logging." and does not call the API
- CSS skin variables only, no hardcoded hex values
- `recharts` added as dependency for bar chart rendering

### Global (this commit)
- Pre-existing em dash in Reports Accountant View description fixed
- All four modified files confirmed clean of banned words (revenue, COGS, receivable, payable, accounting, em dashes)

---

## Apr 27, 2026 — Commit f90ebce

**Ledger enhancements and dashboard tile redesign**

### Dashboard (`app/dashboard/page.tsx`)
- SVG reservoir circles replaced with progress-bar tile cards for Growth Fund, Tax Set-Aside, and Daily Operations
- Zero state: warm callout card instead of empty gauges

### Ledger (`app/ledger/page.tsx`)
- Search input across category and notes
- All / Income / Expenses type toggle
- Multi-select category chips (filtered by active type)
- 3-month chip filter + All time option
- Totals strip: income, expenses, net (or filtered totals)
- Empty-filtered state with Clear filters button
- Red dot indicator on expense rows missing a receipt
- Floating Add Entry button labeled and with stronger shadow

### Docs
- `docs/roadmap.md` created
- `docs/ux-principles.md` created

---

## Notes

- All financial labels go through `t()` from IQContext. Never hardcoded.
- Sage never says: revenue, COGS, receivable, payable, you should, file your taxes, I recommend.
- No em dashes anywhere in UI copy.
- `is_personal = true` transactions excluded from all financial calculations.
- Design system: CSS skin variables (`var(--color-*)`) only. No hardcoded hex in components.
