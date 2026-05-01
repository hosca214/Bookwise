-- Bookwise Demo Seed Data
-- Step 1: Sign up at /login with demo@bookwise.app / Demo2025!
-- Step 2: Run this entire script in the Supabase SQL editor.

DO $$
DECLARE
  demo_id uuid;
  cur_month date := date_trunc('month', CURRENT_DATE)::date;
  prev_month date := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
BEGIN
  SELECT id INTO demo_id FROM auth.users WHERE email = 'demo@bookwise.app';

  IF demo_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found. Create the account at /login first.';
  END IF;

  -- ── Profile ────────────────────────────────────────────────────────────────
  INSERT INTO profiles (
    id, practice_name, industry, vibe, daily_pulse_time, onboarding_complete,
    profit_pct, tax_pct, ops_pct, pay_target, transfer_day,
    monthly_essential_cost, monthly_income_goal
  )
  VALUES (
    demo_id, 'Sage & Stone Bodywork', 'bodyworker', 'sage', '17:00', true,
    10, 25, 32, 1500, 'Monday',
    800, 3500
  )
  ON CONFLICT (id) DO UPDATE SET
    practice_name          = EXCLUDED.practice_name,
    industry               = EXCLUDED.industry,
    vibe                   = EXCLUDED.vibe,
    daily_pulse_time       = EXCLUDED.daily_pulse_time,
    onboarding_complete    = EXCLUDED.onboarding_complete,
    profit_pct             = EXCLUDED.profit_pct,
    tax_pct                = EXCLUDED.tax_pct,
    ops_pct                = EXCLUDED.ops_pct,
    pay_target             = EXCLUDED.pay_target,
    transfer_day           = EXCLUDED.transfer_day,
    monthly_essential_cost = EXCLUDED.monthly_essential_cost,
    monthly_income_goal    = EXCLUDED.monthly_income_goal;

  -- ── Services ───────────────────────────────────────────────────────────────
  DELETE FROM services WHERE user_id = demo_id;

  INSERT INTO services (user_id, name, price, duration_minutes) VALUES
    (demo_id, '60-Minute Session',    120.00, 60),
    (demo_id, '90-Minute Session',    165.00, 90),
    (demo_id, '4-Session Package',    440.00, NULL),
    (demo_id, 'Hot Stone Add-On',      35.00, 15),
    (demo_id, 'Prenatal Session',     130.00, 60),
    (demo_id, 'Deep Tissue (75 min)', 145.00, 75);

  -- ── Transactions ───────────────────────────────────────────────────────────
  DELETE FROM transactions WHERE user_id = demo_id;

  -- Current month income (12 transactions, total $1,755)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, cur_month +  0, 120.00, 'income', 'Session Income', '60-min session - R. Chen',    'manual'),
    (demo_id, cur_month +  2, 165.00, 'income', 'Session Income', '90-min session - T. Brooks',  'manual'),
    (demo_id, cur_month +  3,  25.00, 'income', 'Tip Income',     'Tip from R. Chen',            'manual'),
    (demo_id, cur_month +  4, 120.00, 'income', 'Session Income', '60-min session - M. Patel',   'manual'),
    (demo_id, cur_month +  6, 440.00, 'income', 'Package Income', '4-session package - J. Kim',  'manual'),
    (demo_id, cur_month +  8, 165.00, 'income', 'Session Income', '90-min session - S. Torres',  'manual'),
    (demo_id, cur_month +  9,  30.00, 'income', 'Tip Income',     'Tip from T. Brooks',          'manual'),
    (demo_id, cur_month + 11, 120.00, 'income', 'Session Income', '60-min session - R. Chen',    'manual'),
    (demo_id, cur_month + 13, 165.00, 'income', 'Session Income', '90-min session - M. Patel',   'manual'),
    (demo_id, cur_month + 15, 120.00, 'income', 'Session Income', '60-min session - J. Kim',     'manual'),
    (demo_id, cur_month + 18, 165.00, 'income', 'Session Income', '90-min session - S. Torres',  'manual'),
    (demo_id, cur_month + 20, 120.00, 'income', 'Session Income', '60-min session - R. Chen',    'manual');

  -- Current month expenses (5 transactions, total $935)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, cur_month +  0, 800.00, 'expense', 'Rent',      'Treatment room',       'manual'),
    (demo_id, cur_month +  2,  35.00, 'expense', 'Insurance', 'Liability insurance',  'manual'),
    (demo_id, cur_month +  4,  25.00, 'expense', 'Software',  'Booking software',     'manual'),
    (demo_id, cur_month +  9,  45.00, 'expense', 'Supplies',  'Linens',               'manual'),
    (demo_id, cur_month + 19,  30.00, 'expense', 'Supplies',  'Massage cream refill', 'manual');

  -- Previous month income (8 transactions, total $1,315)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, prev_month +  2, 120.00, 'income', 'Session Income', '60-min session - T. Brooks',  'manual'),
    (demo_id, prev_month +  4, 165.00, 'income', 'Session Income', '90-min session - M. Patel',   'manual'),
    (demo_id, prev_month +  7, 440.00, 'income', 'Package Income', '4-session package - R. Chen', 'manual'),
    (demo_id, prev_month +  9,  20.00, 'income', 'Tip Income',     'Tip from M. Patel',           'manual'),
    (demo_id, prev_month + 11, 120.00, 'income', 'Session Income', '60-min session - S. Torres',  'manual'),
    (demo_id, prev_month + 14, 165.00, 'income', 'Session Income', '90-min session - J. Kim',     'manual'),
    (demo_id, prev_month + 18, 120.00, 'income', 'Session Income', '60-min session - T. Brooks',  'manual'),
    (demo_id, prev_month + 21, 165.00, 'income', 'Session Income', '90-min session - R. Chen',    'manual');

  -- Previous month expenses (7 transactions, total $1,090)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, prev_month +  0, 800.00, 'expense', 'Rent',                 'Treatment room',           'manual'),
    (demo_id, prev_month +  2,  35.00, 'expense', 'Insurance',            'Liability insurance',      'manual'),
    (demo_id, prev_month +  4,  25.00, 'expense', 'Software',             'Booking software',         'manual'),
    (demo_id, prev_month +  7,  65.00, 'expense', 'Equipment',            'Hot stone set',            'manual'),
    (demo_id, prev_month +  9,  45.00, 'expense', 'Supplies',             'Linens',                   'manual'),
    (demo_id, prev_month + 14,  45.00, 'expense', 'Marketing',            'Business cards reprint',   'manual'),
    (demo_id, prev_month + 19,  75.00, 'expense', 'Professional Services','Accountant consultation',  'manual');

  -- ── Daily Pulse ────────────────────────────────────────────────────────────
  INSERT INTO daily_pulse (user_id, date, sessions_given, hours_worked, miles_driven)
  VALUES
    (demo_id, CURRENT_DATE - 1, 4, 5.5, 12.0),
    (demo_id, CURRENT_DATE,     3, 4.0,  8.0)
  ON CONFLICT (user_id, date) DO UPDATE SET
    sessions_given = EXCLUDED.sessions_given,
    hours_worked   = EXCLUDED.hours_worked,
    miles_driven   = EXCLUDED.miles_driven;

  -- ── Buckets ────────────────────────────────────────────────────────────────
  -- Current month: income $1,755 → profit 10%=$175.50, tax 25%=$438.75, ops 65%=$1,140.75
  INSERT INTO buckets (
    user_id, month,
    profit_target, profit_funded,
    tax_target, tax_funded,
    ops_target, ops_funded,
    pay_target, pay_funded
  )
  VALUES (
    demo_id, cur_month,
    175.50, 114.00,
    438.75, 285.00,
    1140.75, 741.00,
    1500.00, 975.00
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    profit_target  = EXCLUDED.profit_target,
    profit_funded  = EXCLUDED.profit_funded,
    tax_target     = EXCLUDED.tax_target,
    tax_funded     = EXCLUDED.tax_funded,
    ops_target     = EXCLUDED.ops_target,
    ops_funded     = EXCLUDED.ops_funded,
    pay_target     = EXCLUDED.pay_target,
    pay_funded     = EXCLUDED.pay_funded;

  -- Previous month: fully funded (establishes win streak)
  INSERT INTO buckets (
    user_id, month,
    profit_target, profit_funded,
    tax_target, tax_funded,
    ops_target, ops_funded,
    pay_target, pay_funded
  )
  VALUES (
    demo_id, prev_month,
    131.50, 131.50,
    328.75, 328.75,
    855.75, 855.75,
    1500.00, 1500.00
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    profit_target  = EXCLUDED.profit_target,
    profit_funded  = EXCLUDED.profit_funded,
    tax_target     = EXCLUDED.tax_target,
    tax_funded     = EXCLUDED.tax_funded,
    ops_target     = EXCLUDED.ops_target,
    ops_funded     = EXCLUDED.ops_funded,
    pay_target     = EXCLUDED.pay_target,
    pay_funded     = EXCLUDED.pay_funded;

  RAISE NOTICE 'Demo seed complete for user: %', demo_id;
END $$;
