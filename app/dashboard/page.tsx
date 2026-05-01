'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fmt } from '@/lib/finance'
import { useIQ } from '@/context/IQContext'
import { useVibe } from '@/context/VibeContext'
import { Confetti } from '@/components/ui/Confetti'
import { BottomNav } from '@/components/ui/BottomNav'
import toast from 'react-hot-toast'
import { RefreshCw, SendHorizonal, X } from 'lucide-react'
import { PulseCalendar } from '@/components/dashboard/PulseCalendar'
import type { Profile, Bucket, WeeklySummary } from '@/lib/supabase'
import { getWeekStart, getWeekEnd, toDateStr, formatMonthLabel } from '@/lib/weekUtils'

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

const SAGE_WISDOM: Array<{ text: string; author?: string }> = [
  { text: "The month you pay yourself first, even a small amount, is the month your business starts working for you." },
  { text: "When you know your monthly number, booking clients feels less like chasing and more like choosing." },
  { text: "A slow month does not mean a failing business. A three-month average tells a more honest story than a single slow week." },
  { text: "Your Growth Fund is the first asset your practice owns. Every dollar you add is a vote for what you are building." },
  { text: "Knowing what you need to earn each month is how you stop undercharging and start choosing your clients." },
  { text: "Your essentials cost is the floor your practice has to clear. Knowing it turns uncertainty into a target." },
  { text: "A practice that pays its owner reliably is worth more than one that occasionally pays a lot. Steady is what compounds." },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Working hard for something we don't care about is called stress. Working hard for something we love is called passion.", author: "Simon Sinek" },
  { text: "Everything is figureoutable.", author: "Marie Forleo" },
  { text: "Self-care is not self-indulgence, it is self-preservation.", author: "Audre Lorde" },
  { text: "Take care of your body. It is the only place you have to live.", author: "Jim Rohn" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Do the best you can until you know better. Then when you know better, do better.", author: "Maya Angelou" },
]

const SUGGESTED_QUESTIONS = [
  "How much can I pay myself right now?",
  "What's eating into my take-home?",
  "Am I setting aside enough for taxes?",
  "Is my practice covering its costs?",
  "Should I raise my rates?",
  "What would one more client a week do for my income?",
]

const FOCUS_AREAS = ['take-home', 'expense-pace', 'bucket-health', 'coverage'] as const

const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 8) + '01'
const _ninetyDaysAgo = new Date()
_ninetyDaysAgo.setDate(_ninetyDaysAgo.getDate() - 90)
const NINETY_DAYS_AGO = _ninetyDaysAgo.toISOString().slice(0, 10)
const _weekStart = getWeekStart(new Date())
const _weekEnd = getWeekEnd(_weekStart)
const WEEK_START_STR = toDateStr(_weekStart)
const WEEK_END_STR = toDateStr(_weekEnd)
const MONTH_LABEL = formatMonthLabel(currentMonth)

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
  const [weekIncome, setWeekIncome] = useState(0)
  const [weekExpenses, setWeekExpenses] = useState(0)
  const [weekStreak, setWeekStreak] = useState(0)
  const [dailyStreak, setDailyStreak] = useState(0)
  const [currentWeekSummary, setCurrentWeekSummary] = useState<WeeklySummary | null>(null)
  const [showOwnerPayInfo, setShowOwnerPayInfo] = useState(false)
  const [showPulseInfo, setShowPulseInfo] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationNote, setCelebrationNote] = useState('')
  const [savingCelebration, setSavingCelebration] = useState(false)

  const [openPlanRow, setOpenPlanRow] = useState<'tax' | 'ops' | 'growth' | null>(null)
  const [showBreakevenDetail, setShowBreakevenDetail] = useState(false)
  const [pulseCalendarOpen, setPulseCalendarOpen] = useState(false)
  const [modalPayPeriod, setModalPayPeriod] = useState<'week' | 'month'>('week')

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
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * SAGE_WISDOM.length))
  const [wisdomFading, setWisdomFading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [recentTransactions, setRecentTransactions] = useState<Array<{ id: string; date: string; amount: number; type: string; category_key: string; notes: string | null }>>([])
  const [needsReviewTxs, setNeedsReviewTxs] = useState<Array<{ id: string; date: string; amount: number; type: string; category_key: string; notes: string | null }>>([])

  const [showSageChat, setShowSageChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'sage'; text: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  async function loadSage(p: Profile, income: number, expenses: number, b: Bucket | null) {
    setLoadingSage(true)
    setInsight(null)
    try {
      const profitFrac = (p.profit_pct ?? 10) / 100
      const taxFrac = (p.tax_pct ?? 25) / 100
      const opsFrac = (p.ops_pct ?? 27) / 100
      const profitTarget = income * profitFrac
      const taxTarget = income * taxFrac
      const opsTarget = income * opsFrac

      const profitPct = profitTarget > 0 && b ? Math.round((b.profit_funded / profitTarget) * 100) : 0
      const taxPct = taxTarget > 0 && b ? Math.round((b.tax_funded / taxTarget) * 100) : 0
      const opsPct = opsTarget > 0 ? Math.min(100, Math.round((expenses / opsTarget) * 100)) : 0
      const overBudget = opsTarget > 0 && expenses > opsTarget
      const overAmount = Math.max(0, expenses - opsTarget)

      const focus = FOCUS_AREAS[Math.floor(Math.random() * FOCUS_AREAS.length)]
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
            focus,
            expenseAlert: overBudget
              ? `Actual expenses this month (${fmt(expenses)}) exceed the ops budget (${fmt(opsTarget)}) by ${fmt(overAmount)}. This is reducing take-home pay.`
              : null,
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

  async function askSage(question: string) {
    if (!profile || !question.trim()) return
    setChatMessages(prev => [...prev, { role: 'user', text: question }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/sage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'question',
          context: {
            practiceName: profile.practice_name,
            industry: profile.industry,
            monthIncome,
            monthExpenses,
            recentTransactions,
            question,
          },
        }),
      })
      if (!res.ok) throw new Error('Sage unavailable')
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'sage', text: data.insight ?? 'Sage AI is thinking. Try again in a moment.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'sage', text: 'Sage AI is thinking. Try again in a moment.' }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      try {
        // getSession reads from local storage — no network call, instant
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { setLoading(false); router.push('/login'); return }
        const user = session.user

        // Fetch all data in parallel
        const [
          { data: profileData },
          { data: txns },
          { data: weekTxns },
          { data: pulseData },
          { data: monthPulse },
          { data: existingBucket },
          { data: existingWeekSummary },
          { data: pastWeeks },
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('transactions').select('id, amount, type, category_key, notes, date, external_id').eq('user_id', user.id).eq('is_personal', false).gte('date', currentMonth).order('date', { ascending: false }),
          supabase.from('transactions').select('amount, type').eq('user_id', user.id).eq('is_personal', false).gte('date', WEEK_START_STR).lte('date', WEEK_END_STR),
          supabase.from('daily_pulse').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
          supabase.from('daily_pulse').select('date').eq('user_id', user.id).gte('date', NINETY_DAYS_AGO).lte('date', today),
          supabase.from('buckets').select('*').eq('user_id', user.id).eq('month', currentMonth).maybeSingle(),
          supabase.from('weekly_summaries').select('*').eq('user_id', user.id).eq('week_start', WEEK_START_STR).maybeSingle(),
          supabase.from('weekly_summaries').select('week_start, transferred').eq('user_id', user.id).lt('week_start', WEEK_START_STR).order('week_start', { ascending: false }).limit(12),
        ])

        if (!profileData) { setLoading(false); router.push('/login'); return }
        if (!profileData.onboarding_complete) { setLoading(false); router.push('/onboarding'); return }

        setProfile(profileData)
        if (profileData.industry) setIndustry(profileData.industry)
        setVibe(profileData.vibe ?? 'sage')

        let income = 0
        let expenses = 0
        txns?.forEach(tx => {
          if (tx.type === 'income') income += Number(tx.amount)
          else expenses += Number(tx.amount)
        })
        setMonthIncome(income)
        setMonthExpenses(expenses)

        let wIncome = 0
        let wExpenses = 0
        weekTxns?.forEach(tx => {
          if (tx.type === 'income') wIncome += Number(tx.amount)
          else wExpenses += Number(tx.amount)
        })
        setWeekIncome(wIncome)
        setWeekExpenses(wExpenses)

        setRecentTransactions((txns ?? []).slice(0, 10).map(tx => ({
          id: tx.id,
          date: tx.date,
          amount: Number(tx.amount),
          type: tx.type,
          category_key: tx.category_key,
          notes: tx.notes,
        })))
        setNeedsReviewTxs((txns ?? [])
          .filter(tx => tx.category_key === 'Other Expense' || tx.category_key === 'Other Income')
          .map(tx => ({ id: tx.id, date: tx.date, amount: Number(tx.amount), type: tx.type, category_key: tx.category_key, notes: tx.notes }))
        )

        // Auto-insert recurring entries for current month
        const { data: templates } = await supabase
          .from('recurring_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        if (templates && templates.length > 0) {
          const existingExternalIds = new Set((txns ?? []).map(tx => tx.external_id).filter(Boolean))
          const yyyyMM = currentMonth.slice(0, 7)
          const toInsert = templates
            .filter(tmpl => {
              const extId = `recurring_${tmpl.id}_${yyyyMM}`
              return !existingExternalIds.has(extId)
            })
            .map(tmpl => ({
              user_id: user.id,
              date: `${yyyyMM}-${String(tmpl.day_of_month).padStart(2, '0')}`,
              amount: tmpl.amount,
              type: tmpl.type,
              category_key: tmpl.category_key,
              notes: tmpl.name,
              source: 'recurring',
              external_id: `recurring_${tmpl.id}_${yyyyMM}`,
              is_personal: false,
            }))
          if (toInsert.length > 0) {
            await supabase.from('transactions').insert(toInsert)
            toInsert.forEach(tx => {
              if (tx.type === 'income') income += tx.amount
              else expenses += tx.amount
            })
            setMonthIncome(income)
            setMonthExpenses(expenses)
          }
        }

        if (pulseData) {
          setPulseId(pulseData.id)
        }

        const log: Record<string, boolean> = {}
        for (const row of monthPulse ?? []) log[row.date] = true
        setPulseLog(log)

        const yest = new Date()
        yest.setDate(yest.getDate() - 1)
        let dStreak = 0
        const streakCheck = new Date(yest)
        while (true) {
          const ds = streakCheck.toISOString().slice(0, 10)
          if (!log[ds]) break
          dStreak++
          streakCheck.setDate(streakCheck.getDate() - 1)
        }
        setDailyStreak(dStreak)

        if (pastWeeks && pastWeeks.length > 0) {
          let streak = 0
          for (const row of pastWeeks) {
            if (row.transferred) streak++
            else break
          }
          setWeekStreak(streak)
        }

        const profitFrac = (profileData.profit_pct ?? 10) / 100
        const taxFrac = (profileData.tax_pct ?? 25) / 100
        const opsFrac = (profileData.ops_pct ?? 27) / 100
        const profitTarget = income * profitFrac
        const taxTarget = income * taxFrac
        const opsTarget = income * opsFrac

        // Show the page immediately with existing bucket data
        const bucketRecord: Bucket | null = existingBucket
          ? { ...existingBucket, profit_target: profitTarget, tax_target: taxTarget, ops_target: opsTarget }
          : null
        setBucket(bucketRecord)
        setLoading(false)

        // Upsert bucket in background — does not block render
        if (existingBucket) {
          supabase.from('buckets')
            .update({ profit_target: profitTarget, tax_target: taxTarget, ops_target: opsTarget })
            .eq('id', existingBucket.id)
            .then(() => {})
        } else {
          supabase.from('buckets')
            .insert({ user_id: user.id, month: currentMonth, profit_target: profitTarget, profit_funded: 0, tax_target: taxTarget, tax_funded: 0, ops_target: opsTarget, ops_funded: 0 })
            .select().single()
            .then(({ data }) => { if (data) setBucket(data) })
        }

        // Auto-archive current week in background
        const wTaxAmt = wIncome * ((profileData.tax_pct ?? 25) / 100)
        const wProfitAmt = wIncome * ((profileData.profit_pct ?? 10) / 100)
        const wPayAmt = Math.max(0, wIncome * (1 - (profileData.tax_pct ?? 25) / 100 - (profileData.profit_pct ?? 10) / 100) - wExpenses)
        if (!existingWeekSummary) {
          supabase.from('weekly_summaries').upsert({
            user_id: user.id,
            week_start: WEEK_START_STR,
            week_end: WEEK_END_STR,
            income: wIncome,
            expenses: wExpenses,
            tax_amount: wTaxAmt,
            profit_amount: wProfitAmt,
            ops_amount: wExpenses,
            pay_amount: wPayAmt,
            transferred: false,
          }, { onConflict: 'user_id,week_start' }).then(() => {})
        } else {
          setCurrentWeekSummary(existingWeekSummary)
          supabase.from('weekly_summaries').update({
            income: wIncome,
            expenses: wExpenses,
            tax_amount: wTaxAmt,
            profit_amount: wProfitAmt,
            ops_amount: wExpenses,
            pay_amount: wPayAmt,
          }).eq('id', existingWeekSummary.id).then(() => {})
        }

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
    const wTax = weekIncome * taxFrac
    const wProfit = weekIncome * profitFrac
    const wPay = monthIncome > 0 ? (Math.min(weekIncome, monthIncome) / monthIncome) * takeHome : 0

    const { error: bucketError } = await supabase
      .from('buckets')
      .update({
        profit_funded: profitTarget,
        profit_target: profitTarget,
        tax_funded: taxTarget,
        tax_target: taxTarget,
        ops_funded: opsActual,
        ops_target: opsTarget,
        pay_funded: takeHome,
      })
      .eq('id', bucket.id)

    if (bucketError) {
      toast.error('Could not save. Try again.')
      setSecuring(false)
      return
    }

    await supabase.from('weekly_summaries').upsert({
      user_id: profile.id,
      week_start: WEEK_START_STR,
      week_end: WEEK_END_STR,
      income: weekIncome,
      expenses: weekExpenses,
      tax_amount: wTax,
      profit_amount: wProfit,
      ops_amount: weekExpenses,
      pay_amount: wPay,
      transferred: true,
      transferred_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })

    setBucket(prev => prev ? {
      ...prev,
      profit_funded: profitTarget,
      profit_target: profitTarget,
      tax_funded: taxTarget,
      tax_target: taxTarget,
      ops_funded: opsActual,
      ops_target: opsTarget,
      pay_funded: takeHome,
    } : prev)
    setWeekStreak(s => s + 1)
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
      setSessionsToday(0)
      setHoursToday(0)
      setMilesToday(0)
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
  const opsFrac = (profile?.ops_pct ?? 27) / 100

  const opsActual = monthExpenses
  const overBudget = opsTarget > 0 && opsActual > opsTarget
  const overAmount = Math.max(0, opsActual - opsTarget)
  const takeHome = Math.max(0, monthIncome * (1 - taxFrac - profitFrac) - opsActual)


  const payTarget = profile?.pay_target ?? 0
  const payProgress = payTarget > 0 ? Math.min(100, (takeHome / payTarget) * 100) : 0





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
        padding: '16px 24px 14px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-background)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1, margin: 0 }}>
            My Dash
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '4px 0 0' }}>
            {profile?.practice_name ?? 'My Practice'} &middot; {MONTH_LABEL}
          </p>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 480, margin: '0 auto' }}>

        {/* My Take-Home Pay */}
        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
              My Take-Home Pay
            </span>
            <button onClick={() => setShowOwnerPayInfo(v => !v)}
              style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', fontFamily: 'var(--font-sans)' }}
            >
              {showOwnerPayInfo ? 'Hide' : 'What is this?'}
            </button>
          </div>
          {showOwnerPayInfo && (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 10, lineHeight: 1.6 }}>
              This is what you actually pocket — your income after Taxes Set Aside, Business Expenses, and your Growth Fund are accounted for. When your expenses stay within budget, this number is predictable. When expenses run over, this number drops.
            </p>
          )}
          {monthIncome > 0 ? (
            <>
              <p className="font-serif" style={{ fontSize: 36, fontWeight: 700, color: takeHome === 0 ? 'var(--color-muted-foreground)' : 'var(--color-pay)', margin: '4px 0 2px', lineHeight: 1 }}>
                {fmt(takeHome)}
              </p>
              {takeHome === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 4px', fontStyle: 'italic' }}>
                  Your expenses exceeded your income this month.
                </p>
              ) : payTarget > 0 ? (
                <>
                  <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${payProgress}%`, background: 'var(--color-pay)', borderRadius: 3, transition: 'width 1.2s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted-foreground)' }}>
                    <span>{fmt(takeHome)} this month</span>
                    <span>Goal: <strong style={{ color: 'var(--color-ink)' }}>{fmt(payTarget)}/mo</strong></span>
                  </div>
                </>
              ) : null}
              {essentialBase > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: essentialCoverage >= 100 ? '#22c55e' : 'var(--color-danger)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-foreground)', fontWeight: 600, flex: 1 }}>
                    {essentialCoverage >= 100
                      ? 'Your business is paying for itself.'
                      : `Your income covers ${essentialCoverage}% of what it costs to show up.`}
                  </span>
                  <button
                    onClick={() => setShowBreakevenDetail(v => !v)}
                    style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const }}
                  >
                    {showBreakevenDetail ? 'Hide' : 'See more'}
                  </button>
                </div>
              )}
              {showBreakevenDetail && essentialBase > 0 && (() => {
                const maxScale = Math.max(monthIncome, essentialBase) * 1.1 || 1
                const breakEvenPos = Math.min(100, (essentialBase / maxScale) * 100)
                const incomeFill = Math.min(100, (monthIncome / maxScale) * 100)
                const coveredFill = Math.min(incomeFill, breakEvenPos)
                const surplusFill = Math.max(0, incomeFill - breakEvenPos)
                const isUnder = essentialCoverage < 100
                return (
                  <div style={{ marginTop: 10, background: 'var(--color-background)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ height: 10, borderRadius: 99, background: 'var(--color-muted)', overflow: 'hidden', display: 'flex' }}>
                      {isUnder ? (
                        <div style={{ width: `${coveredFill}%`, background: '#f97316', borderRadius: 99, transition: 'width 0.8s ease-out', flexShrink: 0 }} />
                      ) : (
                        <>
                          <div style={{ width: `${breakEvenPos}%`, background: 'color-mix(in srgb, var(--color-profit) 45%, var(--color-card))', transition: 'width 0.8s ease-out', flexShrink: 0 }} />
                          {surplusFill > 0 && (
                            <>
                              <div style={{ width: 3, background: 'var(--color-card)', flexShrink: 0 }} />
                              <div style={{ width: `${surplusFill}%`, background: 'var(--color-profit)', transition: 'width 0.8s ease-out', flexShrink: 0 }} />
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--color-muted-foreground)' }}>
                      <span>Income {fmt(monthIncome)}</span>
                      <span>Cost to show up {fmt(essentialBase)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 8, marginBottom: 0 }}>
                      Need to update this?{' '}
                      <a href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Go to Settings</a>
                    </p>
                  </div>
                )
              })()}
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: '8px 0 0' }}>
              Add income in your Ledger to see your take-home pay.{' '}
              <a href="/ledger" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Go to Ledger</a>
            </p>
          )}
        </section>


        {/* Money Plan */}
        {monthIncome === 0 ? (
          <div style={{ ...cardStyle, border: '1.5px dashed var(--color-border)', background: 'var(--color-muted)', textAlign: 'center', padding: '24px 20px', marginBottom: 16 }}>
            <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.6 }}>
              Add income in your Ledger to see your money plan.{' '}
              <a href="/ledger" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Add your first entry</a>
            </p>
          </div>
        ) : (
          <section style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', fontWeight: 600, marginBottom: 10 }}>
              Money Plan
            </div>

            {/* Tax Set-Aside row */}
            <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{t('Tax Bucket')}</span>
                  <button onClick={() => setOpenPlanRow(openPlanRow === 'tax' ? null : 'tax')}
                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '50%', width: 16, height: 16, fontSize: 9, cursor: 'pointer', color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: 'var(--font-sans)' }}
                  >?</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 64, height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${taxTarget > 0 ? Math.min(100, (taxFunded / taxTarget) * 100) : 0}%`, background: 'var(--color-tax)', borderRadius: 99 }} />
                  </div>
                  <span className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-tax)', minWidth: 56, textAlign: 'right' as const }}>
                    {fmt(taxFunded)}
                  </span>
                </div>
              </div>
              {openPlanRow === 'tax' && (
                <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.6, marginTop: 4 }}>
                  <p style={{ margin: '0 0 8px' }}>
                    Set this aside so you are never surprised at tax time. Keep it in a dedicated savings account, separate from your spending.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-background)', borderRadius: 8, padding: '8px 12px' }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 2px' }}>{taxDeadline.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: 0 }}>Due {taxDeadline.label}</p>
                    </div>
                    <div style={{ textAlign: 'center' as const }}>
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

            {/* Business Expenses row */}
            <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{t('Operations Bucket')}</span>
                  <button onClick={() => setOpenPlanRow(openPlanRow === 'ops' ? null : 'ops')}
                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '50%', width: 16, height: 16, fontSize: 9, cursor: 'pointer', color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: 'var(--font-sans)' }}
                  >?</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 64, height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${opsTarget > 0 ? Math.min(100, (opsActual / opsTarget) * 100) : 0}%`, background: overBudget ? 'var(--color-danger)' : opsActual >= opsTarget * 0.85 ? '#C4A882' : 'var(--color-ops)', borderRadius: 99 }} />
                  </div>
                  <span className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: overBudget ? 'var(--color-danger)' : 'var(--color-ops)', minWidth: 56, textAlign: 'right' as const }}>
                    {fmt(opsActual)}
                  </span>
                </div>
              </div>
              {openPlanRow === 'ops' && (
                <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.6, marginTop: 4 }}>
                  {overBudget && (
                    <p style={{ color: 'var(--color-danger)', margin: '0 0 6px', fontWeight: 600 }}>
                      Over budget by {fmt(overAmount)}, which is coming directly out of your take-home.
                    </p>
                  )}
                  <p style={{ margin: 0 }}>
                    This is your monthly budget for business costs. Budget: {fmt(opsTarget)} ({Math.round(opsFrac * 100)}% of income). When your actual spending stays within this amount, your take-home pay stays predictable.
                  </p>
                </div>
              )}
            </div>

            {/* Growth Fund row */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{t('Profit Bucket')}</span>
                  <button onClick={() => setOpenPlanRow(openPlanRow === 'growth' ? null : 'growth')}
                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '50%', width: 16, height: 16, fontSize: 9, cursor: 'pointer', color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: 'var(--font-sans)' }}
                  >?</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 64, height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${profitTarget > 0 ? Math.min(100, (profitFunded / profitTarget) * 100) : 0}%`, background: 'var(--color-profit)', borderRadius: 99 }} />
                  </div>
                  <span className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-profit)', minWidth: 56, textAlign: 'right' as const }}>
                    {fmt(profitFunded)}
                  </span>
                </div>
              </div>
              {openPlanRow === 'growth' && (
                <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
                  This is your practice reinvestment fund ({Math.round(profitFrac * 100)}% of income). Set this amount aside each month for continuing education, new equipment, or saving toward bigger goals.
                </p>
              )}
            </div>
          </section>
        )}


        {/* Transfer Done */}
        {monthIncome > 0 && (
          <>
            <button
              onClick={() => { setModalPayPeriod('week'); setShowPayModal(true) }}
              style={{
                width: '100%', minHeight: 52,
                background: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
                border: 'none', borderRadius: 12,
                fontSize: 18, fontWeight: 700,
                cursor: 'pointer', marginBottom: 4,
                fontFamily: 'var(--font-serif)',
              }}
            >
              Make a Transfer
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 8px', lineHeight: 1.5 }}>
              Tap to track your transfer streak.
            </p>
            {weekStreak >= 2 && (
              <p className="font-serif" style={{ textAlign: 'center', fontSize: 14, fontStyle: 'italic', color: 'var(--color-muted-foreground)', margin: '0 0 24px' }}>
                {weekStreak} weeks of consistently paying yourself.
              </p>
            )}
            {weekStreak < 2 && <div style={{ marginBottom: 24 }} />}
          </>
        )}

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

          <button
            onClick={() => setPulseCalendarOpen(v => !v)}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 13, color: 'var(--color-primary)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              marginBottom: pulseCalendarOpen ? 12 : 20,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {pulseCalendarOpen ? '▲ Hide calendar' : '▼ Show calendar'}
          </button>
          {pulseCalendarOpen && (
            <div style={{ width: '100%', maxWidth: 380, marginBottom: 20 }}>
              <PulseCalendar log={pulseLog} selected={selectedDate} onSelect={onSelectDate} startDate={profile?.created_at?.slice(0, 10)} />
            </div>
          )}

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
          {dailyStreak >= 2 && (
            <p className="font-serif" style={{ textAlign: 'center', fontSize: 14, fontStyle: 'italic', color: 'var(--color-muted-foreground)', margin: '12px 0 0' }}>
              {dailyStreak} days of tracking your pulse in a row.
            </p>
          )}

          {needsReviewTxs.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Needs a category
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Sage could not confidently categorize these. Tap the right category so your numbers stay accurate.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {needsReviewTxs.map(tx => {
                  const cats = tx.type === 'expense'
                    ? ['Supplies', 'Software', 'Rent', 'Insurance', 'Marketing', 'Mileage', 'Meals', 'Professional Services', 'Continuing Education']
                    : ['Session Income', 'Package Income', 'Tip Income']
                  return (
                    <div key={tx.id} style={{ background: 'var(--color-background)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>
                          {new Date(tx.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {tx.notes ? ` · ${tx.notes}` : ''}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-serif)', color: tx.type === 'expense' ? 'var(--color-danger)' : 'var(--color-profit)' }}>
                          {tx.type === 'expense' ? '-' : '+'}{fmt(tx.amount)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cats.map(cat => (
                          <button
                            key={cat}
                            onClick={async () => {
                              await supabase.from('transactions').update({ category_key: cat }).eq('id', tx.id)
                              setNeedsReviewTxs(prev => prev.filter(t => t.id !== tx.id))
                            }}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                              border: '1.5px solid var(--color-border)', background: 'var(--color-card)',
                              color: 'var(--color-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Sage */}
        <section style={{ ...cardStyle, padding: '24px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
              Sage AI Insights
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
            <p className="font-serif" style={{
              fontSize: 17, fontStyle: 'italic', color: 'var(--color-ink)',
              lineHeight: 1.7, margin: 0,
              paddingLeft: 14, borderLeft: '2px solid var(--color-primary)',
            }}>
              {insight}
            </p>
          ) : (
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: 0 }}>
              Sage AI is thinking. Try again in a moment.
            </p>
          )}
        </section>

        {/* Ask Sage AI */}
        <button
          onClick={() => setShowSageChat(true)}
          style={{
            width: '100%', minHeight: 48,
            background: 'var(--color-card)',
            border: '1.5px solid var(--color-primary)',
            borderRadius: 12,
            fontSize: 15, fontWeight: 600,
            color: 'var(--color-primary)',
            cursor: 'pointer', marginTop: 12, marginBottom: 24,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Ask Sage AI a question
        </button>

        {/* Sage Wisdom */}
        <section style={{ ...cardStyle, padding: '28px 24px', marginTop: 0, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
              Sage AI Wisdom
            </p>
            <button
              onClick={() => {
                setWisdomFading(true)
                setTimeout(() => {
                  setTipIndex(i => (i + 1) % SAGE_WISDOM.length)
                  setWisdomFading(false)
                }, 250)
              }}
              aria-label="Next wisdom"
              style={{
                background: 'none', border: 'none',
                color: 'var(--color-muted-foreground)',
                cursor: 'pointer',
                padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div style={{ minHeight: 100, opacity: wisdomFading ? 0 : 1, transition: 'opacity 0.25s ease' }}>
            <p className="font-serif" style={{
              fontSize: 21, fontWeight: 600, color: 'var(--color-ink)',
              lineHeight: 1.5, margin: SAGE_WISDOM[tipIndex].author ? '0 0 10px' : '0',
            }}>
              {SAGE_WISDOM[tipIndex].author ? `"${SAGE_WISDOM[tipIndex].text}"` : SAGE_WISDOM[tipIndex].text}
            </p>
            {SAGE_WISDOM[tipIndex].author && (
              <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: 0, fontWeight: 500 }}>
                {SAGE_WISDOM[tipIndex].author}
              </p>
            )}
          </div>
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
            <h3 id="pay-modal-title" className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 16, marginTop: 0 }}>
              Make a Transfer
            </h3>
            <div style={{ display: 'flex', background: 'var(--color-background)', borderRadius: 999, padding: 3, marginBottom: 20, border: '1px solid var(--color-border)' }}>
              {(['week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setModalPayPeriod(p)}
                  style={{
                    flex: 1, minHeight: 36, border: 'none', borderRadius: 999,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    background: modalPayPeriod === p ? 'var(--color-card)' : 'transparent',
                    color: modalPayPeriod === p ? 'var(--color-ink)' : 'var(--color-muted-foreground)',
                    boxShadow: modalPayPeriod === p ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {p === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
            {(() => {
              const wTakeHome = monthIncome > 0 ? (Math.min(weekIncome, monthIncome) / monthIncome) * takeHome : 0
              const wTax = weekIncome * taxFrac
              const wProfit = weekIncome * profitFrac
              const wOps = weekExpenses
              const buckets = modalPayPeriod === 'week'
                ? [
                    { label: 'Pay Myself',            amount: wTakeHome, color: 'var(--color-pay)' },
                    { label: t('Tax Bucket'),         amount: wTax,      color: 'var(--color-tax)' },
                    { label: t('Profit Bucket'),      amount: wProfit,   color: 'var(--color-profit)' },
                    { label: t('Operations Bucket'), amount: wOps,      color: 'var(--color-ops)' },
                  ]
                : [
                    { label: 'Pay Myself',            amount: takeHome,     color: 'var(--color-pay)' },
                    { label: t('Tax Bucket'),         amount: taxFunded,    color: 'var(--color-tax)' },
                    { label: t('Profit Bucket'),      amount: profitFunded, color: 'var(--color-profit)' },
                    { label: t('Operations Bucket'), amount: opsActual,    color: 'var(--color-ops)' },
                  ]
              const noIncome = modalPayPeriod === 'week' ? wTakeHome === 0 : takeHome === 0
              return (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {buckets.map(({ label, amount, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 15, color: 'var(--color-foreground)' }}>{label}</span>
                        <span className="font-serif" style={{ fontSize: 20, fontWeight: 700, color }}>
                          {amount <= 0
                            ? <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>$0.00</span>
                            : `${fmt(amount)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  {noIncome && (
                    <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 16, lineHeight: 1.5, fontStyle: 'italic' }}>
                      {modalPayPeriod === 'week' ? 'Expenses exceeded income this week.' : 'Expenses exceeded income this month.'} Nothing to pay yourself.
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 20, lineHeight: 1.5 }}>
                    Suggested amounts based on {modalPayPeriod === 'week' ? 'this week\'s' : 'this month\'s'} income. These numbers are already saved in Reports.
                  </p>
                </>
              )
            })()}
            <button onClick={handleSecurePay} disabled={securing}
              style={{ width: '100%', minHeight: 52, background: securing ? 'var(--color-muted)' : 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: securing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {securing ? 'Saving...' : 'I did it'}
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

      {/* Sage Chat Drawer */}
      {showSageChat && (
        <div
          role="dialog" aria-modal="true" aria-label="Ask Sage AI"
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setShowSageChat(false)}
        >
          <div
            style={{ background: 'var(--color-card)', borderRadius: '20px 20px 0 0', padding: '0 0 20px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>Ask Sage AI</h3>
              <button onClick={() => setShowSageChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 120 }}>
              {chatMessages.length === 0 && (
                <div>
                  <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: '0 0 16px' }}>
                    Ask about your income, expenses, or anything on your mind about your practice. Sage uses your actual numbers.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => askSage(q)}
                        style={{
                          padding: '7px 14px', borderRadius: 999,
                          border: '1.5px solid var(--color-border)',
                          background: 'var(--color-background)',
                          color: 'var(--color-foreground)',
                          fontSize: 13, fontWeight: 500,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-muted)',
                    color: msg.role === 'user' ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                    fontSize: 15, lineHeight: 1.6,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--color-muted)' }}>
                    <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 24px 0', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askSage(chatInput) } }}
                placeholder="What do you want to know about your practice?"
                rows={2}
                style={{
                  flex: 1, borderRadius: 10, border: '1.5px solid var(--color-border)',
                  background: 'var(--color-background)', color: 'var(--color-ink)',
                  fontSize: 15, padding: '10px 12px', fontFamily: 'var(--font-sans)',
                  resize: 'none', outline: 'none', lineHeight: 1.5,
                }}
              />
              <button
                onClick={() => askSage(chatInput)}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: chatInput.trim() ? 'var(--color-primary)' : 'var(--color-muted)',
                  border: 'none', cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: chatInput.trim() ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                  transition: 'background 0.15s',
                }}
              >
                <SendHorizonal size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
