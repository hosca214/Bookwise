'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { useVibe, type Vibe, VIBES } from '@/context/VibeContext'
import type { Industry } from '@/lib/iqMaps'
import { Reservoir } from '@/components/dashboard/Reservoir'
import { Confetti } from '@/components/ui/Confetti'
import { Briefcase, Activity, Heart, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 8
const SAMPLE_INCOME = 5000

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
  const [industryLocal, setIndustryLocal] = useState<Industry>('coach')
  const [vibeLocal, setVibeLocal] = useState<Vibe>('sage')
  const [profitPct, setProfitPct] = useState(10)
  const [taxPct, setTaxPct] = useState(25)
  const [opsPct, setOpsPct] = useState(65)
  const [hour, setHour] = useState(17)
  const [minute, setMinute] = useState(0)
  const [demoConnected, setDemoConnected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const router = useRouter()
  const { setIndustry, t } = useIQ()
  const { setVibe } = useVibe()

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

  async function handleComplete() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        practice_name: practiceName.trim() || 'My Practice',
        industry: industryLocal,
        vibe: vibeLocal,
        daily_pulse_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        profit_allocation: profitPct / 100,
        tax_allocation: taxPct / 100,
        ops_allocation: opsPct / 100,
        google_drive_folder_id: 'demo',
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

  const totalPct = profitPct + taxPct + opsPct
  const validSplit = totalPct === 100

  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayH = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const displayM = minute.toString().padStart(2, '0')

  function renderStep() {
    switch (step) {

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
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={next} style={primaryBtn}>Continue</button>
              <button onClick={next} style={ghostBtn}>Skip for now</button>
            </div>
          </div>
        )

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
                    background: 'var(--color-card)',
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

      case 5: {
        const buckets = [
          {
            key: 'Profit Bucket',
            pct: profitPct,
            set: setProfitPct,
            tone: 'profit' as const,
            desc: 'This goes straight to your future. Touch it only for growth.',
          },
          {
            key: 'Tax Bucket',
            pct: taxPct,
            set: setTaxPct,
            tone: 'tax' as const,
            desc: '25% covers federal, self-employment, and most state taxes.',
          },
          {
            key: 'Operations Bucket',
            pct: opsPct,
            set: setOpsPct,
            tone: 'ops' as const,
            desc: 'Your day-to-day business costs live here.',
          },
        ]
        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
              How do you want to split your income?
            </h2>
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginBottom: 28 }}>
              Adjust the percentages. They must add up to 100.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              {buckets.map(({ key, pct, tone }) => (
                <Reservoir
                  key={key}
                  label={t(key)}
                  current={(pct / 100) * SAMPLE_INCOME}
                  goal={SAMPLE_INCOME}
                  tone={tone}
                />
              ))}
            </div>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--color-muted-foreground)', textAlign: 'center', marginBottom: 28,
            }}>
              Preview based on $5,000 monthly income
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {buckets.map(({ key, pct, set, desc }) => (
                <div key={key} style={{
                  background: 'var(--color-card)',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>{t(key)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => set(Math.max(0, pct - 1))}
                        style={{
                          width: 40, height: 40, borderRadius: 8,
                          border: '1.5px solid var(--color-border)',
                          background: 'var(--color-background)',
                          fontSize: 20, fontWeight: 700,
                          cursor: 'pointer', color: 'var(--color-foreground)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        -
                      </button>
                      <span className="font-serif" style={{
                        fontSize: 28, fontWeight: 700, color: 'var(--color-ink)',
                        minWidth: 52, textAlign: 'center', display: 'block',
                      }}>
                        {pct}%
                      </span>
                      <button
                        onClick={() => set(Math.min(100, pct + 1))}
                        style={{
                          width: 40, height: 40, borderRadius: 8,
                          border: '1.5px solid var(--color-border)',
                          background: 'var(--color-background)',
                          fontSize: 20, fontWeight: 700,
                          cursor: 'pointer', color: 'var(--color-foreground)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.5, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span className="font-serif" style={{
                fontSize: 32, fontWeight: 700,
                color: validSplit ? 'var(--color-primary)' : 'var(--color-destructive)',
              }}>
                {totalPct}%
              </span>
              <span style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginLeft: 8 }}>
                {validSplit ? 'total' : totalPct > 100 ? 'over 100' : 'of 100'}
              </span>
            </div>

            <button
              onClick={next}
              disabled={!validSplit}
              style={{
                ...primaryBtn,
                opacity: validSplit ? 1 : 0.5,
                cursor: validSplit ? 'pointer' : 'not-allowed',
                background: validSplit ? 'var(--color-primary)' : 'var(--color-muted)',
                color: validSplit ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
              }}
            >
              {validSplit ? 'Continue' : 'Must equal 100%'}
            </button>
          </div>
        )
      }

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

      case 7:
        return (
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1.1 }}>
              When do you finish your last session?
            </h2>
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', marginBottom: 48, lineHeight: 1.5 }}>
              We will send your Daily Pulse reminder at this time.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 52 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={() => setHour((hour + 1) % 24)}
                  style={{ width: 48, height: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronUp size={20} />
                </button>
                <span className="font-serif" style={{ fontSize: 64, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1, minWidth: 72, textAlign: 'center' }}>
                  {displayH}
                </span>
                <button
                  onClick={() => setHour((hour - 1 + 24) % 24)}
                  style={{ width: 48, height: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronDown size={20} />
                </button>
              </div>

              <span className="font-serif" style={{ fontSize: 64, fontWeight: 700, color: 'var(--color-muted-foreground)', lineHeight: 1, userSelect: 'none', marginBottom: 4 }}>:</span>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={() => setMinute((minute + 15) % 60)}
                  style={{ width: 48, height: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronUp size={20} />
                </button>
                <span className="font-serif" style={{ fontSize: 64, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1, minWidth: 72, textAlign: 'center' }}>
                  {displayM}
                </span>
                <button
                  onClick={() => setMinute((minute - 15 + 60) % 60)}
                  style={{ width: 48, height: 48, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronDown size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 12 }}>
                {(['AM', 'PM'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => {
                      if (period === 'AM' && hour >= 12) setHour(hour - 12)
                      if (period === 'PM' && hour < 12) setHour(hour + 12)
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 16, fontWeight: 700,
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
