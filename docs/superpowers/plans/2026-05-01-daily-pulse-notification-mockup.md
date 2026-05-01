# Daily Pulse Notification Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline push notification + Sage insight two-card mockup to the existing dark Nervous System section of the landing page, showing visitors the complete daily habit loop.

**Architecture:** All changes are confined to `app/landing/page.tsx`. A `Bell` icon is added to the existing lucide-react import. Two frosted-glass cards (notification + Sage response) are inserted between the paragraph and the habit chips row using existing color constants and the existing `FadeIn` helper. No image files. No new components.

**Tech Stack:** Next.js 15 App Router, React inline styles (`CSSProperties`), lucide-react icons, Framer Motion (`FadeIn` wrapper already in file).

---

### Task 1: Add Bell to lucide-react import

**Files:**
- Modify: `app/landing/page.tsx:6-9`

- [ ] **Step 1: Update the import**

Replace the existing lucide-react import block (lines 6-9) with:

```tsx
import {
  TrendingUp, Shield, Camera, MessageCircle, Download,
  ChevronDown, Check, ArrowRight, Folder, Sparkles, Activity,
  Leaf, Clock, BookOpen, X, RefreshCw, FileText, HardDrive, Zap, Bell,
} from 'lucide-react'
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/landing/page.tsx
git commit -m "feat: add Bell icon import to landing page"
```

---

### Task 2: Adjust paragraph margin and insert notification + Sage cards

**Files:**
- Modify: `app/landing/page.tsx:639-643`

- [ ] **Step 1: Change the paragraph margin from 52px to 32px**

On line 639, change `margin: '0 0 52px'` to `margin: '0 0 32px'`:

```tsx
<p style={{ fontSize: isMobile ? 16 : 18, lineHeight: 1.75, color: 'rgba(245,242,236,0.7)', margin: '0 0 32px' }}>
  Most wellness practitioners spend more energy avoiding their numbers than understanding them. That avoidance has a quiet cost. Bookwise is a 60-second daily check-in, not a quarterly scramble. Log your sessions. See your income update. Know exactly what is set aside. When you know your numbers, your nervous system can relax.
</p>
```

- [ ] **Step 2: Insert the two-card notification group between the paragraph and the habit chips comment**

After the closing `</p>` on line 641 and before `{/* habit chips */}` on line 643, insert:

```tsx
{/* notification + sage loop */}
<FadeIn delay={0.1}>
  <div style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    gap: isMobile ? 10 : 12,
    maxWidth: 560,
    margin: '0 auto 40px',
  }}>
    {/* push notification card */}
    <div style={{
      flex: 1,
      background: 'rgba(245,242,236,0.07)',
      border: '1px solid rgba(245,242,236,0.12)',
      borderRadius: 16,
      padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Bell size={15} color={SAGE} />
        <span style={{ fontSize: 12, fontWeight: 600, color: CREAM, flex: 1 }}>Bookwise</span>
        <span style={{ fontSize: 11, color: 'rgba(245,242,236,0.4)' }}>now</span>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(245,242,236,0.75)', lineHeight: 1.55, margin: 0 }}>
        Your 5 PM check-in is ready. Sixty seconds and you&apos;re done. How did today go?
      </p>
    </div>

    {/* connector arrow — desktop only */}
    {!isMobile && (
      <ArrowRight size={16} color='rgba(245,242,236,0.3)' style={{ flexShrink: 0 }} />
    )}

    {/* sage insight card */}
    <div style={{
      flex: 1,
      background: 'rgba(245,242,236,0.07)',
      border: '1px solid rgba(245,242,236,0.12)',
      borderRadius: 16,
      padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <MessageCircle size={13} color={SAGE} />
        <span style={{ fontSize: 11, fontWeight: 600, color: SAGE }}>Sage AI insight</span>
      </div>
      <p style={{ fontSize: 13, color: CREAM, lineHeight: 1.55, margin: 0 }}>
        Income up 12% this week. Your busiest Tuesday yet.
      </p>
    </div>
  </div>
</FadeIn>

{/* habit chips */}
```

Note: remove the original `{/* habit chips */}` comment from line 643 since it is now placed inline at the end of the insert above.

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Run a local build to confirm no runtime errors**

```bash
cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no errors or warnings about `app/landing/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add app/landing/page.tsx
git commit -m "feat: add push notification and Sage insight loop to Nervous System section"
```

---

## Manual QA Checklist

After both tasks are complete, open the landing page at `http://localhost:3000/landing` (or the Vercel preview URL) and verify:

- [ ] The notification card appears between the paragraph text and the habit chips row in the dark Nervous System section.
- [ ] The Sage AI insight card appears to the right of the notification on desktop, below it on mobile.
- [ ] The ArrowRight connector is visible on desktop and hidden on mobile.
- [ ] The paragraph above the cards has correct spacing (not too tight, not too wide).
- [ ] The habit chips row (`60-second daily check-in`, `Always know what you earned`, `Never guess at taxes again`) is still present and unchanged below the new cards.
- [ ] The notification text reads exactly: "Your 5 PM check-in is ready. Sixty seconds and you're done. How did today go?"
- [ ] The Sage insight text reads exactly: "Income up 12% this week. Your busiest Tuesday yet."
- [ ] No `console.log` statements present in the file.
- [ ] No TypeScript errors (`npx tsc --noEmit` passes clean).
