# CLAUDE.md — Bookwise

**Stack:** Next.js 15 App Router, Supabase (auth + db + storage), Anthropic API, Tailwind CSS v4, Framer Motion, canvas-confetti, Vercel.
**Repo:** github.com/hosca214/Bookwise
**Live URL:** https://bookwise-coral.vercel.app

---

## Rules

1. No em dashes anywhere — not in UI, comments, or copy.
2. No number spinwheels. All number inputs use text inputs with `inputMode="numeric"` or `inputMode="decimal"`, or stepper buttons.
3. Body text minimum 16px. Primary metrics 36-40px Lora bold.
4. Headers: Lora. Body: Plus Jakarta Sans.
5. Every financial label calls `t()` from IQContext. Never hardcode.
6. Sage never says: revenue, COGS, receivable, payable, you should, you owe, file your taxes. These terms may appear in marketing copy and demo/translation context only. They must never appear in AI (Sage) output.
7. Currency: always `$X.XX` format.
8. Exclude `is_personal=true` from all financial calculations.
9. "accounting" never appears in UI except the Reports language toggle label.
10. Test all three industries before marking any phase done.
11. Every async operation must have explicit error handling. API routes always return a typed Response — never throw unhandled exceptions.
12. Code must be written so it cannot silently break: no unguarded `.data[0]`, no optional chaining that swallows missing state, no assumptions about external availability.
13. Write minimal, readable code. Name things clearly. No redundant state, no duplicate logic, no commented-out code. A human must be able to read and modify any file without prior context.
14. Before committing any file: remove all `console.log`, dead imports, and unused variables.
15. Write in full sentences throughout the app and all marketing copy. Do not connect clauses with commas to keep a sentence going. Use a period. Start a new sentence.

---

## Design System

**Fonts** — `next/font/google`: Lora 400/600/700 (serif), Plus Jakarta Sans 400/500/600/700 (sans). Applied via CSS variables `--font-serif` and `--font-sans`. Class `font-serif` maps to Lora.

**Skins** — `data-vibe` on `<html>`, stored in `profiles.vibe`. Two skins exist: `sage` (warm green) and `midnight` (dark purple).

```css
[data-vibe="sage"] {
  --color-background: #F5F2EC; --color-card: #FFFFFF;
  --color-primary: #7C9A7E; --color-primary-dark: #4E6E52;
  --color-accent: #C4A882; --color-foreground: #2C3528; --color-ink: #2C3528;
  --color-muted-foreground: #6B7566; --color-muted: #EDE8DF; --color-border: #E0D8CF;
  --color-danger: #C4714A;
  --color-profit: #7C9A7E; --color-tax: #C4A882; --color-ops: #4E6E52;
  --color-pay: #4E6E52;
  --color-primary-foreground: #FFFFFF;
}
[data-vibe="midnight"] {
  --color-background: #1E1E26; --color-card: #2A2A36;
  --color-primary: #B09FCC; --color-primary-dark: #8A7AAA;
  --color-accent: #C8C8D0; --color-foreground: #EEEEF4; --color-ink: #EEEEF4;
  --color-muted-foreground: #9090A0; --color-muted: #252530; --color-border: #3A3A48;
  --color-danger: #E07070;
  --color-profit: #B09FCC; --color-tax: #C8C8D0; --color-ops: #8A7AAA;
  --color-pay: #8A7AAA;
  --color-primary-foreground: #1E1E26;
}
```

**Component specs:**
- Cards: 12px radius, `box-shadow: 0 1px 8px rgba(0,0,0,0.06)`, `var(--color-card)` bg.
- Buttons: 10px radius, min 48px height. Pill nav buttons: 999px radius.
- Inputs: 8px radius, min 48px height, 1.5px border `var(--color-border)`.
- BottomNav: fixed 60px, 4 tabs, solid `var(--color-card)` bg — no backdrop-blur.
- Layout: mobile-first, single column, max-width 480px centered.
- Page headers: Lora 28px.
- Section labels: Jakarta 11px uppercase 0.08em tracking, `var(--color-muted-foreground)`.
- No bold body text used as heading substitute.
- All styles written as inline React `CSSProperties` objects. No Tailwind classes on layout/spacing — Tailwind only used for `font-serif` and `skeleton` utility classes.

---

## Database Schema

All tables have RLS enabled. Each user owns their own rows.

```sql
create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users primary key,
  practice_name text,
  industry text check (industry in ('coach','trainer','bodyworker')),
  vibe text default 'sage',
  daily_pulse_time time default '17:00',
  onboarding_complete boolean default false,
  -- money plan
  profit_pct numeric default 10,
  tax_pct numeric default 25,
  ops_pct numeric default 27,
  -- pay settings
  pay_target numeric default 0,
  transfer_day text default 'Monday',
  monthly_essential_cost numeric default 0,
  -- integrations
  google_drive_folder_id text,
  plaid_access_token text,
  plaid_item_id text,
  stripe_access_token text,
  stripe_user_id text,
  square_access_token text,
  square_merchant_id text,
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
  service_id uuid references services(id),
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
  pay_target numeric default 0,
  pay_funded numeric default 0,
  celebration_note text,
  unique(user_id, month)
);

create table beta_applications (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text not null,
  practice_type text not null,
  money_challenge text,
  created_at timestamptz default now()
);

-- RLS policies
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
-- beta_applications: insert open, no read/update by users
```

---

## IQ Engine

`t(key)` returns `IQ_MAPS[industry][key] ?? key`. In accountantMode (Reports page only) returns key unchanged.

```typescript
export type Industry = 'coach' | 'trainer' | 'bodyworker'

export const IQ_MAPS: Record<Industry, Record<string, string>> = {
  coach: {
    'Income': 'Income', 'Session Income': 'Coaching Income', 'Package Income': 'Program Income',
    'Retainer Income': 'Retainer Income', 'Tip Income': 'Tip', 'Other Income': 'Other Income',
    'Expenses': 'Business Expenses', 'Supplies': 'Office Supplies', 'Equipment': 'Tools and Tech',
    'Software': 'Platforms and Apps', 'Rent': 'Studio or Office Rent', 'Facility Fee': 'Coworking Fee',
    'Insurance': 'Liability Coverage', 'Continuing Education': 'Certifications and Training',
    'Marketing': 'Client Attraction', 'Mileage': 'Client Travel', 'Meals': 'Client Meetings',
    'Professional Services': 'Professional Support', 'Other Expense': 'Other Business Cost',
    'Sessions': 'Coaching Sessions', 'Session': 'Coaching Session', 'Appointments': 'Sessions',
    'Table Time': 'Coaching Hours', 'Hours Worked': 'Hours Coached',
    'Profit Bucket': 'Growth Fund', 'Tax Bucket': 'Tax Set-Aside', 'Operations Bucket': 'Daily Operations',
    'Take-Home': 'Take-Home', 'Pay Myself': 'Pay Myself', 'Profit and Loss': 'Practice Summary',
    'Net Profit': 'Take-Home', 'Gross Income': 'Total Coaching Income',
    'Total Expenses': 'Total Business Costs', 'Tax Estimate': 'Tax Set-Aside Estimate',
    'Sessions Given': 'Sessions Coached Today', 'Miles Driven': 'Miles to Clients',
    'your practice': 'your coaching practice', 'your clients': 'your clients',
  },
  trainer: {
    'Income': 'Income', 'Session Income': 'Training Income', 'Package Income': 'Package Income',
    'Retainer Income': 'Membership Income', 'Tip Income': 'Tip', 'Other Income': 'Other Income',
    'Expenses': 'Gym Expenses', 'Supplies': 'Consumables', 'Equipment': 'Gym Equipment',
    'Software': 'Fitness Apps', 'Rent': 'Gym or Studio Fee', 'Facility Fee': 'Facility Fee',
    'Insurance': 'Liability Coverage', 'Continuing Education': 'Certifications and CECs',
    'Marketing': 'Client Attraction', 'Mileage': 'Travel to Sites', 'Meals': 'Client Meetings',
    'Professional Services': 'Professional Support', 'Other Expense': 'Other Business Cost',
    'Sessions': 'Training Sessions', 'Session': 'Training Session', 'Appointments': 'Sessions',
    'Table Time': 'Floor Time', 'Hours Worked': 'Hours Trained',
    'Profit Bucket': 'Growth Fund', 'Tax Bucket': 'Tax Set-Aside', 'Operations Bucket': 'Daily Operations',
    'Take-Home': 'Take-Home', 'Pay Myself': 'Pay Myself', 'Profit and Loss': 'Performance Report',
    'Net Profit': 'Take-Home', 'Gross Income': 'Total Training Income',
    'Total Expenses': 'Total Gym Costs', 'Tax Estimate': 'Tax Set-Aside Estimate',
    'Sessions Given': 'Sessions Trained Today', 'Miles Driven': 'Miles Traveled',
    'your practice': 'your training business', 'your clients': 'your clients',
  },
  bodyworker: {
    'Income': 'Income', 'Session Income': 'Appointment Income', 'Package Income': 'Package Income',
    'Retainer Income': 'Membership Income', 'Tip Income': 'Tip', 'Other Income': 'Other Income',
    'Expenses': 'Practice Expenses', 'Supplies': 'Linens and Supplies', 'Equipment': 'Treatment Supplies',
    'Software': 'Booking Tools', 'Rent': 'Treatment Room Rent', 'Facility Fee': 'Suite or Room Fee',
    'Insurance': 'Liability Coverage', 'Continuing Education': 'CE Credits and Training',
    'Marketing': 'Client Attraction', 'Mileage': 'Travel to Clients', 'Meals': 'Client Meetings',
    'Professional Services': 'Professional Support', 'Other Expense': 'Other Practice Cost',
    'Sessions': 'Appointments', 'Session': 'Appointment', 'Appointments': 'Appointments',
    'Table Time': 'Table Time', 'Hours Worked': 'Hours on the Table',
    'Profit Bucket': 'Growth Fund', 'Tax Bucket': 'Tax Set-Aside', 'Operations Bucket': 'Daily Operations',
    'Take-Home': 'Take-Home', 'Pay Myself': 'Pay Myself', 'Profit and Loss': 'Practice Summary',
    'Net Profit': 'Take-Home', 'Gross Income': 'Total Appointment Income',
    'Total Expenses': 'Total Practice Costs', 'Tax Estimate': 'Tax Set-Aside Estimate',
    'Sessions Given': 'Appointments Today', 'Miles Driven': 'Miles to Clients',
    'your practice': 'your practice', 'your clients': 'your clients',
  },
}
```

**IQ load order on every protected page:**
1. Middleware refreshes auth session.
2. Page fetches `profiles` (industry + vibe + practice_name + onboarding_complete).
3. If `!onboarding_complete` → redirect `/onboarding`.
4. `setIndustry(profile.industry)` on IQContext.
5. `setVibe(profile.vibe)` on VibeContext → sets `data-vibe` on `document.documentElement`.
6. Page renders. Never render financial labels before step 4.

---

## Schedule C Shadow Map (export only, never shown in UI)

| Category Key | Schedule C Line | Number |
|---|---|---|
| Session/Appointment/Coaching/Package/Retainer/Membership Income | Gross Receipts | Line 1 |
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

## Build Phases

### Phase 1: Scaffold and Auth ✅
- `app/layout.tsx` — fonts, `data-vibe="sage"` on html, Toaster
- `styles/globals.css` — both skin CSS blocks + confettiPop / fadeUp / shimmer keyframes + `.skeleton` class
- `lib/supabase.ts` — `createClient()` browser helper
- `lib/supabase-server.ts` — `createServerSupabaseClient()` server helper (async, must be awaited)
- `context/IQContext.tsx` — `t()`, `industry`, `accountantMode`, `toggleAccountantMode`
- `context/VibeContext.tsx` — `vibe`, `setVibe`, `VIBES` array with swatches and bg colors
- `middleware.ts` — session refresh + route protection (`/dashboard /ledger /reports /settings /onboarding`)
- `app/auth/callback/route.ts` — OAuth handler
- `app/login/page.tsx` — email+password + Google OAuth, single page signup/signin toggle

### Phase 2: Onboarding ✅
Route `/onboarding`. Framer Motion slide transitions. 10 steps total (`TOTAL_STEPS = 10`). Back button on steps 2+. Progress dots. Writes to Supabase only on Step 10.

- **Step 1:** Welcome — "Welcome to Bookwise." / "We are here to help you keep more of what you earn." / "Let's Begin"
- **Step 2:** Practice name input + business account education card. Asks if user has a dedicated business account (Yes/Not yet). Either path continues.
- **Step 3:** Three full-width tap cards for industry. Coach/Briefcase. Trainer/Activity. Bodyworker/Heart. Tapping activates IQ Engine immediately and advances to next step.
- **Step 4:** Vibe picker — scrollable horizontal row of 140px cards (bg + swatches + name). Tap = live preview via VibeContext.
- **Step 5:** Bucket sliders — four rows: Taxes Set Aside (tax %, adjustable, default 25%), Expense Coverage (ops_pct, adjustable, industry default: coach 20/trainer 27/bodyworker 32), Growth Fund (profit %, adjustable, default 10%), Take-Home (calculated remainder, read-only, live-updating). Sliders are range inputs with `accentColor`. `setOpsPct(OPS_DEFAULTS[industry])` fires when industry is selected in Step 3.
- **Step 6:** Integrations — Google Drive (real OAuth via `/api/auth/google-drive?from=onboarding`, saves state to `sessionStorage` before redirect and restores on return). Stripe and Plaid shown as "Coming soon."
- **Step 7:** Pay target + essential cost — two large text inputs (`inputMode="numeric"`, Lora 40px). Monthly pay goal and monthly "cost to show up."
- **Step 8:** Transfer day — 7 full-width day buttons, one selected at a time. Defaults to Monday.
- **Step 9:** Pulse time — hour/minute text inputs (`inputMode="numeric"`) + AM/PM toggle buttons. Default 5:00 PM.
- **Step 10:** Non-skippable disclaimer. "Bookwise organizes your numbers and shows you patterns. Sage, your AI mentor, shares observations. Nothing here is financial or legal advice. Always work with a licensed CPA before filing." Button: "I understand. Let's go." — triggers `handleComplete()` which upserts all collected fields to `profiles` and redirects to `/dashboard`.

**Onboarding upsert fields:** `practice_name`, `industry`, `vibe`, `daily_pulse_time`, `profit_pct`, `tax_pct`, `ops_pct`, `pay_target`, `transfer_day`, `monthly_essential_cost`, `onboarding_complete: true`.

### Phase 3: Dashboard ✅
Route `/dashboard`. Header "My Dash" (Lora 28px). Sub-header: practice name + win streak badge (shows when user has paid themselves 2+ consecutive months).

Cards in order:

- **My Take-Home Pay card** — shows `takeHome = max(0, monthIncome × (1 - taxFrac - profitFrac) - opsActual)`. Monthly/Weekly toggle. Progress bar vs `pay_target` (motivational goal). Sublabel "After Taxes Set Aside, expenses, and Growth Fund". When $0 shows "Your expenses exceeded your income this month." "What is this?" expandable.
- **Money Plan tiles** — shown only when `monthIncome > 0`. Three inline cards: Taxes Set Aside (`var(--color-tax)`), Business Expenses (`var(--color-ops)`), Growth Fund (`var(--color-profit)`). Each shows funded/actual amount (Lora 28px), a 5px progress bar, and "What is this?" expandable. Tax card includes next quarterly deadline name + days-away counter. Business Expenses tile shows `opsActual` (= `monthExpenses`) vs `opsTarget` (= `monthIncome × opsFrac`). Bar color: green under 85%, amber 85-99%, red 100%+. Overage alert shown in red when over budget.
- **Empty state** — when `monthIncome === 0`, shows dashed prompt card instead of the three tiles.
- **Cost to Show Up card** — shows `monthIncome / essentialBase` as a percentage coverage bar. "Your practice is paying for itself" when ≥ 100%.
- **Make a Transfer button** — full-width primary, opens modal listing all four bucket amounts (Take-Home, Tax, Growth, Ops). Confirm → updates `buckets` row → fires Confetti → opens Celebration modal.
- **Celebration modal** — chip shortcuts + textarea for "one small thing you'll do for yourself." Saves to `buckets.celebration_note`.
- **Daily Pulse section** — `PulseCalendar` component (calendar dot heatmap for current month), then Sessions / Hours / Miles text inputs (`inputMode="decimal"`). Save Pulse writes to `daily_pulse`. Selecting a past date loads that day's existing values.
- **Sage says... card** — fetches `/api/sage` (type: `daily_insight`) on mount. RefreshCw regenerate button. Skeleton while loading.
- **Sage Wisdom card** — rotating array of 6 tips. "Next" button cycles them.

Dashboard queries: `profiles`, `transactions` (current month, non-personal), `buckets` (current month, creates if missing), `daily_pulse` (today + current month for calendar), `buckets` again for win streak.

### Phase 4: Ledger ✅
Route `/ledger`.

**Header:** "Ledger" (Lora 28px). Entry count or "Every dollar in, every dollar out."

**Filter bar** (sticky):
- Search input (searches `t(category_key)` and `notes`)
- All / Income / Expenses segmented toggle
- Category chips (appear when Income or Expenses selected, multi-select)
- Month chips (last 3 months, default current month)

**Totals bar:** Income / Expenses / Net for the filtered view (business transactions only).

**Transaction list:** newest first. Each row shows date, `t(category_key)`, notes, source badge (Manual/Stripe/Plaid), amount (green for income, muted for expense), personal toggle (eye icon), receipt camera icon. Tapping camera on an existing row uploads to Supabase Storage and calls `/api/ocr` to populate vendor.

**Add sheet** (slides up from bottom, floating + button bottom-right):
- Date picker, Income/Expense toggle
- Service selector (when Income: shows active services from `services` table, auto-fills amount)
- Category select (IQ-mapped)
- Amount text input (`inputMode="decimal"`)
- Notes input
- Personal toggle
- Scan Receipt: file input (`accept="image/*" capture="environment"`) → uploads to `receipts/{user_id}/{YYYY-MM}/` → calls `/api/ocr` → auto-fills amount, date, notes
- Save inserts to `transactions` with `source: 'manual'`

**Empty state:** "No entries yet." + "Add your first entry" button.

### Phase 5: Sage API ✅
`app/api/sage/route.ts` — POST `{ type, context }` → `claude-sonnet-4-20250514` max_tokens 350. Types: `daily_insight | pay_guidance | question`. Injects IQ vocab into system prompt. No em dashes. 2-3 paragraphs. Ends with one concrete observation, not a question.

`app/api/ocr/route.ts` — POST `{ imageUrl }` → `claude-sonnet-4-20250514` max_tokens 200. Returns `{ vendor: string, date: 'YYYY-MM-DD', amount: number }`.

### Phase 6: Reports ✅
Route `/reports`.

- Language toggle (this page only): "My Language" | "Accountant View" → `toggleAccountantMode()`.
- Date range: This Month / Last Month pills + custom date inputs.
- P&L card: `t('Gross Income')` $X → line items (indented, 14px muted) → Total Expenses → Net Profit (Lora 28px `var(--color-primary)`) → Tax Estimate box (25%, "recommended safety rate. Confirm with your CPA.").
- Accountant View: same structure, `t()` returns raw keys, Schedule C line shown muted beside each line.
- Bar chart (Recharts): 6-month income/expenses trend.
- Win Record section: months where `pay_funded > 0`.
- "Export for My CPA" → `generateCPAExport()` from `lib/csv.ts` → downloads CSV.
- CSV: `Bookwise Export -- [Practice Name] -- [Range]` header + `Always review with a licensed CPA before filing.` + columns: Date, Description, Category, Schedule C Category, Schedule C Line, Amount, Type, Receipt URL.
- Empty: "No transactions for this period." + link to Ledger.

### Phase 7: Settings ✅
Route `/settings`.

**Service Menu:** Lists active services sorted by booking count, then name. Each row shows name, price, duration, booking count, and X to deactivate (`is_active = false`). Add form: name input, price text input, duration stepper (15-min steps, +/- buttons). Saves to `services` table.

**Vibe:** Two skin cards (horizontal scroll, 140px, swatches + name). Tap = live preview. Confirm button saves `profiles.vibe`.

**Pay Settings:** Pay target (monthly take-home goal), transfer day select, monthly essential cost. Saves to `profiles`.

**Money Plan:** Taxes Set Aside %, Business Expenses %, Growth Fund % — all three adjustable steppers (+/- 1%). Take-Home = `100 - tax - ops - profit` (read-only calculated remainder). Shows "Industry default: X%" helper under Business Expenses. Validation warning + disabled Save if allocations exceed 100%. Saves `profit_pct`, `tax_pct`, `ops_pct` to `profiles`.

**Connected Apps:**
- Google Drive — real OAuth via `/api/auth/google-drive`. Shows Connected / Connect button based on `profiles.google_drive_folder_id`.
- Plaid — real OAuth via `usePlaidLink` hook. Fetches link token from `/api/plaid/link-token`, opens Plaid Link modal, exchanges token at `/api/plaid/exchange-token` (syncs 90 days of transactions). Shows Connected / Connect button based on `profiles.plaid_item_id`.
- Stripe — static "Coming soon" row.
- Square — static "Coming soon" row.

**Account:** Log out button. "Reset onboarding" (requires confirmation tap, sets `onboarding_complete = false`).

**Disclaimer:** "Bookwise organizes and presents your financial data. Sage shares observations, not advice. Work with a licensed CPA before filing."

### Phase 8: Demo Data (PENDING)
Demo account: `demo@bookwise.app` / `Demo2025!` — bodyworker, sage vibe.

```sql
-- profile: practice_name='Hands & Heart Massage', industry='bodyworker', vibe='sage',
--   onboarding_complete=true, profit_pct=10, tax_pct=25, pay_target=3500,
--   transfer_day='Monday', monthly_essential_cost=1050
-- 6 services: 60min $120, 90min $165, 90min deep tissue $180, 4-pack $440, add-on $35, hot stone $195
-- 35 transactions (April + March): 20 income, 15 expenses
--   income: appointments ($120/$165/$180), packages ($440), tips ($20-$40)
--   expenses: linens $45, oils $65, room rent $800, CE $150, insurance $35, booking software $25
-- 2 daily_pulse entries (yesterday + today)
-- current month buckets: profit_funded ~60%, tax_funded ~70%, ops_funded ~55%
```

**Polish checklist:**
- [ ] Test coach / trainer / bodyworker on every screen
- [ ] Verify every label goes through `t()`
- [ ] Test Midnight theme on every screen
- [ ] Test 375px viewport
- [ ] Confetti fires on Make a Transfer → I did it
- [ ] OCR populates transaction form from receipt photo
- [ ] CSV downloads with correct columns
- [ ] P&L accountant toggle works both modes
- [ ] Empty states on fresh account
- [ ] All loading states use skeleton, never spinner
- [ ] No spinwheels anywhere
- [ ] Remove all `console.log`
- [ ] `next build` passes clean

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/sage` | POST | AI insight via Claude. Types: `daily_insight`, `pay_guidance`, `question`. |
| `/api/ocr` | POST | Receipt OCR via Claude. Returns `{ vendor, date, amount }`. |
| `/api/beta-apply` | POST | Saves beta application to `beta_applications`, sends Resend email to `ADMIN_NOTIFICATION_EMAIL`. Email failure is silent — DB write is source of truth. |
| `/api/auth/google-drive` | GET | Initiates Google Drive OAuth. Accepts `?from=onboarding` to redirect back correctly. |
| `/api/auth/google-drive/callback` | GET | Exchanges Google code for tokens, saves `google_drive_folder_id` to profiles. |
| `/api/plaid/link-token` | POST | Generates Plaid Link token for authenticated user. |
| `/api/plaid/exchange-token` | POST | Exchanges Plaid public token, stores `plaid_access_token` + `plaid_item_id`, syncs 90 days of transactions. |

---

## Mobile Navigation

Fixed bottom bar, 60px, `var(--color-card)` bg, solid (no blur), border-top `var(--color-border)`.
Tabs: House/"Dash"/dashboard · List/"Ledger"/ledger · FileText/"Reports"/reports · Settings/"Settings"/settings.
Active: `var(--color-primary)` icon + label + 3px dot below. Inactive: `var(--color-muted-foreground)`.
Labels: Jakarta 11px. No hamburger. No sidebar.

---

## Error and Loading States

- Loading: skeleton shimmer only (`className="skeleton"`). Never spinner.
- Network error: "Could not connect. Check your connection and try again."
- Auth error: redirect `/login`.
- Empty Ledger: "No entries yet." + "Add your first entry" button.
- Empty Reports: "No transactions for this period." + link to Ledger.
- Sage fail: "Sage is thinking. Try again in a moment." + retry button.
- OCR fail: "Could not read receipt. Fill in manually."

---

## Compliance (Never Change)

1. App organizes data. Never advises.
2. Sage observes patterns. Sage does not direct action.
3. Never say: financial advice, tax advice, legal advice, file your taxes, you owe.
4. Always say: set aside, here is what your numbers show, work with your CPA.
5. 25% tax rate = "recommended safety rate," never a guarantee.
6. CSV always includes: "Always review with a licensed CPA before filing."
7. Onboarding Step 10 disclaimer is non-skippable.
8. No mention of Profit First or any named methodology.
9. No investment language anywhere.

---

## Environment Variables

Required on Vercel (production + development + preview):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `ANTHROPIC_API_KEY` | Claude API (Sage + OCR) |
| `GOOGLE_DRIVE_CLIENT_ID` | Google OAuth |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google OAuth |
| `PLAID_CLIENT_ID` | Plaid API |
| `PLAID_SECRET` | Plaid API |
| `PLAID_ENV` | `sandbox` or `production` |
| `RESEND_API_KEY` | Email (beta-apply notifications) |
| `RESEND_FROM_EMAIL` | Sender address (defaults to `onboarding@resend.dev`) |
| `ADMIN_NOTIFICATION_EMAIL` | Where beta applications are emailed |

---

## Session Start Checklist

1. Re-read this file.
2. Check which phase is in progress.
3. Verify last completed phase: `next build` passes clean.
4. Confirm `data-vibe` skin variables active in `globals.css`.
5. Confirm `useIQ()` imported and `t()` used in component being built.
6. Verify `IQ_MAPS` has the key before using it in any financial label.
