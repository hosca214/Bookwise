'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
      <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.8-2.7.8-2.09 0-3.86-1.41-4.49-3.31H1.8v2.08A8 8 0 0 0 8.98 17z" fill="#34A853"/>
      <path d="M4.49 10.54A4.8 4.8 0 0 1 4.24 9c0-.53.09-1.05.25-1.54V5.38H1.8A8 8 0 0 0 .98 9c0 1.29.31 2.51.82 3.62l2.69-2.08z" fill="#FBBC05"/>
      <path d="M8.98 3.58c1.18 0 2.23.41 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.18 4.38l2.69 2.08c.63-1.9 2.4-3.31 4.49-3.31z" fill="#EA4335"/>
    </svg>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 16px',
  fontSize: 16,
  borderRadius: 8,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-card)',
  color: 'var(--color-foreground)',
  outline: 'none',
  minHeight: 48,
  fontFamily: 'var(--font-sans)',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_failed') {
      const detail = searchParams.get('detail')
      toast.error(detail ? `Sign in failed: ${detail}` : 'Sign in failed. Please try again.')
    }
  }, [searchParams])

  async function handleGoogleSignIn() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) toast.error(error.message)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not connect to Google. Try again.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) {
          router.push('/onboarding')
          router.refresh()
        } else {
          toast.success('Check your email to confirm your account.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', data.user.id)
          .maybeSingle()
        router.push(profile?.onboarding_complete ? '/dashboard' : '/onboarding')
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ marginBottom: 40 }}>
          <h1 className="font-serif" style={{ fontSize: 40, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8, lineHeight: 1 }}>
            Bookwise
          </h1>
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: 16 }}>
            {mode === 'signin' ? 'Welcome back.' : 'Your practice, finally in your language.'}
          </p>
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            borderRadius: 10,
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-card)',
            color: 'var(--color-foreground)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-foreground)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-foreground)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 10,
              background: loading ? 'var(--color-muted)' : 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              minHeight: 48,
              marginTop: 4,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {loading ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={{
            marginTop: 20,
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--color-muted-foreground)',
            fontSize: 14,
            cursor: 'pointer',
            padding: '8px 0',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>

      </div>
    </div>
  )
}
