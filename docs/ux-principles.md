# Bookwise UX Principles

Living document. Updated as research informs decisions.

---

## Who we are building for

Solo practitioners: coaches, personal trainers, bodyworkers (massage, acupuncture, somatic). They are skilled at their craft. They are not financially trained. Many find money management stressful or anxiety-inducing. They did not become a bodyworker because they love spreadsheets.

Key traits that shape every design decision:
- Irregular income — feast/famine cycles create background financial anxiety
- No accounting background — terms like "accounts receivable", "COGS", "net profit" require translation
- Time-poor — they are booked with clients; the app gets 2-3 minutes of attention, not 20
- Goal-oriented but not data-hungry — they want to know "am I okay?" not "show me all the numbers"
- Mobile-first — likely checking the app between clients on their phone

---

## Visualization principles

**Use progress bars. Avoid pie/donut charts.**

Research finding (April 2026): Non-financial users (documented case: school teachers) consistently misread donut charts — they misinterpret the empty center as a second data category, and brains compare arc angles poorly versus bar lengths. When the same financial data was presented as a bar/progress format, comprehension improved immediately.

Progress bars are also emotionally better: they show a finish line, which reduces financial anxiety. "You're 65% there" is reassuring. A half-full donut is ambiguous.

**Decision made:** Dashboard bucket visualization uses tile cards with progress bars. No donut/pie charts anywhere in the app.

**Use large, Fraunces-bold numbers for primary metrics.** The single most important number on any screen should be instantly scannable at 36-40px. Supporting context is secondary and can hide behind a tap.

---

## Language principles

The IQ Engine handles industry-specific translation. These are the broader language rules:

- **No financial jargon at all** — not even "net profit" on the main dashboard. "Take-home" is the word.
- **Warm, not clinical** — "Set aside so you're never surprised at tax time" beats "Tax liability reserve"
- **Short** — every label, description, and explainer should be one sentence. If it needs two, it's too complex.
- **No em dashes** (per CLAUDE.md) — they read as formal/corporate
- **No "you should", "you owe", "you must"** — directive language triggers anxiety. Use "set aside", "here's what the numbers show"

---

## Anxiety reduction

Financial apps are among the highest-anxiety app categories. Design decisions that increase anxiety:
- Showing $0.00 in circles/gauges with no context (empty = broken = bad)
- Showing large numbers without framing ("$1,200 in taxes" vs "25% set aside — you're covered")
- Requiring decisions before showing value
- Charts that require interpretation

Design decisions that reduce anxiety:
- Progress bars with a visible finish line
- Warm empty states that explain what will happen, not what's missing
- Celebrating small wins (confetti on Secure My Pay, not just task completion)
- Sage's observations framed as patterns, never warnings

---

## Cognitive load budget

Research finding: every additional second of cognitive load in a finance app increases abandonment by 7%.

Rules that follow:
- One primary action per screen
- Primary metrics visible without scrolling
- "What is this?" expands inline — never navigates away
- Filter controls collapse when not needed
- No modals for information — only for confirmation of destructive/irreversible actions

---

## Research findings log

| Date | Question | Finding | Decision |
|---|---|---|---|
| 2026-04-27 | Are donut charts helpful for non-financial users? | No — bar/progress formats comprehend significantly better | Removed donut chart from dashboard toggle |
| 2026-04-27 | Do progress bars reduce financial anxiety? | Yes — they create a "finish line" that makes goals feel achievable | Progress bars on all bucket tiles |
| 2026-04-27 | Does showing "% to goal" help or confuse? | Can overwhelm when combined with dollar amounts — simplify to one primary number | Big funded amount + thin bar only; detail behind "What is this?" tap |
