'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { useVibe } from '@/context/VibeContext'
import { Reservoir } from '@/components/dashboard/Reservoir'
import { Confetti } from '@/components/ui/Confetti'
import { BottomNav } from '@/components/ui/BottomNav'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import { PulseCalendar } from '@/components/dashboard/PulseCalendar'
import type { Profile, Bucket } from '@/lib/supabase'

function getNextTaxDeadline(now: Date) {
  const y = now.getFullYear()
  const todayMs = new Date(y, now.getMonth(), now.getDate()).getTime()
  const candidates = [
    { name: 'Q1 Estimated Tax', label: `April 15, ${y}`,       date: new Date(y, 3, 15) },
    { name: 'Q2 Estimated Tax', label: `June 15, ${y}`,        date: new Date(y, 5, 15) },
    { name: 'Q3 Estimated Tax', label: `September 15, ${y}`,   date: new Date(y, 8, 15) },
    { name: 'Q4 Estimated Tax', label: `January 15, ${y + 1}`, date: new Date(y + 1, 0, 15) },
  ]
  for (const c of candidates) {
    if (c.date.getTime() >= todayMs) {
      return { ...c, days: Math.round((c.date.getTime() - todayMs) / 86400000) }
    }
  }
  return { ...candidates[3], days: 0 }
}

const SAGE_TIPS = [
  "The month you pay yourself first, even a small amount, is the month your business starts working for you.",
  "Knowing what you need to earn before you open your calendar is one of the most powerful things you can do for your practice.",
  "Your tax set-aside is not an expense. It is future peace of mind. Move it the same week you earn it.",
  "Every time you raise your rate, you are not charging more. You are closing the gap between what you give and what you keep.",
  "A slow month does not mean a failing business. Look at your three-month average before you change anything.",
]

const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 8) + '01'

export default function DashboardPage() {
  const router = useRouter()
  const { t, setIndustry } = useIQ()
  const { setVibe } = useVibe()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [bucket, setBucket] = useState<Bucket | null>(null)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [showPayModal, setShowPayModal] = useState(false)
  const [securing, setSecuring] = useState(false)

  const [sessionsToday, setSessionsToday] = useState(0)
  const [hoursToday, setHoursToday] = useState(0)
  const [milesToday, setMilesToday] = useState(0)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const [savingPulse, setSavingPulse] = useState(false)
  const [pulseLog, setPulseLog] = useState<Record<string, boolean>>({})
  const [selectedDate, setSelectedDate] = useState(today)

  const [insight, setInsight] = useState<string | null>(null)
  const [loadingSage, setLoadingSage] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadSage = useCallback(async (p: Profile, income: number, expenses: number, b: Bucket | null) => {
    setLoadingSage(true)
    setInsight(null)
    try {
      const profitFrac = (p.profit_pct ?? 10) / 100
      const taxFrac = (p.tax_pct ?? 25) / 100
      const opsFrac = 1 - profitFrac - taxFrac
      const profitTarget = income * profitFrac
      const taxTarget = income * taxFrac
      const opsTarget = income * opsFrac

      const profitPct = profitTarget > 0 && b ? Math.round((b.profit_funded / profitTarget) * 100) : 0
      const taxPct = taxTarget > 0 && b ? Math.round((b.tax_funded / taxTarget) * 100) : 0
      const opsPct = opsTarget > 0 && b ? Math.round((b.ops_funded / opsTarget) * 100) : 0

      const res = await fetch('/api/sage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily_insight',
          context: {
            industry: p.industry,
            practiceName: p.practice_name ?? 'My Practice',
            monthIncome: income,
            monthExpenses: expenses,
            buckets: { profit: profitPct, tax: taxPct, ops: opsPct },
          },
        }),
      })
      if (!res.ok) throw new Error('Sage unavailable')
      const data = await res.json()
      setInsight(data.insight ?? null)
    } catch {
      setInsight(null)
    } finally {
      setLoadingSage(false)
    }
  }, [])

  useEffect(() => {
    async function loadDashboard() {
      try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) { router.push('/login'); return }
      if (!profileData.onboarding_complete) { router.push('/onboarding'); return }

      setProfile(profileData)
      if (profileData.industry) setIndustry(profileData.industry)
      setVibe(profileData.vibe ?? 'sage')

      const { data: txns } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .eq('is_personal', false)
        .gte('date', currentMonth)

      let income = 0
      let expenses = 0
      txns?.forEach(tx => {
        if (tx.type === 'income') income += Number(tx.amount)
        else expenses += Number(tx.amount)
      })
      setMonthIncome(income)
      setMonthExpenses(expenses)

      const profitFrac = (profileData.profit_pct ?? 10) / 100
      const taxFrac = (profileData.tax_pct ?? 25) / 100
      const opsFrac = 1 - profitFrac - taxFrac
      const profitTarget = income * profitFrac
      const taxTarget = income * taxFrac
      const opsTarget = income * opsFrac

      const { data: existingBucket } = await supabase
        .from('buckets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle()

      let bucketRecord: Bucket | null = existingBucket ?? null

      if (existingBucket) {
        await supabase
          .from('buckets')
          .update({ profit_target: profitTarget, tax_target: taxTarget, ops_target: opsTarget })
          .eq('id', existingBucket.id)
        bucketRecord = { ...existingBucket, profit_target: profitTarget, tax_target: taxTarget, ops_target: opsTarget }
      } else {
        const { data: newBucket } = await supabase
          .from('buckets')
          .insert({
            user_id: user.id,
            month: currentMonth,
            profit_target: profitTarget,
            profit_funded: 0,
            tax_target: taxTarget,
            tax_funded: 0,
            ops_target: opsTarget,
            ops_funded: 0,
          })
          .select()
          .single()
        bucketRecord = newBucket
      }
      setBucket(bucketRecord)

      const { data: pulseData } = await supabase
        .from('daily_pulse')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

      if (pulseData) {
        setPulseId(pulseData.id)
        setSessionsToday(pulseData.sessions_given ?? 0)
        setHoursToday(Number(pulseData.hours_worked) ?? 0)
        setMilesToday(Number(pulseData.miles_driven) ?? 0)
      }

      const { data: monthPulse } = await supabase
        .from('daily_pulse')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', currentMonth)
        .lte('date', today)
      const log: Record<string, boolean> = {}
      for (const row of monthPulse ?? []) {
        log[row.date] = true
      }
      setPulseLog(log)

      setLoading(false)
      loadSage(profileData, income, expenses, bucketRecord)
      } catch {
        setLoadError(true)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') setRefreshKey(k => k + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function handleSecurePay() {
    if (!profile || !bucket) return
    setSecuring(true)

    const pFrac = (profile.profit_pct ?? 10) / 100
    const tFrac = (profile.tax_pct ?? 25) / 100
    const oFrac = 1 - pFrac - tFrac
    const profitTarget = monthIncome * pFrac
    const taxTarget = monthIncome * tFrac
    const opsTarget = monthIncome * oFrac

    const { error } = await supabase
      .from('buckets')
      .update({
        profit_funded: profitTarget,
        profit_target: profitTarget,
        tax_funded: taxTarget,
        tax_target: taxTarget,
        ops_funded: opsTarget,
        ops_target: opsTarget,
      })
      .eq('id', bucket.id)

    if (error) {
      toast.error('Could not save. Try again.')
      setSecuring(false)
      return
    }

    setBucket(prev => prev ? {
      ...prev,
      profit_funded: profitTarget,
      profit_target: profitTarget,
      tax_funded: taxTarget,
      tax_target: taxTarget,
      ops_funded: opsTarget,
      ops_target: opsTarget,
    } : prev)

    setShowPayModal(false)
    setConfettiTrigger(n => n + 1)
    toast.success('Done. You paid yourself. That is worth celebrating.')
    setSecuring(false)
  }

  async function savePulse() {
    setSavingPulse(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (pulseId) {
        await supabase
          .from('daily_pulse')
          .update({ sessions_given: sessionsToday, hours_worked: hoursToday, miles_driven: milesToday })
          .eq('id', pulseId)
      } else {
        const { data } = await supabase
          .from('daily_pulse')
          .insert({ user_id: user.id, date: selectedDate, sessions_given: sessionsToday, hours_worked: hoursToday, miles_driven: milesToday })
          .select()
          .single()
        if (data) setPulseId(data.id)
      }
      toast.success('Pulse saved.')
      setPulseLog(prev => ({ ...prev, [selectedDate]: true }))
      setConfettiTrigger(n => n + 1)
      setSelectedDate('')
    } catch {
      toast.error('Could not save pulse. Try again.')
    } finally {
      setSavingPulse(false)
    }
  }

  async function onSelectDate(date: string) {
    setSelectedDate(date)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('daily_pulse')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle()
      if (data) {
        setPulseId(data.id)
        setSessionsToday(data.sessions_given ?? 0)
        setHoursToday(Number(data.hours_worked) ?? 0)
        setMilesToday(Number(data.miles_driven) ?? 0)
      } else {
        setPulseId(null)
        setSessionsToday(0)
        setHoursToday(0)
        setMilesToday(0)
      }
    } catch {
      toast.error('Could not load pulse for that date.')
    }
  }

  const profitTarget = bucket?.profit_target ?? 0
  const taxTarget = bucket?.tax_target ?? 0
  const opsTarget = bucket?.ops_target ?? 0
  const profitFunded = bucket?.profit_funded ?? 0
  const taxFunded = bucket?.tax_funded ?? 0
  const opsFunded = bucket?.ops_funded ?? 0

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', textAlign: 'center' }}>
          Could not load your data. Pull to refresh.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '24px 24px 120px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="skeleton" style={{ height: 32, width: 140, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 40 }} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="skeleton" style={{ width: 168, height: 168, borderRadius: '50%' }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 52, borderRadius: 12, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 280, borderRadius: 6, margin: '0 auto 32px' }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 12, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 140, borderRadius: 12 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', paddingBottom: 100 }}>
      <Confetti trigger={confettiTrigger} />

      <header style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-background)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1, margin: 0 }}>
            My Dash
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginTop: 4, marginBottom: 0 }}>
            {profile?.practice_name ?? 'My Practice'}
          </p>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 480, margin: '0 auto' }}>

        {/* Reservoirs */}
        <section style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Reservoir
              label={t('Profit Bucket')}
              current={profitFunded}
              goal={Math.max(1, profitTarget)}
              tone="profit"
            />
            <Reservoir
              label={t('Tax Bucket')}
              current={taxFunded}
              goal={Math.max(1, taxTarget)}
              tone="tax"
            />
            <Reservoir
              label={t('Operations Bucket')}
              current={opsFunded}
              goal={Math.max(1, opsTarget)}
              tone="ops"
            />
          </div>
        </section>

        {/* Tax Deadline Countdown */}
        {(() => {
          const dl = getNextTaxDeadline(new Date())
          return (
            <section style={{
              background: 'var(--color-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              padding: '18px 24px',
              marginBottom: 16,
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}>
              <div style={{ textAlign: 'center', minWidth: 72 }}>
                <span className="font-serif" style={{
                  fontSize: 52, fontWeight: 900, color: 'var(--color-primary)',
                  lineHeight: 1, display: 'block',
                }}>
                  {dl.days}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  days
                </span>
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px' }}>
                  {dl.name}
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: 0 }}>
                  Due {dl.label}
                </p>
              </div>
            </section>
          )
        })()}

        {/* Must-Pay Coverage */}
        {(() => {
          const covered = monthExpenses > 0 ? Math.min(100, Math.round((monthIncome / monthExpenses) * 100)) : 0
          return (
            <section style={{
              background: 'var(--color-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              padding: '18px 24px',
              marginBottom: 28,
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 12px' }}>
                {monthExpenses > 0
                  ? `Your essentials are ${covered}% covered this month.`
                  : 'No expenses logged yet.'}
              </p>
              <div style={{ height: 10, borderRadius: 99, background: 'var(--color-muted)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${covered}%`,
                  background: 'var(--color-primary)',
                  borderRadius: 99,
                  transition: 'width 0.8s ease-out',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>
                  Income ${monthIncome.toFixed(2)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>
                  Expenses ${monthExpenses.toFixed(2)}
                </span>
              </div>
            </section>
          )
        })()}

        {/* Tax savings line */}
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--color-accent)', fontWeight: 500, marginBottom: 28 }}>
          You have set aside ${taxFunded.toFixed(2)} for taxes this month.
        </p>

        {/* Secure My Pay */}
        <button
          onClick={() => setShowPayModal(true)}
          style={{
            width: '100%', minHeight: 52,
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            border: 'none', borderRadius: 12,
            fontSize: 18, fontWeight: 700,
            cursor: 'pointer', marginBottom: 8,
            fontFamily: 'var(--font-serif)',
          }}
        >
          Secure My Pay
        </button>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 32 }}>
          Confirm you have moved these funds to your separate accounts.
        </p>

        {/* Daily Pulse */}
        <section style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}>
          <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 20, marginTop: 0 }}>
            Today's Pulse
          </h2>

          <div style={{ width: '100%', maxWidth: 380, marginBottom: 20 }}>
            <PulseCalendar log={pulseLog} selected={selectedDate} onSelect={onSelectDate} startDate={profile?.created_at?.slice(0, 10)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { label: t('Sessions Given'), value: sessionsToday, set: setSessionsToday },
              { label: t('Hours Worked'),   value: hoursToday,    set: setHoursToday },
              { label: t('Miles Driven'),   value: milesToday,    set: setMilesToday },
            ].map(({ label, value, set }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 16, color: 'var(--color-foreground)', fontWeight: 500 }}>{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={value === 0 ? '' : String(value)}
                  placeholder="0"
                  onChange={e => {
                    const raw = e.target.value
                    if (raw === '' || raw === '.') { set(0); return }
                    const n = parseFloat(raw)
                    if (!isNaN(n) && n >= 0) set(n)
                  }}
                  style={{
                    width: 88, minHeight: 48, textAlign: 'center',
                    fontSize: 22, fontWeight: 700,
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--color-ink)',
                    background: 'var(--color-background)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 8, padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={savePulse}
            disabled={savingPulse}
            style={{
              width: '100%', minHeight: 48,
              background: savingPulse ? 'var(--color-muted)' : 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              border: 'none', borderRadius: 10,
              fontSize: 16, fontWeight: 600,
              cursor: savingPulse ? 'not-allowed' : 'pointer',
              marginTop: 20,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {savingPulse ? 'Saving...' : 'Save Pulse'}
          </button>
        </section>

        {/* Sage */}
        <section style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          padding: '24px',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
              Sage says...
            </p>
            <button
              onClick={() => profile && loadSage(profile, monthIncome, monthExpenses, bucket)}
              disabled={loadingSage}
              style={{
                background: 'none', border: 'none',
                color: 'var(--color-muted-foreground)',
                cursor: loadingSage ? 'not-allowed' : 'pointer',
                padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={14} style={{ opacity: loadingSage ? 0.4 : 1 }} />
            </button>
          </div>

          {loadingSage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="skeleton" style={{ height: 16 }} />
              <div className="skeleton" style={{ height: 16, width: '92%' }} />
              <div className="skeleton" style={{ height: 16, width: '78%' }} />
              <div className="skeleton" style={{ height: 16, marginTop: 4 }} />
              <div className="skeleton" style={{ height: 16, width: '85%' }} />
            </div>
          ) : insight ? (
            <p style={{ fontSize: 16, color: 'var(--color-foreground)', lineHeight: 1.75, margin: 0 }}>
              {insight}
            </p>
          ) : (
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: 0 }}>
              Sage is thinking. Try again in a moment.
            </p>
          )}
        </section>

        {/* Sage Wisdom */}
        <section style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          padding: '28px 24px',
          marginTop: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: '0 0 16px' }}>
            Sage Wisdom
          </p>
          <p className="font-serif" style={{
            fontSize: 22, fontWeight: 600, color: 'var(--color-ink)',
            lineHeight: 1.5, margin: '0 0 24px',
          }}>
            {SAGE_TIPS[tipIndex]}
          </p>
          <button
            onClick={() => setTipIndex(i => (i + 1) % SAGE_TIPS.length)}
            style={{
              background: 'none',
              border: '1.5px solid var(--color-border)',
              borderRadius: 8,
              padding: '8px 20px',
              fontSize: 14, fontWeight: 600,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Next
          </button>
        </section>

      </main>

      {/* Secure My Pay Modal */}
      {showPayModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => { if (!securing) setShowPayModal(false) }}
        >
          <div
            style={{
              background: 'var(--color-card)',
              borderRadius: 16, padding: 28,
              width: '100%', maxWidth: 360,
              boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8, marginTop: 0 }}>
              Move these funds
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 24, lineHeight: 1.5 }}>
              Transfer these amounts to your separate accounts today.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {[
                { label: t('Profit Bucket'),     amount: monthIncome * ((profile?.profit_pct ?? 10) / 100), color: 'var(--color-profit)' },
                { label: t('Tax Bucket'),         amount: monthIncome * ((profile?.tax_pct ?? 25) / 100),   color: 'var(--color-tax)' },
                { label: t('Operations Bucket'), amount: monthIncome * (1 - (profile?.profit_pct ?? 10) / 100 - (profile?.tax_pct ?? 25) / 100), color: 'var(--color-ops)' },
              ].map(({ label, amount, color }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--color-background)',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: 15, color: 'var(--color-foreground)' }}>{label}</span>
                  <span className="font-serif" style={{ fontSize: 20, fontWeight: 700, color }}>
                    ${amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSecurePay}
              disabled={securing}
              style={{
                width: '100%', minHeight: 52,
                background: securing ? 'var(--color-muted)' : 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
                border: 'none', borderRadius: 12,
                fontSize: 16, fontWeight: 700,
                cursor: securing ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {securing ? 'Saving...' : 'Done, I moved it'}
            </button>

            <button
              onClick={() => setShowPayModal(false)}
              disabled={securing}
              style={{
                width: '100%', minHeight: 44,
                background: 'none', border: 'none',
                color: 'var(--color-muted-foreground)',
                fontSize: 14, cursor: 'pointer',
                marginTop: 8,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Not yet
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
