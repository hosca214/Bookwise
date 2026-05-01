import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const SCHEDULE_C: Record<string, string> = {
  'Session Income': 'Line 1', 'Package Income': 'Line 1', 'Retainer Income': 'Line 1',
  'Tip Income': 'Line 6', 'Other Income': 'Line 6',
  'Supplies': 'Line 22', 'Equipment': 'Line 22',
  'Software': 'Line 18',
  'Rent': 'Line 20b', 'Facility Fee': 'Line 20b',
  'Insurance': 'Line 15',
  'Continuing Education': 'Line 27a',
  'Marketing': 'Line 8',
  'Mileage': 'Line 9',
  'Meals': 'Line 24b',
  'Professional Services': 'Line 17',
  'Utilities': 'Line 26', 'Phone': 'Line 26', 'Internet': 'Line 26',
  'Other Expense': 'Line 27a',
}

function buildFileName(category: string | null, date: string, originalName: string): string {
  const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : '.jpg'
  if (category && SCHEDULE_C[category]) {
    return `${category} — Schedule C ${SCHEDULE_C[category]} — ${date}${ext}`
  }
  return `${date}-receipt${ext}`
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  const { access_token } = await res.json()
  return access_token
}

async function getOrCreateMonthFolder(accessToken: string, parentId: string, monthLabel: string): Promise<string> {
  const q = `name='${monthLabel}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const { files } = await searchRes.json()
  if (files?.length > 0) return files[0].id

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: monthLabel, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  })
  const folder = await createRes.json()
  if (!folder.id) throw new Error('Folder creation failed')
  return folder.id
}

async function uploadFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
  const boundary = 'bw_boundary'
  const metaBytes = new TextEncoder().encode(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`)
  const filePartBytes = new TextEncoder().encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`)
  const closingBytes = new TextEncoder().encode(`\r\n--${boundary}--`)
  const fileBytes = new Uint8Array(fileBuffer)

  const body = new Uint8Array(metaBytes.length + filePartBytes.length + fileBytes.length + closingBytes.length)
  let offset = 0
  body.set(metaBytes, offset); offset += metaBytes.length
  body.set(filePartBytes, offset); offset += filePartBytes.length
  body.set(fileBytes, offset); offset += fileBytes.length
  body.set(closingBytes, offset)

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error('Upload failed')
  const { id } = await res.json()
  return id
}

async function makePublic(accessToken: string, fileId: string): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })
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

    const txDate = (formData.get('txDate') as string | null) ?? new Date().toISOString().split('T')[0]
    const category = formData.get('category') as string | null

    const fileName = buildFileName(category, txDate, file.name)
    const fileBuffer = await file.arrayBuffer()
    const mimeType = file.type || 'image/jpeg'

    let accessToken = profile.google_drive_access_token as string
    let didRefresh = false

    const run = async (token: string) => {
      return uploadFile(token, profile.google_drive_folder_id, fileName, fileBuffer, mimeType)
    }

    let fileId: string
    try {
      fileId = await run(accessToken)
    } catch {
      accessToken = await refreshAccessToken(profile.google_drive_refresh_token)
      didRefresh = true
      fileId = await run(accessToken)
    }

    await makePublic(accessToken, fileId)

    if (didRefresh) {
      await supabase.from('profiles').update({ google_drive_access_token: accessToken }).eq('id', user.id)
    }

    return NextResponse.json({
      fileId,
      viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1500`,
      fileName,
    })
  } catch {
    return NextResponse.json({ error: 'Could not save to Google Drive.' }, { status: 500 })
  }
}
