# BUILD.md
# Bookwise — Claude Code Master Build Prompt
# AI-Powered Bookkeeping for Wellness Professionals
# Buildathon Submission — Women Build AI — Due May 1

---

## Project Overview

Bookwise is a mobile-responsive Progressive Web App (PWA) that replaces QuickBooks
for solo wellness practitioners. The core innovation is the IQ Engine: a global
language layer that translates every financial term in the app into the user's
own industry vocabulary. A massage therapist never sees "accounts receivable."
A coach never sees "cost of goods sold." They see their world, in their words.

**One-sentence pitch:**
Bookwise is the first AI bookkeeper that speaks your language, built for coaches,
trainers, and bodyworkers who are great at what they do but terrified of their finances.

**Target users (Phase 1):**
- Life coaches and business coaches
- Personal trainers
- Bodyworkers (massage therapists, somatic practitioners, energy healers)

**Tech stack:**
- Framework: Next.js 14 (App Router)
- Auth: Supabase Auth (email + Google OAuth)
- Database: Supabase (PostgreSQL with RLS)
- Storage: Supabase Storage (receipt images)
- Payments/Income: Stripe MCP
- Appointment sync: Calendly or Acuity MCP (as available)
- Bank feed: Plaid MCP (demo mode with mock data fallback)
- Cloud storage: Google Drive MCP (receipt filing)
- AI layer: Claude API (Sage mentor, transaction categorization)
- Styling: Tailwind CSS with custom design tokens
- Animation: Framer Motion
- Fonts: Fraunces (serif, all headers) + Plus Jakarta Sans (body, minimum 18px)
- Deployment: Vercel

---

## Design System — Non-Negotiable

This app must not look like it was built by AI. Every design decision should feel
considered, warm, and human. Reference boutique wellness studio aesthetics, not
fintech dashboards.

### Typography Rules
- Headers: Fraunces (serif) — bold, generous sizing
- Body: Plus Jakarta Sans — minimum 18px, never smaller than 14px
- Primary metrics (dollar amounts, session counts): 40px bold minimum
- No commas in titles or labels
- No em dashes anywhere in the UI

### Color — Five Selectable Skins (Vibe System)
Each skin is a complete CSS variable set applied globally when selected.
Store user selection in Supabase profile.

```css
/* Skin 1: Ethereal Sage (default) */
--bg: #F5F2EC;
--surface: #FFFFFF;
--primary: #7C9A7E;
--accent: #C4A882;
--text: #2C3528;
--text-muted: #6B7566;

/* Skin 2: Warm Terracotta */
--bg: #F5EDE0;
--surface: #FFFAF4;
--primary: #C4714A;
--accent: #2D6B6B;
--text: #2C1E14;
--text-muted: #7A5C4A;

/* Skin 3: Slate and Eucalyptus */
--bg: #EDECEA;
--surface: #F8F7F5;
--primary: #5B8A6E;
--accent: #3D4F8A;
--text: #1E2228;
--text-muted: #5C6470;

/* Skin 4: Midnight Orchid */
--bg: #1E1E26;
--surface: #2A2A36;
--primary: #B09FCC;
--accent: #C8C8D0;
--text: #EEEEF4;
--text-muted: #9090A0;

/* Skin 5: Modern Clay */
--bg: #EDE6DC;
--surface: #F8F3EC;
--primary: #B5603A;
--accent: #1E3058;
--text: #1E1610;
--text-muted: #6B5A4A;
```

### Component Rules
- No number spinwheels anywhere. Use large numeric keypads for all number inputs.
- Bucket progress indicators: filled circles with liquid-rise animation (CSS only,
  no canvas). The fill color rises from bottom like water in a reservoir.
- Confetti animation fires on "Secure My Pay" confirmation. Use canvas-confetti.
- All buttons: rounded corners (border-radius: 12px), generous padding, never flat.
- Cards: soft shadow (box-shadow: 0 2px 16px rgba(0,0,0,0.06)), rounded-xl.
- All inputs: large touch targets (min 48px height), no spinwheels.
- Mobile-first. All layouts must be usable on a 375px screen.

---

## Database Schema (Supabase)

Run these migrations in order before building any features.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User profiles
create table profiles (
  id uuid references auth.users primary key,
  practice_name text,
  industry text check (industry in ('coach', 'trainer', 'bodyworker')),
  vibe text default 'ethereal_sage' check (
    vibe in ('ethereal_sage','warm_terracotta','slate_eucalyptus',
             'midnight_orchid','modern_clay')
  ),
  daily_pulse_time time default '17:00',
  stripe_account_id text,
  plaid_access_token text,
  google_drive_folder_id text,
  tax_rate numeric default 0.25,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Service menu (user's offerings)
create table services (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  price numeric not null,
  duration_minutes int,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Transactions (income and expenses)
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  amount numeric not null,
  type text check (type in ('income','expense')),
  category_key text not null,
  notes text,
  is_personal boolean default false,
  is_matched boolean default false,
  source text check (source in ('stripe','plaid','manual','calendly')),
  external_id text,
  receipt_url text,
  receipt_filename text,
  pulse_matched boolean default false,
  created_at timestamptz default now()
);

-- Daily pulse entries
create table daily_pulse (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  sessions_given int default 0,
  hours_worked numeric default 0,
  miles_driven numeric default 0,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Money buckets (Profit / Tax / Operations)
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
  last_reset date,
  unique(user_id, month)
);

-- Must-pay items (recurring fixed expenses)
create table must_pay (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  amount numeric not null,
  is_variable boolean default false,
  category_key text,
  is_active boolean default true
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table services enable row level security;
alter table transactions enable row level security;
alter table daily_pulse enable row level security;
alter table buckets enable row level security;
alter table must_pay enable row level security;

-- RLS policies (users see only their own data)
create policy "Users manage own profile"
  on profiles for all using (auth.uid() = id);

create policy "Users manage own services"
  on services for all using (auth.uid() = user_id);

create policy "Users manage own transactions"
  on transactions for all using (auth.uid() = user_id);

create policy "Users manage own pulse"
  on daily_pulse for all using (auth.uid() = user_id);

create policy "Users manage own buckets"
  on buckets for all using (auth.uid() = user_id);

create policy "Users manage own must_pay"
  on must_pay for all using (auth.uid() = user_id);
```

---

## Phase 1 — Scaffold, Auth, and Onboarding

### 1.1 Project Setup

```bash
npx create-next-app@latest bookwise --typescript --tailwind --app
cd bookwise
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install framer-motion canvas-confetti
npm install @radix-ui/react-dialog @radix-ui/react-select
npm install react-hot-toast
npm install date-fns
npm install lucide-react
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
ANTHROPIC_API_KEY=your_anthropic_key
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
```

### 1.2 Global Font Setup

In `app/layout.tsx`:
```tsx
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '600', '700', '900']
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700']
})
```

### 1.3 IQ Engine Context

Create `context/IQContext.tsx` — this is the most important file in the app.
See IQ_ENGINE.md for the complete language map.

```tsx
'use client'
import { createContext, useContext, useState } from 'react'
import { IQ_MAPS, type Industry } from '@/lib/iqMaps'

interface IQContextType {
  industry: Industry
  t: (key: string) => string
  setIndustry: (industry: Industry) => void
  accountantMode: boolean
  toggleAccountantMode: () => void
}

const IQContext = createContext<IQContextType | null>(null)

export function IQProvider({ children, defaultIndustry = 'coach' }) {
  const [industry, setIndustry] = useState<Industry>(defaultIndustry)
  const [accountantMode, setAccountantMode] = useState(false)

  function t(key: string): string {
    if (accountantMode) return key
    return IQ_MAPS[industry][key] ?? key
  }

  return (
    <IQContext.Provider value={{
      industry, t, setIndustry,
      accountantMode,
      toggleAccountantMode: () => setAccountantMode(prev => !prev)
    }}>
      {children}
    </IQContext.Provider>
  )
}

export const useIQ = () => {
  const ctx = useContext(IQContext)
  if (!ctx) throw new Error('useIQ must be inside IQProvider')
  return ctx
}
```

### 1.4 Onboarding Flow

Build a multi-step onboarding at `/onboarding`. Each step is a full-screen card
with smooth slide transitions (Framer Motion). Steps in order:

**Step 1 — Welcome**
Full-screen. Centered. Large Fraunces heading:
"Welcome to Bookwise."
Subheading in Plus Jakarta Sans:
"We are here to help you keep more of what you earn."
Single CTA button: "Let's Get Started"

**Step 2 — Practice Name**
"What is the name of your practice?"
Large text input. No placeholder text that is too small.
Store to profiles.practice_name on continue.

**Step 3 — Your Work**
"What best describes what you do?"
Three large tap-to-select cards. Each card has an icon, label, and one-line
description. Not a dropdown. Not radio buttons.

- Coach: "Retainers, packages, transformational work"
- Personal Trainer: "Sessions, memberships, fitness programs"
- Bodyworker: "Appointments, table time, hands-on healing"

Store to profiles.industry. This triggers the IQ Engine immediately.
After selection, all subsequent steps use IQ language.

**Step 4 — Choose Your Vibe**
"Make it yours. Choose a vibe."
Five skin preview cards displayed in a scrollable row. Each shows a color swatch,
the skin name, and a tiny preview of what the dashboard will look like.
Tapping a skin previews it live on the onboarding screen before confirming.

**Step 5 — Connect Your Apps**
"Connect the tools you already use."
Three connection tiles in a column:

- Stripe (Income from client payments)
- Plaid (Your business bank account)
- Calendly / Acuity (Your appointment schedule)

Each tile has a Connect button. If user skips, show a note:
"You can always connect later in Settings. We will use sample data for now."
For the demo, Stripe and Plaid may use sandbox/demo mode.
Plaid: use Plaid Link SDK, sandbox environment.
Stripe: use Stripe Connect OAuth.

**Step 6 — Your Daily Pulse Time**
"When do you finish your last session? We will send your Daily Pulse then."
Time picker (large tap targets, not a spinner). Default: 5:00 PM.
Store to profiles.daily_pulse_time.

**Step 7 — Quick Disclaimer**
Small card, friendly tone:
"Bookwise organizes and presents your financial data. Sage, your AI mentor,
shares observations and patterns. Nothing here is legal or tax advice.
Always work with a licensed CPA for filing."
Single CTA: "I understand. Let's go."

After onboarding completes, redirect to `/dashboard`.

---

## Phase 2 — Dashboard (My Dash)

Route: `/dashboard`
Header label: "My Dash" (no comma, no em dash)

### 2.1 Layout

Mobile-first. Single column on mobile, two columns on tablet and up.
Top of page: practice name in Fraunces, current month and year.

### 2.2 The Three Reservoir Buckets

Three equal circles arranged in a row (or vertical on very small screens).
Each circle shows:
- Bucket name (using IQ language from IQ_ENGINE.md)
- Liquid fill animation rising from bottom to show funded percentage
- Dollar amount funded vs. target (e.g., "$1,240 of $2,000")
- A "Funded" label when 100% is reached

Bucket names by default:
- Profit Bucket (IQ label: "Growth Fund")
- Tax Bucket (IQ label: "Tax Set-Aside")
- Operations Bucket (IQ label: "Daily Operations")

The liquid fill must be a CSS animation using a wave or gradient fill rising
within an SVG circle clip. Reference the fill color from the active skin's
--primary variable.

Buckets reset on the 1st of every month. The reset is triggered client-side
on load by comparing the current date to buckets.last_reset.

### 2.3 Tax Savings Meter

Below the buckets. A single line with a counter:
"You have set aside [amount] for taxes this month."
Updates in real time as transactions are added.
Color: --accent from the active skin.

### 2.4 Secure My Pay Button

Below the tax meter. Full-width button.
Label: "Secure My Pay"
Caption below button: "Confirm you have moved these funds to your separate accounts."

On click:
1. Show a confirmation modal with the exact amounts for each bucket
2. User confirms
3. Fire canvas-confetti (full screen, 3 seconds)
4. Mark buckets as confirmed for the current cycle
5. Show a toast: "Done. You paid yourself. That is worth celebrating."

### 2.5 Daily Pulse Widget

Card at the bottom of the dashboard.
Title: "Today's Pulse"
Fields:
- Sessions given today (large numeric keypad input)
- Hours worked (large numeric keypad input)
- Miles driven to client sites (large numeric keypad input)

Below the fields, if there is an unmatched deposit from the bank feed:
Show a yellow flag card: "We found an extra [amount] deposit.
Was this a Tip or additional payment?"
Two buttons: "Tip" and "Other Income"

### 2.6 Sage Insights Card

A card that shows the current AI mentor insight.
Title: "Sage says..."
Body: one paragraph of plain language financial observation.
Regenerate button: "New Insight"

Sage insights are generated via `/api/sage` which calls the Claude API.
See Phase 4 for the Sage implementation.

---

## Phase 3 — Ledger (Transactions)

Route: `/ledger`

### 3.1 Transaction List

Chronological list, most recent first. Each row shows:
- Date
- IQ-language category label (not accounting terms)
- Amount (green for income, muted for expense)
- Source badge (Stripe / Plaid / Manual)
- Red dot indicator if not yet matched to a Daily Pulse entry
- Personal toggle (small toggle on the right, excludes from calculations when on)

Pull transactions from Supabase. On mount, also fetch new transactions
from Stripe and Plaid (if connected) and upsert using external_id to
prevent duplicates.

### 3.2 Add Transaction (Manual)

Floating + button, bottom right.
Opens a bottom sheet on mobile, modal on desktop.

Fields:
- Date (date picker, large)
- Type: Income or Expense (two large toggle buttons)
- Category (dropdown using IQ-language categories from IQ_ENGINE.md)
- Amount (large numeric keypad, no spinner)
- Notes (optional text field)
- Mark as Personal (toggle)

On save, insert to Supabase transactions table.

### 3.3 Receipt Capture

On any transaction row, a camera icon opens the receipt flow.

Receipt flow:
1. Prompt user to take a photo or upload from library
2. Upload image to Supabase Storage at path: `receipts/{user_id}/{year}/{month}/`
3. Call `/api/ocr` which sends the image to Claude API with a prompt to extract:
   - Vendor name
   - Date
   - Total amount
   - Line items if visible
4. Return extracted metadata and auto-fill the transaction fields
5. Store receipt_url and receipt_filename on the transaction record
6. If Google Drive is connected, also copy the file to the user's connected
   Drive folder using the naming convention:
   `YYYY-MM-DD_VendorName_$Amount.jpg`

Receipt naming convention must be consistent and automatic. The user never
names their own receipts.

---

## Phase 4 — Sage AI Mentor

Sage is the AI layer inside Bookwise. Sage speaks in plain language, uses IQ
vocabulary for the user's industry, and never gives legal or financial advice.
Sage observes patterns and shares what the numbers show.

### 4.1 Sage API Route

Create `/api/sage/route.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { query, context } = await req.json()

  // context includes: industry, current month summary,
  // recent transactions, bucket status, must-pay items

  const anthropic = new Anthropic()

  const systemPrompt = `You are Sage, a warm and knowledgeable financial mentor
inside the Bookwise app. You speak directly to solo wellness practitioners.
You use their specific industry language (provided in context).
You never use accounting jargon. You never give legal or tax advice.
You say "here is what your numbers show" not "you should."
You are supportive, specific, and brief. Never more than 3 short paragraphs.
You notice patterns. You celebrate wins. You flag concerns gently.
You help the user understand when and how much they can pay themselves
based on their current balances and recent trends.
No em dashes. No jargon. Plain, warm, human language.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `My industry: ${context.industry}
My practice name: ${context.practiceName}
This month so far: ${context.monthSummary}
Recent transactions: ${JSON.stringify(context.recentTransactions)}
Bucket status: ${JSON.stringify(context.buckets)}
Question or context: ${query}`
      }
    ]
  })

  return Response.json({
    insight: message.content[0].type === 'text' ? message.content[0].text : ''
  })
}
```

### 4.2 Sage Insight Types

Sage generates three types of responses:

**Daily Insight (unprompted, loads with dashboard):**
A one-paragraph summary of how the month is tracking.
Example: "Your practice brought in $3,200 this month so far. That puts you
ahead of last month at the same point. Your tax set-aside is on track.
You have enough in operations to cover your must-pay items."

**Pay Yourself Guidance (triggered by Secure My Pay):**
Sage calculates a suggested owner pay range based on current operating bucket,
must-pay items, and remaining days in the month. Never a specific command.
Example: "Based on what is sitting in your operations fund and your upcoming
must-pay items, a payment to yourself in the range of $800 to $1,100 looks
healthy right now."

**Question Answering (user types a question):**
User can ask Sage plain-language questions in a chat input on the dashboard.
Example questions Sage handles well:
- "How much did I spend on supplies this month?"
- "Was last month better than this month?"
- "Am I on track to hit my income goal?"
- "How much can I pay myself this week?"

---

## Phase 5 — Reports

Route: `/reports`

### 5.1 P&L Report

Dynamic calculation from Supabase transactions for any date range.
Default view: current month.

Toggle at the top of the report:
- "My Language" (IQ mode, default)
- "Accountant View" (standard accounting terms)

In My Language mode:
- Header: "[Practice Name] Practice Summary"
- Income section uses IQ income label
- Expense categories use IQ labels
- Net result labeled as "Your Take-Home"

In Accountant View mode:
- Standard P&L structure
- Standard accounting terms
- Schedule C categories appear as section notes (not visible to user in My Language mode)

### 5.2 Export

Single button: "Export for My CPA"
Generates a CSV with:
- Standard accounting column headers (Schedule C-aligned)
- All non-personal transactions for the selected date range
- Receipt URLs included as a column
- A note row at the top: "Prepared by Bookwise. Reviewed with a licensed CPA before filing."

### 5.3 Tax Estimate Widget

On the reports page, a persistent card showing:
"Estimated tax set-aside needed based on 25% of net income: [amount]"
Small note below: "25% covers Federal, Self-Employment, and State taxes for most
solo practitioners. Confirm the right rate with your CPA."

---

## Phase 6 — Settings

Route: `/settings`

### 6.1 Service Menu

List of the user's offerings with name, price, and duration.
Add / edit / archive services.
These power the income category dropdowns in the ledger.

### 6.2 Must-Pay Items

List of recurring fixed expenses.
Fields: name, monthly amount, variable toggle (for items like utilities
where actual differs from budgeted).
Show budget vs. actual for variable items.

### 6.3 Connections

Re-access the connections panel from onboarding.
Show connected status for Stripe, Plaid, Google Drive.
Allow reconnect or disconnect.

### 6.4 Vibe

Allow user to change their skin at any time.
Live preview before confirming.

### 6.5 Profile

Practice name, industry (read-only after onboarding), daily pulse time.

---

## MCP Connection Notes

### Stripe
Use Stripe MCP to pull charges and payouts.
Map Stripe charge objects to Bookwise income transactions.
Use charge.id as external_id to prevent duplicate imports.
Sandbox credentials work for demo purposes.

### Plaid
Use Plaid Link in sandbox mode.
On successful link, store access_token in profiles.plaid_access_token (encrypted).
Pull transactions using /transactions/get endpoint.
Map Plaid transaction objects to Bookwise transactions.
Use Plaid transaction_id as external_id.
For demo: use Plaid sandbox institution "First Platypus Bank" with pre-seeded data.

### Google Drive
Use Google Drive MCP to create a folder named "Bookwise Receipts" in the user's Drive.
Store folder ID in profiles.google_drive_folder_id.
On receipt upload, copy the file from Supabase Storage to Drive with the
standardized naming convention: YYYY-MM-DD_VendorName_$Amount.jpg

### Calendly / Acuity
Use available MCP to pull completed appointments.
Map appointment objects to income transaction drafts.
Flag them for user confirmation before saving (since the amount may need adjustment).

---

## Demo Data Strategy

For the buildathon demo, seed the following data for the demo account:

```sql
-- Seed demo profile (coach industry, Ethereal Sage vibe)
-- 3 months of realistic transactions
-- Mix of Stripe income, Plaid expenses, and manual entries
-- Pre-filled bucket progress at ~65% for the current month
-- 2 Daily Pulse entries this week
-- 4 Must-Pay items
-- 3 Services in the service menu
-- 8 receipts with images stored
```

The demo account email: `demo@bookwise.app` / password: `bookwise2025`
All demo data uses realistic wellness practitioner amounts.
Income range: $3,500 to $6,000 per month.
Expense categories reflect real bodyworker spend: linens, oils, table rental, CE credits.

---

## Compliance Rules — Hardcoded

These rules must never be violated in any part of the app:

1. Never say "financial advice," "tax advice," or "legal advice" anywhere.
2. Never say "file your taxes" or "you owe X in taxes." Always say "set aside."
3. Never name Profit First methodology or attribute allocation logic to any system.
4. Always include the disclaimer: "Work with a licensed CPA before filing."
5. Sage always says "here is what your numbers show" not "you should."
6. The export is always labeled "for your CPA" not "your tax return."
7. The 25% tax rate is always described as "a recommended safety rate" not a guarantee.

---

## Buildathon Rubric Alignment

| Rubric Dimension | How Bookwise Scores 5/5 |
|---|---|
| Functionality (20%) | Full CRUD on transactions, live bucket calculations, working export, Sage responses |
| UI/UX (15%) | Five skins, Fraunces + Jakarta typography, reservoir animations, confetti, mobile-first |
| Creativity (15%) | IQ Engine language translation is genuinely novel. No other finance app does this. |
| Problem/Solution (15%) | Clear user (wellness solo), clear pain (accounting language fear), clear fix (IQ Engine) |
| Pitch/Presentation (10%) | See VIDEO_SCRIPT.md for the two-minute arc |
| Technical Complexity (10%) | Supabase auth + RLS, Stripe MCP, Plaid MCP, Claude API, Google Drive MCP, OCR |
| Business Potential (10%) | $47B personal training market, underserved by all existing tools, clear path to paid tiers |
| Inspiration Factor (5%) | The vibe system + confetti + "your language" moment will spark conversation |

**Special award targets:**
- Best Solo Project: solo builder, full-stack app, production-quality
- Best for Women: 80%+ of wellness solopreneurs are women. This is built for them.

---

## File Structure

```
bookwise/
  app/
    layout.tsx              # Fonts, providers, global styles
    page.tsx                # Landing / redirect to dashboard or onboarding
    onboarding/
      page.tsx              # Multi-step onboarding
    dashboard/
      page.tsx              # My Dash
    ledger/
      page.tsx              # Transaction log
    reports/
      page.tsx              # P&L and export
    settings/
      page.tsx              # Settings hub
    api/
      sage/route.ts         # Sage AI endpoint
      ocr/route.ts          # Receipt OCR endpoint
      stripe/route.ts       # Stripe sync endpoint
      plaid/route.ts        # Plaid sync endpoint
  components/
    ui/                     # Base components (Button, Card, Input, Modal)
    buckets/                # Reservoir bucket components
    ledger/                 # Transaction row, add transaction form
    sage/                   # Sage chat and insight components
    onboarding/             # Step components
    reports/                # P&L table, export button
  context/
    IQContext.tsx           # IQ Engine global context
    VibeContext.tsx         # Skin/vibe global context
  lib/
    iqMaps.ts               # All three industry language maps
    supabase.ts             # Supabase client
    stripe.ts               # Stripe helpers
    plaid.ts                # Plaid helpers
    scheduleC.ts            # Hidden Schedule C mapping for export
  styles/
    globals.css             # CSS variables for all skins, base styles
```

---

## Build Order for Claude Code

Execute these phases in order. Do not move to the next phase until the current
phase builds without errors.

1. Database schema (run SQL in Supabase dashboard)
2. Project scaffold + font setup + CSS variables for all skins
3. Supabase auth (sign up, sign in, session handling)
4. IQ Engine context + language maps
5. Onboarding flow (all 7 steps)
6. Dashboard: buckets, tax meter, Secure My Pay, Daily Pulse
7. Ledger: transaction list, add transaction, personal toggle
8. Sage API route + dashboard insight card
9. Receipt capture + OCR API route
10. MCP connections (Stripe, Plaid, Google Drive)
11. Reports: P&L, toggle, export CSV
12. Settings: service menu, must-pay, vibe switcher
13. Demo data seed
14. Final polish: animations, mobile QA, error states

---

## Notes for Claude Code

- Never use em dashes. Use commas or restructure the sentence.
- Never spell "Class" with one "s." It is always "Class."
- No number spinwheels. Always numeric keypad or increment/decrement buttons.
- All currency displays: always two decimal places, always preceded by $.
- All financial calculations must exclude transactions where is_personal = true.
- The word "accounting" should not appear in the user-facing UI except on the
  Accountant View toggle label.
- Sage never uses the word "revenue," "COGS," "receivable," or "payable" unless
  Accountant View is active.
- Every component that displays a financial term must call t() from IQContext
  rather than hardcoding the label.
- Test every feature with all three industries before marking phase complete.
