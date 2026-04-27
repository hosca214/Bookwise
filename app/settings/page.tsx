'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useIQ } from '@/context/IQContext'
import { useVibe, VIBES } from '@/context/VibeContext'
import { BottomNav } from '@/components/ui/BottomNav'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Service } from '@/lib/supabase'

const supabase = createClient()

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--color-muted-foreground)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const fieldInput: React.CSSProperties = {
  width: '100%', minHeight: 48, padding: '12px 14px', fontSize: 16,
  borderRadius: 8, border: '1.5px solid var(--color-border)',
  background: 'var(--color-background)', color: 'var(--color-foreground)',
  outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-muted-foreground)',
      marginBottom: 12,
    }}>
      {children}
    </h2>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { setIndustry } = useIQ()
  const { vibe, setVibe } = useVibe()

  const [userId, setUserId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  // add service form
  const [addOpen, setAddOpen] = useState(false)
  const [svcName, setSvcName] = useState('')
  const [svcPrice, setSvcPrice] = useState('')
  const [svcDuration, setSvcDuration] = useState(60)
  const [savingService, setSavingService] = useState(false)

  // vibe staging (preview before save)
  const [stagedVibe, setStagedVibe] = useState(vibe)
  const [savingVibe, setSavingVibe] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const [{ data: profile }, { data: svcData }] = await Promise.all([
          supabase.from('profiles').select('industry, vibe').eq('id', user.id).single(),
          supabase.from('services').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
        ])

        if (profile?.industry) setIndustry(profile.industry)
        if (profile?.vibe) {
          setVibe(profile.vibe)
          setStagedVibe(profile.vibe as typeof vibe)
        }
        setServices(svcData ?? [])
      } catch {
        toast.error('Could not load settings. Try again.')
      } finally {
        setLoadingServices(false)
      }
    }
    load()
  }, [])

  async function saveVibe() {
    if (!userId) return
    setSavingVibe(true)
    try {
      await supabase.from('profiles').update({ vibe: stagedVibe }).eq('id', userId)
      toast.success('Vibe saved.')
    } catch {
      toast.error('Could not save. Try again.')
    } finally {
      setSavingVibe(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleResetOnboarding() {
    if (!userId) return
    if (!confirmReset) { setConfirmReset(true); return }
    await supabase.from('profiles').update({ onboarding_complete: false }).eq('id', userId)
    router.push('/onboarding')
  }

  async function addService() {
    if (!userId || !svcName.trim()) return
    const price = parseFloat(svcPrice)
    if (isNaN(price) || price <= 0) { toast.error('Enter a price.'); return }
    setSavingService(true)
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({ user_id: userId, name: svcName.trim(), price, duration_minutes: svcDuration })
        .select()
        .single()

      if (error) throw error
      setServices((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSvcName('')
      setSvcPrice('')
      setSvcDuration(60)
      setAddOpen(false)
      toast.success('Service added.')
    } catch {
      toast.error('Could not add service.')
    } finally {
      setSavingService(false)
    }
  }

  async function removeService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id))
    await supabase.from('services').update({ is_active: false }).eq('id', id)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '56px 20px 0' }}>

        <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 32 }}>
          Settings
        </h1>

        {/* ── Service Menu ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Service Menu</SectionHeader>

          {loadingServices ? (
            <div style={{ height: 48, background: 'var(--color-muted)', borderRadius: 8 }} className="skeleton" />
          ) : (
            <>
              {services.map((svc) => (
                <div key={svc.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>{svc.name}</div>
                    {svc.duration_minutes && (
                      <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>{svc.duration_minutes} min</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                      ${svc.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeService(svc.id)}
                      aria-label={`Remove ${svc.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-muted-foreground)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {services.length === 0 && !addOpen && (
                <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', padding: '8px 0' }}>
                  No services yet. Add your first below.
                </p>
              )}

              {/* Add service button */}
              {!addOpen && (
                <button
                  onClick={() => setAddOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 12,
                    background: 'none',
                    border: `1.5px dashed var(--color-border)`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    width: '100%',
                    cursor: 'pointer',
                    color: 'var(--color-muted-foreground)',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <Plus size={16} />
                  Add a service
                </button>
              )}

              {/* Add service form */}
              {addOpen && (
                <div style={{
                  background: 'var(--color-card)',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12,
                  border: '1.5px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={fieldLabel}>Service name</label>
                      <input
                        type="text"
                        value={svcName}
                        onChange={(e) => setSvcName(e.target.value)}
                        placeholder="60-min Massage"
                        style={fieldInput}
                      />
                    </div>

                    <div>
                      <label style={fieldLabel}>Price</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={svcPrice}
                        onChange={(e) => setSvcPrice(e.target.value)}
                        placeholder="0.00"
                        style={{ ...fieldInput, background: 'var(--color-card)' }}
                      />
                    </div>

                    <div>
                      <label style={{ ...fieldLabel, marginBottom: 8 }}>Duration</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button
                          type="button"
                          onClick={() => setSvcDuration((d) => Math.max(15, d - 15))}
                          style={{ width: 44, height: 44, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', fontSize: 20, cursor: 'pointer', color: 'var(--color-foreground)', fontFamily: 'var(--font-sans)' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: 18, fontWeight: 600, minWidth: 72, textAlign: 'center', color: 'var(--color-foreground)' }}>
                          {svcDuration} min
                        </span>
                        <button
                          type="button"
                          onClick={() => setSvcDuration((d) => d + 15)}
                          style={{ width: 44, height: 44, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', fontSize: 20, cursor: 'pointer', color: 'var(--color-foreground)', fontFamily: 'var(--font-sans)' }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => setAddOpen(false)}
                        style={{
                          flex: 1, minHeight: 48, borderRadius: 10,
                          border: '1.5px solid var(--color-border)',
                          background: 'transparent', color: 'var(--color-foreground)',
                          fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addService}
                        disabled={savingService}
                        style={{
                          flex: 2, minHeight: 48, borderRadius: 10,
                          background: 'var(--color-primary)', color: 'var(--color-primary-foreground)',
                          border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {savingService ? 'Saving...' : 'Add Service'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Vibe ─────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Vibe</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {VIBES.map((v) => {
              const selected = stagedVibe === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => { setStagedVibe(v.id); setVibe(v.id) }}
                  style={{
                    borderRadius: 12,
                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: v.bg,
                    padding: '16px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {v.swatches.map((sw) => (
                      <span key={sw} style={{ width: 18, height: 18, borderRadius: '50%', background: sw, border: '1px solid rgba(0,0,0,0.08)', display: 'inline-block' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: v.ink, fontFamily: 'var(--font-sans)' }}>
                    {v.name}
                  </div>
                </button>
              )
            })}
          </div>
          {stagedVibe !== vibe && (
            <button
              onClick={saveVibe}
              disabled={savingVibe}
              style={{
                width: '100%',
                minHeight: 48,
                borderRadius: 10,
                background: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {savingVibe ? 'Saving...' : 'Save Vibe'}
            </button>
          )}
        </section>

        {/* ── Connected Apps ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Connected Apps</SectionHeader>
          <div style={{ background: 'var(--color-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {(['Stripe', 'Plaid', 'Google Drive'] as const).map((app, i) => (
              <div key={app} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-foreground)' }}>{app}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Demo mode</div>
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'var(--color-muted)',
                  color: 'var(--color-profit)',
                }}>
                  Connected
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 8 }}>
            Live connections available after launch.
          </p>
        </section>

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <SectionHeader>About Bookwise</SectionHeader>
          <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: 0 }}>
              Bookwise organizes and presents your financial data. Sage shares observations, not advice. Work with a licensed CPA before filing.
            </p>
          </div>
        </section>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader>Account</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                minHeight: 48,
                borderRadius: 10,
                border: '1.5px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-foreground)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Log Out
            </button>
            <button
              onClick={handleResetOnboarding}
              style={{
                width: '100%',
                minHeight: 48,
                borderRadius: 10,
                border: '1.5px solid var(--color-border)',
                background: 'transparent',
                color: confirmReset ? 'var(--color-danger)' : 'var(--color-muted-foreground)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'color 0.15s',
              }}
            >
              {confirmReset ? 'Tap again to confirm reset' : 'Reset Onboarding'}
            </button>
          </div>
        </section>

      </div>
      <BottomNav />
    </div>
  )
}
