import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') || 'settings'
  const error = searchParams.get('error')

  const errorDest = state === 'onboarding' ? '/onboarding?driveError=1' : '/settings?driveError=1'

  if (error || !code) {
    return NextResponse.redirect(new URL(errorDest, request.url))
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const redirectUri = `${origin}/api/auth/google-drive/callback`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) throw new Error('Token exchange failed')
    const { access_token, refresh_token } = await tokenRes.json()

    const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Bookwise Receipts',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })

    if (!folderRes.ok) throw new Error('Folder creation failed')
    const { id: folderId } = await folderRes.json()

    await supabase
      .from('profiles')
      .update({
        google_drive_folder_id: folderId,
        google_drive_access_token: access_token,
        google_drive_refresh_token: refresh_token,
      })
      .eq('id', user.id)

    const dest = state === 'onboarding' ? '/onboarding?driveConnected=1' : '/settings?driveConnected=1'
    return NextResponse.redirect(new URL(dest, request.url))
  } catch {
    return NextResponse.redirect(new URL(errorDest, request.url))
  }
}
