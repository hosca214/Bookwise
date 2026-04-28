'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Shield, Camera, MessageCircle, Download,
  ChevronDown, Check, ArrowRight, Folder, Sparkles, Activity,
  Leaf, Clock, BookOpen, X, RefreshCw, FileText, HardDrive, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

// ─── colour constants (for SVGs and explicit dark sections) ──────────────────
const INK   = '#2C3528'
const CREAM = '#F5F2EC'
const SAGE  = '#7C9A7E'
const MUTED = '#6B7566'
const SEC   = '#E8E2D5'
const CARD  = '#FFFFFF'
const BORDER = '#E0D8CF'
const GOLD  = '#C4A882'
const DANGER = '#C4714A'

// ─── hooks ───────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [is, setIs] = useState(true)
  useEffect(() => {
    const check = () => setIs(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return is
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, up = 24 }: { children: React.ReactNode; delay?: number; up?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: up }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  )
}

function AnimatedNumber({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    const dur = 1400, t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      setV(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, to])
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>
}

// ─── grain overlay ────────────────────────────────────────────────────────────
function Grain() {
  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', opacity: 0.028,
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }} />
  )
}

// ─── wave divider ─────────────────────────────────────────────────────────────
function Wave({ from, to }: { from: string; to: string }) {
  return (
    <div aria-hidden style={{ lineHeight: 0, background: from, display: 'block' }}>
      <svg viewBox="0 0 1440 64" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 64 }}>
        <path d="M0,32 C240,64 480,0 720,32 C960,64 1200,0 1440,32 L1440,64 L0,64 Z" fill={to} />
      </svg>
    </div>
  )
}

// ─── rotating word ─────────────────────────────────────────────────────────────
const PROFS = ['coaches', 'trainers', 'bodyworkers']
function RotatingWord({ dark = false }: { dark?: boolean }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PROFS.length), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ display: 'inline-block', color: dark ? SAGE : SAGE, fontStyle: 'italic' }}
      >
        {PROFS[idx]}
      </motion.span>
    </AnimatePresence>
  )
}

// ─── phone frame ──────────────────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 230, flexShrink: 0, background: '#1A1A1C', borderRadius: 36, padding: 9, boxShadow: '0 28px 60px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
      <div style={{ width: '100%', background: CREAM, borderRadius: 28, overflow: 'hidden', height: 420, display: 'flex', flexDirection: 'column', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
        <div style={{ padding: '10px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>9:41</span>
          <div style={{ width: 14, height: 8, borderRadius: 2, border: `1.5px solid ${INK}`, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 1, top: 1, bottom: 1, width: '70%', background: SAGE, borderRadius: 1 }} />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── mini progress bar (matches actual app dashboard cards) ──────────────────
function MiniBar({ color, pct }: { color: string; pct: number }) {
  return (
    <div style={{ height: 4, background: BORDER, borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99 }} />
    </div>
  )
}

function BucketRow({ label, amount, pct, color, sub }: { label: string; amount: string; pct: number; color: string; sub?: string }) {
  return (
    <div style={{ background: CARD, borderRadius: 9, padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>{label}</span>
        {sub && <span style={{ fontSize: 9, color: MUTED }}>{sub}</span>}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color, lineHeight: 1.1, margin: '4px 0 0' }}>{amount}</div>
      <MiniBar color={color} pct={pct} />
    </div>
  )
}

// ─── feature screens ──────────────────────────────────────────────────────────
const FEATURE_SCREENS = [
  <PhoneFrame key="buckets">
    <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif' }}>My Dash</div>
        <div style={{ fontSize: 10, color: MUTED }}>Hands and Heart Massage</div>
      </div>
      <BucketRow label="Growth Fund"   amount="$264" pct={42} color={SAGE}    sub="10% of income" />
      <BucketRow label="Tax Set-Aside" amount="$460" pct={73} color={GOLD}    sub="25% of income" />
      <BucketRow label="Daily Ops"     amount="$196" pct={31} color="#4E6E52" sub="65% of income" />
      <div style={{ background: SAGE, borderRadius: 10, padding: '11px 14px', textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Secure My Pay</span>
      </div>
      <div style={{ background: CARD, borderRadius: 9, padding: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Today's Pulse</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: INK }}>4 appointments</span>
          <span style={{ fontSize: 11, color: INK }}>5.5 hrs</span>
        </div>
      </div>
    </div>
  </PhoneFrame>,

  <PhoneFrame key="tax">
    <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif', marginBottom: 2 }}>Tax Set-Aside</div>
      <div style={{ background: CARD, borderRadius: 10, padding: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Set aside this month</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: GOLD, fontFamily: '"Lora", Georgia, serif' }}>$847.50</div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>25% safety rate</div>
      </div>
      <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Next deadline</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>June 15</span>
          <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>48 days</span>
        </div>
        <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>Q2 estimated payment</div>
      </div>
      <div style={{ background: '#EDE8DF', borderRadius: 8, padding: 8 }}>
        <p style={{ fontSize: 10, color: MUTED, margin: 0, lineHeight: 1.5 }}>Confirm your rate with a licensed CPA before filing.</p>
      </div>
    </div>
  </PhoneFrame>,

  <PhoneFrame key="sage">
    <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif' }}>Sage</div>
        <RefreshCw size={13} color={MUTED} />
      </div>
      <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(124,154,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={12} color={SAGE} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: SAGE }}>Today's insight</span>
        </div>
        <p style={{ fontSize: 11, color: INK, lineHeight: 1.6, margin: 0 }}>
          Your appointment income is up 18% from last month. Your linens and supplies expense stayed flat. That gap is your practice growing without adding overhead.
        </p>
      </div>
      <div style={{ background: CARD, borderRadius: 10, padding: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Wisdom of the day</div>
        <p style={{ fontSize: 10, color: INK, margin: 0, lineHeight: 1.5 }}>Knowing what you earned this week is one of the quietest forms of financial self-care.</p>
      </div>
    </div>
  </PhoneFrame>,

  <PhoneFrame key="receipt">
    <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif', marginBottom: 2 }}>Scan Receipt</div>
      <div style={{ background: INK, borderRadius: 10, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
        <Camera size={22} color="rgba(255,255,255,0.5)" />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Tap to scan</span>
      </div>
      <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: SAGE, marginBottom: 6 }}>Sage read your receipt</div>
        {[
          { l: 'Vendor', v: 'Massage Warehouse' },
          { l: 'Date', v: 'Apr 22, 2026' },
          { l: 'Amount', v: '$64.00' },
          { l: 'Category', v: 'Linens and Supplies' },
        ].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F0EBE4' }}>
            <span style={{ fontSize: 10, color: MUTED }}>{r.l}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: INK }}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  </PhoneFrame>,

  <PhoneFrame key="drive">
    <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif', marginBottom: 2 }}>Connected Apps</div>
      <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HardDrive size={14} color={SAGE} />
            <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>Google Drive</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: SAGE, background: 'rgba(124,154,126,0.1)', padding: '2px 7px', borderRadius: 99 }}>Connected</span>
        </div>
        {[{ n: 'Bookwise / 2026', s: '12 files' }, { n: '  April', s: '5 receipts' }, { n: '  March', s: '7 receipts' }].map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 2 ? '1px solid #F0EBE4' : 'none' }}>
            <span style={{ fontSize: 10, color: INK }}>{f.n}</span>
            <span style={{ fontSize: 10, color: MUTED }}>{f.s}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(124,154,126,0.08)', borderRadius: 8, padding: 8 }}>
        <p style={{ fontSize: 10, color: MUTED, margin: 0, lineHeight: 1.5 }}>Every receipt you scan is automatically saved and organized by month.</p>
      </div>
    </div>
  </PhoneFrame>,

  <PhoneFrame key="export">
    <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif', marginBottom: 2 }}>Export for CPA</div>
      <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6 }}>April 2026 Summary</div>
        {[
          { l: 'Appointment Income', v: '+$3,390', c: SAGE },
          { l: 'Linens and Supplies', v: '-$64', c: DANGER },
          { l: 'Treatment Room Rent', v: '-$800', c: DANGER },
          { l: 'CE Credits', v: '-$150', c: DANGER },
        ].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F0EBE4' }}>
            <span style={{ fontSize: 9, color: MUTED }}>{r.l}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: r.c }}>{r.v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>Take-Home</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: SAGE }}>$2,376</span>
        </div>
      </div>
      <div style={{ background: SAGE, borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <FileText size={13} color="#fff" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Download CSV</span>
      </div>
    </div>
  </PhoneFrame>,
]

// ─── data ─────────────────────────────────────────────────────────────────────
const IQ_LABELS = {
  coach:      { income: 'Coaching Income',    expense: 'Certifications and Training', session: 'Coaching Session', bucket: 'Growth Fund' },
  trainer:    { income: 'Training Income',    expense: 'Certifications and CECs',     session: 'Training Session', bucket: 'Growth Fund' },
  bodyworker: { income: 'Appointment Income', expense: 'CE Credits and Training',     session: 'Appointment',      bucket: 'Growth Fund' },
}
type Industry = keyof typeof IQ_LABELS

const ACCORDION = [
  { q: 'Is this real bookkeeping?',     a: 'Bookwise organizes your income and expenses with clarity. For tax filing, we always recommend working with a licensed CPA. We make their job easier and your bill smaller.' },
  { q: 'Do I need to know accounting?', a: 'Not at all. Every label in Bookwise is written in plain language for your profession. No spreadsheets. No jargon. Just your numbers.' },
  { q: 'What about my existing data?',  a: 'Connect Stripe or Plaid and your transactions import automatically. You can also add entries manually anytime.' },
  { q: 'Is my data safe?',              a: 'Your data lives in Supabase with row-level security. Only you can access your records. We never sell or share your data.' },
  { q: 'What does it cost?',            a: 'Bookwise is free during our early access period. Join the waitlist and lock in founding member pricing.' },
]

const FEATURES = [
  { icon: <TrendingUp size={22} />, title: 'Money Buckets',    body: 'Every dollar you earn flows into Growth Fund, Tax Set-Aside, and Daily Operations. You always know at a glance whether your practice is working for you.' },
  { icon: <Shield size={22} />,     title: 'Tax Set-Aside',    body: 'Based on your monthly income, Bookwise shows exactly how much to set aside using a 25% safety rate, so you know what to put away before each deadline.' },
  { icon: <MessageCircle size={22} />, title: 'Sage Insights', body: 'Sage reads your numbers each day and tells you what it sees: income patterns, expense shifts, and observations in plain language.' },
  { icon: <Camera size={22} />,     title: 'Receipt Scanning', body: 'Snap a photo of any receipt and Sage reads the amount, date, and category, then files it automatically into your Google Drive.' },
  { icon: <Folder size={22} />,     title: 'Google Drive Sync', body: 'Receipts and exports are automatically organized in a dedicated Google Drive folder, so your records are always backed up and ready.' },
  { icon: <Download size={22} />,   title: 'CPA Export',       body: 'One tap generates a clean export organized by Schedule C line, dated, categorized, and noted, so your CPA can start from it instead of starting over.' },
]

const WHO = [
  { icon: <Sparkles size={24} />, title: 'Coaches',     lines: ['Life coaches', 'Business coaches', 'Wellness coaches'] },
  { icon: <Activity size={24} />, title: 'Trainers',    lines: ['Personal trainers', 'Fitness instructors', 'Movement teachers'] },
  { icon: <Leaf size={24} />,     title: 'Bodyworkers', lines: ['Massage therapists', 'Acupuncturists', 'Somatic practitioners'] },
]

// ─── page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const isMobile = useIsMobile()
  const supabase  = createClient()

  const [hasSession,       setHasSession]       = useState(false)
  const [industry,         setIndustry]         = useState<Industry>('bodyworker')
  const [openFaq,          setOpenFaq]          = useState<number | null>(null)
  const [email,            setEmail]            = useState('')
  const [submitted,        setSubmitted]        = useState(false)
  const [submitting,       setSubmitting]       = useState(false)
  const [selectedFeature,  setSelectedFeature]  = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [])

  useEffect(() => {
    document.body.style.overflow = selectedFeature !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedFeature])

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    try { await supabase.from('waitlist').insert({ email }) } catch { /* silent */ }
    finally { setSubmitted(true); setSubmitting(false) }
  }

  const labels     = IQ_LABELS[industry]
  const industries = Object.keys(IQ_LABELS) as Industry[]

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '0 20px', height: 40, borderRadius: 999, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, transition: 'all 0.18s',
    background: active ? SAGE : CARD,
    color: active ? '#fff' : MUTED,
    boxShadow: active ? '0 2px 12px rgba(124,154,126,0.35)' : 'none',
  })

  const iconBox: React.CSSProperties = {
    width: 48, height: 48, borderRadius: 14,
    background: 'rgba(124,154,126,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: SAGE, flexShrink: 0,
  }

  return (
    <>
      <Grain />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `0 ${isMobile ? 20 : 48}px`,
        background: 'rgba(245,242,236,0.85)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <span style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 21, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>Bookwise</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasSession ? (
            <a href="/dashboard" style={{ ...pill(true), display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              Go to Dash <ArrowRight size={14} />
            </a>
          ) : (
            <>
              <a href="/login" style={{ ...pill(false), display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontSize: 14 }}>Sign In</a>
              <a href="/login" style={{ ...pill(true), display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 14 }}>Try Free <ArrowRight size={13} /></a>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: isMobile ? 'auto' : '92vh',
        display: 'flex', alignItems: 'center',
        paddingTop: isMobile ? 110 : 0,
        paddingBottom: 0,
        background: `linear-gradient(160deg, #C5D9C7 0%, #D4E3D6 18%, #E4EEE5 36%, ${CREAM} 62%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* background circle */}
        <div aria-hidden style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,154,126,0.22) 0%, transparent 70%)',
          top: '-120px', right: isMobile ? '-200px' : '-80px', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1160, margin: '0 auto', padding: `0 ${isMobile ? 24 : 64}px`, paddingBottom: isMobile ? 60 : 96, width: '100%', display: 'flex', alignItems: 'center', gap: 64, justifyContent: 'space-between' }}>

          {/* LEFT: text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ maxWidth: isMobile ? '100%' : 520, flex: '1 1 auto' }}
          >
            {/* eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999, background: 'rgba(44,53,40,0.07)', border: `1px solid rgba(44,53,40,0.12)`, fontSize: 13, fontWeight: 600, color: INK, marginBottom: 28 }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: SAGE, display: 'inline-block' }} />
              Built by The Zen Bookkeeper
            </motion.div>

            {/* headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 46 : 68, fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.03em', color: INK, margin: '0 0 10px' }}
            >
              Keep more of
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 46 : 68, fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.03em', color: INK, margin: '0 0 32px' }}
            >
              what you earn.
            </motion.h1>

            {/* subheadline — line 1 (rotating word) */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}
              style={{ fontSize: isMobile ? 17 : 19, lineHeight: 1.65, color: MUTED, margin: 0 }}
            >
              The financial clarity tool built for wellness <RotatingWord />{'.'}
            </motion.p>

            {/* subheadline — line 2 (always on its own line) */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.6 }}
              style={{ fontSize: isMobile ? 17 : 19, lineHeight: 1.65, color: MUTED, margin: '0 0 0' }}
            >
              No spreadsheets. No jargon. No anxiety.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.6 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 40 }}
            >
              <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 32px', height: 54, borderRadius: 999, background: INK, color: CREAM, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(44,53,40,0.25)' }}>
                Start free <ArrowRight size={16} />
              </a>
              <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 28px', height: 54, borderRadius: 999, background: 'rgba(255,255,255,0.65)', border: `1.5px solid ${BORDER}`, color: INK, fontSize: 16, fontWeight: 600, textDecoration: 'none', backdropFilter: 'blur(8px)' }}>
                See how it works
              </a>
            </motion.div>

            {/* trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.72, duration: 0.6 }}
              style={{ fontSize: 13, color: MUTED, marginTop: 24, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={13} color={SAGE} strokeWidth={2.5} />
              Free during early access. No credit card required.
            </motion.p>
          </motion.div>

          {/* RIGHT: app mockup (desktop only) */}
          {!isMobile && (
            <motion.div
              initial={{ opacity: 0, x: 40, y: 16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.5, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, transform: 'rotate(2deg)', filter: 'drop-shadow(0 32px 56px rgba(44,53,40,0.20))' }}
            >
              <PhoneFrame>
                <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* dash header */}
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif' }}>My Dash</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Hands and Heart Massage</div>
                  </div>

                  {/* bucket cards — matches actual app */}
                  <BucketRow label="Growth Fund"   amount="$264" pct={42} color={SAGE}    sub="10%" />
                  <BucketRow label="Tax Set-Aside" amount="$460" pct={73} color={GOLD}    sub="25%" />
                  <BucketRow label="Daily Ops"     amount="$196" pct={31} color="#4E6E52" sub="65%" />

                  {/* secure my pay */}
                  <div style={{ background: SAGE, borderRadius: 10, padding: '11px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Secure My Pay</span>
                  </div>

                  {/* sage insight */}
                  <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(124,154,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={12} color={SAGE} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: SAGE }}>Sage insight</span>
                    </div>
                    <p style={{ fontSize: 11, color: INK, lineHeight: 1.55, margin: 0 }}>
                      Income is up 18% from last month. Your overhead stayed flat.
                    </p>
                  </div>

                  {/* pulse */}
                  <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Today's Pulse</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: INK }}>4 appointments</span>
                      <span style={{ fontSize: 12, color: INK }}>5.5 hrs</span>
                    </div>
                  </div>
                </div>
              </PhoneFrame>
            </motion.div>
          )}

        </div>
      </section>

      {/* ── WAVE hero → dark ────────────────────────────────────────────── */}
      <Wave from={CREAM} to={INK} />

      {/* ── NERVOUS SYSTEM (dark) ───────────────────────────────────────── */}
      <section style={{ background: INK, padding: `${isMobile ? 64 : 96}px 24px` }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: 20 }}>
              A new kind of money habit
            </p>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 32 : 50, fontWeight: 700, color: CREAM, margin: '0 0 28px', lineHeight: 1.18, letterSpacing: '-0.02em' }}>
              Knowing your numbers is good for your nervous system.
            </h2>
            <p style={{ fontSize: isMobile ? 16 : 18, lineHeight: 1.75, color: 'rgba(245,242,236,0.7)', margin: '0 0 16px' }}>
              Most wellness practitioners spend more energy avoiding their numbers than understanding them. That avoidance carries a quiet cost. The low-grade anxiety of not knowing what you earned, what you owe, or whether your practice is working for you is a weight you do not have to carry.
            </p>
            <p style={{ fontSize: isMobile ? 16 : 18, lineHeight: 1.75, color: 'rgba(245,242,236,0.7)', margin: '0 0 52px' }}>
              Bookwise is designed as a daily check-in, not a quarterly scramble. Sixty seconds. Your session count, your income, your set-asides. A clear picture, every single day. When you know your numbers, your nervous system can relax.
            </p>

            {/* habit chips */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14, justifyContent: 'center' }}>
              {[
                { icon: <Clock size={18} />,      label: '60-second daily check-in' },
                { icon: <TrendingUp size={18} />, label: 'Always know what you earned' },
                { icon: <Shield size={18} />,     label: 'Never guess at taxes again' },
              ].map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderRadius: 14, background: 'rgba(245,242,236,0.07)', border: '1px solid rgba(245,242,236,0.12)', flex: isMobile ? undefined : 1 }}>
                  <span style={{ color: SAGE, flexShrink: 0 }}>{h.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: CREAM }}>{h.label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── WAVE dark → cream ───────────────────────────────────────────── */}
      <Wave from={INK} to={CREAM} />

      {/* ── IQ ENGINE DEMO ──────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: CREAM }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 10, textAlign: 'center' }}>Your language</p>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
              Your numbers, translated.
            </h2>
            <p style={{ fontSize: 17, color: MUTED, textAlign: 'center', margin: '0 auto 36px', lineHeight: 1.65, maxWidth: 460 }}>
              Every label inside Bookwise speaks your profession's language, so you always know exactly where you stand.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
              {industries.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)} style={pill(industry === ind)}>
                  {ind.charAt(0).toUpperCase() + ind.slice(1)}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={industry}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                style={{ background: CARD, borderRadius: 16, boxShadow: '0 2px 20px rgba(0,0,0,0.07)', overflow: 'hidden' }}
              >
                {[
                  { label: labels.income,  value: '$1,320.00',        color: SAGE },
                  { label: labels.expense, value: '$150.00',           color: DANGER },
                  { label: labels.session, value: '4 today',           color: INK },
                  { label: labels.bucket,  value: '$132.00 set aside', color: GOLD },
                ].map((row, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <span style={{ fontSize: 16, color: INK }}>{row.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </FadeIn>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section style={{ background: CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: `${isMobile ? 52 : 72}px 24px` }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {isMobile ? (
            <div>
              {[
                { to: 3,   suffix: ' industries', label: 'Supported out of the box' },
                { to: 100, suffix: '%',            label: 'Mobile first, no desktop required' },
                { to: 1,   suffix: ' tap',         label: 'To export everything your CPA needs' },
              ].map((s, i, arr) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div style={{ textAlign: 'center', padding: '28px 0', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 44, fontWeight: 700, color: SAGE, lineHeight: 1 }}>
                      <AnimatedNumber to={s.to} suffix={s.suffix} />
                    </div>
                    <div style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>{s.label}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {[
                { to: 3,   suffix: ' industries', label: 'Supported out of the box' },
                { to: 100, suffix: '%',            label: 'Mobile first, no desktop required' },
                { to: 1,   suffix: ' tap',         label: 'To export everything your CPA needs' },
              ].map((s, i) => (
                <FadeIn key={i} delay={i * 0.12}>
                  <div style={{ textAlign: 'center', padding: '0 32px', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 52, fontWeight: 700, color: SAGE, lineHeight: 1, marginBottom: 10 }}>
                      <AnimatedNumber to={s.to} suffix={s.suffix} />
                    </div>
                    <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.45 }}>{s.label}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── PULL QUOTE ──────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? 72 : 104}px 24px`, background: CREAM }}>
        <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <div style={{ fontSize: 32, color: SAGE, fontFamily: '"Lora", Georgia, serif', lineHeight: 1, marginBottom: 20, opacity: 0.5 }}>"</div>
            <blockquote style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 24 : 34, fontWeight: 600, lineHeight: 1.42, color: INK, margin: 0, fontStyle: 'italic', letterSpacing: '-0.01em' }}>
              I used to avoid looking at my numbers. Now I check them every morning.
            </blockquote>
            <p style={{ fontSize: 14, color: MUTED, marginTop: 20, fontWeight: 500 }}>Massage therapist, 8 years in practice</p>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: SEC }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Built for the way you actually work.
            </h2>
            <p style={{ fontSize: 15, color: MUTED, textAlign: 'center', margin: '0 auto 44px', maxWidth: 380 }}>
              Tap any feature to see it inside the app.
            </p>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <motion.div
                  whileHover={{ scale: 1.015, boxShadow: '0 6px 28px rgba(44,53,40,0.10)' }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => setSelectedFeature(i)}
                  style={{ background: CARD, borderRadius: 16, display: 'flex', gap: 18, padding: '22px 24px', cursor: 'pointer', boxShadow: '0 1px 6px rgba(44,53,40,0.05)', transition: 'box-shadow 0.2s' }}
                >
                  <div style={{ ...iconBox }}>{f.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <h3 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 18, fontWeight: 700, color: INK, margin: 0 }}>{f.title}</h3>
                      <span style={{ fontSize: 11, fontWeight: 600, color: SAGE, flexShrink: 0, marginLeft: 8, background: 'rgba(124,154,126,0.10)', padding: '3px 9px', borderRadius: 99 }}>Preview</span>
                    </div>
                    <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>{f.body}</p>
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: CREAM }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 44px', letterSpacing: '-0.02em' }}>
              Made for practitioners, not accountants.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {WHO.map((w, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{ background: CARD, borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 1px 6px rgba(44,53,40,0.05)' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(124,154,126,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SAGE, margin: '0 auto 18px' }}>
                    {w.icon}
                  </div>
                  <h3 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 20, fontWeight: 700, color: INK, margin: '0 0 12px' }}>{w.title}</h3>
                  {w.lines.map((ln, j) => (
                    <p key={j} style={{ fontSize: 15, color: MUTED, margin: '4px 0', lineHeight: 1.5 }}>{ln}</p>
                  ))}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── ZEN BOOKKEEPER ──────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: SEC }}>
        <div style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <div style={{ ...iconBox, width: 52, height: 52, margin: '0 auto 22px' }}>
              <BookOpen size={24} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>Built by people who know your work</p>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 28 : 38, fontWeight: 700, color: INK, margin: '0 0 22px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              The Zen Bookkeeper.
            </h2>
            <p style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.75, color: MUTED, margin: '0 0 18px' }}>
              Bookwise was created by The Zen Bookkeeper, a boutique bookkeeping firm that has spent years helping wellness professionals get clear on their numbers. We have seen the same story over and over: skilled practitioners who are exceptional at their work and quietly overwhelmed by the financial side of running it.
            </p>
            <p style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.75, color: MUTED, margin: 0 }}>
              We built Bookwise because we wanted every practitioner to have what our best clients have: clarity, calm, and confidence in their numbers.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: CREAM }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 44px', letterSpacing: '-0.02em' }}>
              Good questions.
            </h2>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ACCORDION.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div style={{ background: CARD, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(44,53,40,0.05)' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600, color: INK }}>{item.q}</span>
                    <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, marginLeft: 16 }}>
                      <ChevronDown size={18} color={MUTED} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: 15, color: MUTED, padding: '0 24px 20px', margin: 0, lineHeight: 1.7 }}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAVE cream → dark ───────────────────────────────────────────── */}
      <Wave from={CREAM} to={INK} />

      {/* ── WAITLIST CTA (dark) ─────────────────────────────────────────── */}
      <section style={{ background: INK, padding: `${isMobile ? 72 : 104}px 24px` }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <div style={{ ...iconBox, background: 'rgba(124,154,126,0.15)', margin: '0 auto 24px', width: 52, height: 52 }}>
              <Zap size={24} color={SAGE} />
            </div>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 32 : 46, fontWeight: 700, color: CREAM, margin: '0 0 14px', lineHeight: 1.16, letterSpacing: '-0.02em' }}>
              Your practice deserves better than a notebook.
            </h2>
            <p style={{ fontSize: isMobile ? 16 : 18, color: 'rgba(245,242,236,0.65)', margin: '0 0 40px', lineHeight: 1.65 }}>
              Join the waitlist and be first in when we open. Founding members lock in their rate before we go public.
            </p>
            {submitted ? (
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'rgba(245,242,236,0.08)', border: `1px solid rgba(245,242,236,0.15)`, borderRadius: 14, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Check size={18} color={SAGE} />
                <span style={{ fontSize: 16, fontWeight: 600, color: CREAM }}>You are on the list. We will be in touch.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleWaitlist} style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  style={{ flex: 1, height: 54, padding: '0 20px', borderRadius: 12, border: '1.5px solid rgba(245,242,236,0.18)', background: 'rgba(245,242,236,0.07)', fontSize: 16, color: CREAM, outline: 'none' }}
                />
                <button type="submit" disabled={submitting}
                  style={{ height: 54, padding: '0 32px', borderRadius: 12, border: 'none', background: SAGE, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 16px rgba(124,154,126,0.4)' }}
                >
                  {submitting ? 'Joining...' : 'Join waitlist'}
                </button>
              </form>
            )}
            <p style={{ fontSize: 13, color: 'rgba(245,242,236,0.4)', marginTop: 18 }}>Free during early access. No credit card required.</p>
          </FadeIn>
        </div>
      </section>

      {/* ── WAVE dark → cream ───────────────────────────────────────────── */}
      <Wave from={INK} to={CREAM} />

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ padding: '36px 24px', background: CREAM, borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 16, fontWeight: 600, color: INK, marginBottom: 10 }}>Bookwise</p>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 4px', lineHeight: 1.6 }}>A product of The Zen Bookkeeper.</p>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 6px', lineHeight: 1.6 }}>Bookwise organizes your financial data. Sage shares observations, not advice. Always work with a licensed CPA before filing.</p>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>&copy; {new Date().getFullYear()} Bookwise. All rights reserved.</p>
      </footer>

      {/* ── FEATURE PREVIEW MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedFeature !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelectedFeature(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(44,53,40,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ background: CARD, borderRadius: 22, padding: isMobile ? 20 : 36, maxWidth: 560, width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 20 : 32, alignItems: isMobile ? 'center' : 'flex-start', position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
            >
              <button onClick={() => setSelectedFeature(null)} style={{ position: 'absolute', top: 16, right: 16, background: SEC, border: 'none', borderRadius: 99, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} color={MUTED} />
              </button>
              {FEATURE_SCREENS[selectedFeature]}
              <div style={{ flex: 1 }}>
                <div style={{ ...iconBox, marginBottom: 14 }}>{FEATURES[selectedFeature].icon}</div>
                <h3 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 22, fontWeight: 700, color: INK, margin: '0 0 12px' }}>{FEATURES[selectedFeature].title}</h3>
                <p style={{ fontSize: 16, color: MUTED, margin: '0 0 28px', lineHeight: 1.7 }}>{FEATURES[selectedFeature].body}</p>
                <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 22px', height: 46, borderRadius: 999, background: INK, color: CREAM, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                  Try it free <ArrowRight size={14} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
