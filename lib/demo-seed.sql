-- Bookwise Demo Seed Data
-- Run this after schema setup to populate the demo account
-- Demo account: demo@bookwise.app / Demo2025!
-- Create this account in Supabase Auth first, then replace USER_ID below

-- Replace this with the actual UUID from auth.users after creating the demo account
-- DO $$
-- DECLARE demo_user_id uuid := 'REPLACE_WITH_ACTUAL_USER_ID';
-- BEGIN

-- Demo profile (bodyworker, ethereal sage vibe)
INSERT INTO profiles (id, practice_name, industry, vibe, daily_pulse_time, tax_rate, onboarding_complete)
VALUES (
  'REPLACE_WITH_ACTUAL_USER_ID',
  'Serenity Bodywork Studio',
  'bodyworker',
  'sage',
  '17:00',
  0.25,
  true
) ON CONFLICT (id) DO UPDATE SET
  practice_name = EXCLUDED.practice_name,
  industry = EXCLUDED.industry,
  onboarding_complete = EXCLUDED.onboarding_complete;

-- Services
INSERT INTO services (user_id, name, price, duration_minutes, is_active) VALUES
  ('REPLACE_WITH_ACTUAL_USER_ID', '60-Minute Appointment', 120.00, 60, true),
  ('REPLACE_WITH_ACTUAL_USER_ID', '90-Minute Appointment', 165.00, 90, true),
  ('REPLACE_WITH_ACTUAL_USER_ID', '4-Session Package', 440.00, null, true),
  ('REPLACE_WITH_ACTUAL_USER_ID', 'Chair Massage (30 min)', 60.00, 30, true),
  ('REPLACE_WITH_ACTUAL_USER_ID', 'Hot Stone Add-On', 30.00, null, true);

-- Current month bucket (April 2025, ~65% funded)
INSERT INTO buckets (user_id, month, profit_target, profit_funded, tax_target, tax_funded, ops_target, ops_funded)
VALUES (
  'REPLACE_WITH_ACTUAL_USER_ID',
  date_trunc('month', current_date),
  520.00, 338.00,
  1300.00, 845.00,
  3380.00, 2197.00
) ON CONFLICT (user_id, month) DO NOTHING;

-- April transactions (income)
INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 1, 120.00, 'income', 'Session Income', '60-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 1, 25.00, 'income', 'Tip Income', 'Tip from morning client', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 2, 165.00, 'income', 'Session Income', '90-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 3, 440.00, 'income', 'Package Income', '4-session package sale', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 4, 120.00, 'income', 'Session Income', '60-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 5, 30.00, 'income', 'Tip Income', 'Tip', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 6, 165.00, 'income', 'Session Income', '90-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 7, 120.00, 'income', 'Session Income', '60-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 8, 120.00, 'income', 'Session Income', '60-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 9, 165.00, 'income', 'Session Income', '90-min deep tissue', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 10, 440.00, 'income', 'Package Income', '4-session package', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 11, 20.00, 'income', 'Tip Income', 'Tip', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 12, 120.00, 'income', 'Session Income', '60-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 14, 165.00, 'income', 'Session Income', '90-min appointment', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 15, 120.00, 'income', 'Session Income', '60-min appointment', 'manual');

-- April transactions (expenses)
INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 3, 45.00, 'expense', 'Supplies', 'Linens and massage sheets', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 5, 65.00, 'expense', 'Supplies', 'Oils, lotions, aromatherapy', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 7, 800.00, 'expense', 'Rent', 'Treatment room rent', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 8, 35.00, 'expense', 'Insurance', 'Liability insurance', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 10, 25.00, 'expense', 'Software', 'Booking software', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 12, 150.00, 'expense', 'Continuing Education', 'CE credit workshop', 'manual'),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 14, 18.50, 'expense', 'Supplies', 'Sanitizing supplies', 'manual');

-- Daily pulse entries
INSERT INTO daily_pulse (user_id, date, sessions_given, hours_worked, miles_driven) VALUES
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 1, 3, 3.5, 12.0),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 2, 4, 5.0, 8.5),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 4, 3, 4.0, 10.0),
  ('REPLACE_WITH_ACTUAL_USER_ID', current_date - 6, 5, 6.0, 14.0)
ON CONFLICT (user_id, date) DO NOTHING;
