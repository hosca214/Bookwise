'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { useVibe, type Vibe, VIBES } from '@/context/VibeContext'
import type { Industry } from '@/lib/iqMaps'
import { Confetti } from '@/components/ui/Confetti'
import { Briefcase, Activity, Heart, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const supabase = createClient()

const TOTAL_STEPS = 8

const timeInputBase: React.CSSProperties = {
  width: 76, minHeight: 72, fontSize: 40, fontWeight: 700,
  textAlign: 'center', borderRadius: 10,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-card)', color: 'var(--color-ink)',
  outline: 'none', fontFamily: 'var(--font-serif)', padding: 0,
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  minHeight: 52,
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 700,
  border: 'none',
  background: 'var(--color-primary)',
  color: 'var(--color-primary-foreground)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
}

const ghostBtn: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 600,
  border: '1.5px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-muted-foreground)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
}

const stepVariants = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [practiceName, setPracticeName] = useState('')
  const [hasBizAccount, setHasBizAccount] = useState<boolean | null>(null)
  const [industryLocal, setIndustryLocal] = useState<Industry>('coach')
  const [vibeLocal, setVibeLocal] = useState<Vibe>('sage')
  const [profitPct, setProfitPct] = useState(10)
  const [taxPct, setTaxPct] = useState(25)
  const [hour, setHour] = useState(17)
  const [minute, setMinute] = useState(0)
  const [demoConnected, setDemoConnected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const router = useRouter()
  const { setIndustry, t } = useIQ()
  const { setVibe } = useVibe()

  const opsPct = 100 - profitPct - taxPct
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayH = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour

  function next() { setDir(1); setStep(s => s + 1) }
  function back() { setDir(-1); setStep(s => Math.max(1, s - 1)) }

  function handleIndustrySelect(ind: Industry) {
    setIndustryLocal(ind)
    setIndustry(ind)
    next()
  }

  function handleVibeSelect(v: Vibe) {
    setVibeLocal(v)
    setVibe(v)
  }

  function handleProfitSlider(v: number) {
    setProfitPct(v)
    if (v + taxPct > 100) setTaxPct(100 - v)
  }

  function handleTaxSlider(v: number) {
    setTaxPct(v)
    if (profitPct + v > 100) setProfitPct(100 - v)
  }

  function handleHourInput(val: string) {
    const n = parseInt(val.replace(/\D/g, ''))
    if (isNaN(n) || n < 1 || n > 12) return
    setHour(ampm === 'PM' ? (n === 12 ? 12 : n + 12) : (n === 12 ? 0 : n))
  }

  function handleAmPm(period: 'AM' | 'PM') {
    if (period === 'AM' && hour >= 12) setHour(hour - 12)
    if (period === 'PM' && hour < 12) setHour(hour + 12)
  }

  async function handleComplete() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        practice_name: practiceName.trim() || 'My Practice',
        industry: industryLocal,
        vibe: vibeLocal,
        daily_pulse_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        google_drive_folder_id: 'demo',
        profit_pct: profitPct,
        tax_pct: taxPct,
        onboarding_complete: true,
      })

      if (error) throw error

      setConfettiTrigger(n => n + 1)
      await new Promise(resolve => setTimeout(resolve, 1400))
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Could not save your setup. Try again.')
      setLoading(false)
    }
  }

  function renderStep() {
    switch (step) {

      // ── Step 1: Welcome ───────────────────────────────────────────────────
      case 1:
        return (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <h1 className="font-serif" style={{ fontSize: 48, color: 'var(--color-ink)', marginBottom: 16, lineHeight: 1.05 }}>
              Welcome to Bookwise.
            </h1>
            <p style={{ fontSize: 20, color: 'var(--color-muted-foreground)', lineHeight: 1.55, marginBottom: 56 }}>
              We are here to help you keep more of what you earn.
            </p>
            <button onClick={next} style={primaryBtn}>Let's Begin</button>
          </div>
        )

      // ── Step 2: Practice name + business account education ────────────────
      case 2:
        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 28, lineHeight: 1.1 }}>
              What is the name of your practice?
            </h2>
            <input
              type="text"
              value={practiceName}
              onChange={e => setPracticeName(e.target.value)}
              placeholder="My Practice"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') next() }}
              style={{
                width: '100%',
                minHeight: 56,
                fontSize: 20,
                padding: '14px 16px',
                borderRadius: 10,
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-card)',
                color: 'var(--color-foreground)',
                outline: 'none',
                marginBottom: 24,
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
              }}
            />

            <div style={{
              background: 'var(--color-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              padding: '20px',
              marginBottom: 24,
            }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>
                One thing that makes a big difference
              </p>
              <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', lineHeight: 1.6, marginBottom: 16 }}>
                Keeping your business income and expenses in a dedicated account
                makes your books clean, your tax prep easier, and your numbers
                trustworthy. Mixing personal and business spending is the single
                most common source of stress at tax time.
              </p>
              <p style={{
                fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
              }}>
                Do you have a dedicated business account or card?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {([{ val: true, label: 'Yes, I do' }, { val: false, label: 'Not yet' }] as const).map(({ val, label }) => (
                  <button
                    key={label}
                    onClick={() => setHasBizAccount(val)}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 600,
                      border: `1.5px solid ${hasBizAccount === val ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: hasBizAccount === val ? 'var(--color-primary)' : 'var(--color-card)',
                      color: hasBizAccount === val ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {hasBizAccount === false && (
                <p style={{ fontSize: 14, color: 'var(--color-accent)', marginTop: 12, lineHeight: 1.5, marginBottom: 0 }}>
                  No worries. Opening a free business checking account takes about 10 minutes online. Many practitioners do it before logging their first transaction.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={next} style={primaryBtn}>Continue</button>
              <button onClick={next} style={ghostBtn}>Skip for now</button>
            </div>
          </div>
        )

      // ── Step 3: Industry ──────────────────────────────────────────────────
      case 3: {
        const industries = [
          { id: 'coach' as Industry, Icon: Briefcase, label: 'Coach', desc: 'Life, business or wellness coaching' },
          { id: 'trainer' as Industry, Icon: Activity, label: 'Trainer', desc: 'Personal training, fitness instructor, or movement' },
          { id: 'bodyworker' as Industry, Icon: Heart, label: 'Bodyworker', desc: 'Massage, acupuncture, or somatic work' },
        ]
        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 28, lineHeight: 1.1 }}>
              What best describes what you do?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {industries.map(({ id, Icon, label, desc }) => (
                <button
                  key={id}
                  onClick={() => handleIndustrySelect(id)}
                  style={{
                    width: '100%',
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '0 20px',
                    borderRadius: 10,
                    border: `1.5px solid ${industryLocal === id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: industryLocal === id ? 'var(--color-secondary)' : 'var(--color-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <Icon size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>{label}</div>
                    <div style={{ fontSize: 14, color: 'var(--color-muted-foreground)' }}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      }

      // ── Step 4: Vibe ──────────────────────────────────────────────────────
      case 4:
        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
              Make it yours.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginBottom: 28 }}>
              Tap a skin to preview it live.
            </p>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 4 }}>
              {VIBES.map(v => (
                <button
                  key={v.id}
                  onClick={() => handleVibeSelect(v.id)}
                  style={{
                    flexShrink: 0,
                    width: 140,
                    height: 120,
                    borderRadius: 12,
                    border: `2px solid ${vibeLocal === v.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: v.bg,
                    cursor: 'pointer',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {v.swatches.map(s => (
                      <div key={s} style={{ width: 18, height: 18, borderRadius: '50%', background: s, flexShrink: 0 }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.3 }}>
                    {v.name}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={next} style={{ ...primaryBtn, marginTop: 20 }}>Continue</button>
          </div>
        )

      // ── Step 5: Bucket sliders ────────────────────────────────────────────
      case 5: {
        const buckets = [
          {
            key: 'Profit Bucket',
            pct: profitPct,
            maxPct: 100 - taxPct,
            onSlider: handleProfitSlider,
            color: 'var(--color-profit)',
            headline: 'This is your future.',
            desc: 'Reinvest in courses, new tools, or the next version of your practice. Touch it only with intention, not out of need.',
          },
          {
            key: 'Tax Bucket',
            pct: taxPct,
            maxPct: 100 - profitPct,
            onSlider: handleTaxSlider,
            color: 'var(--color-tax)',
            headline: 'Set it aside now.',
            desc: '25% is a widely used starting point for quarterly estimated taxes. Your actual rate may vary. Always confirm with your CPA.',
          },
          {
            key: 'Operations Bucket',
            pct: opsPct,
            maxPct: 100,
            onSlider: null,
            color: 'var(--color-ops)',
            headline: 'Everything it takes to show up.',
            desc: 'Rent, supplies, software, insurance. This is your cost of doing business each month.',
          },
        ]

        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
              How do you want to split your income?
            </h2>
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginBottom: 28, lineHeight: 1.5 }}>
              Every dollar you earn gets a job. Adjust Growth and Tax. Operations covers what remains.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              {buckets.map(({ key, pct, maxPct, onSlider, color, headline, desc }) => (
                <div key={key} style={{
                  background: 'var(--color-card)',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>{t(key)}</span>
                    <span className="font-serif" style={{ fontSize: 28, fontWeight: 700, color }}>{pct}%</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4, lineHeight: 1.4 }}>
                    {headline}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.5, marginBottom: 12 }}>
                    {desc}
                  </p>
                  {onSlider ? (
                    <input
                      type="range"
                      min={0}
                      max={maxPct}
                      value={pct}
                      onChange={e => onSlider(Number(e.target.value))}
                      style={{ width: '100%', accentColor: color, cursor: 'pointer', display: 'block', height: 4 }}
                    />
                  ) : (
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--color-muted)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: color, transition: 'width 0.2s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={next} style={primaryBtn}>Continue</button>
          </div>
        )
      }

      // ── Step 6: Integrations ──────────────────────────────────────────────
      case 6: {
        const apps = [
          { id: 'Stripe', desc: 'Income from client payments' },
          { id: 'Plaid', desc: 'Your business bank account' },
          { id: 'Google Drive', desc: 'Receipt storage' },
        ]
        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
              Connect the tools you already use.
            </h2>
            <div style={{
              background: 'var(--color-secondary)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 16,
              color: 'var(--color-muted-foreground)',
              marginBottom: 24,
              lineHeight: 1.5,
            }}>
              Running on demo data. Connect live accounts in Settings.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {apps.map(({ id, desc }) => (
                <div key={id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 10,
                  border: `1.5px solid ${demoConnected[id] ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: 'var(--color-card)',
                  transition: 'border-color 0.2s',
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>{id}</div>
                    <div style={{ fontSize: 14, color: 'var(--color-muted-foreground)' }}>{desc}</div>
                  </div>
                  {demoConnected[id] ? (
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>Connected</span>
                  ) : (
                    <button
                      onClick={() => setDemoConnected(prev => ({ ...prev, [id]: true }))}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                        border: '1.5px solid var(--color-primary)',
                        background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={next} style={primaryBtn}>Continue</button>
          </div>
        )
      }

      // ── Step 7: Pulse time ────────────────────────────────────────────────
      case 7: {
        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
              When do you finish your last session?
            </h2>
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginBottom: 48, lineHeight: 1.5 }}>
              We will send your Daily Pulse reminder at this time.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 52 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={String(displayH)}
                onChange={e => handleHourInput(e.target.value)}
                style={timeInputBase}
              />
              <span className="font-serif" style={{
                fontSize: 40, fontWeight: 700,
                color: 'var(--color-muted-foreground)',
                lineHeight: 1, userSelect: 'none',
              }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setMinute(m => { const s = [0, 15, 30, 45]; return s[(s.indexOf(m) + 1) % 4] })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-foreground)', padding: 0, display: 'flex' }}
                >
                  <ChevronUp size={22} />
                </button>
                <div style={{ ...timeInputBase, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {minute.toString().padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => setMinute(m => { const s = [0, 15, 30, 45]; return s[(s.indexOf(m) + 3) % 4] })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-foreground)', padding: 0, display: 'flex' }}
                >
                  <ChevronDown size={22} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 8 }}>
                {(['AM', 'PM'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => handleAmPm(period)}
                    style={{
                      padding: '12px 16px', borderRadius: 8, fontSize: 16, fontWeight: 700,
                      border: '1.5px solid var(--color-border)',
                      background: ampm === period ? 'var(--color-primary)' : 'var(--color-card)',
                      color: ampm === period ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={next} style={primaryBtn}>Continue</button>
          </div>
        )
      }

      // ── Step 8: Disclaimer ────────────────────────────────────────────────
      case 8:
        return (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <div style={{
              background: 'var(--color-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              padding: '28px 24px',
              marginBottom: 32,
            }}>
              <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', lineHeight: 1.7, margin: 0 }}>
                Bookwise organizes your numbers and shows you patterns.
                Sage, your AI mentor, shares observations. Nothing here is financial
                or legal advice. Always work with a licensed CPA before filing.
              </p>
            </div>
            <button
              onClick={handleComplete}
              disabled={loading}
              style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Setting up your practice...' : "I understand. Let's go."}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <Confetti trigger={confettiTrigger} />

      <div style={{
        padding: '16px 24px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 480,
        margin: '0 auto',
      }}>
        <div style={{ width: 44, display: 'flex', alignItems: 'center' }}>
          {step > 1 && (
            <button
              onClick={back}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
        </div>
        <span className="font-serif" style={{ fontSize: 18, color: 'var(--color-ink)' }}>Bookwise</span>
        <span style={{ fontSize: 14, color: 'var(--color-muted-foreground)', width: 44, textAlign: 'right' }}>
          {step} of {TOTAL_STEPS}
        </span>
      </div>

      <div style={{ height: 2, background: 'var(--color-border)', margin: '12px 0 0' }}>
        <div style={{
          height: '100%',
          width: `${(step / TOTAL_STEPS) * 100}%`,
          background: 'var(--color-primary)',
          transition: 'width 0.35s ease',
        }} />
      </div>

      <div style={{ padding: '32px 24px 48px', maxWidth: 480, margin: '0 auto', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
