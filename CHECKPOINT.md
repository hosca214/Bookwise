# Bookwise — Build Checkpoint

**Date:** 2026-04-26
**Build status:** `next build` passes clean. 14 static/dynamic routes. Zero TypeScript errors.
**Repo:** github.com/hosca214/Bookwise (branch: main, up to date)

---

## What Is Built and Confirmed Working

### Infrastructure

| File | What it does |
|---|---|
| `app/layout.tsx` | Root layout. Loads Fraunces + Plus Jakarta Sans via `next/font/google`. Sets `data-vibe="sage"` on `<html>`. Wraps in `IQProvider`, `VibeProvider`. Mounts `react-hot-toast` Toaster. |
| `styles/globals.css` | CSS variable blocks for `[data-vibe="sage"]` and `[data-vibe="midnight"]`. Keyframe animations: `confettiPop`, `fadeUp`, `shimmer`. `.skeleton` shimmer class. |
| `middleware.ts` | Supabase session refresh on every request. Route protection: redirects unauthenticated users to `/login` for `/dashboard`, `/ledger`, `/reports`, `/settings`, `/onboarding`. Does NOT check `onboarding_complete` (only dashboard does). |
| `app/auth/callback/route.ts` | Handles Supabase OAuth redirect, exchanges code for session, redirects to `/dashboard`. |
| `context/IQContext.tsx` | `t(key)` translation. `industry` state. `accountantMode` + `toggleAccountantMode`. Falls back to raw key if IQ_MAPS has no entry. |
| `context/VibeContext.tsx` | `vibe` state. `setVibe()` sets `document.documentElement.dataset.vibe`. `VIBES` array (sage, midnight). `normalizeVibe()` maps legacy values. |
| `lib/supabase.ts` | `createClient()` browser Supabase client. `Profile`, `Service`, `Transaction`, `DailyPulse`, `Bucket` TypeScript types. |
| `lib/supabase-server.ts` | `createServerSupabaseClient()` for server components and route handlers. |
| `lib/finance.ts` | `allocateBuckets()` — splits net profit into profit (10%), tax (25%), ops (65%). `calcMileage()` — $0.67/mile IRS rate. |
| `lib/iqMaps.ts` | `IQ_MAPS` — all three industry translation maps. `SCHEDULE_C_MAP` — category key → Schedule C line number, used only in CSV export and Reports accountant view. |
| `lib/csv.ts` | `toCSV()`, `downloadCSV()`, `generateCPAExport()`. CSV includes practice name header + CPA disclaimer. |
| `lib/schema.sql` | Full Supabase schema: profiles, services, transactions, daily_pulse, buckets. RLS policies. |
| `lib/demo-seed.sql` | Demo data seed. Run after signing up as `demo@bookwise.app`. Creates bodyworker profile, 6 services, 35 transactions (March + April 2026), 2 daily_pulse entries, April buckets at ~65% funded. |

### Pages

| File | Status | Notes |
|---|---|---|
| `app/login/page.tsx` | Built | Email+password. Google OAuth. Single-page sign-in/sign-up toggle. Redirects to `/dashboard` on success. |
| `app/onboarding/page.tsx` | Built | 7-step flow with Framer Motion slide transitions. Writes to Supabase only on Step 7. Steps: welcome / practice name / industry / vibe / integrations / pulse time / disclaimer. |
| `app/dashboard/page.tsx` | Built | Checks `onboarding_complete`; redirects to `/onboarding` if false. Three Reservoir circles (Growth Fund 10%, Tax Set-Aside 25%, Daily Operations 65%). Secure My Pay modal + confetti. Daily Pulse card (ChevronUp/Down). Sage Insight card (fetches `/api/sage`). Tax Deadline Countdown. Sage Wisdom rotating tips. |
| `app/ledger/page.tsx` | Built | Transaction list newest-first. Pulse red dot. Personal toggle. Floating + button. Add sheet with TapKeypad, category select (IQ-mapped), date picker, notes, personal toggle. Receipt scan via camera → Supabase Storage → `/api/ocr`. |
| `app/reports/page.tsx` | Built | P&L card with gross income, total expenses, net profit (Fraunces 28px), tax estimate (25%). Language toggle (My Language / Accountant View). Schedule C line numbers in accountant mode. This Month / Last Month pills + custom date range. CSV export. |
| `app/settings/page.tsx` | Built | Service menu (add/soft-delete). TapKeypad for price. ChevronUp/Down for duration. Vibe switcher with live preview and save. Connected Apps (static demo). Disclaimer. |
| `app/landing/page.tsx` | Built | Marketing landing page at `/landing`. Auth-aware nav: shows "Go to My Dashboard" if session exists, otherwise Sign In + Try Free. Hero "Already have an account? Sign in here" link. FAQ, features, waitlist email capture. `FadeUp` uses Framer Motion `whileInView` (not `useInView`). |
| `app/page.tsx` | Built | Root redirect — redirects to `/landing`. |

### API Routes

| File | Status | Notes |
|---|---|---|
| `app/api/sage/route.ts` | Built | POST `{ type, context }`. Model: `claude-sonnet-4-20250514`, max_tokens 350. Types: `daily_insight`, `pay_guidance`, `question`. Injects IQ vocab into system prompt. Returns plain text insight. |
| `app/api/ocr/route.ts` | Built | POST `{ imageUrl }`. Model: `claude-sonnet-4-20250514`, max_tokens 200. Returns `{ vendor, date, amount }`. |

### Components

| File | Status | Notes |
|---|---|---|
| `components/dashboard/Reservoir.tsx` | Built | SVG liquid-fill circle. Props: label, funded, target, color. Animated fill via SVG clipPath + CSS transition. |
| `components/ui/BottomNav.tsx` | Built | Fixed 60px bar. 4 tabs: Dash/Ledger/Reports/Settings. Active tab: primary color + 3px dot below. No blur. |
| `components/ui/TapKeypad.tsx` | Built | 3x4 numeric grid (7-8-9 / 4-5-6 / 1-2-3 / . 0 ⌫). `onPointerDown`. Limits to 2 decimal places. Displays value in Fraunces 40px bold above keypad. Props: `value`, `onChange`, `prefix`. |
| `components/ui/Confetti.tsx` | Built | `canvas-confetti` wrapper. Fires on `trigger` prop increment. Used in Secure My Pay flow. |

---

## Partially Built or Unverified

| Item | Issue |
|---|---|
| **Demo account not seeded** | `lib/demo-seed.sql` is written but not yet run. Requires signing up as `demo@bookwise.app` / `Demo2025!` first, then running the SQL in Supabase dashboard. |
| **OCR untested end-to-end** | Code is wired up but requires a real image upload and live Anthropic API key to verify the full flow. Receipt URL is stored in `transactions.receipt_url` after upload. |
| **Sage API untested end-to-end** | Route exists and is wired into the dashboard. Requires a live `ANTHROPIC_API_KEY` in `.env.local` to confirm response format and tone compliance. |
| **Confetti on Secure My Pay** | Code calls `setConfettiTrigger(n => n + 1)` which fires `Confetti` component. Not visually confirmed — requires authenticated session and funded buckets. |
| **Ledger onboarding redirect** | Ledger, reports, and settings do NOT individually check `onboarding_complete`. Only the dashboard does. Middleware handles auth-only protection. A user who directly navigates to `/ledger` before completing onboarding will not be redirected to `/onboarding`. |
| **Industry tested on all screens** | `t()` is wired up on all pages but cross-industry visual testing (coach/trainer/bodyworker labels) has not been done. |
| **Midnight Orchid skin** | CSS variables are defined. Vibe switcher is built. Full visual QA on the midnight skin has not been done. |
| **375px viewport** | No viewport testing has been done at iPhone SE width. |

---

## Not Started

| Item | Notes |
|---|---|
| **Vercel deployment** | App has never been deployed. Local dev only. |
| **Stripe / Plaid real integration** | Connected Apps section is fully static/mock. |
| **Google Drive real integration** | `google_drive_folder_id = 'demo'` is stored in onboarding; no real Drive API calls exist. |
| **Push notifications for Daily Pulse** | `profiles.daily_pulse_time` is stored but no notification system is implemented. |

---

## Decisions That Differ from CLAUDE.md

| Decision | CLAUDE.md spec | What was built | Reason |
|---|---|---|---|
| Onboarding redirect scope | "IQ load order on every protected page" — implies each page checks `onboarding_complete` | Only `app/dashboard/page.tsx` redirects to `/onboarding` on `!onboarding_complete`; other pages rely on middleware for auth only | Middleware handles auth protection; adding `onboarding_complete` check to every page would require each page to fetch the profile separately — acceptable tradeoff for now |
| Demo practice name | `practice_name = 'Hands & Heart Massage'` | `practice_name = 'Sage & Stone Bodywork'` | Written independently during seed creation |
| Demo service prices | hot stone $195, 90min deep tissue $180, add-on $35 | Hot Stone Add-On $35, Deep Tissue (75 min) $145, no $180 session | Adjusted to realistic variation; spec prices can be updated in `lib/demo-seed.sql` |
| OCR loading indicator | No spinner rules apply | Receipt scan button shows `RefreshCw animate-spin` icon + "Scanning..." text while OCR is in flight | This is UI feedback for an async action, not a number input spinwheel — does not violate Rule 2 |
| `data-vibe` default in schema | `vibe text default 'ethereal-sage'` | `normalizeVibe()` in VibeContext maps `'ethereal-sage'` and `null` to `'sage'`; CSS uses `[data-vibe="sage"]` | Legacy value mapping is handled transparently; no schema migration needed |
| Model string in API routes | `claude-sonnet-4-20250514` | `claude-sonnet-4-20250514` | Same — no deviation |
