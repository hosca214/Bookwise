import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

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

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('plaid_access_token')
      .eq('id', user.id)
      .single()

    if (profile?.plaid_access_token) {
      try {
        const plaid = makePlaidClient()
        await plaid.itemRemove({ access_token: profile.plaid_access_token })
      } catch {
        // If Plaid rejects the removal, still clear local credentials.
      }
    }

    const { error: clearError } = await supabase
      .from('profiles')
      .update({ plaid_access_token: null, plaid_item_id: null })
      .eq('id', user.id)
    if (clearError) throw clearError

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not disconnect.' }, { status: 500 })
  }
}
