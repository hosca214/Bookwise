import { createClient } from '@supabase/supabase-js'

function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function getWeekStart(from: Date): Date {
  const d = new Date(from)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'demo@bookwise.app',
    password: 'Demo2025!',
  })
  if (signInError) return Response.json({ error: signInError.message }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No user after sign in' }, { status: 500 })
  const uid = user.id

  const now = new Date()
  const cur = new Date(now.getFullYear(), now.getMonth(), 1)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  await supabase.from('transactions').delete().eq('user_id', uid)
  await supabase.from('daily_pulse').delete().eq('user_id', uid)
  await supabase.from('weekly_summaries').delete().eq('user_id', uid)

  const transactions = [
    // Current month income
    { user_id: uid, date: addDays(cur,  0), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - R. Chen',    source: 'manual' },
    { user_id: uid, date: addDays(cur,  2), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - T. Brooks',  source: 'manual' },
    { user_id: uid, date: addDays(cur,  3), amount:  25.00, type: 'income',  category_key: 'Tip Income',     notes: 'Tip from R. Chen',            source: 'manual' },
    { user_id: uid, date: addDays(cur,  4), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - M. Patel',   source: 'manual' },
    { user_id: uid, date: addDays(cur,  6), amount: 440.00, type: 'income',  category_key: 'Package Income', notes: '4-session package - J. Kim',  source: 'manual' },
    { user_id: uid, date: addDays(cur,  8), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - S. Torres',  source: 'manual' },
    { user_id: uid, date: addDays(cur,  9), amount:  30.00, type: 'income',  category_key: 'Tip Income',     notes: 'Tip from T. Brooks',          source: 'manual' },
    { user_id: uid, date: addDays(cur, 11), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - R. Chen',    source: 'manual' },
    { user_id: uid, date: addDays(cur, 13), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - M. Patel',   source: 'manual' },
    { user_id: uid, date: addDays(cur, 15), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - J. Kim',     source: 'manual' },
    { user_id: uid, date: addDays(cur, 18), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - S. Torres',  source: 'manual' },
    { user_id: uid, date: addDays(cur, 20), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - R. Chen',    source: 'manual' },
    // Current month expenses
    { user_id: uid, date: addDays(cur,  0), amount: 800.00, type: 'expense', category_key: 'Rent',      notes: 'Treatment room',       source: 'manual' },
    { user_id: uid, date: addDays(cur,  2), amount:  35.00, type: 'expense', category_key: 'Insurance', notes: 'Liability insurance',  source: 'manual' },
    { user_id: uid, date: addDays(cur,  4), amount:  25.00, type: 'expense', category_key: 'Software',  notes: 'Booking software',     source: 'manual' },
    { user_id: uid, date: addDays(cur,  9), amount:  45.00, type: 'expense', category_key: 'Supplies',  notes: 'Linens',               source: 'manual' },
    { user_id: uid, date: addDays(cur, 19), amount:  30.00, type: 'expense', category_key: 'Supplies',  notes: 'Massage cream refill', source: 'manual' },
    // Previous month income
    { user_id: uid, date: addDays(prev,  2), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - T. Brooks',  source: 'manual' },
    { user_id: uid, date: addDays(prev,  4), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - M. Patel',   source: 'manual' },
    { user_id: uid, date: addDays(prev,  7), amount: 440.00, type: 'income',  category_key: 'Package Income', notes: '4-session package - R. Chen', source: 'manual' },
    { user_id: uid, date: addDays(prev,  9), amount:  20.00, type: 'income',  category_key: 'Tip Income',     notes: 'Tip from M. Patel',           source: 'manual' },
    { user_id: uid, date: addDays(prev, 11), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - S. Torres',  source: 'manual' },
    { user_id: uid, date: addDays(prev, 14), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - J. Kim',     source: 'manual' },
    { user_id: uid, date: addDays(prev, 18), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - T. Brooks',  source: 'manual' },
    { user_id: uid, date: addDays(prev, 21), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - R. Chen',    source: 'manual' },
    // Previous month expenses
    { user_id: uid, date: addDays(prev,  0), amount: 800.00, type: 'expense', category_key: 'Rent',                 notes: 'Treatment room',           source: 'manual' },
    { user_id: uid, date: addDays(prev,  2), amount:  35.00, type: 'expense', category_key: 'Insurance',            notes: 'Liability insurance',      source: 'manual' },
    { user_id: uid, date: addDays(prev,  4), amount:  25.00, type: 'expense', category_key: 'Software',             notes: 'Booking software',         source: 'manual' },
    { user_id: uid, date: addDays(prev,  7), amount:  65.00, type: 'expense', category_key: 'Equipment',            notes: 'Hot stone set',            source: 'manual' },
    { user_id: uid, date: addDays(prev,  9), amount:  45.00, type: 'expense', category_key: 'Supplies',             notes: 'Linens',                   source: 'manual' },
    { user_id: uid, date: addDays(prev, 14), amount:  45.00, type: 'expense', category_key: 'Marketing',            notes: 'Business cards reprint',   source: 'manual' },
    { user_id: uid, date: addDays(prev, 19), amount:  75.00, type: 'expense', category_key: 'Professional Services',notes: 'Accountant consultation',  source: 'manual' },
    // Next month: early sessions (covers UTC timezone rollover)
    { user_id: uid, date: addDays(next, 1), amount: 120.00, type: 'income',  category_key: 'Session Income', notes: '60-min session - R. Chen',   source: 'manual' },
    { user_id: uid, date: addDays(next, 2), amount: 165.00, type: 'income',  category_key: 'Session Income', notes: '90-min session - T. Brooks', source: 'manual' },
    { user_id: uid, date: addDays(next, 3), amount:  30.00, type: 'income',  category_key: 'Tip Income',     notes: 'Tip from T. Brooks',         source: 'manual' },
    { user_id: uid, date: addDays(next, 1), amount:  25.00, type: 'expense', category_key: 'Software',       notes: 'Booking software',           source: 'manual' },
  ]

  const { error: txError } = await supabase.from('transactions').insert(transactions)
  if (txError) return Response.json({ error: txError.message }, { status: 500 })

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = addDays(new Date(), -1)
  await supabase.from('daily_pulse').upsert([
    { user_id: uid, date: yesterday, sessions_given: 4, hours_worked: 5.5, miles_driven: 12.0 },
    { user_id: uid, date: today,     sessions_given: 3, hours_worked: 4.0, miles_driven:  8.0 },
  ], { onConflict: 'user_id,date' })

  // Upsert buckets for cur, prev, next months
  await supabase.from('buckets').upsert([
    { user_id: uid, month: cur.toISOString().slice(0, 10),
      profit_target: 175.50, profit_funded: 114.00,
      tax_target: 438.75,    tax_funded: 285.00,
      ops_target: 1140.75,   ops_funded: 741.00,
      pay_target: 1500.00,   pay_funded: 975.00 },
    { user_id: uid, month: prev.toISOString().slice(0, 10),
      profit_target: 131.50, profit_funded: 131.50,
      tax_target: 328.75,    tax_funded: 328.75,
      ops_target: 855.75,    ops_funded: 855.75,
      pay_target: 1500.00,   pay_funded: 1500.00 },
    { user_id: uid, month: next.toISOString().slice(0, 10),
      profit_target: 31.50,  profit_funded: 0.00,
      tax_target: 78.75,     tax_funded: 0.00,
      ops_target: 200.00,    ops_funded: 25.00,
      pay_target: 1500.00,   pay_funded: 0.00 },
  ], { onConflict: 'user_id,month' })

  // Insert 3 past weeks with transferred: true to establish a week streak
  const curWeekStart = getWeekStart(now)
  const weekRows = [-21, -14, -7].map(offset => {
    const ws = new Date(curWeekStart)
    ws.setUTCDate(ws.getUTCDate() + offset)
    const we = new Date(ws)
    we.setUTCDate(we.getUTCDate() + 6)
    return {
      user_id: uid,
      week_start: ws.toISOString().slice(0, 10),
      week_end: we.toISOString().slice(0, 10),
      income: 285.00, expenses: 80.00,
      tax_amount: 71.25, profit_amount: 28.50, ops_amount: 80.00, pay_amount: 105.25,
      transferred: true,
      transferred_at: we.toISOString(),
    }
  })
  await supabase.from('weekly_summaries').insert(weekRows)

  await supabase.auth.signOut()
  return Response.json({ ok: true, transactions: transactions.length })
}
