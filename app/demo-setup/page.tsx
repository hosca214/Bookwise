'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DemoSetupPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function runSeed() {
    setStatus('running')
    setMessage('Generating receipt images and uploading to Drive...')
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong.')
        return
      }
      setStatus('done')
      setMessage(`Done. Uploaded ${data.receipts?.length ?? 0} receipts and created demo transactions.`)
    } catch {
      setStatus('error')
      setMessage('Could not connect. Try again.')
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%', background: 'var(--color-card)', borderRadius: 16, padding: 32, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <h1 className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8 }}>
          Demo Setup
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginBottom: 28, lineHeight: 1.6 }}>
          This will generate 6 varied receipt images, upload them to the connected Google Drive, and create 30 demo transactions across two months.
        </p>

        {status === 'idle' && (
          <button
            onClick={runSeed}
            style={{ width: '100%', minHeight: 48, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >
            Set up demo data
          </button>
        )}

        {status === 'running' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', textAlign: 'center' }}>{message}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {status === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--color-profit)', fontWeight: 600 }}>{message}</p>
            <button
              onClick={() => router.push('/ledger')}
              style={{ width: '100%', minHeight: 48, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Go to Ledger
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--color-danger)' }}>{message}</p>
            <button
              onClick={() => setStatus('idle')}
              style={{ width: '100%', minHeight: 48, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Try again
            </button>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{ width: '100%', marginTop: 16, background: 'none', border: 'none', fontSize: 13, color: 'var(--color-muted-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
