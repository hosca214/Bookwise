import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const BUCKET_ALLOC = { profit: 0.1, tax: 0.25, ops: 0.65 } as const

export type Profile = {
  id: string
  practice_name: string | null
  industry: 'coach' | 'trainer' | 'bodyworker' | null
  vibe: string
  daily_pulse_time: string
  google_drive_folder_id: string | null
  tax_rate: number
  onboarding_complete: boolean
  created_at: string
  profit_pct: number | null
  tax_pct: number | null
}

export type Transaction = {
  id: string
  user_id: string
  date: string
  amount: number
  type: 'income' | 'expense'
  category_key: string
  notes: string | null
  is_personal: boolean
  source: string
  external_id: string | null
  receipt_url: string | null
  receipt_filename: string | null
  pulse_matched: boolean
  created_at: string
}

export type DailyPulse = {
  id: string
  user_id: string
  date: string
  sessions_given: number
  hours_worked: number
  miles_driven: number
}

export type Bucket = {
  id: string
  user_id: string
  month: string
  profit_target: number
  profit_funded: number
  tax_target: number
  tax_funded: number
  ops_target: number
  ops_funded: number
}

export type Service = {
  id: string
  user_id: string
  name: string
  price: number
  duration_minutes: number | null
  is_active: boolean
}
