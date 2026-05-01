'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { BottomNav } from '@/components/ui/BottomNav'
import { generateCPAExport, downloadCSV } from '@/lib/csv'
import { SCHEDULE_C_MAP } from '@/lib/iqMaps'
import type { Transaction, WeeklySummary } from '@/lib/supabase'
import { formatWeekRange } from '@/lib/weekUtils'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

// ── types ─────────────────────────────────────────────────────────────────────

type TrendMonth = { month: string; label: string; income: number; expenses: number; takeHome: number }
type WinRecord = { month: string; pay_funded: number; celebration_note: string | null }
type YearMonth = { month: string; label: string; income: number }

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

// Stable date constants - computed once at module load, not per render
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
  const { t, setIndustry, industry, accountantMode, toggleAccountantMode } = useIQ()

  const [loading, setLoading] = useState(true)
  const [practiceName, setPracticeName] = useState('My Practice')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState(false)

  const [rangeStart, setRangeStart] = useState(THIS_MONTH)
  const [rangeEnd, setRangeEnd] = useState(monthEnd(THIS_MONTH))

  const [trendData, setTrendData] = useState<TrendMonth[]>([])
  const [wins, setWins] = useState<WinRecord[]>([])
  const [payTargetForReports, setPayTargetForReports] = useState(0)

  const [yearIncome, setYearIncome] = useState<YearMonth[]>([])
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([])
  const [seasonInsight, setSeasonInsight] = useState<string | null>(null)
  const [seasonLoading, setSeasonLoading] = useState(false)

  const [pulseSummary, setPulseSummary] = useState<{ sessions: number; hours: number; miles: number; days: number } | null>(null)
  const [pulseInsight, setPulseInsight] = useState<string | null>(null)
  const [pulseInsightLoading, setPulseInsightLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
        const sixMonthStart = sixMonthsAgo.toISOString().slice(0, 8) + '01'

        const [{ data: profile }, { data: txns, error: txErr }, { data: trendTxns }, { data: winsData }, { data: yearTxns }, { data: weeklyData }, { data: pulseRows }] = await Promise.all([
          supabase.from('profiles').select('industry, practice_name, pay_target').eq('id', user.id).single(),
          supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', rangeStart).lte('date', rangeEnd).order('date', { ascending: true }),
          supabase.from('transactions').select('date, amount, type').eq('user_id', user.id).eq('is_personal', false).gte('date', sixMonthStart).order('date', { ascending: true }),
          supabase.from('buckets').select('month, pay_funded, celebration_note').eq('user_id', user.id).gt('pay_funded', 0).order('month', { ascending: false }),
          supabase.from('transactions').select('date, amount').eq('user_id', user.id).eq('is_personal', false).eq('type', 'income').gte('date', THIS_YEAR).order('date', { ascending: true }),
          supabase.from('weekly_summaries').select('*').eq('user_id', user.id).order('week_start', { ascending: false }).limit(52),
          supabase.from('daily_pulse').select('sessions_given, hours_worked, miles_driven').eq('user_id', user.id).gte('date', rangeStart).lte('date', rangeEnd),
        ])

        if (profile?.industry) setIndustry(profile.industry)
        if (profile?.practice_name) setPracticeName(profile.practice_name)
        if (profile?.pay_target != null) setPayTargetForReports(profile.pay_target)
        if (txErr) throw txErr
        setTransactions(txns ?? [])
        setWins(winsData ?? [])
        setWeeklySummaries(weeklyData ?? [])

        const pSum = (pulseRows ?? []).reduce(
          (acc, row) => ({
            sessions: acc.sessions + (row.sessions_given ?? 0),
            hours: acc.hours + Number(row.hours_worked ?? 0),
            miles: acc.miles + Number(row.miles_driven ?? 0),
            days: acc.days + 1,
          }),
          { sessions: 0, hours: 0, miles: 0, days: 0 }
        )
        setPulseSummary(pSum.days > 0 ? pSum : null)

        const monthMap: Record<string, { income: number; expenses: number }> = {}
        for (const tx of trendTxns ?? []) {
          const month = tx.date.slice(0, 7)
          if (!monthMap[month]) monthMap[month] = { income: 0, expenses: 0 }
          if (tx.type === 'income') monthMap[month].income += Number(tx.amount)
          else monthMap[month].expenses += Number(tx.amount)
        }
        setTrendData(
          Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, { income, expenses }]) => ({
              month,
              label: new Date(month + '-02').toLocaleString('default', { month: 'short' }),
              income,
              expenses,
              takeHome: income - expenses,
            }))
        )

        const currentYear = new Date().getFullYear()
        const yearIncomeMap: Record<string, number> = {}
        for (const tx of yearTxns ?? []) {
          const month = tx.date.slice(0, 7)
          yearIncomeMap[month] = (yearIncomeMap[month] ?? 0) + Number(tx.amount)
        }
        setYearIncome(
          Array.from({ length: 12 }, (_, i) => {
            const month = `${currentYear}-${String(i + 1).padStart(2, '0')}`
            return {
              month,
              label: new Date(month + '-02').toLocaleString('default', { month: 'short' }),
              income: yearIncomeMap[month] ?? 0,
            }
          })
        )
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [rangeStart, rangeEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const monthsWithData = yearIncome.filter((m) => m.income > 0).length
    if (monthsWithData < 3) return

    setSeasonLoading(true)
    setSeasonInsight(null)
    fetch('/api/sage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'seasonality_insight',
        context: {
          industry,
          monthlyIncome: yearIncome.map((m) => ({ month: m.label, income: m.income })),
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => setSeasonInsight(data.insight ?? null))
      .catch(() => setSeasonInsight(null))
      .finally(() => setSeasonLoading(false))
  }, [yearIncome, industry]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pulseSummary || pulseSummary.days === 0 || !industry) return
    const periodIncome = transactions
      .filter(t => !t.is_personal && t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0)
    setPulseInsightLoading(true)
    setPulseInsight(null)
    fetch('/api/sage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pulse_insight',
        context: {
          practiceName,
          industry,
          sessions: pulseSummary.sessions,
          hours: pulseSummary.hours,
          miles: pulseSummary.miles,
          days: pulseSummary.days,
          periodIncome,
          avgRevenuePerSession: pulseSummary.sessions > 0 ? periodIncome / pulseSummary.sessions : 0,
        },
      }),
    })
      .then(r => r.json())
      .then(d => setPulseInsight(d.insight ?? null))
      .catch(() => {})
      .finally(() => setPulseInsightLoading(false))
  }, [pulseSummary, industry]) // eslint-disable-line react-hooks/exhaustive-deps

  const businessTxns = transactions.filter((tx) => !tx.is_personal)
  const grossIncome = businessTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = businessTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netProfit = grossIncome - totalExpenses
  const taxEstimate = Math.max(0, netProfit * 0.25)

  const incomeGroups = groupByCategory(businessTxns, 'income')
  const expenseGroups = groupByCategory(businessTxns, 'expense')

  function downloadWeeklyCSV() {
    const header = 'Week Start,Week End,Income,Tax,Expenses,Growth,Pay Myself,Transferred,Transferred At\n'
    const rows = weeklySummaries.map(w =>
      [
        w.week_start, w.week_end,
        w.income.toFixed(2), w.tax_amount.toFixed(2),
        w.expenses.toFixed(2), w.profit_amount.toFixed(2),
        w.pay_amount.toFixed(2),
        w.transferred ? 'Yes' : 'No',
        w.transferred_at ? w.transferred_at.slice(0, 10) : '',
      ].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookwise-weekly-transfers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 16, lineHeight: 1.6 }}>
          Accountant View uses the labels your CPA knows. You don't need to understand them. Just download and share the export.
        </p>

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
              {netProfit < 0 && (
                <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '-4px 0 8px', lineHeight: 1.5 }}>
                  Some months run lean. Your trend over time tells a more complete story.
                </p>
              )}

              {/* Tax estimate */}
              <div style={{
                background: 'var(--color-muted)',
                borderRadius: 8,
                padding: '12px 14px',
                marginTop: 4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-foreground)' }}>
                    {t('Tax Set-Aside Estimate')}
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

        {/* Year at a Glance */}
        {yearIncome.some((m) => m.income > 0) && (
          <div style={{ marginBottom: 12 }}>
            <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4 }}>
              Your Year at a Glance
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 12 }}>
              {t('Income')} by month, {new Date().getFullYear()}
            </p>
            <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--color-border)', marginBottom: 10, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={yearIncome} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, t('Income')]}
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-foreground)' }}
                    cursor={{ fill: 'var(--color-muted)' }}
                  />
                  <Bar dataKey="income" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {yearIncome.filter((m) => m.income > 0).length < 3 ? (
              <div style={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.6 }}>
                  Once you have a few months in, Sage AI will start spotting patterns in your income. Keep logging.
                </p>
              </div>
            ) : (
              <div style={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', marginBottom: 8 }}>
                  Sage AI sees a pattern
                </p>
                {seasonLoading ? (
                  <>
                    <div className="skeleton" style={{ width: '90%', height: 14, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: '75%', height: 14, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: '60%', height: 14 }} />
                  </>
                ) : seasonInsight ? (
                  <p style={{ fontSize: 14, color: 'var(--color-foreground)', lineHeight: 1.65, margin: 0 }}>
                    {seasonInsight}
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: 0 }}>
                    Sage AI is thinking. Try again in a moment.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6-Month Trend Chart */}
        {trendData.length >= 2 && (() => {
          const W = 320, H = 120, PAD = 12
          const allVals = trendData.flatMap((m) => [m.income, m.expenses, m.takeHome])
          const maxVal = Math.max(...allVals, 1)
          const xStep = (W - PAD * 2) / Math.max(trendData.length - 1, 1)
          const yScale = (v: number) => PAD + (1 - v / maxVal) * (H - PAD * 2)
          const pts = (key: keyof TrendMonth) =>
            trendData.map((m, i) => `${PAD + i * xStep},${yScale(Number(m[key]))}`).join(' ')
          return (
            <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--color-border)', marginBottom: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 14px', fontWeight: 600 }}>
                6-Month Trend
              </p>
              <div style={{ overflowX: 'auto' }}>
                <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
                  <polyline points={pts('income')}   fill="none" stroke="var(--color-profit)" strokeWidth={2} strokeLinejoin="round" />
                  <polyline points={pts('expenses')} fill="none" stroke="var(--color-muted-foreground)" strokeWidth={2} strokeLinejoin="round" strokeDasharray="4 3" />
                  <polyline points={pts('takeHome')} fill="none" stroke="var(--color-pay)" strokeWidth={2} strokeLinejoin="round" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${PAD}px`, marginTop: 4 }}>
                  {trendData.map((m) => (
                    <span key={m.month} style={{ fontSize: 10, color: 'var(--color-muted-foreground)' }}>{m.label}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Income',    color: 'var(--color-profit)',           dash: false },
                    { label: 'Expenses',  color: 'var(--color-muted-foreground)', dash: true },
                    { label: 'Take-Home', color: 'var(--color-pay)',              dash: false },
                  ].map(({ label, color, dash }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width={20} height={10}>
                        <line x1={0} y1={5} x2={20} y2={5} stroke={color} strokeWidth={2} strokeDasharray={dash ? '4 3' : undefined} />
                      </svg>
                      <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Month vs Last Month Comparison */}
        {trendData.length >= 2 && (() => {
          const cur = trendData[trendData.length - 1]
          const prev = trendData[trendData.length - 2]
          const rows: { label: string; cur: number; prev: number; better: (c: number, p: number) => boolean }[] = [
            { label: 'Income',    cur: cur.income,    prev: prev.income,    better: (c, p) => c >= p },
            { label: 'Expenses',  cur: cur.expenses,  prev: prev.expenses,  better: (c, p) => c <= p },
            { label: 'Take-Home', cur: cur.takeHome,  prev: prev.takeHome,  better: (c, p) => c >= p },
          ]
          return (
            <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--color-border)', marginBottom: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 12px', fontWeight: 600 }}>
                {cur.label} vs {prev.label}
              </p>
              {rows.map(({ label, cur: c, prev: p, better }) => {
                const delta = c - p
                const isGood = better(c, p)
                return (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 14, color: 'var(--color-muted-foreground)' }}>{label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>${p.toFixed(0)}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isGood ? 'var(--color-profit)' : 'var(--color-danger)' }}>
                        {delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(0)}
                      </span>
                      <span className="font-serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>${c.toFixed(0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Wins Log */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: '0 0 10px', fontWeight: 600 }}>
            Your Wins
          </p>

          {wins.length >= 2 && (() => {
            let streak = 1
            for (let i = 1; i < wins.length; i++) {
              const [ay, am] = wins[i - 1].month.slice(0, 7).split('-').map(Number)
              const [by, bm] = wins[i].month.slice(0, 7).split('-').map(Number)
              const prevDate = new Date(ay, am - 2)
              if (prevDate.getFullYear() === by && prevDate.getMonth() + 1 === bm) streak++
              else break
            }
            if (streak < 2) return null
            const earliest = wins[streak - 1].month
            const earliestLabel = new Date(earliest.slice(0, 7) + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-muted)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>🔥</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 1px' }}>
                    {streak} months in a row
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: 0 }}>
                    You have paid yourself every month since {earliestLabel}.
                  </p>
                </div>
              </div>
            )
          })()}

          {wins.length === 0 ? (
            <div style={{ border: '1.5px dashed var(--color-border)', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, margin: '0 0 6px' }}>🏆</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px' }}>Your wins will appear here.</p>
              <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.5 }}>
                After your first Transfer Done, this log starts filling in.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wins.map((win) => {
                const isGoalReached = payTargetForReports > 0 && win.pay_funded >= payTargetForReports
                const monthLabel = new Date(win.month.slice(0, 7) + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })
                return (
                  <div key={win.month} style={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '14px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', borderLeft: `3px solid ${isGoalReached ? 'var(--color-pay)' : 'var(--color-accent)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span className="font-serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{monthLabel}</span>
                      <span className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-pay)' }}>${win.pay_funded.toFixed(2)}</span>
                    </div>
                    {win.celebration_note && (
                      <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontStyle: 'italic', margin: '0 0 8px', lineHeight: 1.4 }}>
                        "{win.celebration_note}"
                      </p>
                    )}
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: isGoalReached ? 'var(--color-muted)' : 'var(--color-muted)', color: isGoalReached ? 'var(--color-primary)' : 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
                      {isGoalReached ? 'Goal reached' : 'Partial pay'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity Summary */}
        {pulseSummary && (
          <div style={{ background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', padding: '24px', marginBottom: 16 }}>
            <p style={{ ...sectionLabel, marginBottom: 16 }}>Your Activity</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: t('Sessions'), value: pulseSummary.sessions },
                { label: t('Hours Worked'), value: pulseSummary.hours.toFixed(1) },
                { label: t('Miles Driven'), value: pulseSummary.miles.toFixed(1) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--color-muted)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                  <p className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 3px' }}>{value}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: 0, fontWeight: 500, lineHeight: 1.3 }}>{label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: '0 0 14px' }}>
              {pulseSummary.days} {pulseSummary.days === 1 ? 'day' : 'days'} tracked this period
            </p>
            {pulseInsightLoading ? (
              <>
                <div className="skeleton" style={{ height: 13, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 13, width: '80%' }} />
              </>
            ) : pulseInsight ? (
              <p className="font-serif" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--color-ink)', lineHeight: 1.65, margin: 0, paddingLeft: 12, borderLeft: '2px solid var(--color-primary)' }}>
                {pulseInsight}
              </p>
            ) : null}
          </div>
        )}

        {/* Weekly Transfer History */}
        {weeklySummaries.length > 0 && (
          <div style={{ background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', margin: 0 }}>
                Weekly Transfer History
              </p>
              <button
                onClick={downloadWeeklyCSV}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1.5px solid var(--color-border)',
                  background: 'var(--color-card)', color: 'var(--color-primary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Download
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {weeklySummaries.map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-foreground)', margin: '0 0 2px' }}>
                      {formatWeekRange(new Date(w.week_start + 'T12:00:00'))}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0 }}>
                      Income ${w.income.toFixed(2)} &middot; Pay Myself ${w.pay_amount.toFixed(2)}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px',
                    background: w.transferred ? 'var(--color-muted)' : 'transparent',
                    color: w.transferred ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                    border: w.transferred ? 'none' : '1px solid var(--color-border)',
                  }}>
                    {w.transferred ? 'Transferred' : 'Saved'}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
