import { useState } from 'react'

export function usePersistentState<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const set = (val: T): void => {
    setState(val)
    try {
      localStorage.setItem(key, JSON.stringify(val))
    } catch {
      // localStorage unavailable (e.g. private browsing quota); React state still updates
    }
  }

  return [state, set]
}
