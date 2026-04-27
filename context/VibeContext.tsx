'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

export type Vibe = 'sage' | 'midnight' | 'rose' | 'ocean' | 'golden'

export const VIBES: { id: Vibe; name: string; primary: string; bg: string; surface: string; swatches: string[] }[] = [
  { id: 'sage',     name: 'Ethereal Sage',   primary: '#7C9A7E', bg: '#F5F2EC', surface: '#FFFFFF', swatches: ['#F5F2EC', '#7C9A7E', '#C4A882'] },
  { id: 'midnight', name: 'Midnight Orchid', primary: '#B09FCC', bg: '#1E1E26', surface: '#2A2A36', swatches: ['#1E1E26', '#B09FCC', '#C8C8D0'] },
  { id: 'rose',     name: 'Desert Rose',     primary: '#C4816A', bg: '#FAF0EE', surface: '#FFFFFF', swatches: ['#FAF0EE', '#C4816A', '#E8C4B8'] },
  { id: 'ocean',    name: 'Ocean Mist',      primary: '#4A8FA8', bg: '#EEF4F7', surface: '#FFFFFF', swatches: ['#EEF4F7', '#4A8FA8', '#A8C8D8'] },
  { id: 'golden',   name: 'Golden Hour',     primary: '#C4943A', bg: '#FBF5E8', surface: '#FFFFFF', swatches: ['#FBF5E8', '#C4943A', '#E8D090'] },
]

function normalizeVibe(raw: string | null | undefined): Vibe {
  if (!raw) return 'sage'
  if (raw === 'rose') return 'rose'
  if (raw === 'ocean') return 'ocean'
  if (raw === 'golden') return 'golden'
  if (raw.includes('midnight')) return 'midnight'
  return 'sage'
}

interface VibeContextType {
  vibe: Vibe
  setVibe: (v: string) => void
}

const VibeContext = createContext<VibeContextType | null>(null)

export function VibeProvider({ children }: { children: React.ReactNode }) {
  const [vibe, setVibeState] = useState<Vibe>('sage')

  const setVibe = useCallback((raw: string) => {
    const next = normalizeVibe(raw)
    setVibeState(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-vibe', next)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-vibe', vibe)
  }, [vibe])

  return (
    <VibeContext.Provider value={{ vibe, setVibe }}>
      {children}
    </VibeContext.Provider>
  )
}

export function useVibe() {
  const ctx = useContext(VibeContext)
  if (!ctx) throw new Error('useVibe must be used inside VibeProvider')
  return ctx
}
