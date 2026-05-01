'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const btnStyle = { width: '100%', minHeight: 48, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' } as const
const secondaryBtnStyle = { ...btnStyle, background: 'var(--color-muted)', color: 'var(--color-muted-foreground)', fontSize: 14, fontWeight: 600 } as const

type Status = 'idle' | 'running' | 'done' | 'error'

function Spinner({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', textAlign: 'center' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function DemoSetupPage() {
  const router = useRouter()

  const [seedStatus, setSeedStatus] = useState<Status>('idle')
  const [seedMessage, setSeedMessage] = useState('')

  const [receiptStatus, setReceiptStatus] = useState<Status>('idle')
  const [receiptMessage, setReceiptMessage] = useState('')

  async function runSeed() {
    setSeedStatus('running')
    setSeedMessage('Generating receipt images and uploading to Drive...')
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setSeedStatus('error'); setSeedMessage(data.error ?? 'Something went wrong.'); return }
      setSeedStatus('done')
      setSeedMessage(`Done. Created demo transactions.`)
    } catch {
      setSeedStatus('error')
      setSeedMessage('Could not connect. Try again.')
    }
  }

  async function runRefreshReceipts() {
    setReceiptStatus('running')
    setReceiptMessage('Generating receipts and uploading to Drive...')
    try {
      const res = await fetch('/api/demo/refresh-receipts', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setReceiptStatus('error'); setReceiptMessage(data.error ?? 'Something went wrong.'); return }
      setReceiptStatus('done')
      setReceiptMessage(`Done. Uploaded ${data.uploaded?.length ?? 0} files to Drive.`)
    } catch {
      setReceiptStatus('error')
      setReceiptMessage('Could not connect. Try again.')
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%', background: 'var(--color-card)', borderRadius: 16, padding: 32, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8 }}>Demo Setup</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: 0 }}>
            Use the tools below to set up and maintain the demo account.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Transactions</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.5, margin: 0 }}>
            Wipes existing transactions and rebuilds 3 months of demo data with services and buckets.
          </p>
          {seedStatus === 'idle' && <button onClick={runSeed} style={btnStyle}>Seed demo data</button>}
          {seedStatus === 'running' && <Spinner message={seedMessage} />}
          {seedStatus === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--color-profit)', fontWeight: 600, margin: 0 }}>{seedMessage}</p>
              <button onClick={() => setSeedStatus('idle')} style={secondaryBtnStyle}>Run again</button>
            </div>
          )}
          {seedStatus === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>{seedMessage}</p>
              <button onClick={() => setSeedStatus('idle')} style={secondaryBtnStyle}>Try again</button>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Receipts</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.5, margin: 0 }}>
            Re-generates all expense receipts and creates income invoices. Uploads to Drive with uniform naming: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>YYYY-MM-DD - Type - Category - Line X.png</span>
          </p>
          {receiptStatus === 'idle' && <button onClick={runRefreshReceipts} style={btnStyle}>Refresh receipts</button>}
          {receiptStatus === 'running' && <Spinner message={receiptMessage} />}
          {receiptStatus === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--color-profit)', fontWeight: 600, margin: 0 }}>{receiptMessage}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setReceiptStatus('idle')} style={{ ...secondaryBtnStyle, flex: 1 }}>Run again</button>
                <button onClick={() => router.push('/ledger')} style={{ ...btnStyle, flex: 1 }}>Go to Ledger</button>
              </div>
            </div>
          )}
          {receiptStatus === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>{receiptMessage}</p>
              <button onClick={() => setReceiptStatus('idle')} style={secondaryBtnStyle}>Try again</button>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--color-muted-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
