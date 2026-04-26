# CLAUDE.md
# Bookwise — Claude Code Operating Instructions
# Read this file at the start of every session. It is the single source of truth.

---

## What This App Is

Bookwise is a mobile-first PWA bookkeeping app for solo wellness practitioners
(coaches, personal trainers, bodyworkers). The core differentiator is the IQ Engine:
a global language layer that translates every financial term into the user's
industry vocabulary. A massage therapist never sees "revenue." She sees "appointment income."

Stack: Next.js 14 App Router, Supabase (auth + db + storage), Claude API, Tailwind CSS,
Framer Motion, canvas-confetti. Deployed on Vercel.

---

## Non-Negotiable Rules (Never Break These)

1. No em dashes anywhere. Not in UI, not in comments, not in copy.
2. No number spinwheels. All number inputs use large tap targets or increment buttons.
3. Minimum body text: 18px. Primary metrics: 40px bold.
4. All headers: Fraunces (serif). All body: Plus Jakarta Sans.
5. Every user-facing financial label must call t() from IQContext. Never hardcode labels.
6. Sage never says: revenue, COGS, receivable, payable, you should, you owe, file your taxes.
7. All currency: always two decimal places, always preceded by $.
8. Exclude is_personal=true transactions from all financial calculations.
9. The word "accounting" never appears in user-facing UI except on the toggle label.
10. Test every feature with all three industries before marking a phase done.

---

## Design System

### Fonts (load via next/font/google)
- Fraunces: weights 400, 600, 700, 900 — all headers, brand name, metric labels
- Plus Jakarta Sans: weights 400, 500, 600, 700 — all body text

### Two Active Skins (CSS variables in globals.css)

```css
[data-skin="ethereal-sage"] {
  --bg: #F5F2EC;
  --surface: #FFFFFF;
  --primary: #7C9A7E;
  --primary-dark: #4E6E52;
  --accent: #C4A882;
  --text: #2C3528;
  --text-muted: #6B7566;
  --divider: #E0D8CF;
  --danger: #C4714A;
}

[data-skin="midnight-orchid"] {
  --bg: #1E1E26;
  --surface: #2A2A36;
  --primary: #B09FCC;
  --primary-dark: #8A7AAA;
  --accent: #C8C8D0;
  --text: #EEEEF4;
  --text-muted: #9090A0;
  --divider: #3A3A48;
  --danger: #E07070;
}
```

Apply skin by setting data-skin attribute on <html> element.
Default: ethereal-sage.
Store selection in profiles.vibe. Load on auth.

### Component Rules
- Cards: bg var(--surface), border-radius 16px, box-shadow 0 2px 16px rgba(0,0,0,0.06)
- Buttons: border-radius 12px, min height 48px, padding 14px 24px
- Inputs: min height 48px, border 1.5px solid var(--divider), border-radius 10px
- Mobile nav: fixed bottom tab bar, four tabs, 60px height
- All layouts: mobile-first, single column, max-width 480px centered on desktop

---

## Database Schema

Run this in Supabase SQL editor before any code.

```sql
create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users primary key,
  practice_name text,
  industry text check (industry in ('coach','trainer','bodyworker')),
  vibe text default 'ethereal-sage',
  daily_pulse_time time default '17:00',
  google_drive_folder_id text,
  tax_rate numeric default 0.25,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  price numeric not null,
  duration_minutes int,
  is_active boolean default true
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  amount numeric not null,
  type text check (type in ('income','expense')),
  category_key text not null,
  notes text,
  is_personal boolean default false,
  source text default 'manual',
  external_id text,
  receipt_url text,
  receipt_filename text,
  pulse_matched boolean default false,
  created_at timestamptz default now()
);

create table daily_pulse (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  sessions_given int default 0,
  hours_worked numeric default 0,
  miles_driven numeric default 0,
  unique(user_id, date)
);

create table buckets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  month date not null,
  profit_target numeric default 0,
  profit_funded numeric default 0,
  tax_target numeric default 0,
  tax_funded numeric default 0,
  ops_target numeric default 0,
  ops_funded numeric default 0,
  unique(user_id, month)
);

alter table profiles enable row level security;
alter table services enable row level security;
alter table transactions enable row level security;
alter table daily_pulse enable row level security;
alter table buckets enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own services" on services for all using (auth.uid() = user_id);
create policy "own transactions" on transactions for all using (auth.uid() = user_id);
create policy "own pulse" on daily_pulse for all using (auth.uid() = user_id);
create policy "own buckets" on buckets for all using (auth.uid() = user_id);
```

---

## IQ Engine

Single source of truth. Every financial label calls t(key) from IQContext.
Never hardcode a financial term in JSX.

```typescript
// lib/iqMaps.ts
export type Industry = 'coach' | 'trainer' | 'bodyworker'

export const IQ_MAPS: Record<Industry, Record<string, string>> = {
  coach: {
    'Income': 'Income',
    'Session Income': 'Coaching Income',
    'Package Income': 'Program Income',
    'Retainer Income': 'Retainer Income',
    'Tip Income': 'Tip',
    'Other Income': 'Other Income',
    'Expenses': 'Business Expenses',
    'Supplies': 'Office Supplies',
    'Equipment': 'Tools and Tech',
    'Software': 'Platforms and Apps',
    'Rent': 'Studio or Office Rent',
    'Facility Fee': 'Coworking Fee',
    'Insurance': 'Liability Coverage',
    'Continuing Education': 'Certifications and Training',
    'Marketing': 'Client Attraction',
    'Mileage': 'Client Travel',
    'Meals': 'Client Meetings',
    'Professional Services': 'Professional Support',
    'Other Expense': 'Other Business Cost',
    'Sessions': 'Coaching Sessions',
    'Session': 'Coaching Session',
    'Appointments': 'Sessions',
    'Table Time': 'Coaching Hours',
    'Hours Worked': 'Hours Coached',
    'Profit Bucket': 'Growth Fund',
    'Tax Bucket': 'Tax Set-Aside',
    'Operations Bucket': 'Daily Operations',
    'Take-Home': 'Take-Home',
    'Pay Myself': 'Pay Myself',
    'Profit and Loss': 'Practice Summary',
    'Net Profit': 'Take-Home',
    'Gross Income': 'Total Coaching Income',
    'Total Expenses': 'Total Business Costs',
    'Tax Estimate': 'Tax Set-Aside Estimate',
    'Sessions Given': 'Sessions Coached Today',
    'Miles Driven': 'Miles to Clients',
    'your practice': 'your coaching practice',
    'your clients': 'your clients',
  },
  trainer: {
    'Income': 'Income',
    'Session Income': 'Training Income',
    'Package Income': 'Package Income',
    'Retainer Income': 'Membership Income',
    'Tip Income': 'Tip',
    'Other Income': 'Other Income',
    'Expenses': 'Gym Expenses',
    'Supplies': 'Consumables',
    'Equipment': 'Gym Equipment',
    'Software': 'Fitness Apps',
    'Rent': 'Gym or Studio Fee',
    'Facility Fee': 'Facility Fee',
    'Insurance': 'Liability Coverage',
    'Continuing Education': 'Certifications and CECs',
    'Marketing': 'Client Attraction',
    'Mileage': 'Travel to Sites',
    'Meals': 'Client Meetings',
    'Professional Services': 'Professional Support',
    'Other Expense': 'Other Business Cost',
    'Sessions': 'Training Sessions',
    'Session': 'Training Session',
    'Appointments': 'Sessions',
    'Table Time': 'Floor Time',
    'Hours Worked': 'Hours Trained',
    'Profit Bucket': 'Growth Fund',
    'Tax Bucket': 'Tax Set-Aside',
    'Operations Bucket': 'Daily Operations',
    'Take-Home': 'Take-Home',
    'Pay Myself': 'Pay Myself',
    'Profit and Loss': 'Performance Report',
    'Net Profit': 'Take-Home',
    'Gross Income': 'Total Training Income',
    'Total Expenses': 'Total Gym Costs',
    'Tax Estimate': 'Tax Set-Aside Estimate',
    'Sessions Given': 'Sessions Trained Today',
    'Miles Driven': 'Miles Traveled',
    'your practice': 'your training business',
    'your clients': 'your clients',
  },
  bodyworker: {
    'Income': 'Income',
    'Session Income': 'Appointment Income',
    'Package Income': 'Package Income',
    'Retainer Income': 'Membership Income',
    'Tip Income': 'Tip',
    'Other Income': 'Other Income',
    'Expenses': 'Practice Expenses',
    'Supplies': 'Linens and Supplies',
    'Equipment': 'Treatment Supplies',
    'Software': 'Booking Tools',
    'Rent': 'Treatment Room Rent',
    'Facility Fee': 'Suite or Room Fee',
    'Insurance': 'Liability Coverage',
    'Continuing Education': 'CE Credits and Training',
    'Marketing': 'Client Attraction',
    'Mileage': 'Travel to Clients',
    'Meals': 'Client Meetings',
    'Professional Services': 'Professional Support',
    'Other Expense': 'Other Practice Cost',
    'Sessions': 'Appointments',
    'Session': 'Appointment',
    'Appointments': 'Appointments',
    'Table Time': 'Table Time',
    'Hours Worked': 'Hours on the Table',
    'Profit Bucket': 'Growth Fund',
    'Tax Bucket': 'Tax Set-Aside',
    'Operations Bucket': 'Daily Operations',
    'Take-Home': 'Take-Home',
    'Pay Myself': 'Pay Myself',
    'Profit and Loss': 'Practice Summary',
    'Net Profit': 'Take-Home',
    'Gross Income': 'Total Appointment Income',
    'Total Expenses': 'Total Practice Costs',
    'Tax Estimate': 'Tax Set-Aside Estimate',
    'Sessions Given': 'Appointments Today',
    'Miles Driven': 'Miles to Clients',
    'your practice': 'your practice',
    'your clients': 'your clients',
  },
}
```

IQContext exposes:
- `industry`: current user industry
- `t(key)`: returns IQ-mapped term or accounting term if accountantMode
- `accountantMode`: boolean, only true on Reports page when toggled
- `setIndustry(industry)`: set on onboarding, stored in profile

---

## Schedule C Shadow Map (export only, never shown in UI)

| Category Key | Schedule C Line | Number |
|---|---|---|
| Session Income / Appointment Income / Coaching Income | Gross Receipts | Line 1 |
| Package / Retainer / Membership Income | Gross Receipts | Line 1 |
| Tip / Other Income | Other Income | Line 6 |
| Supplies / Linens / Consumables / Office Supplies | Supplies | Line 22 |
| Equipment / Treatment Supplies / Tools and Tech | Supplies | Line 22 |
| Software / Booking Tools / Fitness Apps | Office Expense | Line 18 |
| Rent / Studio Fee / Room Fee / Gym Fee | Rent on Business Property | Line 20b |
| Insurance / Liability Coverage | Insurance | Line 15 |
| Continuing Education / CE Credits / CECs | Other Expense | Line 27a |
| Marketing / Client Attraction | Advertising | Line 8 |
| Mileage / Client Travel / Travel to Sites | Car and Truck | Line 9 |
| Meals / Client Meetings | Meals (50%) | Line 24b |
| Professional Services / Professional Support | Legal and Professional | Line 17 |
| Utilities / Phone / Internet | Utilities | Line 26 |
| Other Expense / Other Cost | Other Expense | Line 27a |

---

## Build Phases — Execute in Order

### Phase 1: Scaffold and Auth (Day 1, Morning)

```bash
npx create-next-app@latest bookwise --typescript --tailwind --app
cd bookwise
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install framer-motion canvas-confetti
npm install lucide-react react-hot-toast date-fns
```

Files to create:
- `app/layout.tsx`: fonts, skin data-attribute on html, Toaster
- `styles/globals.css`: both skin CSS variable blocks, base styles
- `lib/supabase.ts`: createBrowserClient and createServerClient helpers
- `lib/iqMaps.ts`: full IQ_MAPS object above
- `context/IQContext.tsx`: provider with t(), industry, accountantMode
- `context/VibeContext.tsx`: provider with skin state, persist to profile
- `middleware.ts`: Supabase session refresh on every route
- `app/auth/callback/route.ts`: OAuth callback handler

Auth flow:
- Sign up and sign in at `/login` (single page, toggle between modes)
- Email + password only (no OAuth for buildathon speed)
- After sign in: check profiles.onboarding_complete
  - false: redirect to /onboarding
  - true: redirect to /dashboard
- Protected routes: /dashboard, /ledger, /reports, /settings

### Phase 2: Onboarding (Day 1, Afternoon)

Route: `/onboarding`
Multi-step with Framer Motion slide transitions. Progress dots at top.
Store progress in local state, write to Supabase only on final step.

Step 1 — Welcome
Full screen, centered. No nav.
Heading (Fraunces 48px): "Welcome to Bookwise."
Subhead (Jakarta 20px, --text-muted): "We are here to help you keep more of what you earn."
Button: "Let's Begin"

Step 2 — Practice Name
Heading: "What is the name of your practice?"
Single large text input (min height 56px).
Skip allowed (defaults to "My Practice").

Step 3 — Your Work
Heading: "What best describes what you do?"
Three large tap cards. NOT a dropdown.
Each card: icon (64px), label, one-line description.
- Coach: briefcase icon, "Coaching", "Retainers, packages, transformational work"
- Trainer: activity icon, "Personal Training", "Sessions, memberships, fitness programs"
- Bodyworker: heart icon, "Bodywork", "Appointments, table time, hands-on healing"
Selecting a card immediately activates IQ Engine for that industry.
All subsequent steps use IQ language.

Step 4 — Choose Your Vibe
Heading: "Make it yours."
Two skin cards side by side: Ethereal Sage and Midnight Orchid.
Tapping previews the skin live before continuing.
Show a mini dashboard preview inside each card.

Step 5 — Connect (Simplified for Demo)
Heading: "Connect your tools."
Three tiles: Stripe, Plaid, Google Drive.
Each tile has a Connect button and a "Skip for now" link.
For demo: all three show as connected using demo mode.
Demo mode banner: "Running on demo data. Connect live accounts in Settings."
Do not implement real OAuth here. Mock the connected state.
Store google_drive_folder_id as "demo" if skipped.

Step 6 — Pulse Time
Heading: "When do you finish your last session?"
Large time display. Up/down tap buttons for hour and minute. No spinner.
Default: 5:00 PM.

Step 7 — One Quick Note
Small centered card.
Text: "Bookwise organizes your numbers and shows you patterns.
Sage, your AI mentor, shares observations. Nothing here is financial
or legal advice. Always work with a licensed CPA before filing."
Button: "I understand. Let's go."

On complete: set onboarding_complete=true, redirect to /dashboard.

### Phase 3: Dashboard (Day 1, Evening)

Route: `/dashboard`
Header: "My Dash" — Fraunces, no comma, no em dash.
Sub-header: practice name from profile.

Three Reservoir Buckets (render as SVG circles, not div borders):
- Growth Fund (Profit)
- Tax Set-Aside (Tax)
- Daily Operations (Ops)

Each bucket SVG:
- Circle outline: 120px diameter, stroke var(--divider), strokeWidth 8
- Fill circle: clip-path rising animation from bottom
- Use CSS @keyframes to animate clip-rect from bottom on mount
- Center label: bucket name (Fraunces 14px)
- Below circle: "$X funded of $Y target" (Jakarta 13px, --text-muted)
- Show "Funded" badge when 100% reached (--primary background)

Bucket targets: calculated as % of monthly income (Profit 10%, Tax 25%, Ops 65%).
Monthly income = sum of income transactions for current month where is_personal=false.

Tax Savings Line:
Single line below buckets: "You have set aside $X for taxes this month."
Color: var(--accent).

Secure My Pay Button:
Full width, var(--primary) background, Fraunces 18px label.
Below button: "Confirm you have moved these funds to your separate accounts."

On click:
1. Modal: shows exact dollar amounts for each bucket
2. User confirms
3. canvas-confetti fires (full screen, 3 seconds, use both origins)
4. Toast: "Done. You paid yourself. That is worth celebrating."

Daily Pulse Card:
Title: "Today's Pulse" (use t('Sessions Given') for sessions label)
Three inputs using large tap targets:
- Sessions today (increment/decrement buttons, large display number)
- Hours worked (same)
- Miles driven (same)
Save button writes to daily_pulse table for today's date.

Sage Insight Card:
Title: "Sage says..."
Body: AI-generated insight paragraph (fetch from /api/sage on mount)
Loading state: skeleton placeholder (animated shimmer, not spinner)
Regenerate icon button (refresh icon, top right of card)

Error states:
- Supabase fetch fails: show "Could not load your data. Pull to refresh."
- Sage fails: show "Sage is thinking. Try again in a moment."
- Buckets empty: show onboarding prompt card, not empty circles

### Phase 4: Ledger (Day 2, Morning)

Route: `/ledger`
Header: t('Transactions') from IQContext.

Transaction list: chronological, newest first.
Each row:
- Date (Jakarta 13px, --text-muted)
- Category label using t(category_key) — never raw key
- Amount: green for income, --text-muted for expense
- Source badge: small pill (Manual / Stripe / Plaid)
- Red dot: show if pulse_matched=false and transaction is today
- Personal toggle: small toggle right side, updates is_personal in Supabase on change

Empty state: illustration + "No entries yet. Add your first one below."

Add Transaction button: floating + button, bottom right, var(--primary) background.
Opens bottom sheet on mobile (slides up from bottom), modal on desktop.

Add Transaction form fields:
- Date: date picker, large tap target
- Type: two large toggle buttons, "Income" and "Expense"
- Category: dropdown using IQ-mapped options for current industry
  Income options: Session Income, Package Income, Retainer Income, Tip Income, Other Income
  Expense options: Supplies, Equipment, Software, Rent, Facility Fee, Insurance,
    Continuing Education, Marketing, Mileage, Meals, Professional Services,
    Utilities, Phone, Internet, Other Expense
  All labels rendered via t(key)
- Amount: large numeric display with tap keypad (0-9, decimal, backspace)
  No keyboard input. Tap-only keypad for amount entry.
- Notes: optional text input
- Personal toggle

On save: insert to transactions, close sheet, refresh list.

Receipt capture (on transaction row tap):
- Camera icon opens file input (accept="image/*", capture="environment")
- On image selected: upload to Supabase Storage at receipts/{user_id}/{YYYY-MM}/
- Call /api/ocr with image URL
- OCR returns: vendor, date, amount
- Auto-populate transaction fields with extracted data
- Show preview of receipt image in the form
- Store receipt_url on transaction record

Demo data: seed 30 transactions across current and previous month.
Mix of income and expenses. Realistic wellness practitioner amounts.
Include 3 transactions with receipt images (use placeholder receipt PNGs).

### Phase 5: Sage API (Day 2, Morning — parallel with Ledger)

Route: `app/api/sage/route.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { IQ_MAPS } from '@/lib/iqMaps'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { type, context } = await req.json()
  // type: 'daily_insight' | 'pay_guidance' | 'question'
  // context: { industry, practiceName, monthIncome, monthExpenses,
  //            buckets, recentTransactions, question? }

  const vocab = IQ_MAPS[context.industry]

  const system = `You are Sage, a warm financial mentor inside Bookwise.
You speak directly to solo wellness practitioners.
Use these exact terms for this user's industry: ${JSON.stringify(vocab)}
Never use: revenue, COGS, accounts receivable, accounts payable, net income, gross margin.
Never say: you should, you owe, file your taxes.
Always say: here is what your numbers show, based on your current balance.
Keep responses to 2-3 short paragraphs maximum.
No em dashes. Plain warm human language. Be specific, not generic.
End every response with one concrete observation, not a question.`

  const prompts = {
    daily_insight: `Practice: ${context.practiceName}
Industry: ${context.industry}
This month ${context.monthIncome ? `income: $${context.monthIncome}` : 'no income yet'}, expenses: $${context.monthExpenses}
Bucket status: Growth Fund ${context.buckets.profit}% funded, Tax Set-Aside ${context.buckets.tax}% funded
Write a brief daily financial insight for this practitioner.`,

    pay_guidance: `Practice: ${context.practiceName}
Operations bucket: $${context.buckets.opsFunded} of $${context.buckets.opsTarget} funded
Must-pay items total: $${context.mustPayTotal}
Days left in month: ${context.daysLeft}
What is a healthy pay-myself range right now? Be specific with numbers.`,

    question: `Practice: ${context.practiceName}
Monthly summary: income $${context.monthIncome}, expenses $${context.monthExpenses}
Recent transactions: ${JSON.stringify(context.recentTransactions?.slice(0,10))}
User question: ${context.question}
Answer directly and specifically.`,
  }

  const anthropic = new Anthropic()
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 350,
    system,
    messages: [{ role: 'user', content: prompts[type] }]
  })

  return Response.json({
    insight: message.content[0].type === 'text' ? message.content[0].text : ''
  })
}
```

OCR route: `app/api/ocr/route.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { imageUrl } = await req.json()

  const anthropic = new Anthropic()
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl }
        },
        {
          type: 'text',
          text: `Extract from this receipt: vendor name, date (YYYY-MM-DD), and total amount.
Respond with JSON only, no other text:
{"vendor": "string", "date": "YYYY-MM-DD", "amount": number}`
        }
      ]
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    return Response.json(JSON.parse(text))
  } catch {
    return Response.json({ vendor: '', date: '', amount: 0 })
  }
}
```

### Phase 6: Reports (Day 2, Afternoon)

Route: `/reports`
Header: t('Profit and Loss') from IQContext.

Date range selector: current month default. Previous month button. Custom range.

Language toggle (only on this page):
Two pills: "My Language" | "Accountant View"
Toggling calls toggleAccountantMode() in IQContext.
In Accountant View: all t() calls return raw accounting keys.

P&L structure (calculate from transactions table for selected date range,
exclude is_personal=true):

My Language mode:
- [Practice Name] Practice Summary
- [t('Gross Income')]: $X
  - Each income category with IQ label and amount
- [t('Total Expenses')]: $X
  - Each expense category with IQ label and amount
- [t('Net Profit')] / Take-Home: $X (bold, large, var(--primary) color)
- Tax Set-Aside Estimate (25% of net): $X
  - Note: "25% is a recommended safety rate. Confirm with your CPA."

Accountant View mode:
- Profit and Loss Statement
- Gross Income: $X
  - Each category with standard accounting label
  - Schedule C line number shown in muted text next to each category
- Total Expenses: $X
- Net Profit: $X

Export button: "Export for My CPA"
Generates and downloads a CSV file.

CSV structure:
```
Bookwise Export - [Practice Name] - [Date Range]
Prepared by Bookwise. Always review with a licensed CPA before filing.
,,
Date,Description,IQ Category,Schedule C Category,Schedule C Line,Amount,Type,Receipt
2025-04-01,Client session,Appointment Income,Gross Receipts,Line 1,150.00,Income,
2025-04-02,Linens,Linens and Supplies,Supplies,Line 22,-45.00,Expense,https://...
```

Include all non-personal transactions in date range.
Sort by date ascending.
Receipt URLs in final column where available.

Error state: "No transactions found for this period. Add entries in your Ledger."
Loading state: skeleton rows, not spinner.

### Phase 7: Settings (Day 2, Evening — Minimal)

Route: `/settings`
Four sections only:

Service Menu:
List of services with name and price.
Add service form: name input, price input (tap keypad), duration (increment buttons).
Services power the income category dropdowns in the ledger.

Vibe:
Two skin cards. Tap to switch. Immediate live preview.
Confirm button saves to profiles.vibe.

Connected Apps (display only for demo):
Show Stripe, Plaid, Google Drive as "Connected (Demo Mode)".
Note: "Live connections available after launch."

Disclaimer:
Static text: "Bookwise organizes and presents your financial data.
Sage shares observations, not advice. Work with a licensed CPA before filing."

### Phase 8: Demo Data and Final Polish (Day 3)

Demo account: demo@bookwise.app / Demo2025!
Seed this account with realistic data.

```sql
-- Run after schema is set up
-- Insert demo profile (bodyworker, ethereal-sage vibe)
-- Insert 6 services (60min session $120, 90min session $165, etc.)
-- Insert 35 transactions across April and March
-- Mix: 20 income (appointments, packages, tips), 15 expenses
-- Insert 2 daily_pulse entries (yesterday and today)
-- Insert current month buckets at ~65% funded
```

Realistic amounts for a bodyworker:
- 60-minute appointment: $120
- 90-minute appointment: $165
- Package (4 sessions): $440
- Tip: $20-$40
- Linens monthly: $45
- Oils and supplies: $65
- Room rent: $800
- CE credits: $150
- Liability insurance: $35/month
- Booking software: $25/month

Final polish checklist (Day 3):
- Test all three industries: coach, trainer, bodyworker
- Verify every label on every screen goes through t()
- Verify no hardcoded financial terms in JSX
- Test Midnight Orchid skin on every screen
- Test on 375px viewport (iPhone SE size)
- Verify confetti works on Secure My Pay
- Verify OCR returns and populates transaction form
- Verify CSV export downloads with correct columns
- Verify P&L accountant toggle works on both modes
- Verify empty states show on fresh account (not demo account)
- Check all loading states (Sage, transactions, reports)
- Verify no number spinwheels anywhere
- Verify minimum 18px body text everywhere
- Remove all console.log statements
- Run next build and fix all TypeScript errors

---

## Mobile Navigation

Fixed bottom tab bar. 60px height. var(--surface) background. Border top var(--divider).

Four tabs:
- House icon: "Dash" — /dashboard
- List icon: "Ledger" — /ledger
- FileText icon: "Reports" — /reports
- Settings icon: "Settings" — /settings

Active tab: var(--primary) color. Inactive: var(--text-muted).
Tab labels: Jakarta 11px.
No hamburger menus. No sidebar on mobile.

---

## Error and Loading State Rules

Loading states: always use skeleton shimmer (animated gradient), never a spinner.
Skeleton: background linear-gradient sliding animation, rounded corners matching content.

Error states: never show raw error messages to user.
- Network error: "Could not connect. Check your connection and try again."
- Auth error: redirect to /login
- Data not found: show empty state with illustration and action prompt
- API error (Sage, OCR): show friendly message with retry button

Empty states: every list and data view needs one.
- Ledger empty: illustration + "No entries yet." + "Add your first entry" button
- Reports empty: "No transactions for this period." + link to Ledger
- Pulse empty: "Log today's sessions below." (show form immediately)

---

## Compliance Rules (Hardcoded, Never Change)

1. App organizes data. It never advises.
2. Sage observes patterns. Sage does not direct action.
3. Never say: financial advice, tax advice, legal advice, file your taxes, you owe.
4. Always say: set aside, here is what your numbers show, work with your CPA.
5. 25% tax rate: always called "recommended safety rate," never a guarantee.
6. CSV export always includes: "Always review with a licensed CPA before filing."
7. Onboarding Step 7 disclaimer is non-negotiable. Cannot be skipped.
8. No mention of Profit First or any named methodology.
9. No investment language anywhere.

---

## File Structure

```
bookwise/
  CLAUDE.md
  app/
    layout.tsx
    page.tsx                    # redirect logic
    login/page.tsx
    onboarding/page.tsx
    dashboard/page.tsx
    ledger/page.tsx
    reports/page.tsx
    settings/page.tsx
    auth/callback/route.ts
    api/
      sage/route.ts
      ocr/route.ts
  components/
    layout/
      BottomNav.tsx
      PageHeader.tsx
    ui/
      Button.tsx
      Card.tsx
      Input.tsx
      Toggle.tsx
      SkeletonRow.tsx
      TapKeypad.tsx             # numeric keypad, no spinwheels
    dashboard/
      ReservoirBucket.tsx
      SecureMyPay.tsx
      DailyPulse.tsx
      SageInsightCard.tsx
    ledger/
      TransactionRow.tsx
      AddTransactionSheet.tsx
      ReceiptCapture.tsx
      CategorySelect.tsx        # always uses t() for labels
    reports/
      PLStatement.tsx
      LanguageToggle.tsx
      ExportButton.tsx
    onboarding/
      StepWelcome.tsx
      StepPracticeName.tsx
      StepIndustry.tsx
      StepVibe.tsx
      StepConnect.tsx
      StepPulseTime.tsx
      StepDisclaimer.tsx
  context/
    IQContext.tsx
    VibeContext.tsx
  lib/
    iqMaps.ts
    scheduleC.ts                # shadow map, used only in export
    supabase.ts
    demo-seed.sql
  styles/
    globals.css
  middleware.ts
```

---

## Demo Video Moments (Build These First, Polish These Last)

The two-minute video drives the qualifying round. Every feature must be
demoable in a clear, visible way. Build these moments to be visually
impressive, not just functionally correct.

Moment 1 (0:15): Onboarding industry selection. Camera selects "Bodywork."
Every label in the app immediately shifts to bodywork language.
This is the IQ Engine reveal.

Moment 2 (0:45): Dashboard. Reservoir buckets with liquid fill animation.
Secure My Pay button. Confetti fires.

Moment 3 (1:10): Ledger. Add a transaction. Use the tap keypad.
Snap a receipt photo. Watch the OCR auto-populate the fields.

Moment 4 (1:35): Reports. Toggle from My Language to Accountant View.
Labels shift. Hit Export. CSV downloads.
Show the CSV with Schedule C line numbers visible.

Total: under 2 minutes. No preamble. Start with the problem in one sentence.
End with the industry language toggle working live.

---

## Lovable Components to Port (Do Not Rewrite These)

The following components were built in a prior Lovable prototype and are
production-quality. Port them directly into the Next.js app. Do not rebuild
them from scratch. They are pure React with no framework dependencies.

### styles.css
Copy the entire Lovable styles.css as the base for globals.css.
It contains all five vibe skins in oklch, Fraunces + Jakarta wired,
confettiPop keyframe, fade-up animation, and drain keyframe.
Replace `@import "tailwindcss" source(none)` with standard Tailwind v4 import.
Replace `@custom-variant dark` with Next.js compatible syntax.
Keep all CSS custom properties and keyframes exactly as written.

### Reservoir.tsx
Port verbatim. Replace nothing. This uses requestAnimationFrame with cubic
easing, wave overlay, text color flip at 50% fill, and drain animation.
It accepts: label, current, goal, tone (profit|tax|ops), caption, draining.
Change nothing about the animation logic.

### NumericKeypad.tsx
Port verbatim. It is pure React with no router or library dependencies.
Accepts: value, onChange, allowDecimal, prefix, suffix, label.
Use this component for every number input in the app.

### Confetti.tsx
Port verbatim. Uses CSS custom properties from the active vibe skin.
Trigger by incrementing a number prop. 60 pieces, 1.2s animation, auto-clears.
Add the confettiPop keyframe from styles.css to globals.css.

### Onboarding.tsx
Use as a structural reference only. Replace:
- `useNavigate` from TanStack with `useRouter` from next/navigation
- `Link` from TanStack with `Link` from next/link
- All `localStorage` calls with Supabase profile reads/writes
- `completeOnboarding()` with a Supabase upsert to profiles table
- `applyVibe()` with the VibeContext setter
Keep the step system, progress dots, and StepShell wrapper exactly as built.

### BottomNav.tsx
Use as structural reference. Replace:
- `Link` and `useLocation` from TanStack with Next.js equivalents
- Route paths: /dash becomes /dashboard, /pulse becomes /dashboard (pulse is a section)
- Remove /chat tab, keep: Dash, Ledger, Reports, Settings (four tabs only)
Keep the visual design, active state styling, and safe-area-inset padding.

---

## Additional Components from v2 Remix (Port Verbatim)

### lib/finance.ts (from remix-of-bookwise-dash)
This is a complete, pure financial calculation library. Port it verbatim.
No framework dependencies. Works in Next.js with zero changes.
Use it for ALL reservoir bucket calculations throughout the app.

Key functions:
- `allocateDeposit(amount, options)` -- splits one deposit into profit/tax/ops
- `allocateTransactions(txns, options)` -- batch allocation across all transactions
- `calculateTip(deposit, serviceValue)` -- tip = deposit minus service value
- `calculateMileageDeduction(miles, taxRate)` -- IRS $0.67/mile calculation

Constants (do not change):
- `TAX_SET_ASIDE_RATE = 0.25`
- `MILEAGE_RATE_USD_PER_MILE = 0.67`
- `DEFAULT_OPS_RATE = 0.2`

The FinancialTransaction interface maps directly to the transactions table.
Replace the `id: string` field with `id: string` from Supabase uuid.

### reports.tsx CSV logic (from remix-of-bookwise-dash)
Port these three utility functions verbatim into lib/csv.ts:
- `toCSV(rows)` -- converts 2D array to CSV string with proper escaping
- `downloadCSV(filename, csv)` -- triggers browser download
- `ReportCard` component -- UI card with title, description, and download button

Replace localStorage data sources with Supabase transaction queries.
Add Schedule C columns to the export using the shadow map in CLAUDE.md.

### pulse.tsx CalendarView (from remix-of-bookwise-dash)
The CalendarView component inside pulse.tsx allows date navigation
(previous/next day) and shows which dates have existing entries.
Port this as a standalone component: components/dashboard/CalendarNav.tsx
Replace localStorage reads with Supabase daily_pulse queries.

### settings.tsx VibeSelector (from remix-of-bookwise-dash)
The vibe switcher with swatch circles and live preview is complete.
Port as components/settings/VibeSelector.tsx
Replace localStorage writes with Supabase profile updates.
Limit to two skins only: sage and midnight.

### styles.css (use v2 version, not v1)
V2 has a redesigned Studio Clay skin (cooler, cleaner) and added
Cormorant Garamond as an alternative font family.
Use v2 styles.css as the base. Do NOT activate the alt typeset.
Keep only Fraunces + Plus Jakarta Sans active.
Remove the `data-typeset` system entirely.

---

## Design Rules — Making It Look Human-Made

These rules override any Lovable defaults. The goal is a considered,
bespoke aesthetic -- not a design system template.

### Border Radius
- Cards: 12px maximum (rounded-xl). Never rounded-2xl or rounded-3xl on cards.
- Buttons: 10px (rounded-lg). Pill buttons (back nav) allowed at 999px.
- Inputs: 8px (rounded-md).
- The Reservoir circles are exempt -- they are fully round by design.

### Color Usage
- No `color-mix(in oklab, ...)` on interactive backgrounds. Use solid colors.
- Card backgrounds: var(--surface), not translucent overlays.
- Active states: color shift only, no translucent halos.
- Use the oklch skin tokens directly. Do not layer them with color-mix.

### Cards and Sections
- Not every section needs a card. Some information should sit directly
  on the page background with section spacing, no border, no shadow.
- Reserve cards (border + shadow) for interactive or data-dense content.
- Never use the same card treatment for more than two consecutive sections.
- Shadow style: box-shadow 0 1px 8px rgba(0,0,0,0.06) -- subtle, not floating.

### Onboarding
- Remove the StepShell eyebrow pill entirely.
- Replace with: step number in plain muted text (top right), thin progress bar below header.
- Industry selection: three full-width tap cards, 80px height, left-aligned content.
  No centered icon + text layout. Left icon, right label + description.
- Vibe selection: two cards side by side, 120px height, swatch row + name only.
  No tagline text on the card. Clean.

### Navigation
- BottomNav active state: icon and label shift to var(--primary).
  Add a 3px dot below the active label. No background highlight.
- Remove all backdrop-blur from BottomNav. Solid surface color only.

### Typography Hierarchy
- Page headers (Fraunces): 28px on mobile, 32px on tablet.
- Section labels: Plus Jakarta Sans, 11px, uppercase, letter-spacing 0.08em,
  var(--text-muted). Used sparingly -- not on every section.
- Body text: 16px minimum (not 18px -- the Lovable spec was too large for data UI).
- Metric displays (dollar amounts, counts): Fraunces, 36-40px, weight 700.
- No bold body text used as a substitute for proper heading hierarchy.

### What to Delete from Lovable
- Delete: entire /ui/ shadcn folder (accordion through tooltip -- all of it)
- Delete: NumericKeypad.tsx
- Delete: vibe.ts localStorage system
- Delete: typeset system (data-typeset, TYPESETS, applyTypeset)
- Delete: all rounded-3xl and rounded-2xl class usage on cards
- Delete: UndoSnackbar.tsx (replace with react-hot-toast)
- Delete: ConfirmDialog.tsx (replace with a simple inline modal)

---

## IQ Engine -- Session Loading (Critical)

The IQ Engine must load the correct industry on every page, not just after onboarding.

### On Onboarding Complete
Write to Supabase profiles table:
```typescript
await supabase.from('profiles').upsert({
  id: user.id,
  practice_name: businessName,
  industry: selectedIndustry,   // 'coach' | 'trainer' | 'bodyworker'
  vibe: selectedVibe,            // 'ethereal-sage' | 'midnight-orchid' etc.
  daily_pulse_time: pulseTime,
  onboarding_complete: true,
})
```

### On Every Protected Page Load
In the root layout or a shared hook, after auth session is confirmed:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('industry, vibe, practice_name, onboarding_complete')
  .eq('id', user.id)
  .single()

if (!profile?.onboarding_complete) redirect('/onboarding')

// Set IQ Engine industry
setIndustry(profile.industry)

// Apply vibe skin to html element
document.documentElement.setAttribute('data-vibe', profile.vibe)
```

This must happen before any component renders financial labels.
Use a loading skeleton on the page while the profile loads.
Never render a page with IQ language before the industry is confirmed.

### IQ Engine Initialization Order
1. Auth session loads (Supabase middleware)
2. Profile fetches (industry + vibe)
3. IQContext sets industry
4. VibeContext applies skin to html element
5. Page components render with correct labels

If profile fetch fails: show error state, do not render with wrong labels.

---

## Session Start Checklist

At the start of every Claude Code session, before writing any code:
1. Re-read this file
2. Check which phase is in progress
3. Verify the last completed phase builds without errors
4. Confirm active skin variables are in globals.css
5. Confirm IQContext is imported and t() is being used in the component you are about to build
6. If building any financial label: check IQ_MAPS has the key before using it
