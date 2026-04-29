import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

const plaidClient = new PlaidApi(
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

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Bookwise',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch {
    return NextResponse.json({ error: 'Could not create link token.' }, { status: 500 })
  }
}
