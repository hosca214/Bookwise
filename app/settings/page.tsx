'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { useVibe, VIBES } from '@/context/VibeContext'
import { BottomNav } from '@/components/ui/BottomNav'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Service, RecurringTemplate } from '@/lib/supabase'

const supabase = createClient()

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-muted-foreground)',
  display: 'block',
  marginBottom: 6,
  fontFamily: 'var(--font-sans)',
}

const fieldInput: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  fontSize: 16,
  padding: '0 14px',
  borderRadius: 8,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-background)',
  color: 'var(--color-ink)',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
}

const stepperBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-card)',
  fontSize: 20,
  cursor: 'pointer',
  color: 'var(--color-ink)',
  fontFamily: 'var(--font-sans)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-muted-foreground)',
      marginBottom: 10,
      fontFamily: 'var(--font-sans)',
    }}>
      {children}
    </p>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { t, setIndustry, industry } = useIQ()
  const { vibe, setVibe } = useVibe()

  const [userId, setUserId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({})
  const [loadingServices, setLoadingServices] = useState(true)

  const [driveConnected, setDriveConnected] = useState(false)
  const [plaidConnected, setPlaidConnected] = useState(false)
  const [plaidLinking, setPlaidLinking] = useState(false)
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null)

  // vibe
  const [stagedVibe, setStagedVibe] = useState(vibe)
  const [savingVibe, setSavingVibe] = useState(false)

  // pay and transfer
  const [payTarget, setPayTarget] = useState('')
  const [transferDay, setTransferDay] = useState('Monday')
  const [essentialCost, setEssentialCost] = useState('')
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [savingPay, setSavingPay] = useState(false)

  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([])
  const [recurringAddOpen, setRecurringAddOpen] = useState(false)
  const [recurringName, setRecurringName] = useState('')
  const [recurringAmount, setRecurringAmount] = useState('')
  const [recurringType, setRecurringType] = useState<'income' | 'expense'>('income')
  const [recurringCategory, setRecurringCategory] = useState('Session Income')
  const [recurringDay, setRecurringDay] = useState(1)
  const [savingRecurring, setSavingRecurring] = useState(false)

  // money plan
  const [profitPct, setProfitPct] = useState(10)
  const [taxPct, setTaxPct] = useState(25)
  const [opsPct, setOpsPct] = useState(27)
  const [savingPlan, setSavingPlan] = useState(false)
  const takeHomePct = Math.max(0, 100 - profitPct - taxPct - opsPct)
  const overAllocated = profitPct + taxPct + opsPct > 100

  const OPS_DEFAULTS: Record<string, number> = { coach: 20, trainer: 27, bodyworker: 32 }
  const opsDefault = OPS_DEFAULTS[industry ?? ''] ?? 27

  // add service form
  const [addOpen, setAddOpen] = useState(false)
  const [svcName, setSvcName] = useState('')
  const [svcPrice, setSvcPrice] = useState('')
  const [svcDuration, setSvcDuration] = useState(60)
  const [savingService, setSavingService] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const [{ data: profile }, { data: svcData }, { data: bookings }] = await Promise.all([
          supabase.from('profiles').select('industry, vibe, pay_target, transfer_day, profit_pct, tax_pct, ops_pct, monthly_essential_cost, monthly_income_goal, google_drive_folder_id, plaid_item_id').eq('id', user.id).single(),
          supabase.from('services').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
          supabase.from('transactions').select('service_id').eq('user_id', user.id).not('service_id', 'is', null),
        ])

        if (profile?.industry) setIndustry(profile.industry)
        if (profile?.vibe) {
          setVibe(profile.vibe)
          setStagedVibe(profile.vibe as typeof vibe)
        }
        if (profile?.pay_target != null) setPayTarget(String(profile.pay_target))
        if (profile?.transfer_day) setTransferDay(profile.transfer_day)
        if (profile?.profit_pct != null) setProfitPct(profile.profit_pct)
        if (profile?.tax_pct != null) setTaxPct(profile.tax_pct)
        if (profile?.ops_pct != null) setOpsPct(profile.ops_pct)
        if (profile?.monthly_essential_cost != null) setEssentialCost(String(profile.monthly_essential_cost))
        if (profile?.monthly_income_goal != null) setMonthlyGoal(String(profile.monthly_income_goal))
        if (profile?.google_drive_folder_id) setDriveConnected(true)
        if (profile?.plaid_item_id) setPlaidConnected(true)

        // Check if returning from Google Drive OAuth
        const params = new URLSearchParams(window.location.search)
        if (params.get('driveConnected') === '1') {
          setDriveConnected(true)
          toast.success('Google Drive connected.')
          window.history.replaceState({}, '', '/settings')
        }
        if (params.get('driveError') === '1') {
          toast.error('Could not connect Google Drive. Please try again.')
          window.history.replaceState({}, '', '/settings')
        }

        const counts: Record<string, number> = {}
        for (const row of bookings ?? []) {
          if (row.service_id) counts[row.service_id] = (counts[row.service_id] ?? 0) + 1
        }
        setBookingCounts(counts)

        const sorted = (svcData ?? []).sort((a, b) => {
          const diff = (counts[b.id] ?? 0) - (counts[a.id] ?? 0)
          return diff !== 0 ? diff : a.name.localeCompare(b.name)
        })
        setServices(sorted)

        const { data: recurringData } = await supabase
          .from('recurring_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
        setRecurringTemplates(recurringData ?? [])
      } catch {
        toast.error('Could not load settings. Try again.')
      } finally {
        setLoadingServices(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveVibe() {
    if (!userId) return
    setSavingVibe(true)
    try {
      await supabase.from('profiles').update({ vibe: stagedVibe }).eq('id', userId)
      setVibe(stagedVibe)
      toast.success('Vibe saved.')
    } catch {
      toast.error('Could not save. Try again.')
    } finally {
      setSavingVibe(false)
    }
  }

  async function savePay() {
    if (!userId) return
    setSavingPay(true)
    try {
      await supabase.from('profiles').update({
        pay_target: parseFloat(payTarget) || 0,
        transfer_day: transferDay,
        monthly_essential_cost: parseFloat(essentialCost) || 0,
        monthly_income_goal: parseFloat(monthlyGoal) || 0,
      }).eq('id', userId)
      toast.success('Pay settings saved.')
    } catch {
      toast.error('Could not save. Try again.')
    } finally {
      setSavingPay(false)
    }
  }

  async function savePlan() {
    if (!userId) return
    setSavingPlan(true)
    try {
      await supabase.from('profiles').update({ profit_pct: profitPct, tax_pct: taxPct, ops_pct: opsPct }).eq('id', userId)
      toast.success('Your money plan is set.')
    } catch {
      toast.error('Could not save. Try again.')
    } finally {
      setSavingPlan(false)
    }
  }

  function adjustBucket(bucket: 'profit' | 'tax' | 'ops', delta: number) {
    if (bucket === 'profit') {
      const next = profitPct + delta
      if (next < 0 || takeHomePct - delta < 0) return
      setProfitPct(next)
    } else if (bucket === 'tax') {
      const next = taxPct + delta
      if (next < 0 || takeHomePct - delta < 0) return
      setTaxPct(next)
    } else {
      const next = opsPct + delta
      if (next < 0 || takeHomePct - delta < 0) return
      setOpsPct(next)
    }
  }

  async function addRecurringTemplate() {
    if (!userId || !recurringName.trim()) return
    const amount = parseFloat(recurringAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter an amount.'); return }
    setSavingRecurring(true)
    try {
      const { data } = await supabase
        .from('recurring_templates')
        .insert({ user_id: userId, name: recurringName.trim(), amount, type: recurringType, category_key: recurringCategory, day_of_month: recurringDay })
        .select().single()
      if (data) setRecurringTemplates(prev => [...prev, data])
      setRecurringName('')
      setRecurringAmount('')
      setRecurringDay(1)
      setRecurringAddOpen(false)
      toast.success('Recurring entry added.')
    } catch {
      toast.error('Could not save. Try again.')
    } finally {
      setSavingRecurring(false)
    }
  }

  async function removeRecurringTemplate(id: string) {
    setRecurringTemplates(prev => prev.filter(r => r.id !== id))
    await supabase.from('recurring_templates').update({ is_active: false }).eq('id', id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleResetOnboarding() {
    if (!userId) return
    if (!confirmReset) { setConfirmReset(true); return }
    await supabase.from('profiles').update({ onboarding_complete: false }).eq('id', userId)
    router.push('/onboarding')
  }

  async function addService() {
    if (!userId || !svcName.trim()) return
    const price = parseFloat(svcPrice)
    if (isNaN(price) || price <= 0) { toast.error('Enter a price.'); return }
    setSavingService(true)
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({ user_id: userId, name: svcName.trim(), price, duration_minutes: svcDuration })
        .select()
        .single()
      if (error) throw error
      setServices((prev) => [...prev, data].sort((a, b) => {
        const diff = (bookingCounts[b.id] ?? 0) - (bookingCounts[a.id] ?? 0)
        return diff !== 0 ? diff : a.name.localeCompare(b.name)
      }))
      setSvcName('')
      setSvcPrice('')
      setSvcDuration(60)
      setAddOpen(false)
      toast.success('Service added.')
    } catch {
      toast.error('Could not add service.')
    } finally {
      setSavingService(false)
    }
  }

  async function fetchPlaidLinkToken() {
    setPlaidLinking(true)
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' })
      const { link_token, error } = await res.json()
      if (error || !link_token) throw new Error(error)
      setPlaidLinkToken(link_token)
    } catch {
      toast.error('Could not connect your bank account. Try again.')
      setPlaidLinking(false)
    }
  }

  async function removeService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id))
    await supabase.from('services').update({ is_active: false }).eq('id', id)
  }

  const onPlaidSuccess = useCallback(async (publicToken: string) => {
    try {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPlaidConnected(true)
      toast.success('Bank account connected.')
    } catch {
      toast.error('Could not connect your bank account. Try again.')
    } finally {
      setPlaidLinking(false)
      setPlaidLinkToken(null)
    }
  }, [])

  const { open: openPlaidLink, ready: plaidReady } = usePlaidLink({
    token: plaidLinkToken ?? '',
    onSuccess: onPlaidSuccess,
    onExit: () => { setPlaidLinking(false); setPlaidLinkToken(null) },
  })

  useEffect(() => {
    if (plaidLinkToken && plaidReady) openPlaidLink()
  }, [plaidLinkToken, plaidReady, openPlaidLink])

  const buckets = [
    {
      key: 'Tax Bucket' as const,
      pct: taxPct,
      color: 'var(--color-tax)',
      subtitle: 'Ready when your quarterly payment is due',
      onMinus: () => adjustBucket('tax', -1),
      onPlus: () => adjustBucket('tax', 1),
      minusDisabled: taxPct <= 0,
      plusDisabled: takeHomePct <= 0,
      helper: null,
    },
    {
      key: 'Operations Bucket' as const,
      pct: opsPct,
      color: 'var(--color-ops)',
      subtitle: 'Your monthly expense budget',
      onMinus: () => adjustBucket('ops', -1),
      onPlus: () => adjustBucket('ops', 1),
      minusDisabled: opsPct <= 0,
      plusDisabled: takeHomePct <= 0,
      helper: `Industry default: ${opsDefault}%`,
    },
    {
      key: 'Profit Bucket' as const,
      pct: profitPct,
      color: 'var(--color-profit)',
      subtitle: 'Reinvest in your practice',
      onMinus: () => adjustBucket('profit', -1),
      onPlus: () => adjustBucket('profit', 1),
      minusDisabled: profitPct <= 0,
      plusDisabled: takeHomePct <= 0,
      helper: null,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '56px 20px 0' }}>

        <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 32 }}>
          Settings
        </h1>

        {/* ── Vibe ─────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Vibe</SectionHeader>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, marginBottom: 12, scrollbarWidth: 'none' }}>
            {VIBES.map((v) => {
              const selected = stagedVibe === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => { setStagedVibe(v.id); setVibe(v.id) }}
                  style={{
                    flexShrink: 0,
                    width: 140,
                    height: 120,
                    borderRadius: 12,
                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: v.bg,
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {v.swatches.map((sw) => (
                      <span key={sw} style={{ width: 16, height: 16, borderRadius: '50%', background: sw, border: '1px solid rgba(0,0,0,0.08)', display: 'inline-block' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: v.ink, fontFamily: 'var(--font-sans)' }}>
                    {v.name}
                  </div>
                </button>
              )
            })}
          </div>
          {stagedVibe !== vibe && (
            <button
              onClick={saveVibe}
              disabled={savingVibe}
              style={{ width: '100%', minHeight: 48, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {savingVibe ? 'Saving...' : 'Save Vibe'}
            </button>
          )}
        </section>

        {/* ── Pay and Transfer ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Pay and Transfer</SectionHeader>
          <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: '20px 16px', border: '1px solid var(--color-border)' }}>

            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Monthly Pay Goal</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-serif)' }}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={payTarget}
                  onChange={(e) => setPayTarget(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  style={{ width: 120, minHeight: 48, fontSize: 24, fontWeight: 700, textAlign: 'center', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-serif)', padding: 0 }}
                />
                <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>/ month</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Monthly Income Goal</label>
              <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontStyle: 'italic', marginBottom: 8 }}>
                The total your practice brings in — before you divide it up.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-serif)' }}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={monthlyGoal}
                  onChange={(e) => setMonthlyGoal(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  style={{ width: 120, minHeight: 48, fontSize: 24, fontWeight: 700, textAlign: 'center', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-serif)', padding: 0 }}
                />
                <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>/ month</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Cost to show up each month</label>
              <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontStyle: 'italic', marginBottom: 8 }}>
                Think: room rent, supplies, insurance, software.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-serif)' }}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={essentialCost}
                  onChange={(e) => setEssentialCost(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  style={{ width: 120, minHeight: 48, fontSize: 24, fontWeight: 700, textAlign: 'center', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-serif)', padding: 0 }}
                />
                <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>/ month</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ ...fieldLabel, marginBottom: 8 }}>Weekly Transfer Day</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <button
                    key={day}
                    onClick={() => setTransferDay(day)}
                    style={{
                      minHeight: 40, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${transferDay === day ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: transferDay === day ? 'var(--color-primary)' : 'var(--color-card)',
                      color: transferDay === day ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={savingPay}
              onClick={savePay}
              style={{ minHeight: 48, padding: '0 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {savingPay ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>

        {/* ── Money Plan ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Money Plan</SectionHeader>

          {/* Stacked bar */}
          <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
            <div style={{ width: `${taxPct}%`, background: 'var(--color-tax)', transition: 'width 0.25s ease' }} />
            <div style={{ width: `${opsPct}%`, background: 'var(--color-ops)', transition: 'width 0.25s ease' }} />
            <div style={{ width: `${profitPct}%`, background: 'var(--color-profit)', transition: 'width 0.25s ease' }} />
            <div style={{ width: `${takeHomePct}%`, background: 'var(--color-pay)', transition: 'width 0.25s ease' }} />
          </div>

          <div style={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            {buckets.map(({ key, pct, color, subtitle, onMinus, onPlus, minusDisabled, plusDisabled, helper }) => (
              <div key={key} style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.2 }}>{t(key)}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 2 }}>{subtitle}</div>
                      {helper && <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 2, fontStyle: 'italic' }}>{helper}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={onMinus} disabled={minusDisabled} style={{ ...stepperBtn, opacity: minusDisabled ? 0.3 : 1, cursor: minusDisabled ? 'not-allowed' : 'pointer' }}>
                      <span style={{ lineHeight: 1, position: 'relative', top: -1 }}>−</span>
                    </button>
                    <span className="font-serif" style={{ fontSize: 28, fontWeight: 700, color, minWidth: 52, textAlign: 'center' }}>{pct}%</span>
                    <button onClick={onPlus} disabled={plusDisabled} style={{ ...stepperBtn, opacity: plusDisabled ? 0.3 : 1, cursor: plusDisabled ? 'not-allowed' : 'pointer' }}>
                      <span style={{ lineHeight: 1, position: 'relative', top: -1 }}>+</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Take-Home row — read only */}
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-pay)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-muted-foreground)', lineHeight: 1.2 }}>Take-Home</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 2 }}>What you pocket</div>
                  </div>
                </div>
                <span className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-pay)', minWidth: 52, textAlign: 'right' }}>{takeHomePct}%</span>
              </div>
            </div>
          </div>

          {overAllocated && (
            <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 8 }}>
              Your allocations exceed 100%. Reduce one to continue.
            </p>
          )}

          <button
            onClick={savePlan}
            disabled={savingPlan || overAllocated}
            style={{ width: '100%', minHeight: 48, borderRadius: 10, background: overAllocated ? 'var(--color-muted)' : 'var(--color-primary)', color: overAllocated ? 'var(--color-muted-foreground)' : 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: overAllocated ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', marginTop: 12 }}
          >
            {savingPlan ? 'Saving...' : 'Save Money Plan'}
          </button>
        </section>

        {/* ── Your Services ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Your Services</SectionHeader>

          {loadingServices ? (
            <div style={{ height: 48, background: 'var(--color-muted)', borderRadius: 8 }} className="skeleton" />
          ) : (
            <>
              {services.map((svc) => {
                const count = bookingCounts[svc.id] ?? 0
                return (
                  <div key={svc.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--color-border)',
                    gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {svc.duration_minutes && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', background: 'var(--color-muted)', borderRadius: 999, padding: '2px 8px' }}>
                          {svc.duration_minutes} min
                        </span>
                      )}
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                        ${svc.price.toFixed(2)}
                      </span>
                      {count > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(124,154,126,0.1)', borderRadius: 999, padding: '2px 8px' }}>
                          {count} sessions
                        </span>
                      )}
                      <button
                        onClick={() => removeService(svc.id)}
                        aria-label={`Remove ${svc.name}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-muted-foreground)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {services.length === 0 && !addOpen && (
                <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', padding: '8px 0' }}>
                  No services yet. Add your first below.
                </p>
              )}

              {!addOpen && (
                <button
                  onClick={() => setAddOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
                    background: 'none', border: `1.5px dashed var(--color-border)`,
                    borderRadius: 10, padding: '12px 16px', width: '100%',
                    cursor: 'pointer', color: 'var(--color-muted-foreground)',
                    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
                  }}
                >
                  <Plus size={16} />
                  Add a service
                </button>
              )}

              {addOpen && (
                <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: 16, marginTop: 12, border: '1.5px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={fieldLabel}>Service name</label>
                      <input type="text" value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="60-min Massage" style={fieldInput} />
                    </div>
                    <div>
                      <label style={fieldLabel}>Price</label>
                      <input type="text" inputMode="decimal" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} placeholder="0.00" style={{ ...fieldInput, background: 'var(--color-card)' }} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabel, marginBottom: 8 }}>Duration</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button type="button" onClick={() => setSvcDuration((d) => Math.max(15, d - 15))} style={{ ...stepperBtn, width: 44, height: 44 }}>-</button>
                        <span style={{ fontSize: 18, fontWeight: 600, minWidth: 72, textAlign: 'center', color: 'var(--color-foreground)' }}>{svcDuration} min</span>
                        <button type="button" onClick={() => setSvcDuration((d) => d + 15)} style={{ ...stepperBtn, width: 44, height: 44 }}>+</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button onClick={() => setAddOpen(false)} style={{ flex: 1, minHeight: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-foreground)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                        Cancel
                      </button>
                      <button onClick={addService} disabled={savingService} style={{ flex: 2, minHeight: 48, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                        {savingService ? 'Saving...' : 'Add Service'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Recurring Entries ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Recurring Entries</SectionHeader>
          <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 12, lineHeight: 1.6 }}>
            These entries auto-add to your ledger at the start of each month. Use them for membership income, room rent, software subscriptions, or anything that repeats.
          </p>

          {recurringTemplates.length > 0 && (
            <div style={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 12, overflow: 'hidden' }}>
              {recurringTemplates.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: i < recurringTemplates.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>
                      {t(r.category_key)} · adds on the {r.day_of_month}{r.day_of_month === 1 ? 'st' : r.day_of_month === 2 ? 'nd' : r.day_of_month === 3 ? 'rd' : 'th'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: r.type === 'income' ? 'var(--color-profit)' : 'var(--color-danger)' }}>
                      {r.type === 'income' ? '+' : '-'}${r.amount.toFixed(2)}
                    </span>
                    <button onClick={() => removeRecurringTemplate(r.id)} aria-label={`Remove ${r.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-muted-foreground)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!recurringAddOpen ? (
            <button
              onClick={() => setRecurringAddOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: '1.5px dashed var(--color-border)',
                borderRadius: 10, padding: '12px 16px', width: '100%',
                cursor: 'pointer', color: 'var(--color-muted-foreground)',
                fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
              }}
            >
              <Plus size={16} />
              Add a recurring entry
            </button>
          ) : (
            <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: 16, border: '1.5px solid var(--color-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>Name</label>
                  <input type="text" value={recurringName} onChange={e => setRecurringName(e.target.value)}
                    placeholder="Room rent, membership income..." style={{ ...fieldInput }}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['income', 'expense'] as const).map(entryType => (
                      <button key={entryType} onClick={() => { setRecurringType(entryType); setRecurringCategory(entryType === 'income' ? 'Session Income' : 'Rent') }}
                        style={{
                          flex: 1, minHeight: 44, borderRadius: 8, fontSize: 14, fontWeight: 600,
                          border: `1.5px solid ${recurringType === entryType ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: recurringType === entryType ? 'var(--color-primary)' : 'transparent',
                          color: recurringType === entryType ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {entryType.charAt(0).toUpperCase() + entryType.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={fieldLabel}>Category</label>
                  <select
                    value={recurringCategory}
                    onChange={e => setRecurringCategory(e.target.value)}
                    style={{ ...fieldInput, cursor: 'pointer', appearance: 'none' as const }}
                  >
                    {recurringType === 'income'
                      ? ['Session Income', 'Package Income', 'Retainer Income', 'Other Income'].map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))
                      : ['Rent', 'Software', 'Insurance', 'Supplies', 'Marketing', 'Professional Services', 'Other Expense'].map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))
                    }
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>Amount</label>
                  <input type="text" inputMode="decimal" value={recurringAmount}
                    onChange={e => setRecurringAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00" style={fieldInput}
                  />
                </div>
                <div>
                  <label style={{ ...fieldLabel, marginBottom: 8 }}>Adds on day</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button type="button" onClick={() => setRecurringDay(d => Math.max(1, d - 1))} style={{ ...stepperBtn, width: 44, height: 44 }}>-</button>
                    <span style={{ fontSize: 18, fontWeight: 600, minWidth: 60, textAlign: 'center', color: 'var(--color-foreground)' }}>{recurringDay}</span>
                    <button type="button" onClick={() => setRecurringDay(d => Math.min(28, d + 1))} style={{ ...stepperBtn, width: 44, height: 44 }}>+</button>
                    <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>of each month</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setRecurringAddOpen(false)}
                    style={{ flex: 1, minHeight: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-foreground)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    Cancel
                  </button>
                  <button onClick={addRecurringTemplate} disabled={savingRecurring}
                    style={{ flex: 2, minHeight: 48, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {savingRecurring ? 'Saving...' : 'Add Entry'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Connected Apps ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Connected Apps</SectionHeader>
          <div style={{ background: 'var(--color-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>

            {/* Plaid */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>Plaid</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Bank account sync</div>
              </div>
              {plaidConnected ? (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'var(--color-muted)', color: 'var(--color-profit)' }}>
                  Connected
                </span>
              ) : (
                <button
                  onClick={fetchPlaidLinkToken}
                  disabled={plaidLinking}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1.5px solid var(--color-primary)',
                    background: 'transparent', color: 'var(--color-primary)',
                    cursor: plaidLinking ? 'not-allowed' : 'pointer', opacity: plaidLinking ? 0.6 : 1,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {plaidLinking ? 'Opening...' : 'Connect'}
                </button>
              )}
            </div>

            {/* Stripe */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>Stripe</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Coming soon</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)' }}>—</span>
            </div>

            {/* Square */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>Square</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Coming soon</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)' }}>—</span>
            </div>

            {/* Google Drive */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>Google Drive</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Receipt storage</div>
              </div>
              {driveConnected ? (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'var(--color-muted)', color: 'var(--color-profit)' }}>
                  Connected
                </span>
              ) : (
                <button
                  onClick={() => { window.location.href = '/api/auth/google-drive?from=settings' }}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1.5px solid var(--color-primary)',
                    background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Connect
                </button>
              )}
            </div>

          </div>
          <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 8, lineHeight: 1.5 }}>
            Connecting Google Drive creates a Bookwise Receipts folder for your receipts. Connecting Plaid, Stripe, or Square imports your transactions automatically.
          </p>
        </section>

        {/* ── About Bookwise ───────────────────────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <SectionHeader>About Bookwise</SectionHeader>
          <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: 0 }}>
              Bookwise organizes and presents your financial data. Sage AI shares observations, not advice. Work with a licensed CPA before filing.
            </p>
          </div>
        </section>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Account</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={handleLogout}
              style={{ width: '100%', minHeight: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-foreground)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Log Out
            </button>
            <div>
              <button
                onClick={handleResetOnboarding}
                style={{ width: '100%', minHeight: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'transparent', color: confirmReset ? 'var(--color-danger)' : 'var(--color-muted-foreground)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'color 0.15s' }}
              >
                {confirmReset ? 'Tap again to confirm' : 'Revisit My Setup'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 6, textAlign: 'center' }}>
                Your transactions and services stay safe. This just takes you back through setup.
              </p>
            </div>
          </div>
        </section>

      </div>
      <BottomNav />
    </div>
  )
}
