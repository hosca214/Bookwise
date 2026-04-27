'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { BottomNav } from '@/components/ui/BottomNav'
import { generateCPAExport, downloadCSV } from '@/lib/csv'
import { SCHEDULE_C_MAP } from '@/lib/iqMaps'
import type { Transaction } from '@/lib/supabase'

// ── helpers ──────────────────────────────────────────────────────────────────

function monthStart(offset = 0): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 10)
}

function monthEnd(start: string): string {
  const d = new Date(start)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  return d.toISOString().slice(0, 10)
}

function yearStart(offset = 0): string {
  return `${new Date().getFullYear() + offset}-01-01`
}

function yearEnd(offset = 0): string {
  if (offset === 0) return new Date().toISOString().slice(0, 10)
  return `${new Date().getFullYear() + offset}-12-31`
}

// Stable date constants — computed once at module load, not per render
const THIS_MONTH = monthStart(0)
const LAST_MONTH = monthStart(-1)
const THIS_YEAR  = yearStart(0)
const LAST_YEAR  = yearStart(-1)

function rangePill(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: 999,
    border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-primary)' : 'var(--color-card)',
    color: active ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  }
}

function formatMonthLabel(start: string): string {
  return new Date(start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function groupByCategory(txns: Transaction[], type: 'income' | 'expense') {
  const groups: Record<string, number> = {}
  for (const t of txns) {
    if (t.type !== type) continue
    groups[t.category_key] = (groups[t.category_key] ?? 0) + t.amount
  }
  return Object.entries(groups).sort((a, b) => b[1] - a[1])
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', marginBottom: 2,
}

const lineRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '9px 0', borderBottom: '1px solid var(--color-border)', fontSize: 15,
}

const indentRow: React.CSSProperties = {
  ...lineRow, paddingLeft: 16, fontSize: 14, color: 'var(--color-muted-foreground)',
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div className="skeleton" style={{ width: '45%', height: 14 }} />
      <div className="skeleton" style={{ width: '22%', height: 14 }} />
    </div>
  )
}

function CategoryRows({ groups }: { groups: [string, number][] }) {
  const { t, accountantMode } = useIQ()
  return (
    <>
      {groups.map(([cat, amt]) => (
        <div key={cat} style={indentRow}>
          <span>
            {t(cat)}
            {accountantMode && SCHEDULE_C_MAP[cat] && (
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-muted-foreground)' }}>
                {SCHEDULE_C_MAP[cat].line}
              </span>
            )}
          </span>
          <span>${amt.toFixed(2)}</span>
        </div>
      ))}
    </>
  )
}

const supabase = createClient()

export default function ReportsPage() {
  const { t, setIndustry, accountantMode, toggleAccountantMode } = useIQ()

  const [loading, setLoading] = useState(true)
  const [practiceName, setPracticeName] = useState('My Practice')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState(false)

  const [rangeStart, setRangeStart] = useState(THIS_MONTH)
  const [rangeEnd, setRangeEnd] = useState(monthEnd(THIS_MONTH))

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [{ data: profile }, { data: txns, error: txErr }] = await Promise.all([
          supabase.from('profiles').select('industry, practice_name').eq('id', user.id).single(),
          supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', rangeStart).lte('date', rangeEnd).order('date', { ascending: true }),
        ])

        if (profile?.industry) setIndustry(profile.industry)
        if (profile?.practice_name) setPracticeName(profile.practice_name)
        if (txErr) throw txErr
        setTransactions(txns ?? [])
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [rangeStart, rangeEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const businessTxns = transactions.filter((tx) => !tx.is_personal)
  const grossIncome = businessTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = businessTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netProfit = grossIncome - totalExpenses
  const taxEstimate = Math.max(0, netProfit * 0.25)

  const incomeGroups = groupByCategory(businessTxns, 'income')
  const expenseGroups = groupByCategory(businessTxns, 'expense')

  function handleExport() {
    const csv = generateCPAExport(transactions, practiceName, formatMonthLabel(rangeStart))
    downloadCSV(`bookwise-${rangeStart.slice(0, 7)}.csv`, csv)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 2 }}>
              {t('Profit and Loss')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>{practiceName}</p>
          </div>

          {/* Language toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--color-muted)',
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}>
            {(['My Language', 'Accountant View'] as const).map((mode) => {
              const active = mode === 'Accountant View' ? accountantMode : !accountantMode
              return (
                <button
                  key={mode}
                  onClick={() => { if ((mode === 'Accountant View') !== accountantMode) toggleAccountantMode() }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: active ? 'var(--color-card)' : 'transparent',
                    color: active ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {mode}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => { setRangeStart(THIS_MONTH); setRangeEnd(monthEnd(THIS_MONTH)) }} style={rangePill(rangeStart === THIS_MONTH)}>
            This Month
          </button>
          <button onClick={() => { setRangeStart(LAST_MONTH); setRangeEnd(monthEnd(LAST_MONTH)) }} style={rangePill(rangeStart === LAST_MONTH)}>
            Last Month
          </button>
          <button onClick={() => { setRangeStart(THIS_YEAR); setRangeEnd(yearEnd(0)) }} style={rangePill(rangeStart === THIS_YEAR)}>
            This Year
          </button>
          <button onClick={() => { setRangeStart(LAST_YEAR); setRangeEnd(yearEnd(-1)) }} style={rangePill(rangeStart === LAST_YEAR)}>
            Last Year
          </button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-foreground)', fontFamily: 'var(--font-sans)', minHeight: 36 }}
            />
            <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>to</span>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-foreground)', fontFamily: 'var(--font-sans)', minHeight: 36 }}
            />
          </div>
        </div>
      </div>

      {/* P&L Card */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          padding: '20px',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          marginBottom: 16,
        }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : error ? (
            <p style={{ color: 'var(--color-muted-foreground)', textAlign: 'center', padding: '24px 0' }}>
              Could not load your data. Try again.
            </p>
          ) : businessTxns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', marginBottom: 8 }}>
                No transactions for this period.
              </p>
              <a href="/ledger" style={{ color: 'var(--color-primary)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Add entries in your Ledger
              </a>
            </div>
          ) : (
            <>
              {/* Title row */}
              <p style={{ ...sectionLabel, marginBottom: 12 }}>
                {accountantMode ? 'Profit and Loss Statement' : `${practiceName} ${t('Profit and Loss')}`}
              </p>

              {/* Income section */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ ...lineRow, fontWeight: 600, color: 'var(--color-foreground)', borderBottom: 'none', paddingBottom: 4 }}>
                  <span>{t('Gross Income')}</span>
                  <span style={{ color: 'var(--color-profit)' }}>${grossIncome.toFixed(2)}</span>
                </div>
                <CategoryRows groups={incomeGroups} />
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />

              {/* Expenses section */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ ...lineRow, fontWeight: 600, color: 'var(--color-foreground)', borderBottom: 'none', paddingBottom: 4 }}>
                  <span>{t('Total Expenses')}</span>
                  <span style={{ color: 'var(--color-muted-foreground)' }}>${totalExpenses.toFixed(2)}</span>
                </div>
                <CategoryRows groups={expenseGroups} />
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />

              {/* Net Profit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <span className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-foreground)' }}>
                  {t('Net Profit')}
                </span>
                <span className="font-serif" style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: netProfit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
                }}>
                  ${netProfit.toFixed(2)}
                </span>
              </div>

              {/* Tax estimate */}
              <div style={{
                background: 'var(--color-muted)',
                borderRadius: 8,
                padding: '12px 14px',
                marginTop: 4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-foreground)' }}>
                    {t('Tax Estimate')}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                    ${taxEstimate.toFixed(2)}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0 }}>
                  25% is a recommended safety rate. Confirm with your CPA.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Export button */}
        {!loading && !error && businessTxns.length > 0 && (
          <button
            onClick={handleExport}
            style={{
              width: '100%',
              minHeight: 52,
              borderRadius: 10,
              border: `1.5px solid var(--color-primary)`,
              background: 'transparent',
              color: 'var(--color-primary)',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              marginBottom: 12,
            }}
          >
            Export for My CPA
          </button>
        )}

        {/* Disclaimer */}
        <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', textAlign: 'center', padding: '8px 0 16px', lineHeight: 1.5 }}>
          Bookwise organizes your data. Always review with a licensed CPA before filing.
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
