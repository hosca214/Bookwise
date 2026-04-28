# Ledger Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add search, type toggle, multi-select category chips, month chips, real-time totals strip, receipt red dot, and a labelled FAB to `app/ledger/page.tsx`.

**Architecture:** All filtering is client-side — transactions are fetched once on mount (existing behaviour). A `useMemo`-derived `filtered` array is computed from four independent filter states. The totals strip reads from `filtered` excluding `is_personal=true` rows. No new files, no API changes, no schema changes.

**Tech Stack:** Next.js 15 App Router, React `useState`/`useMemo`, Supabase client, Tailwind CSS v4 custom properties, Lucide icons.

---

## File Map

| File | Change |
|---|---|
| `app/ledger/page.tsx` | All changes — filter state, derived list, filter bar, totals strip, red dot, FAB label |

---

### Task 1: Add filter state and `useMemo` import

**Files:**
- Modify: `app/ledger/page.tsx:3` (imports line)
- Modify: `app/ledger/page.tsx:71–94` (state declarations inside `LedgerPage`)

- [ ] **Step 1: Update the React import to include `useMemo`**

Find the existing import on line 3:
```ts
import { useEffect, useState, useRef } from 'react'
```
Replace with:
```ts
import { useEffect, useState, useRef, useMemo } from 'react'
```

- [ ] **Step 2: Add month chip generator constant at module scope (after `today`, before `fieldLabel`)**

Add after `const today = new Date().toISOString().slice(0, 10)`:
```ts
const currentMonth = today.slice(0, 7) // 'YYYY-MM'

function buildMonthChips(): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = []
  const now = new Date()
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    chips.push({ label, value })
  }
  return chips
}

const MONTH_CHIPS = buildMonthChips()
```

- [ ] **Step 3: Add filter state inside `LedgerPage`, after existing state declarations**

After the last existing `useState` (`const [rowOcrLoading, ...]`), add:
```ts
const [search, setSearch] = useState('')
const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
const [categoryFilter, setCategoryFilter] = useState<string[]>([])
const [monthFilter, setMonthFilter] = useState<string>(currentMonth)
```

- [ ] **Step 4: Add the `filtered` derived array using `useMemo`, after filter state**

```ts
const filtered = useMemo(() => {
  return transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false
    if (categoryFilter.length > 0 && !categoryFilter.includes(tx.category_key)) return false
    if (monthFilter !== 'all' && !tx.date.startsWith(monthFilter)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const cat = t(tx.category_key).toLowerCase()
      const notes = (tx.notes ?? '').toLowerCase()
      if (!cat.includes(q) && !notes.includes(q)) return false
    }
    return true
  })
}, [transactions, typeFilter, categoryFilter, monthFilter, search, t])
```

- [ ] **Step 5: Add totals derived values, after `filtered`**

```ts
const businessFiltered = filtered.filter((tx) => !tx.is_personal)
const totalIncome = businessFiltered
  .filter((tx) => tx.type === 'income')
  .reduce((sum, tx) => sum + tx.amount, 0)
const totalExpenses = businessFiltered
  .filter((tx) => tx.type === 'expense')
  .reduce((sum, tx) => sum + tx.amount, 0)
const netTotal = totalIncome - totalExpenses
```

- [ ] **Step 6: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/ledger/page.tsx
git commit -m "feat(ledger): add filter state and derived filtered/totals"
```

---

### Task 2: Add filter bar UI (search + type toggle + category chips + month chips)

**Files:**
- Modify: `app/ledger/page.tsx` — JSX render section, between the header `<div>` and the list `<div>`

The header ends at the closing `</div>` of the `padding: '56px 20px 16px'` div. Insert the filter bar between it and the `{/* List */}` comment.

- [ ] **Step 1: Add module-scope style constants for the filter bar (after `fieldInput`)**

```ts
const filterBarStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  padding: '0 20px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  background: 'var(--color-background)',
  borderBottom: '1px solid var(--color-border)',
}

const totalColStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 0',
  textAlign: 'center',
}

const totalLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--color-muted-foreground)',
  marginBottom: 2,
}

const totalValueStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
}
```

- [ ] **Step 2: Insert the filter bar JSX after the header div and before `{/* List */}`**

```tsx
{/* Filter bar */}
{!loading && !error && (
  <div style={filterBarStyle}>
    {/* Search */}
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 10, fontSize: 13, color: 'var(--color-muted-foreground)' }}>
        🔍
      </span>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search entries..."
        style={{
          width: '100%',
          height: 36,
          borderRadius: 8,
          border: '1.5px solid var(--color-border)',
          background: 'var(--color-card)',
          padding: '0 10px 0 30px',
          fontSize: 13,
          color: 'var(--color-foreground)',
          fontFamily: 'var(--font-sans)',
          outline: 'none',
        }}
      />
    </div>

    {/* Type toggle */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      borderRadius: 8,
      overflow: 'hidden',
      border: '1.5px solid var(--color-border)',
    }}>
      {(['all', 'income', 'expense'] as const).map((type, i) => (
        <button
          key={type}
          onClick={() => { setTypeFilter(type); setCategoryFilter([]) }}
          style={{
            minHeight: 36,
            border: 'none',
            borderRight: i < 2 ? '1px solid var(--color-border)' : 'none',
            background: typeFilter === type
              ? type === 'all' ? 'var(--color-ink)'
              : type === 'income' ? 'var(--color-profit)'
              : 'var(--color-danger)'
              : 'var(--color-card)',
            color: typeFilter === type ? 'white' : 'var(--color-muted-foreground)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expenses'}
        </button>
      ))}
    </div>

    {/* Category chips — only when Income or Expenses is selected */}
    {typeFilter !== 'all' && (
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {(typeFilter === 'income' ? INCOME_CATS : EXPENSE_CATS).map((cat) => {
          const sel = categoryFilter.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter((prev) =>
                prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
              )}
              style={{
                height: 28,
                padding: '0 10px',
                borderRadius: 999,
                border: `1.5px solid ${sel
                  ? typeFilter === 'income' ? 'var(--color-profit)' : 'var(--color-danger)'
                  : 'var(--color-border)'}`,
                background: sel
                  ? typeFilter === 'income'
                    ? 'color-mix(in srgb, var(--color-profit) 15%, var(--color-card))'
                    : 'color-mix(in srgb, var(--color-danger) 15%, var(--color-card))'
                  : 'var(--color-card)',
                color: sel
                  ? typeFilter === 'income' ? 'var(--color-profit)' : 'var(--color-danger)'
                  : 'var(--color-muted-foreground)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap' as const,
                flexShrink: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {sel ? '✓ ' : ''}{t(cat)}
            </button>
          )
        })}
      </div>
    )}

    {/* Month chips */}
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
      {MONTH_CHIPS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => setMonthFilter(value)}
          style={{
            height: 28,
            padding: '0 10px',
            borderRadius: 999,
            border: '1.5px solid var(--color-border)',
            background: monthFilter === value ? 'var(--color-ink)' : 'var(--color-card)',
            color: monthFilter === value ? 'var(--color-card)' : 'var(--color-muted-foreground)',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </button>
      ))}
      <button
        onClick={() => setMonthFilter('all')}
        style={{
          height: 28,
          padding: '0 10px',
          borderRadius: 999,
          border: '1.5px solid var(--color-border)',
          background: monthFilter === 'all' ? 'var(--color-ink)' : 'var(--color-card)',
          color: monthFilter === 'all' ? 'var(--color-card)' : 'var(--color-muted-foreground)',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap' as const,
          flexShrink: 0,
          fontFamily: 'var(--font-sans)',
        }}
      >
        All time
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify the app compiles**

```bash
cd "$(git rev-parse --show-toplevel)"
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/ledger/page.tsx
git commit -m "feat(ledger): add filter bar with search, type toggle, category chips, month chips"
```

---

### Task 3: Add totals strip

**Files:**
- Modify: `app/ledger/page.tsx` — JSX, between filter bar and `{/* List */}`

- [ ] **Step 1: Insert the totals strip after the filter bar closing `</div>` and before `{/* List */}`**

```tsx
{/* Totals strip */}
{!loading && !error && transactions.length > 0 && (
  <div style={{
    display: 'flex',
    background: 'var(--color-card)',
    borderBottom: '1px solid var(--color-border)',
    maxWidth: 480,
    margin: '0 auto',
  }}>
    {typeFilter === 'all' ? (
      <>
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Income</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-profit)' }}>
            +${totalIncome.toFixed(2)}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Expenses</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-danger)' }}>
            -${totalExpenses.toFixed(2)}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Net</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-ink)' }}>
            ${netTotal.toFixed(2)}
          </div>
        </div>
      </>
    ) : typeFilter === 'income' ? (
      <>
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Filtered</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-ink)' }}>
            {categoryFilter.length === 0 ? 'All' : `${categoryFilter.length} cat${categoryFilter.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Income</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-profit)' }}>
            +${totalIncome.toFixed(2)}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Entries</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-ink)' }}>
            {businessFiltered.length}
          </div>
        </div>
      </>
    ) : (
      <>
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Filtered</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-ink)' }}>
            {categoryFilter.length === 0 ? 'All' : `${categoryFilter.length} cat${categoryFilter.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Expenses</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-danger)' }}>
            -${totalExpenses.toFixed(2)}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
        <div style={totalColStyle}>
          <div style={totalLabelStyle}>Entries</div>
          <div style={{ ...totalValueStyle, color: 'var(--color-ink)' }}>
            {businessFiltered.length}
          </div>
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/ledger/page.tsx
git commit -m "feat(ledger): add totals strip reflecting active filters"
```

---

### Task 4: Render `filtered` instead of `transactions` in the list

**Files:**
- Modify: `app/ledger/page.tsx` — the `transactions.map(...)` call in the list section

- [ ] **Step 1: Replace `transactions.map` with `filtered.map`**

Find this line in the `transactions.length === 0` empty state and the map call:
```tsx
} : (
  transactions.map((tx) => (
```
Replace `transactions.map` with `filtered.map`.

- [ ] **Step 2: Also update the entry count in the header paragraph**

Find:
```tsx
? `${transactions.length} entr${transactions.length === 1 ? 'y' : 'ies'}`
: 'All your transactions in one place'
```
Replace with:
```tsx
? filtered.length < transactions.length
  ? `${filtered.length} of ${transactions.length} entries`
  : `${transactions.length} entr${transactions.length === 1 ? 'y' : 'ies'}`
: 'All your transactions in one place'
```

- [ ] **Step 3: Commit**

```bash
git add app/ledger/page.tsx
git commit -m "feat(ledger): render filtered list and update entry count in header"
```

---

### Task 5: Handle empty filtered state

**Files:**
- Modify: `app/ledger/page.tsx` — the empty state JSX block

- [ ] **Step 1: Add a "no results" state after the existing empty state block**

The current list render has three branches: `loading`, `error`, `transactions.length === 0`, and the `transactions.map`. Add a fourth branch between the zero-transactions empty state and the map:

Change:
```tsx
) : (
  filtered.map((tx) => (
```
To:
```tsx
) : filtered.length === 0 ? (
  <div style={{ textAlign: 'center', padding: '48px 0' }}>
    <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
    <p className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>
      No entries match your filters.
    </p>
    <button
      onClick={() => {
        setSearch('')
        setTypeFilter('all')
        setCategoryFilter([])
        setMonthFilter(currentMonth)
      }}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--color-primary)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
    >
      Clear filters
    </button>
  </div>
) : (
  filtered.map((tx) => (
```

- [ ] **Step 2: Commit**

```bash
git add app/ledger/page.tsx
git commit -m "feat(ledger): add empty filtered state with clear filters action"
```

---

### Task 6: Add receipt red dot to expense rows

**Files:**
- Modify: `app/ledger/page.tsx` — the camera button inside `filtered.map`

- [ ] **Step 1: Add `position: 'relative'` to the camera button and insert the red dot span**

Find the camera button in the transaction row (inside `filtered.map`). It currently looks like:
```tsx
<button
  onClick={() => { setRowReceiptTarget(tx.id); rowFileRef.current?.click() }}
  title={tx.receipt_url ? 'Replace receipt' : 'Scan receipt'}
  style={{
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    color: tx.receipt_url ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    opacity: rowOcrLoading === tx.id ? 0.4 : 1,
  }}
>
  {rowOcrLoading === tx.id
    ? <RefreshCw size={14} className="animate-spin" />
    : <Camera size={14} />}
</button>
```

Replace with:
```tsx
<button
  onClick={() => { setRowReceiptTarget(tx.id); rowFileRef.current?.click() }}
  title={tx.receipt_url ? 'Replace receipt' : 'Scan receipt'}
  style={{
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    color: tx.receipt_url ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    opacity: rowOcrLoading === tx.id ? 0.4 : 1,
  }}
>
  {rowOcrLoading === tx.id
    ? <RefreshCw size={14} className="animate-spin" />
    : <Camera size={14} />}
  {tx.type === 'expense' && !tx.receipt_url && (
    <span style={{
      position: 'absolute',
      top: 2,
      right: 2,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--color-danger)',
      border: '1.5px solid var(--color-background)',
      flexShrink: 0,
    }} />
  )}
</button>
```

- [ ] **Step 2: Commit**

```bash
git add app/ledger/page.tsx
git commit -m "feat(ledger): add red dot badge to expense rows missing a receipt"
```

---

### Task 7: Update FAB with label and stronger shadow

**Files:**
- Modify: `app/ledger/page.tsx` — the floating `+` button JSX

- [ ] **Step 1: Replace the existing FAB button with a labelled version**

Find:
```tsx
{/* Floating + button */}
{!sheetOpen && (
  <button
    onClick={openSheet}
    style={{
      position: 'fixed',
      bottom: 80,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--color-primary)',
      color: 'var(--color-primary-foreground)',
      border: 'none',
      fontSize: 28,
      fontWeight: 300,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      zIndex: 40,
    }}
  >
    +
  </button>
)}
```

Replace with:
```tsx
{/* Floating + button */}
{!sheetOpen && (
  <div style={{
    position: 'fixed',
    bottom: 80,
    right: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    zIndex: 40,
  }}>
    <button
      onClick={openSheet}
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'var(--color-primary)',
        color: 'var(--color-primary-foreground)',
        border: 'none',
        fontSize: 28,
        fontWeight: 300,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
      }}
    >
      +
    </button>
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      color: 'var(--color-primary-dark)',
      fontFamily: 'var(--font-sans)',
      letterSpacing: '0.03em',
    }}>
      Add Entry
    </span>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/ledger/page.tsx
git commit -m "feat(ledger): add label and stronger shadow to FAB"
```

---

### Task 8: Verify in browser

**Files:** none — verification only

- [ ] **Step 1: Start the dev server**

```bash
cd "$(git rev-parse --show-toplevel)"
npm run dev
```
Expected: server starts on `http://localhost:3000`

- [ ] **Step 2: Log in as demo account and navigate to Ledger**

Open `http://localhost:3000/login`. Sign in as `demo@bookwise.app` / `Demo2025!`. Navigate to `/ledger`.

Expected:
- Filter bar visible below header with search input, All/Income/Expenses toggle, month chips
- Totals strip shows Income / Expenses / Net for current month
- Entry count in header reads "N entries"
- Expense rows with no receipt show red dot on camera icon
- FAB shows "Add Entry" label below the circle

- [ ] **Step 3: Test type toggle**

Tap "Expenses". Expected:
- Toggle turns orange/danger color
- Expense category chips appear in a scrollable row below the toggle
- Totals strip shows "Filtered / Expenses / Entries" layout

- [ ] **Step 4: Test multi-select category chips**

With Expenses selected, tap "Supplies". Expected: chip highlights in danger tint with ✓. Tap "Rent". Expected: both chips active, list shows only Supplies and Rent transactions, totals update.

- [ ] **Step 5: Test search**

Clear type filter (tap "All"). Type "oils" in the search box. Expected: list filters to only rows where category or notes contains "oils".

- [ ] **Step 6: Test month filter**

Tap "Mar 2026" chip. Expected: list shows only March transactions, totals update to March totals.

- [ ] **Step 7: Test empty filtered state**

Select a month that has no transactions for a specific category. Expected: "No entries match your filters." message with a "Clear filters" link that resets all filter state on tap.

- [ ] **Step 8: Test receipt red dot**

Verify expense rows with no receipt show a small red dot overlaid on the camera icon. Tap the camera icon on a row and upload an image. Expected: dot disappears from that row after upload succeeds.

- [ ] **Step 9: Final push**

```bash
git push
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Search input across category + notes | Task 2 |
| Type toggle All / Income / Expenses | Task 2 |
| Category chips multi-select, scrollable | Task 2 |
| Chips show only for active type | Task 2 |
| Month chips single-select | Task 2 |
| Totals strip reflects filtered set | Task 3 |
| Totals exclude `is_personal=true` | Task 3 (via `businessFiltered`) |
| Totals layout changes by type | Task 3 |
| `filtered` drives transaction list | Task 4 |
| Header count shows filtered vs total | Task 4 |
| Empty filtered state + clear link | Task 5 |
| Receipt red dot on expense rows | Task 6 |
| Red dot absent when receipt present | Task 6 |
| FAB label "Add Entry" | Task 7 |
| FAB stronger shadow | Task 7 |
| All category labels via `t()` | Task 2 (chip labels) + existing row labels |
