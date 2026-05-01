'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { usePersistentState } from '@/lib/hooks'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { BottomNav } from '@/components/ui/BottomNav'
import { Camera, X, RefreshCw, FolderOpen, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Transaction, Service } from '@/lib/supabase'

const INCOME_CATS = [
  'Session Income', 'Package Income', 'Retainer Income', 'Tip Income', 'Other Income',
]
const EXPENSE_CATS = [
  'Supplies', 'Equipment', 'Software', 'Rent', 'Facility Fee', 'Insurance',
  'Continuing Education', 'Marketing', 'Mileage', 'Meals', 'Professional Services',
  'Utilities', 'Phone', 'Internet', 'Other Expense',
]

const supabase = createClient()
const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7)

function buildMonthChips(): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = []
  const now = new Date()
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    chips.push({ label, value })
  }
  return chips
}

const MONTH_CHIPS = buildMonthChips()

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--color-muted-foreground)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const fieldInput: React.CSSProperties = {
  width: '100%', minHeight: 48, padding: '12px 14px', fontSize: 16,
  borderRadius: 8, border: '1.5px solid var(--color-border)',
  background: 'var(--color-card)', color: 'var(--color-foreground)',
  outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
}

const filterBarStyle: React.CSSProperties = {
  maxWidth: 480, margin: '0 auto', padding: '0 20px 10px',
  display: 'flex', flexDirection: 'column', gap: 8,
  background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)',
}

const totalColStyle: React.CSSProperties = { flex: 1, padding: '8px 0', textAlign: 'center' }

const totalLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: 'var(--color-muted-foreground)', marginBottom: 2,
}

const totalValueStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SourceBadge({ source }: { source: string }) {
  const label = source === 'stripe' ? 'Stripe' : source === 'plaid' ? 'Plaid' : 'Manual'
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 999,
      background: 'var(--color-muted)',
      color: 'var(--color-muted-foreground)',
      letterSpacing: '0.03em',
    }}>
      {label}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div className="skeleton" style={{ width: 36, height: 14 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '55%', height: 14, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '30%', height: 12 }} />
      </div>
      <div className="skeleton" style={{ width: 56, height: 16 }} />
    </div>
  )
}

export default function LedgerPage() {
  const { t, setIndustry } = useIQ()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState(false)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [txDate, setTxDate] = useState(today)
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  const [txCategory, setTxCategory] = useState('Session Income')
  const [txAmount, setTxAmount] = useState('')
  const [txNotes, setTxNotes] = useState('')
  const [txPersonal, setTxPersonal] = useState(false)
  const [saving, setSaving] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptThumbUrl, setReceiptThumbUrl] = useState<string | null>(null)
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)

  const rowFileRef = useRef<HTMLInputElement>(null)
  const [rowReceiptTarget, setRowReceiptTarget] = useState<string | null>(null)
  const [rowOcrLoading, setRowOcrLoading] = useState<string | null>(null)
  const [hoveredReceiptId, setHoveredReceiptId] = useState<string | null>(null)

  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [personalHintDismissed, setPersonalHintDismissed] = useState(true)
  const [practiceName, setPracticeName] = useState<string | null>(null)
  const [profileIndustry, setProfileIndustry] = useState<string | null>(null)
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null)
  const [ledgerInsight, setLedgerInsight] = useState<string | null>(null)
  const [loadingLedgerInsight, setLoadingLedgerInsight] = useState(false)

  const [savedSearch, setSavedSearch] = usePersistentState('ledger.search', '')
  const [savedCategoryFilter, setSavedCategoryFilter] = usePersistentState<string[]>('ledger.categoryFilter', [])
  const [savedMonthFilter, setSavedMonthFilter] = usePersistentState('ledger.monthFilter', currentMonth)
  const [isReset, setIsReset] = useState(false)

  const search = isReset ? '' : savedSearch
  const categoryFilter: string[] = isReset ? [] : savedCategoryFilter
  const monthFilter = isReset ? currentMonth : savedMonthFilter

  const setSearch = (val: string) => { setSavedSearch(val); setIsReset(false) }
  const setCategoryFilter = (val: string[]) => { setSavedCategoryFilter(val); setIsReset(false) }
  const setMonthFilter = (val: string) => { setSavedMonthFilter(val); setIsReset(false) }
  const handleResetFilters = () => setIsReset(true)
  const hasActiveFilters = search !== '' || categoryFilter.length > 0 || monthFilter !== currentMonth

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  const filtered = useMemo(() => transactions.filter((tx) => {
    if (categoryFilter.length > 0 && !categoryFilter.includes(tx.category_key)) return false
    if (monthFilter !== 'all' && !tx.date.startsWith(monthFilter)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!t(tx.category_key).toLowerCase().includes(q) && !(tx.notes ?? '').toLowerCase().includes(q)) return false
    }
    return true
  }), [transactions, categoryFilter, monthFilter, search, t])

  const businessFiltered = filtered.filter((tx) => !tx.is_personal)
  const totalIncome = businessFiltered.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
  const totalExpenses = businessFiltered.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
  const netTotal = totalIncome - totalExpenses
  const expenseCount = businessFiltered.filter(tx => tx.type === 'expense').length
  const receiptedCount = businessFiltered.filter(tx => tx.type === 'expense' && tx.receipt_url).length

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const [{ data: profile }, { data, error: err }, { data: svcData }] = await Promise.all([
          supabase.from('profiles').select('industry, practice_name, google_drive_folder_id').eq('id', user.id).single(),
          supabase.from('transactions').select('*').eq('user_id', user.id)
            .order('date', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('services').select('*').eq('user_id', user.id).eq('is_active', true),
        ])

        if (profile?.industry) { setIndustry(profile.industry); setProfileIndustry(profile.industry) }
        if (profile?.practice_name) setPracticeName(profile.practice_name)
        if (profile?.google_drive_folder_id) setDriveFolderId(profile.google_drive_folder_id)
        if (err) throw err
        setTransactions(data ?? [])
        setServices(svcData ?? [])
        setPersonalHintDismissed(!!localStorage.getItem('ledger_personal_hint_seen'))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function loadLedgerInsight(txList: typeof transactions, month: string, industry: string, name: string) {
    if (!txList.length) return
    setLoadingLedgerInsight(true)
    setLedgerInsight(null)
    const business = txList.filter(tx => !tx.is_personal && tx.date.startsWith(month))
    const expenseMap = new Map<string, number>()
    business.filter(tx => tx.type === 'expense').forEach(tx => {
      expenseMap.set(tx.category_key, (expenseMap.get(tx.category_key) ?? 0) + tx.amount)
    })
    const topExpenses = Array.from(expenseMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, total]) => ({ category: t(category), total }))
    const totalIncome = business.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
    const totalExpenses = business.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
    try {
      const res = await fetch('/api/sage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ledger_insight',
          context: {
            industry,
            practiceName: name,
            period: month,
            totalIncome,
            totalExpenses,
            topExpenses,
            transactionCount: business.length,
          },
        }),
      })
      if (!res.ok) throw new Error('unavailable')
      const data = await res.json()
      setLedgerInsight(data.insight ?? null)
    } catch {
      setLedgerInsight(null)
    } finally {
      setLoadingLedgerInsight(false)
    }
  }

  useEffect(() => {
    if (!loading && transactions.length > 0 && profileIndustry && practiceName !== null) {
      loadLedgerInsight(transactions, monthFilter, profileIndustry, practiceName)
    }
  }, [loading, monthFilter, profileIndustry])

  function openSheet() {
    setTxDate(today)
    setTxType('income')
    setTxCategory('Session Income')
    setTxAmount('')
    setTxNotes('')
    setTxPersonal(false)
    setReceiptUrl(null)
    setReceiptThumbUrl(null)
    setReceiptFileName(null)
    setSelectedServiceId(null)
    setSheetOpen(true)
  }

  function openEdit(tx: Transaction) {
    setTxDate(tx.date)
    setTxType(tx.type as 'income' | 'expense')
    setTxCategory(tx.category_key)
    setTxAmount(String(tx.amount))
    setTxNotes(tx.notes ?? '')
    setTxPersonal(tx.is_personal)
    setEditingTx(tx)
    setExpandedTxId(null)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSelectedServiceId(null)
    setEditingTx(null)
    setSheetOpen(false)
  }

  async function handleDelete(txId: string) {
    if (!userId) return
    try {
      await supabase.from('transactions').delete().eq('id', txId).eq('user_id', userId)
      setTransactions((prev) => prev.filter((t) => t.id !== txId))
      setExpandedTxId(null)
      toast.success('Entry deleted.')
    } catch {
      toast.error('Could not delete. Try again.')
    }
  }

  async function handleSave() {
    if (!userId) return
    const amount = parseFloat(txAmount)
    if (!txAmount || isNaN(amount) || amount <= 0) {
      toast.error('Enter an amount.')
      return
    }
    setSaving(true)
    try {
      if (editingTx) {
        const { error: err } = await supabase
          .from('transactions')
          .update({ date: txDate, amount, type: txType, category_key: txCategory, notes: txNotes || null, is_personal: txPersonal })
          .eq('id', editingTx.id)
        if (err) throw err
        setTransactions((prev) => prev.map((t) => t.id === editingTx.id ? { ...t, date: txDate, amount, type: txType, category_key: txCategory, notes: txNotes || null, is_personal: txPersonal } : t))
        closeSheet()
        toast.success('Entry updated.')
      } else {
        const { data, error: err } = await supabase
          .from('transactions')
          .insert({ user_id: userId, date: txDate, amount, type: txType, category_key: txCategory, notes: txNotes || null, is_personal: txPersonal, source: 'manual', receipt_url: receiptUrl, receipt_filename: receiptFileName, pulse_matched: false, service_id: selectedServiceId })
          .select()
          .single()
        if (err) throw err
        setTransactions((prev) => [data, ...prev])
        closeSheet()
        toast.success('Entry saved.')
      }
    } catch {
      toast.error('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePersonal(tx: Transaction) {
    const next = !tx.is_personal
    setTransactions((prev) => prev.map((t) => t.id === tx.id ? { ...t, is_personal: next } : t))
    await supabase.from('transactions').update({ is_personal: next }).eq('id', tx.id)
  }

  async function handleReceiptCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('txDate', txDate)
      fd.append('category', txCategory)

      const driveRes = await fetch('/api/drive/upload', { method: 'POST', body: fd })
      if (!driveRes.ok) throw new Error('Drive upload failed')
      const { viewUrl, thumbnailUrl, fileName } = await driveRes.json()

      setReceiptUrl(viewUrl)
      setReceiptThumbUrl(thumbnailUrl)
      setReceiptFileName(fileName)

      const ocrRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: thumbnailUrl }),
      })
      const ocr = await ocrRes.json()
      if (ocr.amount && ocr.amount > 0) setTxAmount(String(ocr.amount))
      if (ocr.date && /^\d{4}-\d{2}-\d{2}$/.test(ocr.date)) setTxDate(ocr.date)
      if (ocr.vendor) setTxNotes(ocr.vendor)
      toast.success('Receipt scanned.')
    } catch {
      toast.error('Could not read receipt. Fill in manually.')
    } finally {
      setOcrLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRowReceiptCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId || !rowReceiptTarget) return
    const txId = rowReceiptTarget
    setRowOcrLoading(txId)
    try {
      const tx = transactions.find(t => t.id === txId)
      if (!tx) return

      const fd = new FormData()
      fd.append('file', file)
      fd.append('txDate', tx.date)
      fd.append('category', tx.category_key)

      const driveRes = await fetch('/api/drive/upload', { method: 'POST', body: fd })
      if (!driveRes.ok) throw new Error('Drive upload failed')
      const { viewUrl, thumbnailUrl, fileName } = await driveRes.json()

      const [ocrRes] = await Promise.all([
        fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: thumbnailUrl }),
        }),
        supabase.from('transactions').update({ receipt_url: viewUrl, receipt_filename: fileName }).eq('id', txId),
      ])

      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, receipt_url: viewUrl, receipt_filename: fileName } : t))

      const ocr = await ocrRes.json()
      if (ocr.vendor && !tx.notes) {
        await supabase.from('transactions').update({ notes: ocr.vendor }).eq('id', txId)
        setTransactions(prev => prev.map(t => t.id === txId ? { ...t, notes: ocr.vendor } : t))
      }
      toast.success('Receipt saved.')
    } catch {
      toast.error('Could not read receipt. Fill in manually.')
    } finally {
      setRowOcrLoading(null)
      setRowReceiptTarget(null)
      if (rowFileRef.current) rowFileRef.current.value = ''
    }
  }

  const categories = txType === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '56px 20px 16px',
        maxWidth: 480,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 2 }}>
            Ledger
          </h1>
          {driveFolderId && (
            <a
              href={`https://drive.google.com/drive/folders/${driveFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              <FolderOpen size={14} />
              Receipts
            </a>
          )}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)' }}>
          {transactions.length > 0
            ? filtered.length < transactions.length
              ? `${filtered.length} of ${transactions.length} entries`
              : `${transactions.length} entr${transactions.length === 1 ? 'y' : 'ies'}`
            : 'Every dollar in, every dollar out.'}
        </p>
      </div>

      {/* Filter bar */}
      {!loading && !error && (
        <div style={filterBarStyle}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--color-muted-foreground)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries..."
              style={{ width: '100%', height: 36, borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', padding: '0 10px 0 30px', fontSize: 13, color: 'var(--color-foreground)', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCategoryPicker((v) => !v)}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1.5px solid ${categoryFilter.length > 0 ? 'var(--color-primary)' : 'var(--color-border)'}`, background: categoryFilter.length > 0 ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-card))' : 'var(--color-card)', color: categoryFilter.length > 0 ? 'var(--color-primary)' : 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', width: '100%', textAlign: 'left' }}
            >
              {categoryFilter.length > 0 ? `${categoryFilter.length} ${categoryFilter.length === 1 ? 'category' : 'categories'} selected` : 'Filter by category'}
            </button>
            {showCategoryPicker && (
              <>
                <div onClick={() => setShowCategoryPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: 'var(--color-card)', border: '1.5px solid var(--color-border)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxHeight: 300, overflowY: 'auto' }}>
                  {[{ label: 'Income', cats: INCOME_CATS }, { label: 'Expenses', cats: EXPENSE_CATS }].map(({ label, cats }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--color-muted-foreground)', padding: '10px 14px 4px' }}>{label}</div>
                      {cats.map((cat) => {
                        const sel = categoryFilter.includes(cat)
                        return (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(sel ? categoryFilter.filter((c) => c !== cat) : [...categoryFilter, cat])}
                            style={{ width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', background: sel ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-card))' : 'transparent', color: sel ? 'var(--color-primary)' : 'var(--color-foreground)', fontSize: 13, fontWeight: sel ? 600 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}`, background: sel ? 'var(--color-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'white', fontWeight: 700 }}>{sel ? '✓' : ''}</span>
                            {t(cat)}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {MONTH_CHIPS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setMonthFilter(value)}
                style={{ height: 28, padding: '0 10px', borderRadius: 999, border: '1.5px solid var(--color-border)', background: monthFilter === value ? 'var(--color-ink)' : 'var(--color-card)', color: monthFilter === value ? 'var(--color-card)' : 'var(--color-muted-foreground)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0, fontFamily: 'var(--font-sans)' }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setMonthFilter('all')}
              style={{ height: 28, padding: '0 10px', borderRadius: 999, border: '1.5px solid var(--color-border)', background: monthFilter === 'all' ? 'var(--color-ink)' : 'var(--color-card)', color: monthFilter === 'all' ? 'var(--color-card)' : 'var(--color-muted-foreground)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0, fontFamily: 'var(--font-sans)' }}
            >
              All time
            </button>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0 }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Totals strip */}
      {!loading && !error && transactions.length > 0 && (
        <div style={{ display: 'flex', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', maxWidth: 480, margin: '0 auto' }}>
          <div style={totalColStyle}><div style={totalLabelStyle}>Income</div><div style={{ ...totalValueStyle, color: 'var(--color-profit)' }}>+${totalIncome.toFixed(2)}</div></div>
          <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
          <div style={totalColStyle}><div style={totalLabelStyle}>Expenses</div><div style={{ ...totalValueStyle, color: 'var(--color-danger)' }}>-${totalExpenses.toFixed(2)}</div></div>
          <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
          <div style={totalColStyle}><div style={totalLabelStyle}>Net</div><div style={{ ...totalValueStyle, color: 'var(--color-ink)' }}>${netTotal.toFixed(2)}</div></div>
        </div>
      )}

      {/* Receipt progress */}
      {expenseCount > 0 && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 20px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${expenseCount > 0 ? Math.round(receiptedCount / expenseCount * 100) : 0}%`,
                background: receiptedCount === expenseCount ? 'var(--color-primary)' : 'var(--color-accent)',
                borderRadius: 3,
                transition: 'width 0.3s',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: receiptedCount === expenseCount ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}>
              {receiptedCount === expenseCount ? 'All receipts attached' : `${receiptedCount}/${expenseCount} receipts`}
            </span>
          </div>
        </div>
      )}

      {/* Personal toggle hint */}
      {!personalHintDismissed && transactions.length > 0 && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-muted)', borderRadius: 8, padding: '8px 12px', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', margin: 0, lineHeight: 1.5 }}>
              Mark a transaction as personal and it won't count toward your funds or tax set-aside.
            </p>
            <button
              onClick={() => {
                localStorage.setItem('ledger_personal_hint_seen', '1')
                setPersonalHintDismissed(true)
              }}
              style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--color-muted-foreground)', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-muted-foreground)' }}>
            <p style={{ marginBottom: 12 }}>Could not load your data. Pull to refresh.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)' }}
            >
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>
              No entries yet.
            </p>
            <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', marginBottom: 24 }}>
              Add your first one below.
            </p>
            <button
              onClick={openSheet}
              style={{
                padding: '12px 28px',
                background: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
                borderRadius: 10,
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Add your first entry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>No entries match your filters.</p>
            <button
              onClick={() => { setSearch(''); setCategoryFilter([]); setMonthFilter(currentMonth) }}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((tx) => {
            const isExpanded = expandedTxId === tx.id
            const isManual = tx.source === 'manual'
            const chipStyle: React.CSSProperties = { height: 28, padding: '0 12px', borderRadius: 999, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }
            return (
              <div key={tx.id}>
                <div
                  onClick={() => setExpandedTxId((prev) => prev === tx.id ? null : tx.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', background: isExpanded ? 'color-mix(in srgb, var(--color-primary) 4%, var(--color-card))' : 'transparent' }}
                >
                  {/* date */}
                  <div style={{ minWidth: 40, fontSize: 13, color: 'var(--color-muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(tx.date)}
                  </div>

                  {/* middle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t(tx.category_key)}
                      </span>
                      {tx.date === today && !tx.pulse_matched && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toast("Today's Pulse is waiting.", { icon: undefined }) }}
                          style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', flexShrink: 0, display: 'inline-block', border: 'none', padding: 0, cursor: 'pointer' }}
                        />
                      )}
                    </div>
                    {tx.notes && (
                      <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {tx.notes}
                      </div>
                    )}
                  </div>

                  {/* amount */}
                  <div style={{ fontSize: 16, fontWeight: 600, color: tx.type === 'income' ? 'var(--color-profit)' : 'var(--color-muted-foreground)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', opacity: tx.is_personal ? 0.45 : 1 }}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </div>

                  {/* receipt icon */}
                  {tx.receipt_url ? (
                    <div
                      style={{ position: 'relative', flexShrink: 0 }}
                      onMouseEnter={() => setHoveredReceiptId(tx.id)}
                      onMouseLeave={() => setHoveredReceiptId(null)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(tx.receipt_url!, '_blank', 'noopener,noreferrer') }}
                        title="Open receipt"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}
                      >
                        <Receipt size={14} />
                      </button>
                      {hoveredReceiptId === tx.id && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 50, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', pointerEvents: 'none' }}>
                          <img src={tx.receipt_url} alt="Receipt preview" style={{ width: 160, height: 'auto', borderRadius: 4, display: 'block' }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRowReceiptTarget(tx.id); rowFileRef.current?.click() }}
                      title="Attach receipt"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-muted-foreground)', flexShrink: 0, display: 'flex', alignItems: 'center', position: 'relative', opacity: rowOcrLoading === tx.id ? 0.4 : 1 }}
                    >
                      {rowOcrLoading === tx.id ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                      {tx.type === 'expense' && (
                        <span style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-danger)', border: '1.5px solid var(--color-background)' }} />
                      )}
                    </button>
                  )}
                </div>

                {/* expanded action row */}
                {isExpanded && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 12px 52px', borderBottom: '1px solid var(--color-border)', background: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-card))', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-muted-foreground)', marginRight: 2 }}>
                      {tx.source === 'plaid' ? 'Plaid' : tx.source === 'stripe' ? 'Stripe' : 'Manual'}
                    </span>
                    {isManual && (
                      <button onClick={(e) => { e.stopPropagation(); openEdit(tx) }} style={chipStyle}>Edit</button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePersonal(tx) }}
                      style={{ ...chipStyle, ...(tx.is_personal ? { background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-card))', borderColor: 'var(--color-accent)', color: 'var(--color-ink)' } : {}) }}
                    >
                      {tx.is_personal ? 'Personal ✓' : 'Personal'}
                    </button>
                    {isManual ? (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(tx.id) }} style={{ ...chipStyle, borderColor: 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))', color: 'var(--color-danger)' }}>Delete</button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', fontStyle: 'italic' }}>Read-only</span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Sage AI Analysis */}
      {!loading && transactions.length > 0 && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 100px' }}>
          <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: '20px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
                Sage AI Analysis
              </p>
              <button
                onClick={() => profileIndustry && practiceName !== null && loadLedgerInsight(transactions, monthFilter, profileIndustry, practiceName)}
                disabled={loadingLedgerInsight}
                aria-label="Regenerate analysis"
                style={{ background: 'none', border: 'none', color: 'var(--color-muted-foreground)', cursor: loadingLedgerInsight ? 'not-allowed' : 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={14} style={{ opacity: loadingLedgerInsight ? 0.4 : 1 }} />
              </button>
            </div>
            {loadingLedgerInsight ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 14 }} />
                <div className="skeleton" style={{ height: 14, width: '80%' }} />
              </div>
            ) : ledgerInsight ? (
              <p className="font-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--color-ink)', lineHeight: 1.65, margin: 0, paddingLeft: 12, borderLeft: '2px solid var(--color-primary)' }}>
                {ledgerInsight}
              </p>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', margin: 0 }}>
                Sage AI is thinking. Try again in a moment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating + button */}
      {!sheetOpen && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 40 }}>
          <button
            onClick={openSheet}
            style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 28, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.22)' }}
          >
            +
          </button>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-sans)', letterSpacing: '0.03em' }}>
            Add Entry
          </span>
        </div>
      )}

      {/* Sheet backdrop */}
      {sheetOpen && (
        <div
          onClick={closeSheet}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 50,
          }}
        />
      )}

      {/* Add Transaction Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New transaction"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${sheetOpen ? '0' : '100%'})`,
          width: '100%',
          maxWidth: 480,
          background: 'var(--color-card)',
          borderRadius: '20px 20px 0 0',
          zIndex: 60,
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '92vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Sheet header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <h2 className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-ink)' }}>
            {editingTx ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button
            onClick={closeSheet}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-muted-foreground)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Type toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['income', 'expense'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setTxType(type)
                  setTxCategory(type === 'income' ? 'Session Income' : 'Supplies')
                }}
                style={{
                  minHeight: 48,
                  borderRadius: 10,
                  border: `1.5px solid ${txType === type ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: txType === type ? 'var(--color-primary)' : 'var(--color-card)',
                  color: txType === type ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Date */}
          <div>
            <label style={fieldLabel}>Date</label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              style={fieldInput}
            />
          </div>

          {/* Service chips (income only) */}
          {txType === 'income' && services.length > 0 && (() => {
            const bookingCounts = transactions.reduce<Record<string, number>>((acc, tx) => {
              if (tx.service_id) acc[tx.service_id] = (acc[tx.service_id] ?? 0) + 1
              return acc
            }, {})
            const sorted = [...services].sort((a, b) => {
              const diff = (bookingCounts[b.id] ?? 0) - (bookingCounts[a.id] ?? 0)
              return diff !== 0 ? diff : a.name.localeCompare(b.name)
            })
            return (
              <div>
                <label style={fieldLabel}>Your Services</label>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {sorted.map((svc) => {
                    const count = bookingCounts[svc.id] ?? 0
                    const selected = selectedServiceId === svc.id
                    return (
                      <button
                        key={svc.id}
                        onClick={() => {
                          setSelectedServiceId(selected ? null : svc.id)
                          if (!selected) {
                            setTxAmount(String(svc.price))
                            setTxNotes(svc.name)
                            setTxCategory('Session Income')
                          }
                        }}
                        style={{
                          flexShrink: 0,
                          minHeight: 40,
                          padding: '0 14px',
                          borderRadius: 999,
                          border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: selected ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-card)',
                          color: 'var(--color-foreground)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {svc.name} · ${svc.price}{count > 0 ? ` · ${count}x` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Category */}
          <div>
            <label style={fieldLabel}>Category</label>
            <select
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              style={fieldInput}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{t(cat)}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={fieldLabel}>Amount</label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'none',
                  border: `1.5px solid var(--color-border)`,
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-muted-foreground)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {ocrLoading ? <RefreshCw size={13} className="animate-spin" /> : <Camera size={13} />}
                {ocrLoading ? 'Scanning...' : 'Scan Receipt'}
              </button>
            </div>
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleReceiptCapture}
            />
            <input
              type="file"
              ref={rowFileRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleRowReceiptCapture}
            />
            {receiptThumbUrl && (
              <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptThumbUrl!} alt="Receipt" style={{ width: '100%', maxHeight: 120, objectFit: 'cover' }} />
              </div>
            )}
            <input
                type="text"
                inputMode="decimal"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0.00"
                style={fieldInput}
              />
          </div>

          {/* Notes */}
          <div>
            <label style={fieldLabel}>Notes (optional)</label>
            <input
              type="text"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Vendor, description..."
              style={fieldInput}
            />
          </div>

          {/* Personal toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 0' }}>
            <div
              onClick={() => setTxPersonal(!txPersonal)}
              style={{
                width: 40,
                height: 24,
                borderRadius: 999,
                background: txPersonal ? 'var(--color-accent)' : 'var(--color-border)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: txPersonal ? 19 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>Personal</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Exclude from business totals</div>
            </div>
          </label>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !txAmount}
            style={{
              width: '100%',
              minHeight: 52,
              borderRadius: 10,
              background: saving || !txAmount ? 'var(--color-muted)' : 'var(--color-primary)',
              color: saving || !txAmount ? 'var(--color-muted-foreground)' : 'var(--color-primary-foreground)',
              border: 'none',
              fontSize: 16,
              fontWeight: 700,
              cursor: saving || !txAmount ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              marginTop: 4,
            }}
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
