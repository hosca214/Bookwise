'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { BottomNav } from '@/components/ui/BottomNav'
import { Camera, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Transaction } from '@/lib/supabase'

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
  const [ocrLoading, setOcrLoading] = useState(false)

  const rowFileRef = useRef<HTMLInputElement>(null)
  const [rowReceiptTarget, setRowReceiptTarget] = useState<string | null>(null)
  const [rowOcrLoading, setRowOcrLoading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const [{ data: profile }, { data, error: err }] = await Promise.all([
          supabase.from('profiles').select('industry').eq('id', user.id).single(),
          supabase.from('transactions').select('*').eq('user_id', user.id)
            .order('date', { ascending: false }).order('created_at', { ascending: false }),
        ])

        if (profile?.industry) setIndustry(profile.industry)
        if (err) throw err
        setTransactions(data ?? [])
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function openSheet() {
    setTxDate(today)
    setTxType('income')
    setTxCategory('Session Income')
    setTxAmount('')
    setTxNotes('')
    setTxPersonal(false)
    setReceiptUrl(null)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
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
      const { data, error: err } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          date: txDate,
          amount,
          type: txType,
          category_key: txCategory,
          notes: txNotes || null,
          is_personal: txPersonal,
          source: 'manual',
          receipt_url: receiptUrl,
          pulse_matched: false,
        })
        .select()
        .single()

      if (err) throw err
      setTransactions((prev) => [data, ...prev])
      closeSheet()
      toast.success('Entry saved.')
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
      const month = txDate.slice(0, 7)
      const path = `receipts/${userId}/${month}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(path, file, { upsert: false })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      const url = urlData.publicUrl
      setReceiptUrl(url)

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      })
      const ocr = await res.json()
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
      const month = tx.date.slice(0, 7)
      const path = `receipts/${userId}/${month}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file, { upsert: false })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      const url = urlData.publicUrl

      await supabase.from('transactions').update({ receipt_url: url }).eq('id', txId)
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, receipt_url: url } : t))

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      })
      const ocr = await res.json()
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
        <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 2 }}>
          Ledger
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)' }}>
          {transactions.length > 0
            ? `${transactions.length} entr${transactions.length === 1 ? 'y' : 'ies'}`
            : 'All your transactions in one place'}
        </p>
      </div>

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
            <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
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
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {/* date */}
              <div style={{ minWidth: 40, fontSize: 13, color: 'var(--color-muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                {formatDate(tx.date)}
              </div>

              {/* middle */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t(tx.category_key)}
                  </span>
                  {tx.date === today && !tx.pulse_matched && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', flexShrink: 0, display: 'inline-block' }} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <SourceBadge source={tx.source} />
                  {tx.notes && (
                    <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.notes}
                    </span>
                  )}
                </div>
              </div>

              {/* amount */}
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: tx.type === 'income' ? 'var(--color-profit)' : 'var(--color-muted-foreground)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                opacity: tx.is_personal ? 0.45 : 1,
              }}>
                {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
              </div>

              {/* receipt camera */}
              <button
                onClick={() => { setRowReceiptTarget(tx.id); rowFileRef.current?.click() }}
                title={tx.receipt_url ? 'Replace receipt' : 'Scan receipt'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: tx.receipt_url ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: rowOcrLoading === tx.id ? 0.4 : 1,
                }}
              >
                {rowOcrLoading === tx.id
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Camera size={14} />}
              </button>

              {/* personal toggle */}
              <button
                onClick={() => togglePersonal(tx)}
                title={tx.is_personal ? 'Mark as business' : 'Mark as personal'}
                style={{
                  width: 32,
                  height: 20,
                  borderRadius: 999,
                  background: tx.is_personal ? 'var(--color-accent)' : 'var(--color-border)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: tx.is_personal ? 14 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Floating + button */}
      {!sheetOpen && (
        <button
          onClick={openSheet}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            border: 'none',
            fontSize: 28,
            fontWeight: 300,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            zIndex: 40,
          }}
        >
          +
        </button>
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
            New Entry
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
            {receiptUrl && (
              <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptUrl} alt="Receipt" style={{ width: '100%', maxHeight: 120, objectFit: 'cover' }} />
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
