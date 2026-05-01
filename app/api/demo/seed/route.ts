import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DEMO_EMAIL = 'demo@bookwise.app'

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

async function uploadImageToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  imageBuffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
  const boundary = 'seed_boundary'
  const metaBytes = new TextEncoder().encode(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`)
  const filePartBytes = new TextEncoder().encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`)
  const closingBytes = new TextEncoder().encode(`\r\n--${boundary}--`)
  const fileBytes = new Uint8Array(imageBuffer)
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
  if (!res.ok) throw new Error('Upload failed')
  const { id } = await res.json()

  await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })
  return id
}

async function generateReceiptPng(baseUrl: string, type: string): Promise<ArrayBuffer> {
  const res = await fetch(`${baseUrl}/api/demo/receipt?type=${type}`)
  if (!res.ok) throw new Error(`Receipt generation failed for type: ${type}`)
  return res.arrayBuffer()
}

const today = new Date()
function daysAgo(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
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

    // Generate receipt images
    const receiptTypes: Array<{ type: string; fileName: string; label: string }> = [
      { type: 'target',       fileName: 'Supplies — Schedule C Line 22 — receipt.png',         label: 'target' },
      { type: 'online',       fileName: 'Equipment — Schedule C Line 22 — receipt.png',        label: 'online' },
      { type: 'invoice',      fileName: 'Rent — Schedule C Line 20b — receipt.png',            label: 'invoice' },
      { type: 'training',     fileName: 'Continuing Education — Schedule C Line 27a — receipt.png', label: 'training' },
      { type: 'insurance',    fileName: 'Insurance — Schedule C Line 15 — receipt.png',        label: 'insurance' },
      { type: 'subscription', fileName: 'Software — Schedule C Line 18 — receipt.png',         label: 'subscription' },
    ]

    const receiptUrls: Record<string, string> = {}

    for (const r of receiptTypes) {
      const pngBuffer = await generateReceiptPng(baseUrl, r.type)
      let fileId: string
      try {
        fileId = await uploadImageToDrive(accessToken, folderId, r.fileName, pngBuffer, 'image/png')
      } catch {
        accessToken = await refreshAccessToken(profile.google_drive_refresh_token)
        await supabase.from('profiles').update({ google_drive_access_token: accessToken }).eq('id', user.id)
        fileId = await uploadImageToDrive(accessToken, folderId, r.fileName, pngBuffer, 'image/png')
      }
      receiptUrls[r.label] = `https://drive.google.com/file/d/${fileId}/view`
    }

    // Clear existing demo transactions
    await supabase.from('transactions').delete().eq('user_id', user.id)

    // Create services
    await supabase.from('services').delete().eq('user_id', user.id)
    const { data: services } = await supabase.from('services').insert([
      { user_id: user.id, name: '60-min Session', price: 120, duration_minutes: 60, is_active: true },
      { user_id: user.id, name: '90-min Session', price: 165, duration_minutes: 90, is_active: true },
      { user_id: user.id, name: '90-min Deep Tissue', price: 180, duration_minutes: 90, is_active: true },
      { user_id: user.id, name: '4-Session Package', price: 440, duration_minutes: null, is_active: true },
      { user_id: user.id, name: 'Add-On (15 min)', price: 35, duration_minutes: 15, is_active: true },
      { user_id: user.id, name: 'Hot Stone Upgrade', price: 195, duration_minutes: 90, is_active: true },
    ]).select()
    const s90 = services?.find(s => s.name === '90-min Session')?.id ?? null
    const s60 = services?.find(s => s.name === '60-min Session')?.id ?? null
    const sDT = services?.find(s => s.name === '90-min Deep Tissue')?.id ?? null
    const sPk = services?.find(s => s.name === '4-Session Package')?.id ?? null

    const txs = [
      // ---- APRIL (this month) income ----
      { date: daysAgo(1),  amount: 165, type: 'income', category_key: 'Session Income',   notes: 'Sarah K — 90 min', source: 'manual', service_id: s90 },
      { date: daysAgo(2),  amount: 30,  type: 'income', category_key: 'Tip Income',        notes: 'Cash tip from Sarah K', source: 'manual' },
      { date: daysAgo(3),  amount: 120, type: 'income', category_key: 'Session Income',   notes: 'Marcus R — 60 min', source: 'manual', service_id: s60 },
      { date: daysAgo(5),  amount: 180, type: 'income', category_key: 'Session Income',   notes: 'Jennifer P — deep tissue', source: 'manual', service_id: sDT },
      { date: daysAgo(6),  amount: 440, type: 'income', category_key: 'Package Income',   notes: 'Dana L — 4-pack', source: 'manual', service_id: sPk },
      { date: daysAgo(8),  amount: 165, type: 'income', category_key: 'Session Income',   notes: 'Tomas V — 90 min', source: 'manual', service_id: s90 },
      { date: daysAgo(9),  amount: 20,  type: 'income', category_key: 'Tip Income',        notes: null, source: 'manual' },
      { date: daysAgo(10), amount: 120, type: 'income', category_key: 'Session Income',   notes: 'Patricia W', source: 'manual', service_id: s60 },
      { date: daysAgo(12), amount: 180, type: 'income', category_key: 'Session Income',   notes: 'Alex M — deep tissue', source: 'manual', service_id: sDT },
      { date: daysAgo(14), amount: 165, type: 'income', category_key: 'Session Income',   notes: 'Cleo B — 90 min', source: 'manual', service_id: s90 },
      { date: daysAgo(15), amount: 35,  type: 'income', category_key: 'Tip Income',        notes: null, source: 'manual' },
      // ---- APRIL expenses ----
      { date: daysAgo(4),  amount: 44.50, type: 'expense', category_key: 'Supplies',     notes: 'Target — linens and table covers', source: 'manual', receipt_url: receiptUrls['target'], receipt_filename: 'Target-Supplies-Receipt.png' },
      { date: daysAgo(7),  amount: 65.00, type: 'expense', category_key: 'Equipment',    notes: 'Natural Bodywork Supply — oils', source: 'manual', receipt_url: receiptUrls['online'], receipt_filename: 'NBS-Order-Receipt.png' },
      { date: daysAgo(11), amount: 800,   type: 'expense', category_key: 'Rent',          notes: 'Serenity Spaces — April rent', source: 'manual', receipt_url: receiptUrls['invoice'], receipt_filename: 'Serenity-Spaces-Invoice.png' },
      { date: daysAgo(13), amount: 35,    type: 'expense', category_key: 'Insurance',     notes: 'Professional Protect — April', source: 'manual', receipt_url: receiptUrls['insurance'], receipt_filename: 'Insurance-Payment.png' },
      { date: daysAgo(16), amount: 25,    type: 'expense', category_key: 'Software',      notes: 'Jane App — monthly plan', source: 'manual', receipt_url: receiptUrls['subscription'], receipt_filename: 'JaneApp-Subscription.png' },
      // ---- MARCH income ----
      { date: daysAgo(20), amount: 165, type: 'income', category_key: 'Session Income',   notes: 'Sarah K — 90 min', source: 'manual', service_id: s90 },
      { date: daysAgo(21), amount: 120, type: 'income', category_key: 'Session Income',   notes: 'Marcus R', source: 'manual', service_id: s60 },
      { date: daysAgo(22), amount: 40,  type: 'income', category_key: 'Tip Income',        notes: null, source: 'manual' },
      { date: daysAgo(23), amount: 180, type: 'income', category_key: 'Session Income',   notes: 'Jennifer P — deep tissue', source: 'manual', service_id: sDT },
      { date: daysAgo(25), amount: 165, type: 'income', category_key: 'Session Income',   notes: 'Tomas V', source: 'manual', service_id: s90 },
      { date: daysAgo(26), amount: 440, type: 'income', category_key: 'Package Income',   notes: 'New client package — Reena S', source: 'manual', service_id: sPk },
      { date: daysAgo(28), amount: 120, type: 'income', category_key: 'Session Income',   notes: null, source: 'manual', service_id: s60 },
      { date: daysAgo(29), amount: 20,  type: 'income', category_key: 'Tip Income',        notes: null, source: 'manual' },
      { date: daysAgo(30), amount: 165, type: 'income', category_key: 'Session Income',   notes: 'Cleo B', source: 'manual', service_id: s90 },
      // ---- MARCH expenses ----
      { date: daysAgo(19), amount: 800,   type: 'expense', category_key: 'Rent',          notes: 'Serenity Spaces — March rent', source: 'manual', receipt_url: receiptUrls['invoice'], receipt_filename: 'Serenity-Spaces-Invoice-March.png' },
      { date: daysAgo(24), amount: 130,   type: 'expense', category_key: 'Continuing Education', notes: 'ABMP — Myofascial Release L2', source: 'manual', receipt_url: receiptUrls['training'], receipt_filename: 'ABMP-Training-Receipt.png' },
      { date: daysAgo(27), amount: 35,    type: 'expense', category_key: 'Insurance',     notes: 'Professional Protect — March', source: 'manual', receipt_url: receiptUrls['insurance'], receipt_filename: 'Insurance-Payment-March.png' },
      { date: daysAgo(31), amount: 25,    type: 'expense', category_key: 'Software',      notes: 'Jane App — monthly plan', source: 'manual', receipt_url: receiptUrls['subscription'], receipt_filename: 'JaneApp-Subscription-March.png' },
    ]

    await supabase.from('transactions').insert(
      txs.map(tx => ({
        user_id: user.id,
        is_personal: false,
        pulse_matched: false,
        ...tx,
        receipt_url: (tx as Record<string, unknown>).receipt_url ?? null,
        receipt_filename: (tx as Record<string, unknown>).receipt_filename ?? null,
      }))
    )

    // Buckets
    const thisMonth = today.toISOString().slice(0, 7) + '-01'
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10)
    await supabase.from('buckets').upsert([
      { user_id: user.id, month: thisMonth, profit_target: 220, profit_funded: 132, tax_target: 550, tax_funded: 385, ops_target: 594, ops_funded: 594, pay_target: 3500, pay_funded: 1500 },
      { user_id: user.id, month: lastMonth, profit_target: 220, profit_funded: 220, tax_target: 550, tax_funded: 550, ops_target: 594, ops_funded: 570, pay_target: 3500, pay_funded: 3200, celebration_note: 'Took myself out for sushi.' },
    ], { onConflict: 'user_id,month' })

    // Daily pulse
    await supabase.from('daily_pulse').delete().eq('user_id', user.id)
    await supabase.from('daily_pulse').insert([
      { user_id: user.id, date: daysAgo(0), sessions_given: 2, hours_worked: 3.5, miles_driven: 4.2 },
      { user_id: user.id, date: daysAgo(1), sessions_given: 3, hours_worked: 5,   miles_driven: 0 },
    ])

    return NextResponse.json({ ok: true, receipts: Object.keys(receiptUrls) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
