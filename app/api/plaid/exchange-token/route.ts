import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Configuration, PlaidApi, PlaidEnvironments, Transaction } from 'plaid'

function makePlaidClient() {
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments ?? 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
          'PLAID-SECRET': process.env.PLAID_SECRET!,
        },
      },
    })
  )
}

type MappedTx = { category_key: string; type: 'income' | 'expense' } | null

function mapTransaction(tx: Transaction): MappedTx {
  const name = (tx.merchant_name ?? tx.name ?? '').toLowerCase()
  const primary = (tx.personal_finance_category?.primary ?? '').toUpperCase()
  const detailed = (tx.personal_finance_category?.detailed ?? '').toUpperCase()

  // Skip internal transfers and loan payments
  if (primary === 'TRANSFER_OUT' || primary === 'LOAN_PAYMENTS') return null
  if (primary === 'BANK_FEES') return null

  // Plaid: positive amount = money leaving account (expense), negative = money coming in (income)
  if (tx.amount < 0) {
    if (
      name.includes('stripe') || name.includes('square') || name.includes('paypal') ||
      name.includes('venmo') || name.includes('zelle') || name.includes('cash app')
    ) {
      return { category_key: 'Session Income', type: 'income' }
    }
    if (primary === 'TRANSFER_IN') return null // skip internal account transfers
    return { category_key: 'Other Income', type: 'income' }
  }

  // Expenses
  if (primary === 'FOOD_AND_DRINK') return { category_key: 'Meals', type: 'expense' }
  if (primary === 'TRANSPORTATION') return { category_key: 'Mileage', type: 'expense' }
  if (primary === 'RENT_AND_UTILITIES') return { category_key: 'Rent', type: 'expense' }
  if (primary === 'MEDICAL') return { category_key: 'Insurance', type: 'expense' }
  if (primary === 'GENERAL_SERVICES') return { category_key: 'Professional Services', type: 'expense' }
  if (primary === 'PERSONAL_CARE') return { category_key: 'Supplies', type: 'expense' }
  if (
    detailed.includes('SOFTWARE') || detailed.includes('SUBSCRIPTION') ||
    name.includes('software') || name.includes('subscription') || name.includes('app.')
  ) {
    return { category_key: 'Software', type: 'expense' }
  }
  if (
    primary === 'GENERAL_MERCHANDISE' || detailed.includes('OFFICE') ||
    name.includes('supply') || name.includes('supplies')
  ) {
    return { category_key: 'Supplies', type: 'expense' }
  }
  if (primary === 'ENTERTAINMENT') return { category_key: 'Other Expense', type: 'expense' }

  return { category_key: 'Other Expense', type: 'expense' }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { public_token } = await request.json()
    if (!public_token) return NextResponse.json({ error: 'Missing public_token.' }, { status: 400 })

    const plaid = makePlaidClient()
    const exchangeRes = await plaid.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeRes.data

    await supabase
      .from('profiles')
      .update({ plaid_access_token: access_token, plaid_item_id: item_id })
      .eq('id', user.id)

    await syncTransactions(supabase, user.id, access_token, plaid)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not connect your bank account.' }, { status: 500 })
  }
}

async function syncTransactions(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase-server').createServerSupabaseClient>>,
  userId: string,
  accessToken: string,
  plaid: PlaidApi
) {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const txRes = await plaid.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 100, offset: 0 },
  })

  const validRows = txRes.data.transactions
    .map((tx) => {
      const mapped = mapTransaction(tx)
      if (!mapped) return null
      return {
        user_id: userId,
        date: tx.date,
        amount: Math.abs(tx.amount),
        type: mapped.type,
        category_key: mapped.category_key,
        notes: tx.merchant_name ?? tx.name,
        source: 'plaid',
        external_id: tx.transaction_id,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  if (validRows.length > 0) {
    await supabase
      .from('transactions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(validRows as any, { onConflict: 'user_id,external_id', ignoreDuplicates: true })
  }
}
