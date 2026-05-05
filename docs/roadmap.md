# Bookwise Roadmap

Living document. Updated as priorities shift.

---

## Shipped

- **Phase 1** -- Scaffold and Auth
- **Phase 2** -- Onboarding (10 steps, Framer Motion transitions, upserts to Supabase on Step 10)
- **Phase 3** -- Dashboard (Take-Home Pay card, Money Plan tiles, Cost to Show Up, Make a Transfer, Confetti, Celebration modal, Daily Pulse, Sage says card)
- **Phase 4** -- Ledger (transaction list, Add Entry sheet, receipt camera + OCR, personal toggle, Schedule C badge per row)
- **Phase 5** -- Sage API + OCR (daily_insight, pay_guidance, pay_yourself, question, seasonality_insight modes)
- **Phase 6** -- Reports (P&L, accountant toggle, Schedule C export, 6-month bar chart, Year at a Glance, Win Record, CPA CSV export)
- **Phase 7** -- Settings (Service Menu, Vibe picker, Pay Settings, Money Plan sliders, Connected Apps, Account)
- **Ledger Enhancements** -- search, type toggle, multi-select category chips, 3-month chip filter, totals strip, red dot on receipts missing, labeled FAB (Apr 27)
- **Dashboard Redesign** -- tile cards for Growth Fund, Tax Set-Aside, Daily Operations; zero state warm callout replacing empty gauges (Apr 27)
- **Schedule C in Ledger** -- helper text below category select in Add form; quiet pill badge on each transaction row (Apr 28)
- **Dashboard Period Toggle** -- weekly/monthly view on Take-Home Pay card (Apr 30)
- **Landing Hero Clarity** -- two-column hero, animated phone mockup, rotating profession word, wave dividers, grain overlay, dark beta CTA section (Apr 28/30)
- **Onboarding Language Audit** -- jargon removed from Steps 2 and 5 copy (Apr 28)
- **Year at a Glance** -- 12-month income bar chart in Reports with Sage seasonality callout (Apr 28)
- **Persistent View State** -- ledger filter + month selections survive navigation (May 1)
- **Dashboard Simplification** -- layout and card hierarchy cleaned up (May 1)
- **Ledger Simplification** -- row layout tightened, personal toggle as `···` menu (May 1)
- **Sage Has a Question card** -- AI-driven transaction review card on dashboard, replaces old "Needs a category" pulse block (May 3)
- **Demo Infrastructure** -- `/api/demo/seed`, `/api/demo/receipt`, `/api/demo/refresh-receipts` routes; `/demo-setup` admin page (May 3)
- **Landing beta apply form** -- `/api/beta-apply` wired, Resend notification email on submission
- **Terms and Privacy pages** -- `/terms` and `/privacy` routes live

---

## To Do Before Launch

These are the remaining blockers before real users can sign up.

### QA Polish Pass
All items below must be checked before first live deploy. Run through all three industries (coach, trainer, bodyworker) for each.

- [ ] Test all 3 industries on every screen
- [ ] Verify every financial label goes through `t()`
- [ ] Test Midnight vibe on every screen
- [ ] Test 375px viewport (smallest common phone)
- [ ] Confetti fires correctly on Make a Transfer flow
- [ ] OCR populates the Add Entry form from a receipt photo
- [ ] CSV downloads with correct columns and CPA disclaimer row
- [ ] P&L accountant toggle works in both modes
- [ ] Empty states render correctly on a fresh account
- [ ] All loading states use skeleton shimmer, zero spinners
- [ ] No number spinwheels anywhere
- [ ] Remove all `console.log` statements
- [ ] `next build` passes clean with zero errors

### Review Reminder
Dashboard nudge card + ledger nav badge prompting users to mark personal expenses. Keeps books tax-ready. Not yet built.

### Non-Negotiables (pre-launch legal/financial)
- [ ] **Supabase RLS audit** -- hire a developer ($300-500 freelancer) to verify data isolation before real users
- [ ] **Stripe platform verification** -- submit immediately; takes 2-4 weeks to approve
- [ ] **Terms of Service** -- must be live before first signup (Termly recommended)

---

## Partnerships

### Relay Business Banking

**Opportunity:** Recommend Relay during onboarding and on the Secure My Pay screen as the place to hold tax, profit, and operations funds. Relay offers up to 20 real sub-accounts (each with its own routing number), free, built for exactly this workflow.

**Revenue:** Relay Partner Program pays:
- One-time fee on account open
- One-time fee when account becomes funded (within 12 months)
- Monthly revenue share for 24 months

**Compliance benefit:** If users hold money in Relay, Bookwise never touches funds. Relay handles KYC. We remain purely a planning and reporting layer -- zero money transmitter obligations.

**Product story:** "Bookwise tells you what to move. Relay is where you move it."

**Action:** Apply to Relay Partner Program at `relayfi.com/advisor-partner-program` before building any banking integration. Understand payout structure, then wire referral link into onboarding (Step 5 connected apps) and Secure My Pay flow.

---

## Future Consideration

- **Plaid read-only + Relay verification** -- connect read-only to user's Relay sub-accounts, show actual balances vs. targets on dashboard. No transfer permissions needed, zero compliance. Depends on Relay partnership being established first.
- **Stripe Invoicing** -- issue invoices from within Bookwise, auto-import paid invoices as transactions.
- **Mobile app** -- PWA first, then evaluate native wrapper once user base is established.
- **Daily Pulse notification** -- push or email reminder at user's configured pulse time. Mockup done (May 1 plan), not yet built.
