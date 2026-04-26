# IQ_ENGINE.md
# Bookwise IQ Engine — AI Language Layer
# Version 1.0

---

## What the IQ Engine Is

The IQ Engine is the defining innovation of Bookwise. It is a global language
translation layer that sits between the financial data and every word the user
sees on screen. When a user selects their industry during onboarding, the entire
application re-renders using their vocabulary.

A massage therapist never reads the word "revenue." A coach never reads
"accounts receivable." They see their practice, in their language, as if
the app was built specifically for them.

The IQ Engine is implemented as a React context (IQContext) that exposes a
single translation function: t(key). Every user-facing financial label in
the app calls t() instead of hardcoding text. The key is always the accounting
term. The output is the industry-appropriate human term.

There are two modes:
- IQ Mode (default): user sees their industry language
- Accountant View (toggle on P&L and Reports only): user sees standard terms

---

## Industry Research Notes

All terminology below was validated against how practitioners in each
field actually speak and operate their businesses. Key finding:
all three industries use "clients" as their primary term for the
people they serve. The differentiation is in how they describe
their work, their income types, and their specific expenses.

Coaches: income is structured around retainers, packages, and programs.
Expenses cluster around platforms, certifications, and marketing.
They talk about their "practice" or "business" and measure success
in client transformations and retention.

Personal trainers: income is structured around sessions, memberships,
and packages. Expenses cluster around gym fees, equipment, and insurance.
They talk about "clients" and "members" (for subscription models) and
measure success in session volume and retention.

Bodyworkers (massage therapists, somatic practitioners, energy healers):
income is structured around appointments and packages. Expenses cluster
around supplies, linens, table rental, oils, and CE credits. They use
"table time" to describe their core service delivery. They talk about
their "practice" and measure success in appointment volume and repeat bookings.

---

## The Complete IQ Language Map

This is the single source of truth. Every component in the app must
reference this map via IQContext. No hardcoded user-facing financial labels.

```typescript
// lib/iqMaps.ts

export type Industry = 'coach' | 'trainer' | 'bodyworker'

export interface IQMap {
  // People
  'Clients': string
  'Client': string

  // Income
  'Income': string
  'Revenue': string
  'Session Income': string
  'Package Income': string
  'Retainer Income': string
  'Tip Income': string
  'Other Income': string

  // Core work terms
  'Session': string
  'Sessions': string
  'Appointment': string
  'Appointments': string
  'Table Time': string
  'Hours Worked': string

  // Expenses (categories)
  'Expenses': string
  'Business Expenses': string
  'Supplies': string
  'Equipment': string
  'Software': string
  'Rent': string
  'Facility Fee': string
  'Insurance': string
  'Continuing Education': string
  'Marketing': string
  'Mileage': string
  'Meals and Entertainment': string
  'Professional Services': string
  'Utilities': string
  'Phone': string
  'Internet': string
  'Other Expense': string

  // Money buckets
  'Profit Bucket': string
  'Tax Bucket': string
  'Operations Bucket': string
  'Growth Fund': string
  'Tax Set-Aside': string
  'Daily Operations': string

  // Pay yourself
  'Owner Pay': string
  'Pay Myself': string
  'Take-Home': string

  // Reports and documents
  'Profit and Loss': string
  'Balance Sheet': string
  'Net Profit': string
  'Gross Income': string
  'Total Expenses': string
  'Practice Summary': string
  'Tax Estimate': string

  // Ledger labels
  'Transaction': string
  'Transactions': string
  'Category': string
  'Source': string
  'Amount': string
  'Notes': string

  // Dashboard
  'My Dash': string
  'Daily Pulse': string
  'Sessions Given': string
  'Miles Driven': string

  // Reports toggle
  'My Language': string
  'Accountant View': string

  // Sage (AI mentor) - how Sage refers to the practice
  'your practice': string
  'your work': string
  'your clients': string
}

export const IQ_MAPS: Record<Industry, IQMap> = {

  coach: {
    // People
    'Clients': 'Clients',
    'Client': 'Client',

    // Income
    'Income': 'Income',
    'Revenue': 'Income',
    'Session Income': 'Coaching Income',
    'Package Income': 'Program Income',
    'Retainer Income': 'Retainer Income',
    'Tip Income': 'Tip',
    'Other Income': 'Other Income',

    // Core work terms
    'Session': 'Coaching Session',
    'Sessions': 'Coaching Sessions',
    'Appointment': 'Session',
    'Appointments': 'Sessions',
    'Table Time': 'Coaching Hours',
    'Hours Worked': 'Hours Coached',

    // Expenses
    'Expenses': 'Business Expenses',
    'Business Expenses': 'Business Expenses',
    'Supplies': 'Office Supplies',
    'Equipment': 'Tools and Tech',
    'Software': 'Platforms and Apps',
    'Rent': 'Studio or Office Rent',
    'Facility Fee': 'Coworking or Space Fee',
    'Insurance': 'Liability Coverage',
    'Continuing Education': 'Certifications and Training',
    'Marketing': 'Client Attraction',
    'Mileage': 'Client Travel',
    'Meals and Entertainment': 'Client Meetings',
    'Professional Services': 'Professional Support',
    'Utilities': 'Utilities',
    'Phone': 'Phone',
    'Internet': 'Internet',
    'Other Expense': 'Other Business Cost',

    // Buckets
    'Profit Bucket': 'Growth Fund',
    'Tax Bucket': 'Tax Set-Aside',
    'Operations Bucket': 'Daily Operations',
    'Growth Fund': 'Growth Fund',
    'Tax Set-Aside': 'Tax Set-Aside',
    'Daily Operations': 'Daily Operations',

    // Pay
    'Owner Pay': 'Pay Myself',
    'Pay Myself': 'Pay Myself',
    'Take-Home': 'Take-Home',

    // Reports
    'Profit and Loss': 'Practice Summary',
    'Balance Sheet': 'What I Own vs. What I Owe',
    'Net Profit': 'Take-Home',
    'Gross Income': 'Total Coaching Income',
    'Total Expenses': 'Total Business Costs',
    'Practice Summary': 'Practice Summary',
    'Tax Estimate': 'Tax Set-Aside Estimate',

    // Ledger
    'Transaction': 'Entry',
    'Transactions': 'Entries',
    'Category': 'Type',
    'Source': 'Where it came from',
    'Amount': 'Amount',
    'Notes': 'Notes',

    // Dashboard
    'My Dash': 'My Dash',
    'Daily Pulse': 'Daily Pulse',
    'Sessions Given': 'Sessions Coached Today',
    'Miles Driven': 'Miles to Clients',

    // Toggle
    'My Language': 'My Language',
    'Accountant View': 'Accountant View',

    // Sage voice
    'your practice': 'your coaching practice',
    'your work': 'your coaching',
    'your clients': 'your clients',
  },

  trainer: {
    // People
    'Clients': 'Clients',
    'Client': 'Client',

    // Income
    'Income': 'Income',
    'Revenue': 'Income',
    'Session Income': 'Training Income',
    'Package Income': 'Package Income',
    'Retainer Income': 'Membership Income',
    'Tip Income': 'Tip',
    'Other Income': 'Other Income',

    // Core work terms
    'Session': 'Training Session',
    'Sessions': 'Training Sessions',
    'Appointment': 'Session',
    'Appointments': 'Sessions',
    'Table Time': 'Floor Time',
    'Hours Worked': 'Hours Trained',

    // Expenses
    'Expenses': 'Gym Expenses',
    'Business Expenses': 'Gym Expenses',
    'Supplies': 'Consumables',
    'Equipment': 'Gym Equipment',
    'Software': 'Fitness Apps',
    'Rent': 'Gym or Studio Fee',
    'Facility Fee': 'Facility Fee',
    'Insurance': 'Liability Coverage',
    'Continuing Education': 'Certifications and CECs',
    'Marketing': 'Client Attraction',
    'Mileage': 'Travel to Sites',
    'Meals and Entertainment': 'Client Meetings',
    'Professional Services': 'Professional Support',
    'Utilities': 'Utilities',
    'Phone': 'Phone',
    'Internet': 'Internet',
    'Other Expense': 'Other Business Cost',

    // Buckets
    'Profit Bucket': 'Growth Fund',
    'Tax Bucket': 'Tax Set-Aside',
    'Operations Bucket': 'Daily Operations',
    'Growth Fund': 'Growth Fund',
    'Tax Set-Aside': 'Tax Set-Aside',
    'Daily Operations': 'Daily Operations',

    // Pay
    'Owner Pay': 'Pay Myself',
    'Pay Myself': 'Pay Myself',
    'Take-Home': 'Take-Home',

    // Reports
    'Profit and Loss': 'Performance Report',
    'Balance Sheet': 'What I Own vs. What I Owe',
    'Net Profit': 'Take-Home',
    'Gross Income': 'Total Training Income',
    'Total Expenses': 'Total Gym Costs',
    'Practice Summary': 'Performance Report',
    'Tax Estimate': 'Tax Set-Aside Estimate',

    // Ledger
    'Transaction': 'Entry',
    'Transactions': 'Entries',
    'Category': 'Type',
    'Source': 'Where it came from',
    'Amount': 'Amount',
    'Notes': 'Notes',

    // Dashboard
    'My Dash': 'My Dash',
    'Daily Pulse': 'Daily Pulse',
    'Sessions Given': 'Sessions Trained Today',
    'Miles Driven': 'Miles Traveled',

    // Toggle
    'My Language': 'My Language',
    'Accountant View': 'Accountant View',

    // Sage voice
    'your practice': 'your training business',
    'your work': 'your training',
    'your clients': 'your clients',
  },

  bodyworker: {
    // People
    'Clients': 'Clients',
    'Client': 'Client',

    // Income
    'Income': 'Income',
    'Revenue': 'Income',
    'Session Income': 'Appointment Income',
    'Package Income': 'Package Income',
    'Retainer Income': 'Membership Income',
    'Tip Income': 'Tip',
    'Other Income': 'Other Income',

    // Core work terms
    'Session': 'Appointment',
    'Sessions': 'Appointments',
    'Appointment': 'Appointment',
    'Appointments': 'Appointments',
    'Table Time': 'Table Time',
    'Hours Worked': 'Hours on the Table',

    // Expenses
    'Expenses': 'Practice Expenses',
    'Business Expenses': 'Practice Expenses',
    'Supplies': 'Linens and Supplies',
    'Equipment': 'Treatment Supplies',
    'Software': 'Booking Tools',
    'Rent': 'Treatment Room Rent',
    'Facility Fee': 'Suite or Room Fee',
    'Insurance': 'Liability Coverage',
    'Continuing Education': 'CE Credits and Training',
    'Marketing': 'Client Attraction',
    'Mileage': 'Travel to Clients',
    'Meals and Entertainment': 'Client Meetings',
    'Professional Services': 'Professional Support',
    'Utilities': 'Utilities',
    'Phone': 'Phone',
    'Internet': 'Internet',
    'Other Expense': 'Other Practice Cost',

    // Buckets
    'Profit Bucket': 'Growth Fund',
    'Tax Bucket': 'Tax Set-Aside',
    'Operations Bucket': 'Daily Operations',
    'Growth Fund': 'Growth Fund',
    'Tax Set-Aside': 'Tax Set-Aside',
    'Daily Operations': 'Daily Operations',

    // Pay
    'Owner Pay': 'Pay Myself',
    'Pay Myself': 'Pay Myself',
    'Take-Home': 'Take-Home',

    // Reports
    'Profit and Loss': 'Practice Summary',
    'Balance Sheet': 'What I Own vs. What I Owe',
    'Net Profit': 'Take-Home',
    'Gross Income': 'Total Appointment Income',
    'Total Expenses': 'Total Practice Costs',
    'Practice Summary': 'Practice Summary',
    'Tax Estimate': 'Tax Set-Aside Estimate',

    // Ledger
    'Transaction': 'Entry',
    'Transactions': 'Entries',
    'Category': 'Type',
    'Source': 'Where it came from',
    'Amount': 'Amount',
    'Notes': 'Notes',

    // Dashboard
    'My Dash': 'My Dash',
    'Daily Pulse': 'Daily Pulse',
    'Sessions Given': 'Appointments Today',
    'Miles Driven': 'Miles to Clients',

    // Toggle
    'My Language': 'My Language',
    'Accountant View': 'Accountant View',

    // Sage voice
    'your practice': 'your practice',
    'your work': 'your bodywork',
    'your clients': 'your clients',
  },
}
```

---

## Schedule C Shadow Map (Hidden from User)

This mapping is used only during the CPA export. It never appears in the UI.
When the export runs, each IQ category key is translated to its Schedule C line.
The user's IQ label appears in the "Description" column.
The Schedule C line appears in the "Tax Category" column.

This gives the CPA exactly what they need without the user ever seeing
accounting language.

| Category Key | Schedule C Line | Line Number |
|---|---|---|
| Session Income / Appointment Income / Coaching Income | Gross Receipts or Sales | Line 1 |
| Package Income | Gross Receipts or Sales | Line 1 |
| Retainer Income / Membership Income | Gross Receipts or Sales | Line 1 |
| Tip Income | Other Income | Line 6 |
| Other Income | Other Income | Line 6 |
| Linens and Supplies / Consumables / Office Supplies | Supplies | Line 22 |
| Gym Equipment / Treatment Supplies / Tools and Tech | Supplies | Line 22 |
| Booking Tools / Fitness Apps / Platforms and Apps | Office Expense | Line 18 |
| Treatment Room Rent / Gym or Studio Fee / Studio or Office Rent | Rent on Business Property | Line 20b |
| Liability Coverage | Insurance | Line 15 |
| CE Credits and Training / Certifications and Training / Certifications and CECs | Other Expense | Line 27a |
| Client Attraction | Advertising | Line 8 |
| Travel to Clients / Travel to Sites / Client Travel | Car and Truck Expenses | Line 9 |
| Client Meetings | Meals (50% deductible) | Line 24b |
| Professional Support | Legal and Professional | Line 17 |
| Utilities | Utilities | Line 26 |
| Phone | Utilities | Line 26 |
| Internet | Utilities | Line 26 |
| Other Business Cost / Other Practice Cost / Other Gym Cost | Other Expense | Line 27a |

---

## Toggle Behavior Rules

The Accountant View toggle appears only on:
- The P&L / Practice Summary page
- The Reports page
- The Export preview

It does not appear on:
- The Dashboard
- The Ledger (transaction log)
- The Daily Pulse
- The Onboarding flow
- The Settings pages

When Accountant View is active:
- All t() calls return the raw accounting key instead of the mapped term
- The P&L header changes to "Profit and Loss Statement"
- Section headers use standard accounting labels
- The Schedule C category appears as a secondary label under each line

When Accountant View is off (default):
- All t() calls return the industry-mapped term
- The Schedule C mapping is invisible
- The report header uses the IQ label (e.g., "Practice Summary")

---

## Sage Language Rules

Sage is the AI mentor. Sage always uses IQ language. Sage never switches
to accounting terms even if the user asks directly. If a user asks
"what is my revenue?" Sage responds using their industry term:
"Your coaching income this month is..."

Sage system prompt must include the user's industry and the relevant
IQ vocabulary before every call. See BUILD.md Phase 4 for the full
Sage API implementation.

Sage never says:
- Revenue
- COGS (Cost of Goods Sold)
- Accounts Receivable or Payable
- Net Income (says Take-Home instead)
- Gross Margin
- Depreciation
- Amortization
- Journal Entry
- General Ledger
- You should (financial direction)
- You owe (tax language)
- File your taxes

Sage always says:
- "Your [industry income label] this month..."
- "Here is what your numbers show..."
- "Based on your current balance..."
- "This might be worth a conversation with your CPA..."
- "You are on track..." or "Your numbers are showing something worth noticing..."

---

## Adding New Industries (Expansion Protocol)

When Bookwise expands to new industries, follow this process:

1. Research the actual language used by practitioners in that field.
   Do not guess. Interview at least three practitioners or review their
   professional association materials.

2. Add a new key to the Industry type: `'esthetician' | 'yoga' | 'nutritionist'`

3. Add a new entry to IQ_MAPS with all required keys filled in.
   Every key must have a value. No empty strings.

4. Add the new industry as an option in Step 3 of the Onboarding flow.

5. Update the demo data seed to include a sample profile for the new industry.

6. Test all IQ labels across every page with the new industry selected.

Planned future industries:
- Esthetician / Skin Therapist
- Yoga Teacher / Movement Instructor
- Nutritionist / Dietitian
- Acupuncturist / TCM Practitioner
- Therapist / Counselor (non-medical)
- Virtual Assistant / OBM (adjacent market)
