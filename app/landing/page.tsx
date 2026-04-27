'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { TrendingUp, Shield, Camera, MessageCircle, Download, Zap, ChevronDown, Check, ArrowRight, Folder } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(true)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function AnimatedNumber({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    const duration = 1200
    const startTime = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * to))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, to])
  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>
}

const IQ_LABELS = {
  coach:      { income: 'Coaching Income',    expense: 'Certifications and Training', session: 'Coaching Session', bucket: 'Growth Fund' },
  trainer:    { income: 'Training Income',    expense: 'Certifications and CECs',     session: 'Training Session', bucket: 'Growth Fund' },
  bodyworker: { income: 'Appointment Income', expense: 'CE Credits and Training',     session: 'Appointment',      bucket: 'Growth Fund' },
}
type Industry = keyof typeof IQ_LABELS

const ACCORDION = [
  { q: 'Is this real bookkeeping?',     a: 'Bookwise organizes your income and expenses with clarity. For tax filing, we always recommend working with a licensed CPA. We make their job easier and your bill smaller.' },
  { q: 'Do I need to know accounting?', a: 'Not at all. Every label in Bookwise is written in plain language made for your profession. No spreadsheets. No jargon. Just your numbers.' },
  { q: 'What about my existing data?',  a: 'Connect Stripe or Plaid and your transactions import automatically. You can also add entries manually anytime.' },
  { q: 'Is my data safe?',              a: 'Your data lives in Supabase with row-level security -- only you can access your records. We never sell or share your data.' },
  { q: 'What does it cost?',            a: 'Bookwise is free during our early access period. Join the waitlist and you will lock in founding member pricing.' },
]

const FEATURES = [
  { icon: <TrendingUp size={22} />, title: 'Reservoir Buckets',  body: 'Every dollar flows into three buckets: Growth Fund, Tax Set-Aside, and Daily Operations. You always know where your money went.' },
  { icon: <Shield size={22} />,     title: 'Tax Set-Aside',      body: 'Bookwise automatically sets aside 25% of your income for taxes every time you log a payment.' },
  { icon: <Camera size={22} />,     title: 'Receipt Scanning',   body: 'Point your camera at a receipt and Sage reads it. Amount, date, and category fill in automatically.' },
  { icon: <MessageCircle size={22} />, title: 'Sage Insights',   body: 'Your AI companion notices patterns in your numbers and shares plain-language observations. No advice, just clarity.' },
  { icon: <Download size={22} />,   title: 'CPA Export',         body: 'One tap generates a Schedule C-ready CSV your accountant can open instantly. Every line mapped, every note included.' },
  { icon: <Folder size={22} />,     title: 'Google Drive Sync',  body: 'Receipts and exports go straight to your Drive folder. Your records are always backed up and organized.' },
]

const WHO = [
  { emoji: '💼', title: 'Coaches',      lines: ['Life coaches', 'Business coaches', 'Wellness coaches'] },
  { emoji: '🏋️', title: 'Trainers',    lines: ['Personal trainers', 'Fitness instructors', 'Movement teachers'] },
  { emoji: '🤲', title: 'Bodyworkers',  lines: ['Massage therapists', 'Acupuncturists', 'Somatic practitioners'] },
]

export default function LandingPage() {
  const isMobile = useIsMobile()
  const [hasSession, setHasSession] = useState(false)
  const [industry, setIndustry] = useState<Industry>('bodyworker')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [])

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      await supabase.from('waitlist').insert({ email })
    } catch {
      // silent -- duplicate emails are fine
    } finally {
      setSubmitted(true)
      setSubmitting(false)
    }
  }

  const labels = IQ_LABELS[industry]
  const industries: Industry[] = ['coach', 'trainer', 'bodyworker']

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '0 18px', height: 40, borderRadius: 999, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
    background: active ? 'var(--color-primary)' : 'var(--color-card)',
    color: active ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
  })

  const card: React.CSSProperties = {
    background: 'var(--color-card)',
    borderRadius: 12,
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
  }

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', fontFamily: 'var(--font-sans)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${isMobile ? 20 : 40}px`, background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>Bookwise</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasSession ? (
            <a href="/dashboard" style={{ ...pill(true), display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              Go to Dash <ArrowRight size={14} />
            </a>
          ) : (
            <>
              <a href="/login" style={{ ...pill(false), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Sign in</a>
              <a href="/login" style={{ ...pill(true), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Get early access</a>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: isMobile ? 120 : 144, paddingBottom: 80, padding: `${isMobile ? 120 : 144}px 24px 80px`, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: 'easeOut' }}>
          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 999, background: 'var(--color-secondary)', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 24 }}>
            Built for wellness professionals
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 42 : 58, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.02em', color: 'var(--color-ink)', margin: '0 0 24px' }}>
            Your practice,<br />not a puzzle.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--color-muted-foreground)', margin: '0 auto 40px', maxWidth: 480 }}>
            Bookwise turns your income and expenses into clear, calm numbers. No spreadsheets. No jargon. Just the picture your practice needs.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 28px', height: 52, borderRadius: 999, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
              Start free <ArrowRight size={16} />
            </a>
            <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 28px', height: 52, borderRadius: 999, background: 'var(--color-secondary)', color: 'var(--color-ink)', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
              See how it works
            </a>
          </div>
        </motion.div>
      </section>

      {/* STATS */}
      <section style={{ padding: '60px 24px', background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {[
            { to: 3,   suffix: ' industries', label: 'supported out of the box' },
            { to: 100, suffix: '%',           label: 'mobile, no desktop required' },
            { to: 0,   suffix: ' jargon',     label: 'in any label or screen' },
          ].map((stat, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>
                <AnimatedNumber to={stat.to} suffix={stat.suffix} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginTop: 6, lineHeight: 1.4 }}>{stat.label}</div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* PULL QUOTE */}
      <section style={{ padding: '80px 24px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <FadeIn>
          <blockquote style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 26 : 32, fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink)', margin: 0 }}>
            "I used to avoid looking at my numbers. Now I check them every morning."
          </blockquote>
          <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginTop: 16 }}>Massage therapist, 8 years in practice</p>
        </FadeIn>
      </section>

      {/* IQ ENGINE DEMO */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: 'var(--color-secondary)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', marginBottom: 8, textAlign: 'center' }}>IQ Engine</p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 38, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'center', margin: '0 0 12px' }}>
              Speaks your language.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', textAlign: 'center', margin: '0 0 32px', lineHeight: 1.6 }}>
              Bookwise knows the difference between a coaching session and a treatment appointment. Pick your profession to see your numbers.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
              {industries.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)} style={pill(industry === ind)}>
                  {ind.charAt(0).toUpperCase() + ind.slice(1)}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={industry}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                style={{ ...card, padding: 24 }}
              >
                {[
                  { label: labels.income,  value: '$1,320.00',       color: 'var(--color-profit)' },
                  { label: labels.expense, value: '$150.00',          color: 'var(--color-danger)' },
                  { label: labels.session, value: '4 today',          color: 'var(--color-foreground)' },
                  { label: labels.bucket,  value: '$132.00 set aside', color: 'var(--color-accent)' },
                ].map((row, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontSize: 15, color: 'var(--color-foreground)' }}>{row.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </FadeIn>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 38, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'center', margin: '0 0 40px' }}>
              Everything you need. Nothing you do not.
            </h2>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.07}>
                <div style={{ ...card, display: 'flex', gap: 20, padding: 24 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 6px' }}>{f.title}</h3>
                    <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.6 }}>{f.body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ padding: '80px 24px', background: 'var(--color-secondary)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 38, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'center', margin: '0 0 40px' }}>
              Made for you.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {WHO.map((w, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{ ...card, padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{w.emoji}</div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 12px' }}>{w.title}</h3>
                  {w.lines.map((line, j) => (
                    <p key={j} style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: '4px 0' }}>{line}</p>
                  ))}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 38, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'center', margin: '0 0 40px' }}>
              Good questions.
            </h2>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ACCORDION.map((item, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div style={{ ...card, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>{item.q}</span>
                    <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, marginLeft: 12 }}>
                      <ChevronDown size={18} color="var(--color-muted-foreground)" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', padding: '0 20px 18px', margin: 0, lineHeight: 1.65 }}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section style={{ padding: '80px 24px', background: 'var(--color-secondary)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Zap size={32} color="var(--color-primary)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 38, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 12px' }}>
              Get early access.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--color-muted-foreground)', margin: '0 0 32px', lineHeight: 1.6 }}>
              Join the waitlist. Founding members lock in their rate before we open to the public.
            </p>
            {submitted ? (
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...card, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Check size={20} color="var(--color-primary)" />
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>You are on the list. We will be in touch.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleWaitlist} style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{ flex: 1, height: 52, padding: '0 18px', borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', fontSize: 16, color: 'var(--color-foreground)', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ height: 52, padding: '0 28px', borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', fontSize: 16, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Joining...' : 'Join waitlist'}
                </button>
              </form>
            )}
          </FadeIn>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 34 : 46, fontWeight: 900, color: 'var(--color-ink)', lineHeight: 1.12, margin: '0 0 20px' }}>
              Your numbers deserve clarity.
            </h2>
            <p style={{ fontSize: 17, color: 'var(--color-muted-foreground)', margin: '0 0 36px', lineHeight: 1.6 }}>
              Start free. No credit card required. Takes three minutes to set up.
            </p>
            <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 36px', height: 56, borderRadius: 999, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', fontSize: 17, fontWeight: 700, textDecoration: 'none' }}>
              Get started free <ArrowRight size={18} />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: '0 0 6px', lineHeight: 1.6 }}>
          Bookwise organizes your financial data. Sage shares observations, not advice. Always work with a licensed CPA before filing.
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: 0 }}>
          &copy; {new Date().getFullYear()} Bookwise. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
