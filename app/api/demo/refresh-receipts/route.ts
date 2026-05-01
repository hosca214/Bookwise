import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DEMO_EMAIL = 'demo@bookwise.app'

const SCHEDULE_C: Record<string, string> = {
  'Supplies': 'Line 22',
  'Equipment': 'Line 22',
  'Software': 'Line 18',
  'Rent': 'Line 20b',
  'Insurance': 'Line 15',
  'Continuing Education': 'Line 27a',
  'Marketing': 'Line 8',
  'Session Income': 'Line 1',
  'Package Income': 'Line 1',
  'Tip Income': 'Line 6',
  'Other Income': 'Line 6',
}

const RECEIPT_TYPE: Record<string, string> = {
  'Supplies': 'target',
  'Equipment': 'online',
  'Rent': 'invoice',
  'Continuing Education': 'training',
  'Insurance': 'insurance',
  'Software': 'subscription',
}

// Income transactions to generate invoices for
const INCOME_INVOICES = [
  { date: '2026-05-01', client: 'Jennifer P', service: '90-min Deep Tissue', amount: '180', category: 'Session Income', notes: 'Jennifer P - deep tissue' },
  { date: '2026-05-01', client: 'Keisha T',   service: '4-Session Package',   amount: '440', category: 'Package Income', notes: 'Keisha T - 4-pack' },
  { date: '2026-04-22', client: 'Dana L',     service: '4-Session Package',   amount: '440', category: 'Package Income', notes: 'Dana L - 4-pack' },
]

async function refreshToken(refreshTok: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshTok,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  const { access_token } = await res.json()
  return access_token
}

async function uploadToDrive(accessToken: string, folderId: string, fileName: string, buffer: ArrayBuffer): Promise<string> {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
  const boundary = 'receipt_boundary'
  const metaBytes = new TextEncoder().encode(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`)
  const filePartBytes = new TextEncoder().encode(`--${boundary}\r\nContent-Type: image/png\r\n\r\n`)
  const closingBytes = new TextEncoder().encode(`\r\n--${boundary}--`)
  const fileBytes = new Uint8Array(buffer)
  const body = new Uint8Array(metaBytes.length + filePartBytes.length + fileBytes.length + closingBytes.length)
  let offset = 0
  body.set(metaBytes, offset); offset += metaBytes.length
  body.set(filePartBytes, offset); offset += filePartBytes.length
  body.set(fileBytes, offset); offset += fileBytes.length
  body.set(closingBytes, offset)

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`)
  const { id } = await res.json()
  await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })
  return id
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email !== DEMO_EMAIL) return NextResponse.json({ error: 'Demo account only.' }, { status: 403 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('google_drive_folder_id, google_drive_access_token, google_drive_refresh_token')
      .eq('id', user.id)
      .single()

    if (!profile?.google_drive_folder_id || !profile?.google_drive_refresh_token) {
      return NextResponse.json({ error: 'Connect Google Drive first.' }, { status: 400 })
    }

    let accessToken = profile.google_drive_access_token as string
    const folderId = profile.google_drive_folder_id
    const baseUrl = new URL(request.url).origin

    async function getImage(url: string): Promise<ArrayBuffer> {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Receipt gen failed: ${url}`)
      return res.arrayBuffer()
    }

    async function upload(fileName: string, buffer: ArrayBuffer): Promise<string> {
      try {
        return await uploadToDrive(accessToken, folderId, fileName, buffer)
      } catch {
        accessToken = await refreshToken(profile.google_drive_refresh_token)
        await supabase.from('profiles').update({ google_drive_access_token: accessToken }).eq('id', user.id)
        return await uploadToDrive(accessToken, folderId, fileName, buffer)
      }
    }

    const uploaded: string[] = []

    // Re-upload expense receipts
    const { data: expenseTxs } = await supabase
      .from('transactions')
      .select('id, date, type, category_key, notes')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .not('receipt_url', 'is', null)
      .order('date')

    for (const tx of expenseTxs ?? []) {
      const receiptType = RECEIPT_TYPE[tx.category_key]
      if (!receiptType) continue
      const scheduleC = SCHEDULE_C[tx.category_key] ?? 'Line 27a'
      const fileName = `${tx.date} - Expense - ${tx.category_key} - ${scheduleC}.png`
      const buffer = await getImage(`${baseUrl}/api/demo/receipt?type=${receiptType}`)
      const fileId = await upload(fileName, buffer)
      await supabase.from('transactions').update({
        receipt_url: `https://drive.google.com/file/d/${fileId}/view`,
        receipt_filename: fileName,
      }).eq('id', tx.id)
      uploaded.push(fileName)
    }

    // Generate income invoices
    for (const inv of INCOME_INVOICES) {
      const scheduleC = SCHEDULE_C[inv.category] ?? 'Line 1'
      const fileName = `${inv.date} - Income - ${inv.category} - ${scheduleC}.png`
      const params = new URLSearchParams({ type: 'client-invoice', client: inv.client, service: inv.service, amount: inv.amount, date: inv.date, category: inv.category })
      const buffer = await getImage(`${baseUrl}/api/demo/receipt?${params}`)
      const fileId = await upload(fileName, buffer)
      await supabase.from('transactions')
        .update({
          receipt_url: `https://drive.google.com/file/d/${fileId}/view`,
          receipt_filename: fileName,
        })
        .eq('user_id', user.id)
        .eq('date', inv.date)
        .eq('notes', inv.notes)
      uploaded.push(fileName)
    }

    return NextResponse.json({ ok: true, uploaded })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
