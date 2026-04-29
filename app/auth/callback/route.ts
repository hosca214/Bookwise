import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&detail=no_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const msg = encodeURIComponent(error.message ?? 'exchange_failed')
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&detail=${msg}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&detail=no_user`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  const dest = profile?.onboarding_complete ? '/dashboard' : '/onboarding'
  return NextResponse.redirect(`${origin}${dest}`)
}
