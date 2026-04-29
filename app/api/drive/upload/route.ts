import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  const { access_token } = await res.json()
  return access_token
}

async function uploadToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<void> {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
  const boundary = 'bookwise_boundary'

  const metaPart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`
  const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  const closing = `\r\n--${boundary}--`

  const metaBytes = new TextEncoder().encode(metaPart)
  const filePartBytes = new TextEncoder().encode(filePart)
  const closingBytes = new TextEncoder().encode(closing)
  const fileBytes = new Uint8Array(fileBuffer)

  const body = new Uint8Array(
    metaBytes.length + filePartBytes.length + fileBytes.length + closingBytes.length
  )
  let offset = 0
  body.set(metaBytes, offset); offset += metaBytes.length
  body.set(filePartBytes, offset); offset += filePartBytes.length
  body.set(fileBytes, offset); offset += fileBytes.length
  body.set(closingBytes, offset)

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!uploadRes.ok) throw new Error('Drive upload failed')
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('google_drive_folder_id, google_drive_access_token, google_drive_refresh_token')
      .eq('id', user.id)
      .single()

    if (!profile?.google_drive_folder_id || !profile?.google_drive_refresh_token) {
      return NextResponse.json({ error: 'Google Drive not connected.' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fileBuffer = await file.arrayBuffer()
    const fileName = `${new Date().toISOString().split('T')[0]}-${file.name}`

    // Always refresh the token to avoid expiry issues
    const accessToken = await refreshAccessToken(profile.google_drive_refresh_token)

    // Save the refreshed token for next time
    await supabase
      .from('profiles')
      .update({ google_drive_access_token: accessToken })
      .eq('id', user.id)

    await uploadToDrive(
      accessToken,
      profile.google_drive_folder_id,
      fileName,
      fileBuffer,
      file.type || 'image/jpeg'
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not save to Google Drive.' }, { status: 500 })
  }
}
