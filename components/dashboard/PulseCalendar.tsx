'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

interface PulseCalendarProps {
  log: Record<string, boolean>
  selected: string
  onSelect: (date: string) => void
  startDate?: string
}

export function PulseCalendar({ log, selected, onSelect, startDate }: PulseCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const base = selected || todayKey()
    const d = new Date(base + 'T00:00:00')
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [filter, setFilter] = useState<'all' | 'complete' | 'missing'>('all')

  const grid = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: { date: string | null; status: 'complete' | 'missing' | 'future' }[] = []
    const todayStr = todayKey()

    for (let i = 0; i < startDay; i++) {
      cells.push({ date: null, status: 'future' })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      let status: 'complete' | 'missing' | 'future' = 'future'
      if (ds <= todayStr) {
        if (startDate && ds < startDate) {
          status = 'future'
        } else {
          status = log[ds] ? 'complete' : 'missing'
        }
      }
      cells.push({ date: ds, status })
    }

    return cells
  }, [cursor, log])

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const filters: { key: 'all' | 'complete' | 'missing'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'complete', label: 'Complete' },
    { key: 'missing', label: 'Missing' },
  ]

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1.5px solid var(--color-border)',
        background: 'var(--color-card)',
        padding: 20,
        width: '100%',
      }}
    >
      {/* Month navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <button
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          aria-label="Previous month"
          style={{
            borderRadius: '50%',
            padding: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-muted-foreground)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--color-foreground)',
          }}
        >
          {monthLabel}
        </span>

        <button
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          aria-label="Next month"
          style={{
            borderRadius: '50%',
            padding: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-muted-foreground)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {filters.map(({ key, label }) => {
          const active = filter === key
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                border: 'none',
                cursor: 'pointer',
                background: active
                  ? 'var(--color-primary)'
                  : 'var(--color-secondary)',
                color: active
                  ? 'var(--color-primary-foreground)'
                  : 'var(--color-foreground)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Day headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 4,
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-muted-foreground)',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {grid.map((cell, i) => {
          if (!cell.date) return <div key={i} />

          const day = parseInt(cell.date.slice(-2))
          const isSel = cell.date === selected
          const isFuture = cell.status === 'future'

          const dim =
            (filter === 'complete' && cell.status !== 'complete') ||
            (filter === 'missing' && cell.status !== 'missing')

          return (
            <button
              key={cell.date}
              onClick={() => !isFuture && onSelect(cell.date!)}
              disabled={isFuture}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                border: 'none',
                cursor: isFuture ? 'default' : 'pointer',
                background: isSel
                  ? 'var(--color-primary)'
                  : 'var(--color-secondary)',
                color: isSel
                  ? 'var(--color-primary-foreground)'
                  : 'var(--color-foreground)',
                opacity: isFuture ? 0.3 : dim ? 0.25 : 1,
                transition: 'background 0.15s, opacity 0.15s',
              }}
            >
              <span>{day}</span>

              {/* Complete dot */}
              {cell.status === 'complete' && (
                <span
                  style={{
                    display: 'block',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    marginTop: 2,
                    background: isSel
                      ? 'var(--color-primary-foreground)'
                      : 'var(--color-profit)',
                  }}
                />
              )}

              {/* Missing dot */}
              {cell.status === 'missing' && (
                <span
                  style={{
                    display: 'block',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    marginTop: 2,
                    background: isSel
                      ? 'var(--color-primary-foreground)'
                      : 'var(--color-danger)',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 12,
          fontSize: 12,
          color: 'var(--color-muted-foreground)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-profit)',
              display: 'inline-block',
            }}
          />
          Complete
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-danger)',
              display: 'inline-block',
            }}
          />
          Missing
        </span>
      </div>
    </div>
  )
}
