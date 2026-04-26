'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Reservoir } from '@/components/dashboard/Reservoir'
import { createClient } from '@/lib/supabase'

// ── Data ──────────────────────────────────────────────────────────────────────

const IQ_LABELS: Record<string, { accounting: string; translated: string }[]> = {
  coach: [
    { accounting: 'Revenue',             translated: 'Coaching Income' },
    { accounting: 'Cost of Goods Sold',  translated: 'Delivery Costs'  },
    { accounting: 'Accounts Receivable', translated: 'Owed to Me'      },
    { accounting: 'Net Income',          translated: 'Take-Home'        },
  ],
  trainer: [
    { accounting: 'Revenue',             translated: 'Training Income' },
    { accounting: 'Cost of Goods Sold',  translated: 'Session Costs'  },
    { accounting: 'Accounts Receivable', translated: 'Owed to Me'     },
    { accounting: 'Net Income',          translated: 'Take-Home'       },
  ],
  bodyworker: [
    { accounting: 'Revenue',             translated: 'Appointment Income' },
    { accounting: 'Cost of Goods Sold',  translated: 'Table Costs'        },
    { accounting: 'Accounts Receivable', translated: 'Owed to Me'         },
    { accounting: 'Net Income',          translated: 'Take-Home'          },
  ],
}

const STATS = [
  { num: 3,  prefix: '',  suffix: '',     unit: 'industries',               label: 'Coaches, trainers, bodyworkers' },
  { num: 0,  prefix: '$', suffix: '',     unit: ' jargon',                  label: 'We speak your language'         },
  { num: 25, prefix: '',  suffix: '%',    unit: '',                         label: 'Tax rate built in'              },
  { num: 5,  prefix: '',  suffix: ' min', unit: '',                         label: 'To your first real insight'     },
]

const OBJECTIONS = [
  {
    q: 'Is this just another QuickBooks?',
    a: 'No. Most bookkeeping tools were built for small businesses with employees, inventory, and accountants on staff. Bookwise was built for one person -- you -- and it speaks your language from day one.',
  },
  {
    q: 'What if I am not good with money?',
    a: 'That is exactly why Bookwise exists. You do not need to be good with money. You need a tool that makes your money make sense.',
  },
  {
    q: 'Do I have to connect my bank?',
    a: 'No. You can add transactions manually, import a CSV, or connect when you are ready. Bookwise works however you work.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your data is encrypted and private. We use Supabase with row-level security, which means only you can see your numbers.',
  },
]

// ── CountUp ───────────────────────────────────────────────────────────────────

function CountUp({ target, trigger }: { target: number; trigger: boolean }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) return
    if (target === 0) { setValue(0); return }
    const duration = 1400
    const start = performance.now()
    function step(now: number) {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [trigger, target])
  return <>{value}</>
}

// ── FadeUp ────────────────────────────────────────────────────────────────────

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [activeIndustry, setActiveIndustry] = useState<'coach' | 'trainer' | 'bodyworker'>('bodyworker')
  const [labelsKey, setLabelsKey]           = useState(0)
  const [openFaq, setOpenFaq]               = useState<number | null>(null)
  const [email, setEmail]                   = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [isMobile, setIsMobile]             = useState(false)
  const [hasSession, setHasSession]         = useState(false)

  const statsRef    = useRef<HTMLElement>(null)
  const statsInView = useInView(statsRef, { once: true, margin: '-40px' })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
    })
  }, [])

  function switchIndustry(ind: 'coach' | 'trainer' | 'bodyworker') {
    if (ind === activeIndustry) return
    setActiveIndustry(ind)
    setLabelsKey(k => k + 1)
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setWaitlistStatus('loading')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('waitlist').insert({ email })
      if (error) throw error
      setWaitlistStatus('success')
    } catch {
      setWaitlistStatus('error')
    }
  }

  // ── Shared style tokens ───────────────────────────────────────────────────

  const label11 = {
    fontSize: 11, fontWeight: 700 as const, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: 'var(--color-primary)',
    marginBottom: 12, marginTop: 0,
  }

  const bodyText = {
    fontSize: 15, color: 'var(--color-muted-foreground)',
    lineHeight: 1.75, margin: 0,
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div data-vibe="sage" style={{ background: 'var(--color-background)', minHeight: '100vh' }}>

      {/* ── 1. NAV ───────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>
            Bookwise
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {hasSession ? (
              <Link href="/dashboard" style={{
                fontSize: 14, fontWeight: 700, color: 'var(--color-primary-foreground)',
                textDecoration: 'none', padding: '8px 18px', borderRadius: 8,
                background: 'var(--color-primary)', whiteSpace: 'nowrap',
              }}>
                Go to My Dashboard
              </Link>
            ) : (
              <>
                {!isMobile && (
                  <Link href="/login" style={{
                    fontSize: 14, fontWeight: 600, color: 'var(--color-primary)',
                    textDecoration: 'none', padding: '7px 16px', borderRadius: 8,
                    border: '1.5px solid var(--color-primary)', background: 'transparent',
                  }}>
                    Sign In
                  </Link>
                )}
                <Link href="/login" style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--color-primary-foreground)',
                  textDecoration: 'none', padding: '8px 18px', borderRadius: 8,
                  background: 'var(--color-primary)', whiteSpace: 'nowrap',
                }}>
                  Try Free for 30 Days
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. HERO ──────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(140deg, var(--color-primary) 0%, var(--color-accent) 100%)',
        padding: isMobile ? '80px 24px 72px' : '108px 24px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -100, right: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -60,
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'inline-block',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 99, padding: '6px 18px',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.09em',
            color: 'rgba(255,255,255,0.88)', marginBottom: 32,
            textTransform: 'uppercase',
          }}>
            Built for coaches, trainers, and bodyworkers
          </div>

          <h1 className="font-serif" style={{
            fontSize: isMobile ? 36 : 56,
            color: '#ffffff', lineHeight: 1.06,
            marginBottom: 28, letterSpacing: '-0.02em',
          }}>
            <span style={{ fontWeight: 400 }}>You are brilliant at your work.</span><br />
            <em style={{ fontWeight: 400 }}>Your finances should be too.</em>
          </h1>

          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,0.80)',
            lineHeight: 1.65, maxWidth: 480, margin: '0 auto 40px',
          }}>
            Bookwise is the first bookkeeping app that speaks your language. No spreadsheets. No accountant required. Just clarity on what you earned, what to set aside, and exactly how much you can pay yourself.
          </p>

          <Link href="/login" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: 10,
            border: '1.5px solid rgba(255,255,255,0.75)', background: 'transparent',
            color: '#ffffff', fontSize: 16, fontWeight: 700, textDecoration: 'none',
          }}>
            Start Free -- No Credit Card Needed
          </Link>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginTop: 14 }}>
            30 days free. Then $19 per month. Cancel anytime.
          </p>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 10 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'rgba(255,255,255,0.40)', textDecoration: 'underline' }}>
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* ── 3. STATS STRIP ───────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ background: 'var(--color-primary)', padding: '32px 24px' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
          gap: isMobile ? '28px 16px' : 0,
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: isMobile ? 0 : '0 24px',
              borderRight: (!isMobile && i < 3) ? '1px solid rgba(255,255,255,0.18)' : 'none',
            }}>
              <div className="font-serif" style={{
                fontSize: 38, fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: 6,
              }}>
                {s.prefix}<CountUp target={s.num} trigger={!!statsInView} />{s.suffix}{s.unit}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. PROBLEM ───────────────────────────────────────────────────── */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '104px 24px',
          background: 'var(--color-card)',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <p style={label11}>Sound familiar?</p>

            <h2 className="font-serif" style={{
              fontSize: isMobile ? 26 : 34, fontWeight: 400, color: 'var(--color-ink)',
              lineHeight: 1.3, marginBottom: 40,
            }}>
              You started your practice to help people. Not to stare at a spreadsheet wondering if you can pay yourself this month.
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left', marginBottom: 56 }}>
              {[
                'You have tried QuickBooks. It was built for a restaurant, not a massage practice.',
                'You know you should be setting aside money for taxes. You just never know how much.',
                'You are making good money on paper. But somehow your account never reflects it.',
              ].map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--color-primary)', flexShrink: 0, marginTop: 7,
                  }} />
                  <p style={{ ...bodyText, fontSize: 15, margin: 0 }}>{pt}</p>
                </div>
              ))}
            </div>

            <p className="font-serif" style={{
              fontSize: 22, fontStyle: 'italic', fontWeight: 400,
              color: 'var(--color-primary)', paddingTop: 8,
            }}>
              There is a better way.
            </p>
          </div>
        </section>
      </FadeUp>

      {/* ── 5. IQ ENGINE DEMO ────────────────────────────────────────────── */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '104px 24px',
          background: 'var(--color-muted)',
        }}>
          <div style={{
            maxWidth: 1000, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 48 : 72,
            alignItems: 'center',
          }}>
            {/* Left */}
            <div>
              <p style={label11}>The IQ Engine</p>
              <h2 className="font-serif" style={{
                fontSize: isMobile ? 26 : 32, fontWeight: 600, color: 'var(--color-ink)',
                lineHeight: 1.15, marginBottom: 18,
              }}>
                Bookwise learns your language. Not the other way around.
              </h2>
              <p style={{ ...bodyText, marginBottom: 28 }}>
                The moment you tell us what you do, every label in the app becomes yours. No more "accounts receivable." No more "cost of goods sold." Just your work, in your words.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['coach', 'trainer', 'bodyworker'] as const).map(ind => (
                  <button
                    key={ind}
                    onClick={() => switchIndustry(ind)}
                    style={{
                      padding: '9px 20px', borderRadius: 99,
                      border: '1.5px solid var(--color-primary)',
                      background: activeIndustry === ind ? 'var(--color-primary)' : 'transparent',
                      color: activeIndustry === ind ? 'var(--color-primary-foreground)' : 'var(--color-primary)',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', textTransform: 'capitalize',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {ind.charAt(0).toUpperCase() + ind.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Right */}
            <div>
              <div style={{
                background: 'var(--color-card)', borderRadius: 14,
                boxShadow: '0 4px 28px rgba(0,0,0,0.08)', overflow: 'hidden',
              }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={labelsKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {IQ_LABELS[activeIndustry].map((row, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 22px',
                        borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none',
                      }}>
                        <span style={{
                          fontSize: 13, color: 'var(--color-muted-foreground)',
                          textDecoration: 'line-through', opacity: 0.65,
                        }}>
                          {row.accounting}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
                          {row.translated}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
              <p style={{
                fontSize: 13, color: 'var(--color-muted-foreground)',
                textAlign: 'center', marginTop: 14,
              }}>
                This is not a translation layer bolted on. It is how the entire app thinks.
              </p>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── 6. FEATURES ──────────────────────────────────────────────────── */}

      {/* Feature 1 -- full-width two column, text left, reservoirs right */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '104px 24px',
          background: 'var(--color-card)',
        }}>
          <div style={{
            maxWidth: 1000, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '5fr 7fr',
            gap: isMobile ? 48 : 64,
            alignItems: 'center',
          }}>
            <div>
              <h2 className="font-serif" style={{
                fontSize: isMobile ? 28 : 34, fontWeight: 600, color: 'var(--color-ink)',
                lineHeight: 1.15, marginBottom: 18,
              }}>
                Always know where your money stands.
              </h2>
              <p style={bodyText}>
                Every dollar you earn is automatically split across three funds -- your growth, your taxes, and your day-to-day costs. Watch them fill in real time. Hit the Secure My Pay button when it is time to pay yourself, and know you have already handled your taxes.
              </p>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center',
              gap: isMobile ? 12 : 14, flexWrap: 'wrap',
            }}>
              <Reservoir label="Growth Fund"      current={2480} goal={4000} tone="profit" />
              <Reservoir label="Tax Set-Aside"    current={2840} goal={4000} tone="tax"    />
              <Reservoir label="Daily Operations" current={2320} goal={4000} tone="ops"    />
            </div>
          </div>
        </section>
      </FadeUp>

      {/* Feature 2 -- Sage, card left, text right */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '96px 24px',
          background: 'var(--color-background)',
        }}>
          <div style={{
            maxWidth: 960, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 40 : 64,
            alignItems: 'start',
          }}>
            <div style={{
              background: 'var(--color-card)', borderRadius: 14,
              border: '1px solid var(--color-border)',
              padding: '28px 24px',
              boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
            }}>
              <p style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--color-muted-foreground)',
                margin: '0 0 16px',
              }}>
                Sage says...
              </p>
              <p style={{ ...bodyText, fontSize: 15 }}>
                Your appointment income this month is tracking 18% above last month. Your supply spend is steady. Based on your current pace, you will hit your take-home target by the 22nd. The 90-minute slots are doing the heavy lifting.
              </p>
            </div>
            <div style={{ paddingTop: isMobile ? 0 : 12 }}>
              <h2 className="font-serif" style={{
                fontSize: isMobile ? 28 : 32, fontWeight: 600, color: 'var(--color-ink)',
                lineHeight: 1.15, marginBottom: 18,
              }}>
                Meet Sage. Your AI financial mentor.
              </h2>
              <p style={{ ...bodyText, marginBottom: 16 }}>
                Sage watches your numbers so you do not have to. She notices when your supply spend jumped. She tells you it is a good week to pay yourself. She answers plain-language questions like "how much did I spend on my treatment room this month?" -- and she never judges you for not knowing.
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', lineHeight: 1.55 }}>
                Sage shares observations, not advice. Always work with a licensed CPA for filing.
              </p>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* Feature 3 -- receipt, visual left, text right */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '96px 24px',
          background: 'var(--color-muted)',
        }}>
          <div style={{
            maxWidth: 960, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 40 : 64,
            alignItems: 'center',
          }}>
            <div style={{
              background: 'var(--color-card)', borderRadius: 14,
              padding: '28px 24px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
            }}>
              {[
                { label: 'Vendor', value: 'Pure Touch Linens' },
                { label: 'Date',   value: 'April 22, 2026'    },
                { label: 'Amount', value: '$45.00'             },
              ].map(({ label, value }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <p style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: 'var(--color-muted-foreground)',
                    margin: '0 0 5px',
                  }}>
                    {label}
                  </p>
                  <div style={{
                    height: 44, borderRadius: 8,
                    border: '1.5px solid var(--color-primary)',
                    background: 'var(--color-background)',
                    display: 'flex', alignItems: 'center', padding: '0 14px',
                    fontSize: 14, fontWeight: 600, color: 'var(--color-foreground)',
                  }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h2 className="font-serif" style={{
                fontSize: isMobile ? 28 : 32, fontWeight: 600, color: 'var(--color-ink)',
                lineHeight: 1.15, marginBottom: 18,
              }}>
                Snap a receipt. It files itself.
              </h2>
              <p style={bodyText}>
                Take a photo of any receipt. Bookwise reads the vendor, date, and amount automatically and saves the image to your Google Drive with the right name. Your CPA will thank you.
              </p>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── 7. SOCIAL PROOF ──────────────────────────────────────────────── */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '104px 24px',
          background: 'var(--color-card)',
        }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <h2 className="font-serif" style={{
              fontSize: isMobile ? 28 : 34, fontWeight: 400, color: 'var(--color-ink)',
              textAlign: 'center', marginBottom: 56,
            }}>
              Built for the way you actually work.
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: 20, alignItems: 'start',
            }}>
              {/* Coach -- tallest, most generous padding */}
              <div style={{
                background: 'var(--color-muted)',
                borderLeft: '4px solid var(--color-primary)',
                borderRadius: '0 12px 12px 0', padding: '36px 24px 40px',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 14px' }}>
                  For Coaches
                </p>
                <p style={{ ...bodyText }}>
                  You sell transformation, not time. Bookwise tracks your retainers, packages, and program income and shows you exactly what your practice is worth -- and what you can pay yourself after every launch.
                </p>
              </div>

              {/* Trainer */}
              <div style={{
                background: 'var(--color-muted)',
                borderLeft: '4px solid var(--color-primary)',
                borderRadius: '0 12px 12px 0', padding: '24px',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 14px' }}>
                  For Personal Trainers
                </p>
                <p style={{ ...bodyText }}>
                  Sessions, packages, memberships -- Bookwise tracks them all. See your busiest days, your highest-margin offerings, and whether that gym fee is actually worth it.
                </p>
              </div>

              {/* Bodyworker */}
              <div style={{
                background: 'var(--color-muted)',
                borderLeft: '4px solid var(--color-primary)',
                borderRadius: '0 12px 12px 0', padding: '28px 24px 32px',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 14px' }}>
                  For Bodyworkers
                </p>
                <p style={{ ...bodyText }}>
                  Table time is sacred. Admin should not be. Snap a receipt between clients, log a tip in ten seconds, and let Bookwise handle the rest. Your CE credits even go straight to your tax export.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── 8. OBJECTIONS ────────────────────────────────────────────────── */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '104px 24px',
          background: 'var(--color-background)',
        }}>
          <div style={{
            maxWidth: 960, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 56 : 72,
            alignItems: 'start',
          }}>
            {/* Accordion */}
            <div>
              <h2 className="font-serif" style={{
                fontSize: isMobile ? 26 : 30, fontWeight: 600, color: 'var(--color-ink)',
                marginBottom: 32, lineHeight: 1.2,
              }}>
                You have questions. Fair.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {OBJECTIONS.map((obj, i) => (
                  <div key={i} style={{
                    border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{
                        width: '100%', padding: '15px 18px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: openFaq === i ? 'var(--color-muted)' : 'var(--color-card)',
                        border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
                        {obj.q}
                      </span>
                      <span style={{
                        fontSize: 20, color: 'var(--color-primary)', marginLeft: 12, flexShrink: 0,
                        display: 'inline-block',
                        transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform 0.18s',
                      }}>
                        +
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === i && (
                        <motion.div
                          key="body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden', background: 'var(--color-card)' }}
                        >
                          <p style={{
                            fontSize: 14, color: 'var(--color-muted-foreground)',
                            lineHeight: 1.7, padding: '0 18px 16px', margin: 0,
                          }}>
                            {obj.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div style={{
              background: 'var(--color-muted)',
              borderRadius: 14, padding: '36px 28px',
              borderLeft: '4px solid var(--color-primary)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
            }}>
              <span className="font-serif" style={{
                fontSize: 64, color: 'var(--color-primary)',
                lineHeight: 0.7, display: 'block', marginBottom: 20, fontWeight: 900,
              }}>
                "
              </span>
              <p style={{ fontSize: 16, color: 'var(--color-foreground)', lineHeight: 1.8, margin: '0 0 28px' }}>
                I used to dread opening my bank app. Now I actually know what I earned, what I owe in taxes, and what I can pay myself. It took me ten minutes to set up.
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 6px' }}>
                Maya C., Licensed Massage Therapist
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: 0 }}>
                Early user quote. Results will vary.
              </p>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── 9. WAITLIST ──────────────────────────────────────────────────── */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '72px 24px' : '96px 24px',
          background: 'var(--color-card)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
            <h2 className="font-serif" style={{
              fontSize: 32, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 12,
            }}>
              Get early access.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', lineHeight: 1.65, marginBottom: 32 }}>
              Join wellness practitioners getting priority access and a free first month when we launch.
            </p>

            {waitlistStatus === 'success' ? (
              <p className="font-serif" style={{
                fontSize: 20, fontStyle: 'italic', color: 'var(--color-primary)', lineHeight: 1.4,
              }}>
                You are in. We will be in touch soon.
              </p>
            ) : (
              <>
                <form onSubmit={handleWaitlist} style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 10,
                }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{
                      flex: 1, padding: '13px 16px', fontSize: 15,
                      borderRadius: 8, border: '1.5px solid var(--color-border)',
                      background: 'var(--color-background)', color: 'var(--color-foreground)',
                      outline: 'none', fontFamily: 'var(--font-sans)', minHeight: 48,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={waitlistStatus === 'loading'}
                    style={{
                      padding: '0 24px', borderRadius: 8, minHeight: 48,
                      background: waitlistStatus === 'loading' ? 'var(--color-muted-foreground)' : 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)',
                      border: 'none', fontSize: 15, fontWeight: 700,
                      cursor: waitlistStatus === 'loading' ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                    }}
                  >
                    {waitlistStatus === 'loading' ? 'Joining...' : 'Join the Waitlist'}
                  </button>
                </form>
                {waitlistStatus === 'error' && (
                  <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 10 }}>
                    Something went wrong. Try again.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </FadeUp>

      {/* ── 10. FINAL CTA ────────────────────────────────────────────────── */}
      <FadeUp>
        <section style={{
          padding: isMobile ? '80px 24px' : '112px 24px',
          background: 'linear-gradient(140deg, var(--color-primary) 0%, var(--color-accent) 100%)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* lighter wash overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.18)', pointerEvents: 'none',
          }} />
          <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
            <h2 className="font-serif" style={{
              fontSize: isMobile ? 34 : 42, fontWeight: 400, color: '#ffffff',
              lineHeight: 1.1, marginBottom: 16,
            }}>
              Your numbers are waiting for you.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, marginBottom: 36 }}>
              Thirty days free. No credit card. No accounting degree.
            </p>
            <Link href="/login" style={{
              display: 'inline-block', padding: '16px 52px',
              background: 'var(--color-card)', color: 'var(--color-primary)',
              borderRadius: 12, fontSize: 18, fontWeight: 700, textDecoration: 'none',
            }}>
              Start Free Today
            </Link>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 16 }}>
              Then $19 per month. Cancel anytime. Your data is always yours.
            </p>
          </div>
        </section>
      </FadeUp>

      {/* ── 11. FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--color-primary)', padding: '36px 24px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: 20,
        }}>
          <div>
            <span className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: 6 }}>
              Bookwise
            </span>
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.40)',
              textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
            }}>
              Financial clarity for wellness professionals
            </span>
          </div>
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.38)',
            maxWidth: 340, textAlign: isMobile ? 'left' : 'right',
            lineHeight: 1.65, margin: 0,
          }}>
            Bookwise organizes your numbers. Nothing here is financial or legal advice. Always work with a licensed CPA before filing.
          </p>
        </div>
      </footer>

    </div>
  )
}
