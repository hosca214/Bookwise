import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_drive_access_token, google_drive_refresh_token')
    .eq('id', user.id)
    .single()

  if (!profile?.google_drive_access_token) {
    return NextResponse.json({ error: 'Drive not connected' }, { status: 400 })
  }

  async function fetchFile(token: string) {
    return fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  let res = await fetchFile(profile.google_drive_access_token)

  if (res.status === 401 && profile.google_drive_refresh_token) {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: profile.google_drive_refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    if (tokenRes.ok) {
      const { access_token } = await tokenRes.json()
      await supabase.from('profiles').update({ google_drive_access_token: access_token }).eq('id', user.id)
      res = await fetchFile(access_token)
    }
  }

  if (!res.ok) return NextResponse.json({ error: 'Could not load image' }, { status: 502 })

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
