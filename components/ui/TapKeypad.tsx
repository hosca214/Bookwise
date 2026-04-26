'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  prefix?: string
}

const KEY_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 60,
  fontSize: 22,
  fontWeight: 600,
  borderRadius: 10,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-card)',
  color: 'var(--color-foreground)',
  cursor: 'pointer',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  transition: 'background 0.1s',
  fontFamily: 'var(--font-sans)',
}

export function TapKeypad({ value, onChange, prefix = '$' }: Props) {
  function tap(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === '.' && value.includes('.')) return
    if (value === '0' && key !== '.') {
      onChange(key)
      return
    }
    // limit to 2 decimal places
    const dot = value.indexOf('.')
    if (dot !== -1 && value.length - dot > 2) return
    onChange(value + key)
  }

  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫']

  return (
    <div>
      <div style={{
        textAlign: 'center',
        padding: '12px 0 16px',
        fontSize: 40,
        fontWeight: 700,
        fontFamily: 'var(--font-serif)',
        color: 'var(--color-foreground)',
        letterSpacing: '-0.5px',
        minHeight: 60,
      }}>
        {prefix}{value || '0'}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
      }}>
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onPointerDown={() => tap(k)}
            style={{
              ...KEY_STYLE,
              background: k === '⌫' ? 'var(--color-muted)' : 'var(--color-card)',
              fontSize: k === '⌫' ? 18 : 22,
            }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
