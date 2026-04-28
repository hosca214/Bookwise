'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { useVibe } from '@/context/VibeContext'
import { Confetti } from '@/components/ui/Confetti'
import { BottomNav } from '@/components/ui/BottomNav'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import { PulseCalendar } from '@/components/dashboard/PulseCalendar'
import type { Profile, Bucket } from '@/lib/supabase'

const supabase = createClient()
const MS_PER_DAY = 86_400_000

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
      return { ...c, days: Math.round((c.date.getTime() - todayMs) / MS_PER_DAY) }
    }
  }
  return { ...candidates[3], days: 0 }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-card)',
  borderRadius: 12,
  border: '1px solid var(--color-border)',
  padding: '18px 24px',
  marginBottom: 16,
  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
}

const taxDeadline = getNextTaxDeadline(new Date())

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

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [bucket, setBucket] = useState<Bucket | null>(null)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [showPayModal, setShowPayModal] = useState(false)
  const [securing, setSecuring] = useState(false)
  const [payPeriod, setPayPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [showOwnerPayInfo, setShowOwnerPayInfo] = useState(false)
  const [showGrowthInfo, setShowGrowthInfo] = useState(false)
  const [showTaxInfo, setShowTaxInfo] = useState(false)
  const [showOpsInfo, setShowOpsInfo] = useState(false)
  const [showEssentialsInfo, setShowEssentialsInfo] = useState(false)
  const [showPulseInfo, setShowPulseInfo] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationNote, setCelebrationNote] = useState('')
  const [savingCelebration, setSavingCelebration] = useState(false)

  const CELEBRATION_CHIPS = ['A long bath', 'A nice meal out', 'A morning off', 'A new book']

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

  async function loadSage(p: Profile, income: number, expenses: number, b: Bucket | null) {
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
  }

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

    const profitTarget = monthIncome * profitFrac
    const taxTarget = monthIncome * taxFrac
    const opsTarget = monthIncome * opsFrac

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
    setCelebrationNote('')
    setShowCelebration(true)
    setSecuring(false)
  }

  async function handleSaveCelebration(skip = false) {
    if (!bucket) { setShowCelebration(false); return }
    setSavingCelebration(true)
    await supabase
      .from('buckets')
      .update({ celebration_note: skip ? null : celebrationNote })
      .eq('id', bucket.id)
    setBucket(prev => prev ? { ...prev, celebration_note: skip ? null : celebrationNote } : prev)
    setSavingCelebration(false)
    setShowCelebration(false)
    toast.success('Done. You paid yourself this month. That is worth celebrating.')
  }

  async function savePulse() {
    if (!profile?.id) return
    setSavingPulse(true)
    try {
      if (pulseId) {
        await supabase
          .from('daily_pulse')
          .update({ sessions_given: sessionsToday, hours_worked: hoursToday, miles_driven: milesToday })
          .eq('id', pulseId)
      } else {
        const { data } = await supabase
          .from('daily_pulse')
          .insert({ user_id: profile.id, date: selectedDate, sessions_given: sessionsToday, hours_worked: hoursToday, miles_driven: milesToday })
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
    if (!profile?.id) return
    setSelectedDate(date)
    try {
      const { data } = await supabase
        .from('daily_pulse')
        .select('*')
        .eq('user_id', profile.id)
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

  const essentialBase = (profile?.monthly_essential_cost ?? 0) > 0
    ? (profile?.monthly_essential_cost ?? 0)
    : monthExpenses
  const essentialCoverage = essentialBase > 0
    ? Math.min(100, Math.round((monthIncome / essentialBase) * 100))
    : 0
  const profitFrac = (profile?.profit_pct ?? 10) / 100
  const taxFrac = (profile?.tax_pct ?? 25) / 100
  const opsFrac = 1 - profitFrac - taxFrac

  const payTarget = profile?.pay_target ?? 0
  const payActual = Math.min(monthIncome, payTarget)
  const payProgress = payTarget > 0 ? Math.min(100, (payActual / payTarget) * 100) : 0

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: 84, borderRadius: 12 }} />
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

        {/* Owner's Pay */}
        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
              {t('Take-Home')}
            </span>
            <div style={{ display: 'flex', background: 'var(--color-muted)', borderRadius: 999, padding: 2, gap: 2 }}>
              {(['monthly', 'weekly'] as const).map(p => (
                <button key={p} onClick={() => setPayPeriod(p)}
                  style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: payPeriod === p ? 'var(--color-card)' : 'transparent', color: payPeriod === p ? 'var(--color-ink)' : 'var(--color-muted-foreground)', boxShadow: payPeriod === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'background 0.15s', fontFamily: 'var(--font-sans)' }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {payTarget > 0 ? (
            <>
              <p className="font-serif" style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-pay)', margin: '4px 0 10px', lineHeight: 1 }}>
                ${(payPeriod === 'weekly' ? payActual / 4.33 : payActual).toFixed(2)}
              </p>
              <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${payProgress}%`, background: 'var(--color-pay)', borderRadius: 3, transition: 'width 1.2s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted-foreground)' }}>
                <span>${(payPeriod === 'weekly' ? payActual / 4.33 : payActual).toFixed(0)} so far</span>
                <span>Goal: <strong style={{ color: 'var(--color-ink)' }}>${(payPeriod === 'weekly' ? payTarget / 4.33 : payTarget).toFixed(0)}{payPeriod === 'monthly' ? '/mo' : '/wk'}</strong></span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: '8px 0 0' }}>
              Set a monthly pay goal to track your take-home.{' '}
              <a href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Go to Settings</a>
            </p>
          )}
          <button onClick={() => setShowOwnerPayInfo(v => !v)}
            style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', padding: '8px 0 0', textDecoration: 'underline', fontFamily: 'var(--font-sans)' }}
          >
            {showOwnerPayInfo ? 'Hide' : "What is Owner's Pay?"}
          </button>
          {showOwnerPayInfo && (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginTop: 6, lineHeight: 1.6 }}>
              This is your monthly take-home target — the amount you want to move from your business account to your personal account. As income comes in, this card shows how close you are. Adjust your goal anytime in Settings.
            </p>
          )}
        </section>

        {/* Money Plan Tiles */}
        {monthIncome === 0 ? (
          <div style={{ ...cardStyle, border: '1.5px dashed var(--color-border)', background: 'var(--color-muted)', textAlign: 'center', padding: '24px 20px', marginBottom: 16 }}>
            <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.6 }}>
              Add income to see your money plan. Your Growth Fund, Tax Set-Aside, and Operations will appear here.{' '}
              <a href="/ledger" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Add your first entry</a>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>

            {/* Growth Fund */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
                  {t('Profit Bucket')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{Math.round(profitFrac * 100)}% of income</span>
              </div>
              <p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-profit)', margin: '0 0 8px', lineHeight: 1 }}>
                ${profitFunded.toFixed(2)}
              </p>
              <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${profitTarget > 0 ? Math.min(100, (profitFunded / profitTarget) * 100) : 0}%`, background: 'var(--color-profit)', borderRadius: 99, transition: 'width 1.2s ease' }} />
              </div>
              <button onClick={() => setShowGrowthInfo(v => !v)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', fontFamily: 'var(--font-sans)' }}>
                {showGrowthInfo ? 'Hide' : 'What is this?'}
              </button>
              {showGrowthInfo && (
                <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
                  Reinvest in your practice. Move this to a dedicated business savings account each month.
                </p>
              )}
            </div>

            {/* Tax Set-Aside */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
                  {t('Tax Bucket')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{Math.round(taxFrac * 100)}% of income</span>
              </div>
              <p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-tax)', margin: '0 0 8px', lineHeight: 1 }}>
                ${taxFunded.toFixed(2)}
              </p>
              <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${taxTarget > 0 ? Math.min(100, (taxFunded / taxTarget) * 100) : 0}%`, background: 'var(--color-tax)', borderRadius: 99, transition: 'width 1.2s ease' }} />
              </div>
              <button onClick={() => setShowTaxInfo(v => !v)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', fontFamily: 'var(--font-sans)' }}>
                {showTaxInfo ? 'Hide' : 'What is this?'}
              </button>
              {showTaxInfo && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 10px', lineHeight: 1.6 }}>
                    Set this aside so you are never surprised at tax time. Keep it in a separate savings account so it is ready when your quarterly payment is due.
                  </p>
                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 2px' }}>{taxDeadline.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: 0 }}>Due {taxDeadline.label}</p>
                    </div>
                    <div style={{ background: 'var(--color-background)', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
                      <p className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-ink)', margin: 0, lineHeight: 1 }}>{taxDeadline.days}</p>
                      <p style={{ fontSize: 9, color: 'var(--color-muted-foreground)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>days away</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: '8px 0 0', fontStyle: 'italic' }}>
                    Always confirm your payment with a licensed CPA before filing.
                  </p>
                </div>
              )}
            </div>

            {/* Daily Operations */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
                  {t('Operations Bucket')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{Math.round(opsFrac * 100)}% of income</span>
              </div>
              <p className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ops)', margin: '0 0 8px', lineHeight: 1 }}>
                ${opsFunded.toFixed(2)}
              </p>
              <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${opsTarget > 0 ? Math.min(100, (opsFunded / opsTarget) * 100) : 0}%`, background: 'var(--color-ops)', borderRadius: 99, transition: 'width 1.2s ease' }} />
              </div>
              <button onClick={() => setShowOpsInfo(v => !v)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', fontFamily: 'var(--font-sans)' }}>
                {showOpsInfo ? 'Hide' : 'What is this?'}
              </button>
              {showOpsInfo && (
                <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
                  Covers your everyday business costs: supplies, rent, software, insurance.
                </p>
              )}
            </div>

          </div>
        )}

        {/* Cost to Show Up */}
        <section style={{ ...cardStyle, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
              Cost to Show Up
            </p>
            <button
              onClick={() => setShowEssentialsInfo(v => !v)}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
            >
              {showEssentialsInfo ? 'Hide' : 'What is this?'}
            </button>
          </div>
          {showEssentialsInfo && (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 12, lineHeight: 1.6, borderLeft: '3px solid var(--color-border)', paddingLeft: 12 }}>
              This shows whether your income covers what it costs to show up each month. When you reach 100%, your practice is paying for itself. Every dollar above this builds your funds.
            </p>
          )}
          {essentialBase === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.6 }}>
              Add what it costs to show up in{' '}
              <a href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Settings</a>{' '}
              and we will show you how your income covers it.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 12px' }}>
                {essentialCoverage >= 100
                  ? 'Your practice is paying for itself this month.'
                  : `Your costs are ${essentialCoverage}% covered this month.`}
              </p>
              <div style={{ height: 10, borderRadius: 99, background: 'var(--color-muted)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${essentialCoverage}%`,
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
                  Cost to show up ${essentialBase.toFixed(2)}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 10, marginBottom: 0 }}>
                Need to update this?{' '}
                <a href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Go to Settings</a>
              </p>
            </>
          )}
        </section>

        {/* Transfer Done */}
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
          Transfer Done
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 32, lineHeight: 1.5 }}>
          Open your banking app, move the amounts above to separate accounts, then tap Transfer Done.
          Come back every <strong style={{ color: 'var(--color-ink)' }}>{profile?.transfer_day ?? 'Monday'}</strong> to keep your numbers clean.
        </p>

        {/* Daily Pulse */}
        <section style={{ ...cardStyle, padding: '24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              Today's Pulse
            </h2>
            <button
              onClick={() => setShowPulseInfo(v => !v)}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
            >
              {showPulseInfo ? 'Hide' : 'What is this?'}
            </button>
          </div>
          {showPulseInfo && (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 16, lineHeight: 1.6, borderLeft: '3px solid var(--color-border)', paddingLeft: 12 }}>
              Logging your sessions and miles helps Sage give you better insights. Miles driven for business can also be a tax deduction. Your CPA will want this number at year end.
            </p>
          )}

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
        <section style={{ ...cardStyle, padding: '24px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
              Sage says...
            </p>
            <button
              onClick={() => profile && loadSage(profile, monthIncome, monthExpenses, bucket)}
              disabled={loadingSage}
              aria-label="Regenerate insight"
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
        <section style={{ ...cardStyle, padding: '28px 24px', marginTop: 24, marginBottom: 0 }}>
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

      {/* Transfer Done Modal */}
      {showPayModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="pay-modal-title"
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => { if (!securing) setShowPayModal(false) }}
        >
          <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 id="pay-modal-title" className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8, marginTop: 0 }}>
              Move these funds
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 24, lineHeight: 1.5 }}>
              Open your banking app and move these amounts to separate accounts. Then come back and tap Transfer Done.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {[
                { label: t('Take-Home'),         amount: payTarget,              color: 'var(--color-pay)' },
                { label: t('Tax Bucket'),         amount: monthIncome * taxFrac,  color: 'var(--color-tax)' },
                { label: t('Profit Bucket'),      amount: monthIncome * profitFrac, color: 'var(--color-profit)' },
                { label: t('Operations Bucket'), amount: monthIncome * opsFrac,  color: 'var(--color-ops)' },
              ].map(({ label, amount, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 15, color: 'var(--color-foreground)' }}>{label}</span>
                  <span className="font-serif" style={{ fontSize: 20, fontWeight: 700, color }}>${amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <a
              href="https://app.relayfi.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 48, background: 'var(--color-background)', border: '1.5px solid var(--color-border)', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10, textDecoration: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
            >
              Open Relay to transfer
            </a>
            <button onClick={handleSecurePay} disabled={securing}
              style={{ width: '100%', minHeight: 52, background: securing ? 'var(--color-muted)' : 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: securing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {securing ? 'Saving...' : 'Transfer Done'}
            </button>
            <button onClick={() => setShowPayModal(false)} disabled={securing}
              style={{ width: '100%', minHeight: 44, background: 'none', border: 'none', color: 'var(--color-muted-foreground)', fontSize: 14, cursor: 'pointer', marginTop: 8, fontFamily: 'var(--font-sans)' }}
            >
              Not yet
            </button>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <div role="dialog" aria-modal="true" aria-labelledby="celebration-title"
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <p style={{ fontSize: 32, textAlign: 'center', margin: '0 0 8px' }}>🎉</p>
            <h3 id="celebration-title" className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8, marginTop: 0, textAlign: 'center' }}>
              You paid yourself this month.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 20, lineHeight: 1.5, textAlign: 'center' }}>
              That is worth celebrating. What is one small thing you will do for yourself?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {CELEBRATION_CHIPS.map(chip => (
                <button key={chip} onClick={() => setCelebrationNote(chip)}
                  style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: `1.5px solid ${celebrationNote === chip ? 'var(--color-pay)' : 'var(--color-border)'}`, background: celebrationNote === chip ? 'var(--color-pay)' : 'var(--color-card)', color: celebrationNote === chip ? '#fff' : 'var(--color-muted-foreground)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}
                >
                  {chip}
                </button>
              ))}
            </div>
            <textarea
              value={celebrationNote}
              onChange={e => setCelebrationNote(e.target.value)}
              placeholder="Write your own..."
              rows={2}
              style={{ width: '100%', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-ink)', fontSize: 13, padding: '10px 12px', fontFamily: 'var(--font-sans)', resize: 'none', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
            />
            <button onClick={() => handleSaveCelebration(false)} disabled={savingCelebration}
              style={{ width: '100%', minHeight: 48, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8, fontFamily: 'var(--font-sans)' }}
            >
              {savingCelebration ? 'Saving...' : 'Save and Celebrate'}
            </button>
            <button onClick={() => handleSaveCelebration(true)}
              style={{ width: '100%', background: 'none', border: 'none', fontSize: 13, color: 'var(--color-muted-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
