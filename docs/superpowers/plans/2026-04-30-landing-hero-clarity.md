# Landing Page Hero Clarity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vague hero copy with clear, audience-specific copy that immediately communicates what Bookwise does and who it's for.

**Architecture:** Single file edit — `app/landing/page.tsx`. Three hero elements updated: eyebrow badge, headline (two h1 elements consolidated into two clear sentences), and subhead (two motion.p paragraphs replaced with four short punchy lines). No structural or logic changes.

**Tech Stack:** Next.js 15, React, Framer Motion (existing animations untouched)

---

### Task 1: Update the eyebrow badge

**Files:**
- Modify: `app/landing/page.tsx:480`

- [ ] **Step 1: Replace eyebrow text**

In `app/landing/page.tsx`, find the eyebrow `<motion.div>` around line 472. The inner text currently reads:

```tsx
<span style={{ width: 6, height: 6, borderRadius: '50%', background: SAGE, display: 'inline-block' }} />
Now accepting founding members
```

Replace with:

```tsx
<span style={{ width: 6, height: 6, borderRadius: '50%', background: SAGE, display: 'inline-block' }} />
Financial clarity for coaches, trainers, and bodyworkers
```

- [ ] **Step 2: Commit**

```bash
git add app/landing/page.tsx
git commit -m "copy: update hero eyebrow to name audience"
```

---

### Task 2: Update the headline

**Files:**
- Modify: `app/landing/page.tsx:484-499`

The headline is currently split across two `<motion.h1>` elements ("Keep more of" / "what you earn."). Replace both with two new h1 elements carrying the new headline sentences.

- [ ] **Step 1: Replace first h1 (lines ~484-491)**

Find:
```tsx
<motion.h1
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
  style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 46 : 68, fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.03em', color: INK, margin: '0 0 10px' }}
>
  Keep more of
</motion.h1>
```

Replace with:
```tsx
<motion.h1
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
  style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 38 : 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: INK, margin: '0 0 10px' }}
>
  Always know where your money goes.
</motion.h1>
```

Note: font size reduced slightly (46→38 mobile, 68→52 desktop) because the new headline is longer.

- [ ] **Step 2: Replace second h1 (lines ~492-499)**

Find:
```tsx
<motion.h1
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
  style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 46 : 68, fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.03em', color: INK, margin: '0 0 32px' }}
>
  what you earn.
</motion.h1>
```

Replace with:
```tsx
<motion.h1
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
  style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 38 : 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: INK, margin: '0 0 32px' }}
>
  Never get surprised by your tax bill.
</motion.h1>
```

- [ ] **Step 3: Commit**

```bash
git add app/landing/page.tsx
git commit -m "copy: replace hero headline with tax-clarity messaging"
```

---

### Task 3: Replace the subhead

**Files:**
- Modify: `app/landing/page.tsx:501-517`

The subhead is currently two `<motion.p>` elements. Replace both with four short lines: three plain statements and a closer. The `RotatingWord` component is no longer needed in the hero (it can remain defined in the file — just no longer rendered here).

- [ ] **Step 1: Replace both subhead paragraphs**

Find the entire block from `{/* subheadline */}` comment through the second `</motion.p>` (lines ~501-517):

```tsx
{/* subheadline */}
<motion.p
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.38, duration: 0.6 }}
  style={{ fontSize: isMobile ? 17 : 19, lineHeight: 1.65, color: MUTED, margin: 0 }}
>
  The financial clarity tool built for wellness <RotatingWord />{'.'}
</motion.p>
<motion.p
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.44, duration: 0.6 }}
  style={{ fontSize: isMobile ? 17 : 19, lineHeight: 1.65, color: MUTED, margin: '0 0 0' }}
>
  No spreadsheets. No jargon. No anxiety.
</motion.p>
```

Replace with:

```tsx
{/* subheadline */}
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.38, duration: 0.6 }}
  style={{ fontSize: isMobile ? 17 : 18, lineHeight: 2, color: MUTED, margin: 0 }}
>
  <p style={{ margin: 0 }}>Track every dollar in and out.</p>
  <p style={{ margin: 0 }}>See exactly what to save for taxes.</p>
  <p style={{ margin: 0 }}>Know what to pay yourself this month.</p>
</motion.div>
<motion.p
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.44, duration: 0.6 }}
  style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.5, color: INK, fontWeight: 600, margin: '8px 0 0' }}
>
  Your money finally makes sense. Clear numbers, calm mind.
</motion.p>
```

- [ ] **Step 2: Start the dev server and verify visually**

```bash
cd "/Users/ayahosch/Documents/Claude Projects/bookwise-starter"
npm run dev
```

Open http://localhost:3000/landing and confirm:
- Eyebrow reads "Financial clarity for coaches, trainers, and bodyworkers"
- Headline reads "Always know where your money goes. / Never get surprised by your tax bill."
- Three short lines appear in muted color
- Closer "Your money finally makes sense. Clear numbers, calm mind." appears bolder in INK color
- No em dashes anywhere on the page
- Layout looks correct on mobile (375px) and desktop

- [ ] **Step 3: Commit**

```bash
git add app/landing/page.tsx
git commit -m "copy: replace hero subhead with plain-language daily-habit messaging"
```

---

### Task 4: Push and verify on production

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

- [ ] **Step 2: Confirm Vercel deployment**

Wait ~2 minutes, then open https://bookwise-coral.vercel.app/landing and confirm the new hero copy is live.
