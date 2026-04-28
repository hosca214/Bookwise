# Bookwise Roadmap

Living document. Updated as priorities shift.

---

## Shipped

- **Phase 1** -- Scaffold and Auth
- **Phase 2** -- Onboarding
- **Phase 3** -- Dashboard (Reservoirs)
- **Phase 4** -- Ledger
- **Phase 5** -- Sage API + OCR
- **Phase 6** -- Reports
- **Phase 7** -- Settings

---

## In Progress

- **Ledger Enhancements** -- search, category filter, month filter, totals bar, receipt red dot, FAB label, personal toggle redesign (`···` menu). Plan: `docs/superpowers/plans/2026-04-27-ledger-enhancements.md`
- **Dashboard Redesign** -- replace reservoir circles with tile cards (Growth Fund, Tax Set-Aside, Daily Operations). Zero state shows concept, not $0 targets. Plan: `docs/superpowers/plans/2026-04-27-owner-pay-dashboard-redesign.md`

---

## Queued

- **Demo Data + QA** -- bodyworker full account + coach full account + trainer IQ spot-check + fresh onboarding account. All in `lib/demo-seed.sql`.
- **Review Reminder** -- dashboard nudge card + ledger nav badge to prompt users to mark personal expenses. Keeps books tax-ready.
- **Language Audit** -- change "funded" to "set aside" everywhere. Buckets track intention, not actual bank deposits.

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
