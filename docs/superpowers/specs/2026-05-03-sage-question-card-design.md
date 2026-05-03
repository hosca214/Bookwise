# Sage Has a Question — Transaction Review Card

**Date:** 2026-05-03
**Status:** Approved
**Scope:** Demo data + Daily Pulse UI only. No rules/learning system in this phase.

---

## What We Are Building

Two ambiguous demo transactions with raw bank-style notes are added to the demo seed. The existing "Needs a category" block inside the Daily Pulse section is replaced with a richer card — "Sage has a question" — that shows an AI-suggested category the user can accept in one tap, or override by typing a freeflow description that Sage interprets.

---

## 1. Database Changes

### New columns on `transactions`

```sql
alter table transactions add column if not exists ai_suggested_category text;
alter table transactions add column if not exists ai_suggestion_reason   text;
```

These are nullable. Only populated when Sage has a confident suggestion for an uncategorized transaction. All existing transactions are unaffected.

The dashboard query already fetches `transactions` — the select just needs these two fields added.

---

## 2. Demo Seed Data

Two transactions added to the current month block in `lib/demo-seed.sql`. Both are flagged `Other Expense` / `Other Income` so they surface in the review card. Both carry pre-populated suggestion fields.

**Transaction 1 — ambiguous expense**

| Field | Value |
|---|---|
| notes | `AMZN MKTP US*BT7R4 SEATTLE WA` |
| amount | 89.47 |
| type | expense |
| category_key | `Other Expense` |
| ai_suggested_category | `Supplies` |
| ai_suggestion_reason | `Looks like an online product purchase. Linens, oils, and tools often come through here.` |

**Transaction 2 — ambiguous income**

| Field | Value |
|---|---|
| notes | `VENMO PAYMENT D MORRISON` |
| amount | 130.00 |
| type | income |
| category_key | `Other Income` |
| ai_suggested_category | `Session Income` |
| ai_suggestion_reason | `Looks like a client payment. If this was for an appointment, mark it as Appointment Income.` |

Both use `source: 'manual'` consistent with all other demo transactions.

---

## 3. Dashboard State Changes

`needsReviewTxs` type expands to include the two new fields:

```typescript
Array<{
  id: string
  date: string
  amount: number
  type: string
  category_key: string
  notes: string | null
  ai_suggested_category: string | null
  ai_suggestion_reason: string | null
}>
```

Two new state values per pending transaction:
- `showReason: Record<string, boolean>` — controls reason tooltip visibility per transaction id
- `editingTx: Record<string, string>` — freeflow input value per transaction id

---

## 4. UI — "Sage Has a Question" Block

Replaces the existing "Needs a category" block inside the Daily Pulse card. Appears only when `needsReviewTxs.length > 0`. Sits in the same position (after Save Pulse button, above the streak line).

### Section header

```
● SAGE HAS A QUESTION          (red dot, uppercase, 13px, same style as today)
Help Sage learn. Confirming these keeps your numbers accurate.
                               (13px muted, 1.5 line height)
```

### Per-transaction card

```
┌─────────────────────────────────────────────┐
│ May 3 · AMZN MKTP US*BT7R4 SEATTLE WA  -$89.47 │
│                                               │
│ ┌─────────────────────────────────────┐       │
│ │ ✓ Supplies  ⓘ                       │       │  ← suggestion pill, pre-selected
│ └─────────────────────────────────────┘       │
│                                               │
│ [category pills: Supplies / Software / ...]   │  ← existing pill row (unchanged)
│                                               │
│ Or tell Sage what this is...          [Edit]  │  ← collapsed by default
└─────────────────────────────────────────────┘
```

**Suggestion pill:**
- Styled distinctly from the category pills — bordered, with a checkmark prefix and the category name
- Tapping the `ⓘ` icon toggles display of `ai_suggestion_reason` inline (13px italic, muted)
- Tapping the pill itself is the "accept" action — same effect as tapping a category pill

**Category pills (existing behavior, unchanged):**
- Still present below the suggestion pill
- User can bypass the suggestion and pick any category directly

**"Or tell Sage what this is..." / Edit:**
- One line of muted placeholder text + an "Edit" link (12px, primary color)
- Tapping "Edit" expands a textarea: `placeholder="Describe this transaction..."`
- A "Ask Sage" button submits the freeflow text
- On submit: POST to `/api/sage` with `type: 'categorize'`, passing the raw note + user's description
- Sage returns a `{ category_key: string }` — updates the transaction and removes the card
- While waiting: button shows "Thinking..." and is disabled
- On API failure: inline error "Sage could not read that. Try a category above."

**Accepting any category (pill or suggestion):**
- `supabase.from('transactions').update({ category_key: cat }).eq('id', tx.id)`
- Removes the card from `needsReviewTxs` immediately (optimistic)
- No toast — the card disappearing is the confirmation

---

## 5. Sage API — New Type: `categorize`

`app/api/sage/route.ts` receives a new `type: 'categorize'` case.

**Request body:**
```json
{
  "type": "categorize",
  "context": {
    "industry": "bodyworker",
    "rawNote": "AMZN MKTP US*BT7R4 SEATTLE WA",
    "userDescription": "I bought massage oil and new sheets",
    "transactionType": "expense"
  }
}
```

**System prompt addition:**
Sage receives the full IQ category list for the user's industry and must return exactly one `category_key` from that list. Response is JSON only: `{ "category_key": "Supplies" }`. Max tokens: 60.

The `categorize` type returns `{ category_key: string }` — a different shape from all other types which return `{ insight: string }`. The route handler must branch on `type` before parsing the response. The client reads `data.category_key`, not `data.insight`.

**Valid expense category keys:** `Supplies`, `Equipment`, `Software`, `Rent`, `Insurance`, `Marketing`, `Mileage`, `Meals`, `Professional Services`, `Continuing Education`, `Other Expense`

**Valid income category keys:** `Session Income`, `Package Income`, `Tip Income`, `Other Income`

---

## 6. What Is Not in This Phase

- Categorization rules / learning system — deferred
- Auto-applying rules to future transactions — deferred
- Ambiguous vendor detection — deferred
- Surfacing rules in Settings — deferred

The freeflow path updates the one transaction. Nothing is saved for reuse.

---

## Out-of-Scope Guardrails

- The two new columns are nullable — existing transaction inserts require no changes
- The demo seed `DELETE FROM transactions WHERE user_id = demo_id` already handles re-runs cleanly
- No spinner anywhere — existing skeleton pattern used for the "Thinking..." state if needed; button text change is sufficient here
- All financial labels still go through `t()` — category names shown in pills use `t(cat)`
- The `ⓘ` reason text is plain English, not passed through `t()` (it comes from the DB, not the IQ map)
