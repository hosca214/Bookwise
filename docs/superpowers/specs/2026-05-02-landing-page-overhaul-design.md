# Landing Page Overhaul — Design Spec
**Date:** 2026-05-02
**Status:** Approved

---

## Overview

Four coordinated improvements to the Bookwise landing page:
1. Fix the mobile hero phone frame being clipped
2. Reorder sections for a stronger story arc
3. Add desktop nav section anchors
4. Highlight the three AI capabilities more prominently
5. SEO and GEO optimization (sitemap, robots.txt, canonical URL, enhanced structured data)

---

## 1. Mobile Hero Phone Frame Fix

**Problem:** The hero section has `overflow: 'hidden'` in its inline style. On mobile, the PhoneFrame component (230px wide, 438px tall) renders below the CTAs with only 60px bottom padding on the section. The overflow clips the bottom of the phone.

**Fix:** Split the overflow handling. The `overflow: 'hidden'` exists to clip the decorative background radial gradient circle. Instead of hiding overflow on the whole section, wrap the background circle in its own absolute-positioned div with `overflow: 'hidden'` and `inset: 0`, and remove `overflow: 'hidden'` from the section itself.

Additionally, increase mobile `paddingBottom` on the hero section from `60` to `80` to give the phone frame room to breathe.

**Files changed:** `app/landing/page.tsx` — hero `<section>` style and background circle wrapper.

---

## 2. Section Reorder

**Current order:**
Nav → Hero → Nervous System → Stories → Who It's For → How It Works → Features → Zen Bookkeeper → FAQ → Pricing → Beta Application → Footer

**New order (story arc — problem → solution → proof → features → trust → convert):**
Nav → Hero → Nervous System → How It Works → Stories → Features → Who It's For → Zen Bookkeeper → FAQ → Pricing → Beta Application → Footer

**What changed and why:**
- Move "How It Works" before "Stories." The Nervous System section establishes the problem. "How It Works" delivers the solution immediately after. "Stories" then works as social proof — the reader sees themselves in the stories after already understanding the product.
- Everything else stays in order. No sections are removed.

**Files changed:** `app/landing/page.tsx` — section block order only, no content changes.

---

## 3. Nav Section Anchors

**Current nav:** Logo + "Sign In" pill only. No section anchors.

**New desktop nav:** Logo | How It Works | Features | Pricing | FAQ | Apply for Beta | Sign In

- Section links are plain text anchors (`<a href="#how-it-works">`, `#features`, `#pricing`, `#faq`, `#beta`). No active state needed — this is a landing page.
- Links are styled: Plus Jakarta Sans 14px, `color: MUTED`, hover `color: INK`. No underline.
- "Apply for Beta" is styled as the active pill (same as current "Sign In" button) to draw the eye to the CTA.
- "Sign In" becomes a ghost pill: white bg with border, no fill.

**Mobile nav:** Logo + "Apply for Beta" pill only. Section links are hidden on mobile (width < 768px). Mobile users are already in a scroll context and the page is short enough that they will encounter every section naturally.

**Anchor IDs to verify/add in page sections:**
- `#how-it-works` — add `id="how-it-works"` to the How It Works section
- `#features` — add `id="features"` to the Features section
- `#pricing` — already present (`id="pricing"`)
- `#faq` — add `id="faq"` to the FAQ section
- `#beta` — already present (`id="beta"`)

**Files changed:** `app/landing/page.tsx` — nav JSX and the four section `<section>` tags that need `id` attributes.

---

## 4. AI Feature Highlights

**Current state:** The Features section has 6 cards. Sage AI Insights and Receipt Scanning call out AI in their copy but are visually indistinguishable from non-AI cards. The IQ Engine (language layer) is not represented at all.

**Changes:**

### 4a. Add IQ Engine feature card

Add a 7th card to the `FEATURES` array:

```
icon: <Languages size={22} />  (or Sparkles if Languages is not imported)
title: "Your Language, Not Ours"
body: "Bookwise replaces accounting jargon with words from your world.
       Coaches see 'Coaching Income' and 'Client Attraction.' Trainers see
       'Training Income' and 'Gym Expenses.' Bodyworkers see 'Appointment Income'
       and 'Treatment Supplies.' No translation required."
aiPowered: true
```

This goes in position 3 (after Sage AI Insights, before Receipt Scanning) so the three AI cards are grouped.

### 4b. Add `aiPowered` flag to three cards

Add `aiPowered: true` to:
- Sage AI Insights
- Receipt Scanning
- Your Language, Not Ours (new card)

Update the `FEATURES` type to include `aiPowered?: boolean`.

### 4c. Render AI badge on flagged cards

In the feature card render loop, when `f.aiPowered === true`, render a small badge below the icon box and before the title:

```
"AI-powered"  — 10px, Plus Jakarta Sans, uppercase, 0.08em tracking
color: SAGE, background: rgba(124,154,126,0.10), padding: 3px 8px, borderRadius: 999
```

This visually groups the AI capabilities without changing the card layout.

**Files changed:** `app/landing/page.tsx` — `FEATURES` array and feature card render block.

---

## 5. SEO and GEO Optimization

### 5a. metadataBase — required for OG and canonical to resolve

Add `metadataBase` to the `metadata` export in `app/layout.tsx`:

```typescript
metadataBase: new URL('https://bookwise-coral.vercel.app'),
```

Once the custom domain is purchased, update this to the real domain. This is the one change that makes the existing OG image and all other absolute URLs actually work.

### 5b. Canonical URL

Add to the `metadata` export in `app/layout.tsx`:

```typescript
alternates: {
  canonical: '/',
},
```

This tells search engines the canonical URL of the root page, preventing duplicate content issues.

### 5c. Landing page-specific metadata

Add a `metadata` export to `app/landing/page.tsx`. Since the landing page is the primary public-facing page, it should have richer metadata than the global default:

```typescript
export const metadata: Metadata = {
  title: 'Bookwise — Financial Clarity for Coaches, Trainers, and Bodyworkers',
  description: 'Track every dollar in and out. Know exactly what to save for taxes. See what to pay yourself this month. Built for wellness practitioners by The Zen Bookkeeper.',
  alternates: {
    canonical: '/landing',
  },
  openGraph: {
    title: 'Bookwise — Financial Clarity for Wellness Practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself. Built for coaches, trainers, and bodyworkers.',
    url: '/landing',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bookwise — Financial Clarity for Wellness Practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself.',
    images: ['/opengraph-image'],
  },
}
```

Note: `app/landing/page.tsx` is a `'use client'` component. Next.js 15 does not support exporting `metadata` from client components. To work around this, create `app/landing/layout.tsx` as a thin server component that exports the metadata and passes children through unchanged:

```typescript
import { Metadata } from 'next'
export const metadata: Metadata = { /* ... */ }
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

The `page.tsx` itself keeps `'use client'` and is not modified for this change.

### 5d. Sitemap

Create `app/sitemap.ts` as a Next.js 15 sitemap route:

```typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://bookwise-coral.vercel.app/landing', lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://bookwise-coral.vercel.app/login',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]
}
```

Update the base URL when the custom domain is live.

### 5e. Robots.txt

Create `app/robots.ts`:

```typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/ledger', '/reports', '/settings', '/onboarding', '/api/'] },
    sitemap: 'https://bookwise-coral.vercel.app/sitemap.xml',
  }
}
```

This allows crawling of the landing page and login, and blocks all authenticated routes and API routes.

### 5f. Enhanced JSON-LD structured data (GEO optimization)

Replace the existing basic `SoftwareApplication` JSON-LD in `app/layout.tsx` with two structured data blocks:

**Block 1 — SoftwareApplication (richer):**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Bookwise",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "AI-powered bookkeeping for wellness practitioners — coaches, personal trainers, and bodyworkers. Track income and expenses, see what to save for taxes, know what to pay yourself, and get daily AI insights in plain language.",
  "offers": { "@type": "Offer", "price": "19.00", "priceCurrency": "USD", "priceValidUntil": "2027-01-01" },
  "creator": { "@type": "Organization", "name": "The Zen Bookkeeper", "url": "https://thezenbookkeeper.net" },
  "featureList": ["AI receipt scanning", "Sage AI daily insights", "Plain language financial labels", "Tax set-aside calculator", "CPA export", "Stripe and Plaid integration"]
}
```

**Block 2 — FAQPage (enables Google FAQ rich result and AI overview inclusion):**
Mirrors the 6 FAQ accordion questions and answers as structured data. This is the highest-leverage GEO change — AI search engines (Perplexity, ChatGPT, Google AI Overview) prefer pages with structured FAQ data when surfacing answers about a product.

Both blocks go in `<head>` via `dangerouslySetInnerHTML` in `app/layout.tsx`.

---

## Files Changed Summary

| File | Change |
|---|---|
| `app/landing/page.tsx` | Fix hero overflow, reorder sections, add nav links, add IQ Engine card, add AI badges, add section IDs |
| `app/landing/layout.tsx` | New file — server component exporting landing-page metadata |
| `app/layout.tsx` | Add `metadataBase`, `alternates.canonical`, enhanced JSON-LD |
| `app/sitemap.ts` | New file — sitemap route |
| `app/robots.ts` | New file — robots route |

---

## What This Does Not Change

- Hero headline and copy
- All section content (text, images, CTAs)
- The beta form and submission logic
- Pricing section content
- Any authenticated app pages
- CLAUDE.md rules — no em dashes, no accounting jargon in UI
