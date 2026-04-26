'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, FileText, Settings } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: 'Dash', icon: Home },
  { href: '/ledger', label: 'Ledger', icon: BookOpen },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-card)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 6px)',
      }}
    >
      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          padding: '8px 8px 0',
          margin: 0,
          listStyle: 'none',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 4px 6px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                  position: 'relative',
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, lineHeight: 1 }}>
                  {tab.label}
                </span>
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                    }}
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
