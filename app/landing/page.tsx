'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Shield, Camera, MessageCircle, Download,
  ChevronDown, Check, ArrowRight, Folder, Sparkles, Activity,
  Leaf, Clock, BookOpen, X, RefreshCw, FileText, HardDrive, Zap, Bell,
} from 'lucide-react'
import toast from 'react-hot-toast'
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

// ─── grain overlay ────────────────────────────────────────────────────────────
function Grain() {
  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', opacity: 0.055,
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }} />
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
      <BucketRow label="Taxes"          amount="$460" pct={73} color={GOLD}    sub="25% of income" />
      <BucketRow label="Business Expenses"     amount="$196" pct={31} color="#4E6E52" sub="65% of income" />
      <BucketRow label="Growth Fund"   amount="$264" pct={42} color={SAGE}    sub="10% of income" />
      <BucketRow label="Owner Pay"     amount="$318" pct={58} color={DANGER}  sub="paid this month" />
      <div style={{ background: SAGE, borderRadius: 10, padding: '11px 14px', textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Make a Transfer</span>
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
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif', marginBottom: 2 }}>Taxes Set Aside</div>
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
        <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif' }}>Sage AI</div>
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
        <div style={{ fontSize: 10, fontWeight: 600, color: SAGE, marginBottom: 6 }}>Sage AI read your receipt</div>
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
  coach:      { income: 'Coaching Income',    expense: 'Certifications and Training', session: 'Coaching Sessions', bucket: 'Growth Fund' },
  trainer:    { income: 'Training Income',    expense: 'Certifications and CECs',     session: 'Training Sessions', bucket: 'Growth Fund' },
  bodyworker: { income: 'Appointment Income', expense: 'CE Credits and Training',     session: 'Appointments',      bucket: 'Growth Fund' },
}
type Industry = keyof typeof IQ_LABELS

const IQ_TRANSFORMS: Record<Industry, { generic: string; specific: string }[]> = {
  coach: [
    { generic: 'Revenue',              specific: 'Coaching Income' },
    { generic: 'Work sessions',        specific: 'Coaching Sessions' },
    { generic: 'Facility rent',        specific: 'Studio or Office Rent' },
    { generic: 'Continuing education', specific: 'Certifications and Training' },
    { generic: 'Daily hours',          specific: 'Coaching Hours' },
  ],
  trainer: [
    { generic: 'Revenue',              specific: 'Training Income' },
    { generic: 'Work sessions',        specific: 'Training Sessions' },
    { generic: 'Facility rent',        specific: 'Gym or Studio Fee' },
    { generic: 'Continuing education', specific: 'Certifications and CECs' },
    { generic: 'Daily hours',          specific: 'Floor Time' },
  ],
  bodyworker: [
    { generic: 'Revenue',              specific: 'Appointment Income' },
    { generic: 'Work sessions',        specific: 'Appointments' },
    { generic: 'Facility rent',        specific: 'Treatment Room Rent' },
    { generic: 'Continuing education', specific: 'CE Credits and Training' },
    { generic: 'Daily hours',          specific: 'Table Time' },
  ],
}

const ACCORDION = [
  { q: 'Is this real bookkeeping?',     a: 'Bookwise organizes your income and expenses with clarity. For tax filing, we always recommend working with a licensed CPA. We make their job easier and your bill smaller.' },
  { q: 'Do I need to know accounting?', a: 'Not at all. Every label in Bookwise is written in plain language for your profession. No spreadsheets. No jargon. Just your numbers.' },
  { q: 'What about my existing data?',  a: 'Connect your bank through Plaid. Import from Stripe if you take card payments. You can also add entries manually anytime.' },
  { q: 'Is my data safe?',              a: 'Your records are private and encrypted. Only you can see them. We never sell your data, ever.' },
  { q: 'What does it cost?',            a: 'Bookwise starts with a free 30-day trial. No credit card required. After that, the Practitioner plan is $19 per month and Practice Pro is $49 per month. Beta testers in our founding 50 receive Practice Pro free for life.' },
  { q: 'What is the beta program?',     a: 'We are opening Bookwise to 50 founding practitioners before we launch publicly. Beta testers get Practice Pro free for life, early access to new features, and a direct line to us as we build. We review every application and reach out within 5 business days.' },
]

const FEATURES = [
  { icon: <TrendingUp size={22} />, title: 'Money Buckets',    body: 'Every dollar you earn flows into Taxes Set Aside, Business Expenses, and Growth Fund automatically. You always know at a glance whether your practice is working for you.' },
  { icon: <Shield size={22} />,     title: 'Taxes Set Aside',  body: 'Based on your monthly income, Bookwise shows exactly how much to set aside using a 25% safety rate. You always know what to put away before each deadline.' },
  { icon: <MessageCircle size={22} />, title: 'Sage AI Insights', body: 'Sage AI reads your numbers each day and tells you what it sees. Income patterns. Changes in what you are spending. Observations in plain language.' },
  { icon: <Camera size={22} />,     title: 'Receipt Scanning', body: 'Snap a photo of any receipt. Sage AI reads the amount, date, and category and files it automatically into your Google Drive. You will never lose a receipt at tax time.' },
  { icon: <Folder size={22} />,     title: 'Google Drive Sync', body: 'Receipts and exports are automatically organized in a dedicated Google Drive folder. Your records are always backed up and ready for your CPA.' },
  { icon: <Download size={22} />,   title: 'CPA Export',       body: 'One tap generates a clean export organized by Schedule C line. Dated, categorized, and noted. Your CPA starts from it instead of starting over.' },
]

const STEPS = [
  {
    n: '01',
    icon: <Activity size={24} />,
    title: 'Log your day',
    body: 'Add a session, snap a receipt, or let Stripe and Plaid pull transactions in automatically. Takes sixty seconds.',
  },
  {
    n: '02',
    icon: <Sparkles size={24} />,
    title: 'Sage AI sorts everything',
    body: 'Your income flows into Taxes Set Aside, Business Expenses, and Growth Fund. Each bucket updates automatically so you always know where you stand.',
  },
  {
    n: '03',
    icon: <Download size={24} />,
    title: 'Hand it to your CPA',
    body: 'One tap generates a clean export organized by Schedule C line. Your CPA starts from it instead of starting over.',
  },
]

const WHO = [
  { icon: <Sparkles size={24} />, title: 'Coaches',     lines: ['Life coaches', 'Business coaches', 'Wellness coaches'],           value: 'Track packages, retainers, and sessions without a spreadsheet.' },
  { icon: <Activity size={24} />, title: 'Trainers',    lines: ['Personal trainers', 'Fitness instructors', 'Group fitness instructors'], value: 'See your most profitable sessions and track every gym-related expense.' },
  { icon: <Leaf size={24} />,     title: 'Bodyworkers', lines: ['Massage therapists', 'Acupuncturists', 'Somatic practitioners'],   value: 'Know your table income, supply costs, and take-home every month.' },
]

const PRACTITIONER_FEATURES = [
  'Money Buckets dashboard', 'Daily Pulse log', 'Sage AI daily insights',
  'Receipt scanning (30/month)', 'Stripe or Plaid import', 'CPA export (CSV)',
  'Google Drive sync', 'Tax deadline countdown',
]

const PRO_FEATURES = [
  'Everything in Practitioner', 'Ask Sage AI — direct AI questions',
  'Monthly Sage AI Report emailed to you', 'Unlimited receipt scanning',
  'Multiple bank connections', 'Multiple practice profiles',
  'Priority support', 'Unlimited transaction history',
]

// ─── page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const isMobile = useIsMobile()
  const supabase  = createClient()

  const [industry,         setIndustry]         = useState<Industry>('bodyworker')
  const [openFaq,          setOpenFaq]          = useState<number | null>(null)
  const [name,             setName]             = useState('')
  const [email,            setEmail]            = useState('')
  const [practiceType,     setPracticeType]     = useState('')
  const [challenge,        setChallenge]        = useState('')
  const [submitted,        setSubmitted]        = useState(false)
  const [submitting,       setSubmitting]       = useState(false)
  const [selectedFeature,  setSelectedFeature]  = useState<number | null>(null)

  useEffect(() => {
  }, [])

  useEffect(() => {
    document.body.style.overflow = selectedFeature !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedFeature])

  async function handleBetaApply(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !practiceType || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/beta-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, practice_type: practiceType, money_challenge: challenge }),
      })
      if (!res.ok) throw new Error('submission failed')
      setSubmitted(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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

  const fieldStyle: React.CSSProperties = {
    width: '100%', height: 54, padding: '0 20px', borderRadius: 12,
    border: '1.5px solid rgba(245,242,236,0.18)',
    background: 'rgba(245,242,236,0.07)',
    fontSize: 16, color: CREAM, outline: 'none',
    boxSizing: 'border-box' as const,
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
          <a href="/login" style={{ ...pill(true), display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontSize: 14 }}>Sign In</a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: isMobile ? 'auto' : '92vh',
        display: 'flex', alignItems: 'center',
        paddingTop: isMobile ? 110 : 0,
        paddingBottom: 0,
        background: `linear-gradient(160deg, #B8D1BC 0%, #C5D9C7 18%, #D9EAD9 36%, ${CREAM} 80%)`,
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
              A financial clarity app for coaches, trainers, and bodyworkers
            </motion.div>

            {/* headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 38 : 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: INK, margin: '0 0 10px' }}
            >
              Always know where your money goes.
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 38 : 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: INK, margin: '0 0 32px' }}
            >
              Never get surprised by your tax bill.
            </motion.h1>

            {/* subheadline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}
              style={{ fontSize: isMobile ? 17 : 18, lineHeight: 2, color: MUTED, margin: 0 }}
            >
              <p style={{ margin: 0 }}>Track every dollar in and out.</p>
              <p style={{ margin: 0 }}>See exactly what to save for taxes.</p>
              <p style={{ margin: 0 }}>Know what to pay yourself this month.</p>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.6 }}
              style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.5, color: INK, fontWeight: 600, margin: '8px 0 0' }}
            >
              Your money finally makes sense. Clear numbers, calm mind.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.6 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 40 }}
            >
              <a href="#beta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 32px', height: 54, borderRadius: 999, background: INK, color: CREAM, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(44,53,40,0.25)' }}>
                Apply for beta <ArrowRight size={16} />
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
              50 founding spots. Free 30-day trial. No credit card required.
            </motion.p>
          </motion.div>

          {/* MOBILE: app mockup below CTAs */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', justifyContent: 'center', marginTop: 40, filter: 'drop-shadow(0 24px 48px rgba(44,53,40,0.22))' }}
            >
              <PhoneFrame>
                <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif' }}>My Dash</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Hands and Heart Massage</div>
                  </div>
                  {/* Take-Home Pay card */}
                  <div style={{ background: CARD, borderRadius: 12, padding: '14px 14px 12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 4 }}>My Take-Home Pay</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif', lineHeight: 1 }}>$2,376</div>
                    <div style={{ fontSize: 9, color: MUTED, marginTop: 3, marginBottom: 8 }}>After Taxes Set Aside, expenses, and Growth Fund</div>
                    <div style={{ height: 5, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '68%', background: SAGE, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>68% of $3,500 goal</div>
                  </div>
                  <BucketRow label="Taxes Set Aside" amount="$460"  pct={73} color={GOLD}      sub="25%" />
                  <BucketRow label="Growth Fund"     amount="$264"  pct={42} color={SAGE}      sub="10%" />
                  <div style={{ background: SAGE, borderRadius: 10, padding: '11px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Make a Transfer</span>
                  </div>
                </div>
              </PhoneFrame>
            </motion.div>
          )}

          {/* RIGHT: app mockup (desktop only) */}
          {!isMobile && (
            <motion.div
              initial={{ opacity: 0, x: 40, y: 16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.5, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, transform: 'rotate(6deg)', filter: 'drop-shadow(0 32px 56px rgba(44,53,40,0.24))' }}
            >
              <PhoneFrame>
                <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: INK, fontFamily: '"Lora", Georgia, serif' }}>My Dash</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Hands and Heart Massage</div>
                  </div>
                  <BucketRow label="Taxes Set Aside" amount="$460" pct={73} color={GOLD}    sub="25%" />
                  <BucketRow label="Business Expenses"     amount="$196" pct={31} color="#4E6E52" sub="65%" />
                  <BucketRow label="Growth Fund"   amount="$264" pct={42} color={SAGE}    sub="10%" />
                  <div style={{ background: SAGE, borderRadius: 10, padding: '11px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Make a Transfer</span>
                  </div>
                  <div style={{ background: CARD, borderRadius: 10, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(124,154,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={12} color={SAGE} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: SAGE }}>Sage AI insight</span>
                    </div>
                    <p style={{ fontSize: 11, color: INK, lineHeight: 1.55, margin: 0 }}>
                      Income is up 18% from last month. Your overhead stayed flat.
                    </p>
                  </div>
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
            <p style={{ fontSize: isMobile ? 16 : 18, lineHeight: 1.75, color: 'rgba(245,242,236,0.7)', margin: '0 0 32px' }}>
              Most wellness practitioners spend more energy avoiding their numbers than understanding them. That avoidance has a quiet cost. Bookwise is a 60-second daily check-in, not a quarterly scramble. Log your sessions. See your income update. Know exactly what is set aside. When you know your numbers, your nervous system can relax.
            </p>

            {/* notification + sage loop */}
            <FadeIn delay={0.1}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 10 : 12,
                maxWidth: 560,
                margin: '0 auto 40px',
              }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(245,242,236,0.07)',
                  border: '1px solid rgba(245,242,236,0.12)',
                  borderRadius: 16,
                  padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Bell size={15} color={SAGE} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: CREAM, flex: 1 }}>Bookwise</span>
                    <span style={{ fontSize: 11, color: 'rgba(245,242,236,0.4)' }}>now</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(245,242,236,0.75)', lineHeight: 1.55, margin: 0 }}>
                    Your 5 PM check-in is ready. Sixty seconds and you&apos;re done. How did today go?
                  </p>
                </div>

                {!isMobile && (
                  <ArrowRight size={16} color='rgba(245,242,236,0.3)' style={{ flexShrink: 0 }} />
                )}

                <div style={{
                  flex: 1,
                  background: 'rgba(245,242,236,0.07)',
                  border: '1px solid rgba(245,242,236,0.12)',
                  borderRadius: 16,
                  padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <MessageCircle size={13} color={SAGE} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: SAGE }}>Sage AI insight</span>
                  </div>
                  <p style={{ fontSize: 13, color: CREAM, lineHeight: 1.55, margin: 0 }}>
                    Income up 12% this week. Your busiest Tuesday yet.
                  </p>
                </div>
              </div>
            </FadeIn>

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


      {/* ── STORIES ─────────────────────────────────────────────────────── */}
      <section style={{ background: CREAM, padding: `${isMobile ? 64 : 96}px 24px` }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 12, textAlign: 'center' }}>Sound familiar?</p>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Two stories we hear every year.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            <FadeIn delay={0.05}>
              <div style={{ background: CARD, borderRadius: 20, padding: isMobile ? 28 : 36, boxShadow: '0 2px 16px rgba(44,53,40,0.07)', height: '100%' }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 16, margin: '0 0 16px' }}>The March scramble.</p>
                <p style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 18 : 21, fontWeight: 600, color: INK, lineHeight: 1.5, margin: '0 0 18px' }}>
                  Receipts in the glovebox, a shoebox under the desk, and a stack of screenshots on your phone.
                </p>
                <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.75, margin: 0 }}>
                  You spend ten hours pulling a year's worth of records together before your CPA appointment. That's ten sessions you didn't take, plus whatever the CPA charges to sort through the pile. And the worst part: you did this last year too.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.12}>
              <div style={{ background: CARD, borderRadius: 20, padding: isMobile ? 28 : 36, boxShadow: '0 2px 16px rgba(44,53,40,0.07)', height: '100%' }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '0 0 16px' }}>The April surprise.</p>
                <p style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 18 : 21, fontWeight: 600, color: INK, lineHeight: 1.5, margin: '0 0 18px' }}>
                  Your biggest quarter ever. Then April arrives.
                </p>
                <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.75, margin: 0 }}>
                  You had no idea quarterly estimated payments were a thing, so you didn't make them. The IRS charges 8% annually on what you missed, and it accrues from the day you were supposed to pay. The money was there. You just didn't know to set it aside.
                </p>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.18}>
            <p style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 20 : 26, fontWeight: 600, color: INK, textAlign: 'center', margin: `${isMobile ? 40 : 56}px 0 0`, lineHeight: 1.4, fontStyle: 'italic' }}>
              Bookwise is the system that makes both of these disappear.
            </p>
          </FadeIn>
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
                  <p style={{ fontSize: 14, color: SAGE, margin: '16px 0 0', lineHeight: 1.55, fontWeight: 500 }}>{w.value}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: CREAM }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 12, textAlign: 'center' }}>How it works</p>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 56px', letterSpacing: '-0.02em' }}>
              Three steps to knowing your numbers.
            </h2>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 0 }}>
            {STEPS.map((step, i) => (
              <FadeIn key={i} delay={i * 0.14}>
                <div style={{
                  padding: isMobile ? '32px 0' : '0 40px',
                  borderLeft: !isMobile && i > 0 ? `1px solid ${BORDER}` : 'none',
                  borderTop: isMobile && i > 0 ? `1px solid ${BORDER}` : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 12, fontWeight: 700, color: SAGE, letterSpacing: '0.14em', marginBottom: 20 }}>{step.n}</div>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124,154,126,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SAGE, margin: '0 auto 22px' }}>
                    {step.icon}
                  </div>
                  <h3 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 20, fontWeight: 700, color: INK, margin: '0 0 12px' }}>{step.title}</h3>
                  <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.75 }}>{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
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
                  style={{ background: CARD, borderRadius: 16, display: 'flex', gap: 18, padding: '22px 24px', cursor: 'pointer', boxShadow: '0 1px 6px rgba(44,53,40,0.05)', transition: 'box-shadow 0.2s', height: '100%' }}
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

      {/* ── ZEN BOOKKEEPER ──────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: SEC }}>
        <div style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <div style={{ width: 380, height: 380, borderRadius: '50%', margin: '0 auto 32px', overflow: 'hidden', flexShrink: 0 }}>
              <img src="/IMG_0111.jpeg" alt="Founder of The Zen Bookkeeper" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '72% 50%', transform: 'scale(1.5)', transformOrigin: '65% 75%' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>The person behind the product</p>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 28 : 38, fontWeight: 700, color: INK, margin: '0 0 14px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              The Zen Bookkeeper.
            </h2>
            <p style={{ fontSize: isMobile ? 17 : 18, lineHeight: 1.6, color: INK, fontWeight: 600, margin: '0 0 20px' }}>
              Hi, I&apos;m Aya, founder and designer of the Bookwise app.
            </p>
            <p style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.75, color: MUTED, margin: '0 0 18px' }}>
              I have a master&apos;s degree in accounting and spent ten years doing corporate audits. The work was interesting, but it kept me far from the people I actually wanted to help.
            </p>
            <p style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.75, color: MUTED, margin: '0 0 18px' }}>
              The wellness professionals I worked with along the way changed my life. Coaches, trainers, bodyworkers. I wanted to give something back to them. So I left corporate and opened my own bookkeeping firm built specifically for this community.
            </p>
            <p style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.75, color: MUTED, margin: 0 }}>
              I built Bookwise because I wanted every practitioner to have their own tool. Something that makes the numbers feel manageable and puts you back in control of your business.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? 64 : 96}px 24px`, background: CREAM }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 44px', letterSpacing: '-0.02em' }}>
              Questions.
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


      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ background: SEC, padding: `${isMobile ? 64 : 96}px 24px` }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 12, textAlign: 'center' }}>Pricing</p>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 30 : 44, fontWeight: 700, color: INK, textAlign: 'center', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
              Simple, honest pricing.
            </h2>
            <p style={{ fontSize: 16, color: MUTED, textAlign: 'center', margin: '0 auto 52px', maxWidth: 400, lineHeight: 1.65 }}>
              Start with a free 30-day trial. No credit card required.
            </p>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            {/* Practitioner */}
            <FadeIn delay={0.05}>
              <div style={{ background: CARD, borderRadius: 20, padding: isMobile ? 28 : 36, boxShadow: '0 2px 12px rgba(44,53,40,0.07)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, margin: '0 0 8px', letterSpacing: '0.04em' }}>Practitioner</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 48, fontWeight: 700, color: INK, lineHeight: 1 }}>$19</span>
                  <span style={{ fontSize: 15, color: MUTED }}>/month</span>
                </div>
                <p style={{ fontSize: 14, color: MUTED, margin: '0 0 28px', lineHeight: 1.55 }}>Everything you need to stay on top of your money, every day.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {PRACTITIONER_FEATURES.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check size={15} color={SAGE} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 15, color: INK }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href="#beta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: 12, background: SEC, color: INK, fontSize: 15, fontWeight: 700, textDecoration: 'none', border: `1.5px solid ${BORDER}` }}>
                  Apply for beta
                </a>
              </div>
            </FadeIn>
            {/* Practice Pro */}
            <FadeIn delay={0.1}>
              <div style={{ background: INK, borderRadius: 20, padding: isMobile ? 28 : 36, boxShadow: '0 8px 40px rgba(44,53,40,0.22)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 20, right: 20, background: SAGE, borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#fff' }}>Most popular</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,242,236,0.6)', margin: '0 0 8px', letterSpacing: '0.04em' }}>Practice Pro</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 48, fontWeight: 700, color: CREAM, lineHeight: 1 }}>$49</span>
                  <span style={{ fontSize: 15, color: 'rgba(245,242,236,0.5)' }}>/month</span>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(245,242,236,0.6)', margin: '0 0 28px', lineHeight: 1.55 }}>Ask Sage AI anything. Get your numbers delivered monthly. Run your whole practice.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {PRO_FEATURES.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check size={15} color={SAGE} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 15, color: CREAM }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href="#beta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: 12, background: SAGE, color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(124,154,126,0.4)' }}>
                  Apply for beta <ArrowRight size={14} />
                </a>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.15}>
            <p style={{ textAlign: 'center', fontSize: 14, color: MUTED, marginTop: 28, lineHeight: 1.6 }}>
              Beta testers in our founding 50 receive Practice Pro free for life.
            </p>
          </FadeIn>
        </div>
      </section>


      {/* ── BETA APPLICATION (dark) ──────────────────────────────────────── */}
      <section id="beta" style={{ background: INK, padding: `${isMobile ? 72 : 104}px 24px` }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ ...iconBox, background: 'rgba(124,154,126,0.15)', margin: '0 auto 24px', width: 52, height: 52 }}>
              <Zap size={24} color={SAGE} />
            </div>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: isMobile ? 32 : 46, fontWeight: 700, color: CREAM, margin: '0 0 14px', lineHeight: 1.16, letterSpacing: '-0.02em', textAlign: 'center' }}>
              50 founding spots.
            </h2>
            <p style={{ fontSize: isMobile ? 16 : 18, color: 'rgba(245,242,236,0.65)', margin: '0 0 40px', lineHeight: 1.65, textAlign: 'center' }}>
              Beta testers get Practice Pro free for life, early access to every new feature, and a direct line to us as we build. We review every application and reach out within 5 business days.
            </p>

            {submitted ? (
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'rgba(245,242,236,0.08)', border: `1px solid rgba(245,242,236,0.15)`, borderRadius: 14, padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
                <Check size={24} color={SAGE} />
                <p style={{ fontSize: 18, fontWeight: 600, color: CREAM, margin: 0 }}>Application received.</p>
                <p style={{ fontSize: 15, color: 'rgba(245,242,236,0.6)', margin: 0, lineHeight: 1.6 }}>We will review it and be in touch within 5 business days.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleBetaApply} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  style={fieldStyle}
                />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Your email" required
                  style={fieldStyle}
                />
                <select
                  value={practiceType} onChange={e => setPracticeType(e.target.value)} required
                  style={{ ...fieldStyle, appearance: 'none' as const, color: practiceType ? CREAM : 'rgba(245,242,236,0.4)' }}
                >
                  <option value="" disabled>What kind of practitioner are you?</option>
                  <option value="life_coach" style={{ color: INK, background: CREAM }}>Life coach</option>
                  <option value="business_coach" style={{ color: INK, background: CREAM }}>Business coach</option>
                  <option value="wellness_coach" style={{ color: INK, background: CREAM }}>Wellness coach</option>
                  <option value="personal_trainer" style={{ color: INK, background: CREAM }}>Personal trainer</option>
                  <option value="fitness_instructor" style={{ color: INK, background: CREAM }}>Fitness instructor</option>
                  <option value="massage_therapist" style={{ color: INK, background: CREAM }}>Massage therapist</option>
                  <option value="acupuncturist" style={{ color: INK, background: CREAM }}>Acupuncturist</option>
                  <option value="somatic_practitioner" style={{ color: INK, background: CREAM }}>Somatic practitioner</option>
                  <option value="other" style={{ color: INK, background: CREAM }}>Other wellness practitioner</option>
                </select>
                <input
                  type="text" value={challenge} onChange={e => setChallenge(e.target.value)}
                  placeholder="What's your biggest money headache right now? (optional)"
                  style={fieldStyle}
                />
                <button type="submit" disabled={submitting}
                  style={{ height: 54, borderRadius: 12, border: 'none', background: SAGE, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 16px rgba(124,154,126,0.4)', marginTop: 4 }}
                >
                  {submitting ? 'Submitting...' : 'Apply for a founding spot'}
                </button>
              </form>
            )}

            <p style={{ fontSize: 13, color: 'rgba(245,242,236,0.4)', marginTop: 18, textAlign: 'center' }}>Free 30-day trial. No credit card required.</p>
          </FadeIn>
        </div>
      </section>


      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ padding: '40px 24px', background: CREAM, borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 16, fontWeight: 600, color: INK, marginBottom: 10 }}>Bookwise</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'Apply for beta', href: '#beta' },
            { label: 'Sign in', href: '/login' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>{l.label}</a>
          ))}
        </div>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 4px', lineHeight: 1.6 }}>A product of The Zen Bookkeeper.</p>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 6px', lineHeight: 1.6 }}>Bookwise organizes your financial data. Sage AI shares observations, not advice. Always work with a licensed CPA before filing.</p>
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
                <a href="#beta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 22px', height: 46, borderRadius: 999, background: INK, color: CREAM, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                  Apply for beta <ArrowRight size={14} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
