-- Bookwise Demo Seed Data
-- Step 1: Sign up at /login with demo@bookwise.app / Demo2025!
-- Step 2: Run this entire script in the Supabase SQL editor.

DO $$
DECLARE
  demo_id uuid;
BEGIN
  SELECT id INTO demo_id FROM auth.users WHERE email = 'demo@bookwise.app';

  IF demo_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found. Create the account at /login first.';
  END IF;

  -- ── Profile ────────────────────────────────────────────────────────────────
  INSERT INTO profiles (id, practice_name, industry, vibe, daily_pulse_time, onboarding_complete)
  VALUES (demo_id, 'Sage & Stone Bodywork', 'bodyworker', 'sage', '17:00', true)
  ON CONFLICT (id) DO UPDATE SET
    practice_name = EXCLUDED.practice_name,
    industry = EXCLUDED.industry,
    vibe = EXCLUDED.vibe,
    daily_pulse_time = EXCLUDED.daily_pulse_time,
    onboarding_complete = EXCLUDED.onboarding_complete;

  -- ── Services ───────────────────────────────────────────────────────────────
  DELETE FROM services WHERE user_id = demo_id;

  INSERT INTO services (user_id, name, price, duration_minutes) VALUES
    (demo_id, '60-Minute Session',      120.00, 60),
    (demo_id, '90-Minute Session',      165.00, 90),
    (demo_id, '4-Session Package',      440.00, NULL),
    (demo_id, 'Hot Stone Add-On',        35.00, 15),
    (demo_id, 'Prenatal Session',       130.00, 60),
    (demo_id, 'Deep Tissue (75 min)',   145.00, 75);

  -- ── Transactions -April 2026 ──────────────────────────────────────────────
  DELETE FROM transactions WHERE user_id = demo_id;

  -- April income (12 transactions)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, '2026-04-01', 120.00, 'income', 'Session Income',  '60-min session -R. Chen',    'manual'),
    (demo_id, '2026-04-03', 165.00, 'income', 'Session Income',  '90-min session -T. Brooks',  'manual'),
    (demo_id, '2026-04-04',  25.00, 'income', 'Tip Income',      'Tip from R. Chen',            'manual'),
    (demo_id, '2026-04-05', 120.00, 'income', 'Session Income',  '60-min session -M. Patel',   'manual'),
    (demo_id, '2026-04-07', 440.00, 'income', 'Package Income',  '4-session package -J. Kim',  'manual'),
    (demo_id, '2026-04-09', 165.00, 'income', 'Session Income',  '90-min session -S. Torres',  'manual'),
    (demo_id, '2026-04-10',  30.00, 'income', 'Tip Income',      'Tip from T. Brooks',          'manual'),
    (demo_id, '2026-04-12', 120.00, 'income', 'Session Income',  '60-min session -R. Chen',    'manual'),
    (demo_id, '2026-04-14', 165.00, 'income', 'Session Income',  '90-min session -M. Patel',   'manual'),
    (demo_id, '2026-04-16', 120.00, 'income', 'Session Income',  '60-min session -J. Kim',     'manual'),
    (demo_id, '2026-04-19', 165.00, 'income', 'Session Income',  '90-min session -S. Torres',  'manual'),
    (demo_id, '2026-04-21', 120.00, 'income', 'Session Income',  '60-min session -R. Chen',    'manual');

  -- April expenses (8 transactions)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, '2026-04-01', 800.00, 'expense', 'Rent',                 'Treatment room -April',      'manual'),
    (demo_id, '2026-04-03',  35.00, 'expense', 'Insurance',            'Liability -April',           'manual'),
    (demo_id, '2026-04-05',  25.00, 'expense', 'Software',             'Booking software -April',    'manual'),
    (demo_id, '2026-04-08',  65.00, 'expense', 'Equipment',            'Oils and aromatherapy',       'manual'),
    (demo_id, '2026-04-10',  45.00, 'expense', 'Supplies',             'Linens',                      'manual'),
    (demo_id, '2026-04-13', 150.00, 'expense', 'Continuing Education', 'Myofascial release workshop', 'manual'),
    (demo_id, '2026-04-15',  60.00, 'expense', 'Marketing',            'Instagram promotion',         'manual'),
    (demo_id, '2026-04-20',  30.00, 'expense', 'Supplies',             'Massage cream refill',        'manual');

  -- ── Transactions -March 2026 ──────────────────────────────────────────────

  -- March income (8 transactions)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, '2026-03-03', 120.00, 'income', 'Session Income',  '60-min session -T. Brooks',  'manual'),
    (demo_id, '2026-03-05', 165.00, 'income', 'Session Income',  '90-min session -M. Patel',   'manual'),
    (demo_id, '2026-03-08', 440.00, 'income', 'Package Income',  '4-session package -R. Chen', 'manual'),
    (demo_id, '2026-03-10',  20.00, 'income', 'Tip Income',      'Tip from M. Patel',           'manual'),
    (demo_id, '2026-03-12', 120.00, 'income', 'Session Income',  '60-min session -S. Torres',  'manual'),
    (demo_id, '2026-03-15', 165.00, 'income', 'Session Income',  '90-min session -J. Kim',     'manual'),
    (demo_id, '2026-03-19', 120.00, 'income', 'Session Income',  '60-min session -T. Brooks',  'manual'),
    (demo_id, '2026-03-22', 165.00, 'income', 'Session Income',  '90-min session -R. Chen',    'manual');

  -- March expenses (7 transactions)
  INSERT INTO transactions (user_id, date, amount, type, category_key, notes, source) VALUES
    (demo_id, '2026-03-01', 800.00, 'expense', 'Rent',                 'Treatment room -March',      'manual'),
    (demo_id, '2026-03-03',  35.00, 'expense', 'Insurance',            'Liability -March',           'manual'),
    (demo_id, '2026-03-05',  25.00, 'expense', 'Software',             'Booking software -March',    'manual'),
    (demo_id, '2026-03-08',  65.00, 'expense', 'Equipment',            'Hot stone set',               'manual'),
    (demo_id, '2026-03-10',  45.00, 'expense', 'Supplies',             'Linens',                      'manual'),
    (demo_id, '2026-03-15',  45.00, 'expense', 'Marketing',            'Business cards reprint',      'manual'),
    (demo_id, '2026-03-20',  75.00, 'expense', 'Professional Services','Accountant consultation',     'manual');

  -- ── Daily Pulse ────────────────────────────────────────────────────────────
  INSERT INTO daily_pulse (user_id, date, sessions_given, hours_worked, miles_driven)
  VALUES
    (demo_id, CURRENT_DATE - 1, 4, 5.5, 12.0),
    (demo_id, CURRENT_DATE,     3, 4.0,  8.0)
  ON CONFLICT (user_id, date) DO UPDATE SET
    sessions_given = EXCLUDED.sessions_given,
    hours_worked   = EXCLUDED.hours_worked,
    miles_driven   = EXCLUDED.miles_driven;

  -- ── Buckets -April 2026 (65% funded) ─────────────────────────────────────
  -- April income = $1,755 → profit target 10% = $175.50, tax 25% = $438.75, ops 65% = $1,140.75
  INSERT INTO buckets (user_id, month, profit_target, profit_funded, tax_target, tax_funded, ops_target, ops_funded)
  VALUES (demo_id, '2026-04-01', 175.50, 114.00, 438.75, 285.00, 1140.75, 741.00)
  ON CONFLICT (user_id, month) DO UPDATE SET
    profit_target  = EXCLUDED.profit_target,
    profit_funded  = EXCLUDED.profit_funded,
    tax_target     = EXCLUDED.tax_target,
    tax_funded     = EXCLUDED.tax_funded,
    ops_target     = EXCLUDED.ops_target,
    ops_funded     = EXCLUDED.ops_funded;

  RAISE NOTICE 'Demo seed complete for user: %', demo_id;
END $$;
