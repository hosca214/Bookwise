'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { IQ_MAPS, type Industry } from '@/lib/iqMaps'

interface IQContextType {
  industry: Industry
  t: (key: string) => string
  setIndustry: (industry: Industry) => void
  accountantMode: boolean
  toggleAccountantMode: () => void
}

const IQContext = createContext<IQContextType | null>(null)

export function IQProvider({
  children,
  defaultIndustry = 'coach',
}: {
  children: React.ReactNode
  defaultIndustry?: Industry
}) {
  const [industry, setIndustryState] = useState<Industry>(defaultIndustry)
  const [accountantMode, setAccountantMode] = useState(false)

  const t = useCallback(
    (key: string): string => {
      if (accountantMode) return key
      return IQ_MAPS[industry]?.[key] ?? key
    },
    [industry, accountantMode]
  )

  function setIndustry(next: Industry) { setIndustryState(next) }

  const toggleAccountantMode = useCallback(() => {
    setAccountantMode((prev) => !prev)
  }, [])

  return (
    <IQContext.Provider
      value={{ industry, t, setIndustry, accountantMode, toggleAccountantMode }}
    >
      {children}
    </IQContext.Provider>
  )
}

export function useIQ() {
  const ctx = useContext(IQContext)
  if (!ctx) throw new Error('useIQ must be used inside IQProvider')
  return ctx
}
