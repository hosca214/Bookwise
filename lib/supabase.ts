import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


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
  ops_pct: number | null
  pay_target: number
  transfer_day: string
  monthly_essential_cost: number | null
  monthly_income_goal: number | null
}

export type RecurringTemplate = {
  id: string
  user_id: string
  name: string
  amount: number
  type: 'income' | 'expense'
  category_key: string
  day_of_month: number
  is_active: boolean
  created_at: string
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
  ai_suggested_category: string | null
  ai_suggestion_reason: string | null
  created_at: string
  service_id: string | null
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
  pay_funded: number
  celebration_note: string | null
}

export type Service = {
  id: string
  user_id: string
  name: string
  price: number
  duration_minutes: number | null
  is_active: boolean
}

export type WeeklySummary = {
  id: string
  user_id: string
  week_start: string
  week_end: string
  income: number
  expenses: number
  tax_amount: number
  profit_amount: number
  ops_amount: number
  pay_amount: number
  transferred: boolean
  transferred_at: string | null
}
