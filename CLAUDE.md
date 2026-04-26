# CLAUDE.md — Bookwise

**Stack:** Next.js 15 App Router, Supabase (auth + db + storage), Anthropic API, Tailwind CSS v4, Framer Motion, canvas-confetti, Vercel.
**Repo:** github.com/hosca214/Bookwise

---

## Rules

1. No em dashes anywhere — not in UI, comments, or copy.
2. No number spinwheels. All number inputs use tap targets or increment buttons.
3. Body text minimum 16px. Primary metrics 36-40px Fraunces bold.
4. Headers: Fraunces. Body: Plus Jakarta Sans.
5. Every financial label calls `t()` from IQContext. Never hardcode.
6. Sage never says: revenue, COGS, receivable, payable, you should, you owe, file your taxes.
7. Currency: always `$X.XX` format.
8. Exclude `is_personal=true` from all financial calculations.
9. "accounting" never appears in UI except the Reports language toggle label.
10. Test all three industries before marking any phase done.

---

## Design System

**Fonts** — `next/font/google`: Fraunces 400/600/700/900, Plus Jakarta Sans 400/500/600/700.

**Skins** — `data-vibe` on `<html>`, stored in `profiles.vibe`:

```css
[data-vibe="sage"] {
  --color-background: #F5F2EC; --color-card: #FFFFFF;
  --color-primary: #7C9A7E; --color-primary-dark: #4E6E52;
  --color-accent: #C4A882; --color-foreground: #2C3528; --color-ink: #2C3528;
  --color-muted-foreground: #6B7566; --color-muted: #EDE8DF; --color-border: #E0D8CF;
  --color-danger: #C4714A; --color-profit: #7C9A7E; --color-tax: #C4A882; --color-ops: #4E6E52;
  --color-primary-foreground: #FFFFFF;
}
[data-vibe="midnight"] {
  --color-background: #1E1E26; --color-card: #2A2A36;
  --color-primary: #B09FCC; --color-primary-dark: #8A7AAA;
  --color-accent: #C8C8D0; --color-foreground: #EEEEF4; --color-ink: #EEEEF4;
  --color-muted-foreground: #9090A0; --color-muted: #252530; --color-border: #3A3A48;
  --color-danger: #E07070; --color-profit: #B09FCC; --color-tax: #C8C8D0; --color-ops: #8A7AAA;
  --color-primary-foreground: #1E1E26;
}
```

**Component specs:**
- Cards: 12px radius, `box-shadow: 0 1px 8px rgba(0,0,0,0.06)`, `var(--color-card)` bg.
- Buttons: 10px radius, min 48px height. Pill nav buttons: 999px radius.
- Inputs: 8px radius, min 48px height, 1.5px border `var(--color-border)`.
- BottomNav: fixed 60px, 4 tabs, solid `var(--color-card)` bg — no backdrop-blur.
- Layout: mobile-first, single column, max-width 480px centered.
- Page headers: Fraunces 28px mobile / 32px tablet.
- Section labels: Jakarta 11px uppercase 0.08em tracking, `var(--color-muted-foreground)`.
- No bold body text used as heading substitute.

---

## Database Schema

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
  name text not null, price numeric not null,
  duration_minutes int, is_active boolean default true
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null, amount numeric not null,
  type text check (type in ('income','expense')),
  category_key text not null, notes text,
  is_personal boolean default false, source text default 'manual',
  external_id text, receipt_url text, receipt_filename text,
  pulse_matched boolean default false, created_at timestamptz default now()
);

create table daily_pulse (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null, sessions_given int default 0,
  hours_worked numeric default 0, miles_driven numeric default 0,
  unique(user_id, date)
);

create table buckets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  month date not null, profit_target numeric default 0, profit_funded numeric default 0,
  tax_target numeric default 0, tax_funded numeric default 0,
  ops_target numeric default 0, ops_funded numeric default 0,
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

**On onboarding complete:**
```typescript
await supabase.from('profiles').upsert({
  id: user.id, practice_name, industry, vibe, daily_pulse_time, onboarding_complete: true,
})
```

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
- `styles/globals.css` — both skin CSS blocks + confettiPop / fadeUp / shimmer keyframes
- `lib/supabase.ts` — `createClient()` browser helper
- `lib/supabase-server.ts` — `createServerSupabaseClient()` server helper
- `context/IQContext.tsx` — `t()`, `industry`, `accountantMode`, `toggleAccountantMode`
- `context/VibeContext.tsx` — `vibe`, `setVibe`, `VIBES` array with swatches
- `middleware.ts` — session refresh + route protection (`/dashboard /ledger /reports /settings /onboarding`)
- `app/auth/callback/route.ts` — OAuth handler
- `app/login/page.tsx` — email+password + Google OAuth, single page signup/signin toggle

### Phase 2: Onboarding ✅
Route `/onboarding`. Framer Motion slide transitions. Write to Supabase only on Step 7.
- Step 1: "Welcome to Bookwise." / "We are here to help you keep more of what you earn." / "Let's Begin"
- Step 2: Practice name input (min 56px height). Skip → "My Practice".
- Step 3: Three full-width tap cards. Coach/Briefcase/"Life, business or wellness coaching". Trainer/Activity/"Personal training, fitness instructor, or movement". Bodyworker/Heart/"Massage, acupuncture, or somatic work". Tap activates IQ Engine immediately.
- Step 4: Two vibe cards side by side (120px). Tap = live preview.
- Step 5: Stripe/Plaid/Google Drive tiles. All mock-connected. Store `google_drive_folder_id = 'demo'`.
- Step 6: Pulse time. ChevronUp/Down buttons. Default 5:00 PM. No spinner.
- Step 7: Non-skippable disclaimer. "Bookwise organizes your numbers... Nothing here is financial or legal advice. Always work with a licensed CPA before filing." Button: "I understand. Let's go."

### Phase 3: Dashboard ✅
Route `/dashboard`. Header "My Dash" (Fraunces). Sub-header: practice name.
- Three `Reservoir.tsx` SVG circles: Growth Fund (profit 10%), Tax Set-Aside (tax 25%), Daily Operations (ops 65%). Targets = % of current month income (`is_personal=false`). Liquid fill animation.
- Tax line: "You have set aside $X for taxes this month." (`var(--color-accent)`)
- Secure My Pay: full-width primary button → modal with bucket amounts → confirm → `Confetti.tsx` → toast "Done. You paid yourself. That is worth celebrating."
- Daily Pulse card: sessions/hours/miles via ChevronUp/Down. Writes to `daily_pulse`.
- Sage Insight card: fetches `/api/sage` on mount. Skeleton loading. RefreshCw regenerate button.
- Tax Deadline Countdown card: next quarterly deadline name + days remaining.
- Sage Wisdom card: rotating tips array, cycles on tap.
- Error: "Could not load your data. Pull to refresh."
- Empty buckets: onboarding prompt card (not 0% circles).

### Phase 4: Ledger ✅
Route `/ledger`.
- Transaction list newest first. Row: date (13px muted) / `t(category_key)` / amount (green income, muted expense) / source badge (Manual/Stripe/Plaid) / red dot if `pulse_matched=false` AND today / personal toggle.
- Empty: "No entries yet." + "Add your first entry" button.
- Floating + button (56px circle, bottom right, above BottomNav).
- Add sheet slides up from bottom. Fields: date picker / type toggle (Income|Expense) / category select (IQ-mapped) / `TapKeypad.tsx` for amount / notes / personal toggle / Save.
- Income categories: Session Income, Package Income, Retainer Income, Tip Income, Other Income.
- Expense categories: Supplies, Equipment, Software, Rent, Facility Fee, Insurance, Continuing Education, Marketing, Mileage, Meals, Professional Services, Utilities, Phone, Internet, Other Expense.
- Scan Receipt: file input (`accept="image/*" capture="environment"`) → upload to `receipts/{user_id}/{YYYY-MM}/` → call `/api/ocr` → auto-populate amount/date/notes.

### Phase 5: Sage API ✅
`app/api/sage/route.ts` — POST `{ type, context }` → `claude-sonnet-4-20250514` max_tokens 350. Types: `daily_insight | pay_guidance | question`. Injects IQ vocab into system prompt. No em dashes. 2-3 paragraphs. Ends with one concrete observation, not a question.

`app/api/ocr/route.ts` — POST `{ imageUrl }` → `claude-sonnet-4-20250514` max_tokens 200. Returns `{ vendor: string, date: 'YYYY-MM-DD', amount: number }`.

### Phase 6: Reports ✅
Route `/reports`.
- Language toggle (this page only): "My Language" | "Accountant View" → `toggleAccountantMode()`.
- Date range: This Month / Last Month pills + custom date inputs.
- P&L card: `t('Gross Income')` $X → line items (indented, 14px muted) → Total Expenses → Net Profit (Fraunces 28px `var(--color-primary)`) → Tax Estimate box (25%, "recommended safety rate. Confirm with your CPA.").
- Accountant View: same structure, `t()` returns raw keys, Schedule C line shown muted beside each line.
- "Export for My CPA" → `generateCPAExport()` from `lib/csv.ts` → downloads CSV.
- CSV: `Bookwise Export -- [Practice Name] -- [Range]` header + `Always review with a licensed CPA before filing.` + columns: Date, Description, Category, Schedule C Category, Schedule C Line, Amount, Type, Receipt URL.
- Empty: "No transactions for this period." + link to Ledger.

### Phase 7: Settings ✅
Route `/settings`.
- Service Menu: list active services. Add form: name input + `TapKeypad` price + ChevronUp/Down duration (15min steps). Remove = `is_active=false`.
- Vibe: two skin cards (swatches + name, 120px). Tap = live preview. Confirm saves `profiles.vibe`.
- Connected Apps: Stripe / Plaid / Google Drive shown as "Connected (Demo Mode)". Static.
- Disclaimer: "Bookwise organizes and presents your financial data. Sage shares observations, not advice. Work with a licensed CPA before filing."

### Phase 8: Demo Data (PENDING)
Demo account: `demo@bookwise.app` / `Demo2025!` — bodyworker, ethereal-sage.

```sql
-- profile: practice_name='Hands & Heart Massage', industry='bodyworker', onboarding_complete=true
-- 6 services: 60min $120, 90min $165, 90min deep tissue $180, 4-pack $440, add-on $35, hot stone $195
-- 35 transactions (April + March): 20 income, 15 expenses
--   income: appointments ($120/$165/$180), packages ($440), tips ($20-$40)
--   expenses: linens $45, oils $65, room rent $800, CE $150, insurance $35, booking software $25
-- 2 daily_pulse entries (yesterday + today)
-- current month buckets ~65% funded
```

**Polish checklist:**
- [ ] Test coach / trainer / bodyworker on every screen
- [ ] Verify every label goes through `t()`
- [ ] Test Midnight Orchid on every screen
- [ ] Test 375px viewport
- [ ] Confetti fires on Secure My Pay
- [ ] OCR populates transaction form
- [ ] CSV downloads with correct columns
- [ ] P&L accountant toggle works both modes
- [ ] Empty states on fresh account
- [ ] All loading states use skeleton, never spinner
- [ ] No spinwheels anywhere
- [ ] Remove all `console.log`
- [ ] `next build` passes clean

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
7. Onboarding Step 7 disclaimer is non-skippable.
8. No mention of Profit First or any named methodology.
9. No investment language anywhere.

---

## Session Start Checklist

1. Re-read this file.
2. Check which phase is in progress.
3. Verify last completed phase: `next build` passes clean.
4. Confirm `data-vibe` skin variables active in `globals.css`.
5. Confirm `useIQ()` imported and `t()` used in component being built.
6. Verify `IQ_MAPS` has the key before using it in any financial label.
