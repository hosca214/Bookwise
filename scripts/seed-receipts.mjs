/**
 * Generates SVG receipts and uploads them to Supabase Storage,
 * then links each one to a demo account expense transaction.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bqtvlowshzqkdepdxcsy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHZsb3dzaHpxa2RlcGR4Y3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTg3OTQsImV4cCI6MjA5Mjc5NDc5NH0.totioXIiBLytIZCRAY88LfW5Z9_BqNFQBsoB1VhoF0Y'
const DEMO_USER_ID = '6b70fdf6-579e-436b-a932-829f2e398d01'

function makeSVGReceipt({ store, addr, date, txn, items, total, payment }) {
  const W = 380
  const LINE = 22
  const PAD = 24
  let y = PAD + 16

  const lines = []
  const push = (text, x, bold = false, right = false, color = '#222', size = 13) => {
    const anchor = right ? 'end' : 'start'
    lines.push(
      `<text x="${x}" y="${y}" font-family="'Courier New',monospace" font-size="${size}" ` +
      `font-weight="${bold ? 'bold' : 'normal'}" fill="${color}" text-anchor="${anchor}">${text}</text>`
    )
  }
  const dash = (yy) =>
    `<line x1="${PAD}" y1="${yy}" x2="${W - PAD}" y2="${yy}" stroke="#aaa" stroke-dasharray="4,3" stroke-width="1"/>`

  // Store name
  lines.push(
    `<text x="${W / 2}" y="${y}" font-family="'Courier New',monospace" font-size="16" ` +
    `font-weight="bold" fill="#111" text-anchor="middle" letter-spacing="2">${store}</text>`
  )
  y += 20

  // Address (two lines if contains ·)
  const addrParts = addr.split('·')
  for (const part of addrParts) {
    lines.push(
      `<text x="${W / 2}" y="${y}" font-family="'Courier New',monospace" font-size="11" ` +
      `fill="#666" text-anchor="middle">${part.trim()}</text>`
    )
    y += 15
  }
  y += 6

  // Divider
  lines.push(dash(y)); y += 14

  // Meta
  push(`Date:`, PAD, false, false, '#555'); push(date, W - PAD, false, true, '#222')
  y += LINE
  push(`Receipt #:`, PAD, false, false, '#555'); push(txn, W - PAD, false, true, '#222')
  y += LINE + 4

  // Divider
  lines.push(dash(y)); y += 14

  // Items
  for (const [label, amount] of items) {
    if (label.startsWith('  ')) {
      push(label, PAD + 8, false, false, '#888', 12)
    } else {
      push(label, PAD); push(amount, W - PAD, false, true)
    }
    y += LINE - 2
  }
  y += 4

  // Divider
  lines.push(dash(y)); y += 14

  // Total
  push('TOTAL', PAD, true, false, '#111', 15)
  push(total, W - PAD, true, true, '#111', 15)
  y += LINE
  push('Payment', PAD, false, false, '#555'); push(payment, W - PAD, false, true)
  y += LINE + 6

  // Divider
  lines.push(dash(y)); y += 14

  // Footer
  lines.push(
    `<text x="${W / 2}" y="${y}" font-family="'Courier New',monospace" font-size="11" ` +
    `fill="#888" text-anchor="middle">Thank you for your business!</text>`
  )
  y += 28

  const H = y
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="white"/>` +
    lines.join('') +
    `</svg>`
  )
}

const RECEIPTS = [
  {
    txId: '1a705814-b025-41d6-aa42-ef241cc31389',
    filename: 'receipt-oils-apr23.svg',
    receipt: makeSVGReceipt({
      store: 'MASSAGE WAREHOUSE',
      addr: '3812 Maple Ave, Dallas TX 75219 · (214) 555-0142',
      date: 'Apr 23, 2026', txn: '89223-A',
      items: [
        ['Unscented Massage Oil 1gal', '$18.50'],
        ['Lavender Essential Oil 2oz', '$11.50'],
      ],
      total: '$30.00', payment: 'Visa ...4821',
    }),
  },
  {
    txId: 'd9576381-9256-4f65-886b-f247488a8f91',
    filename: 'receipt-ce-apr13.svg',
    receipt: makeSVGReceipt({
      store: 'ABMP',
      addr: 'Associated Bodywork & Massage Professionals · abmp.com',
      date: 'Apr 13, 2026', txn: 'WS-2026-0413',
      items: [
        ['Myofascial Release Workshop', '$150.00'],
        ['  4 CE Credits · Online', ''],
      ],
      total: '$150.00', payment: 'Visa ...4821',
    }),
  },
  {
    txId: 'e2b7b736-fa1a-46b5-8ae9-7ad801b10f2c',
    filename: 'receipt-linens-apr10.svg',
    receipt: makeSVGReceipt({
      store: 'LINEN & SPA SUPPLY',
      addr: '7201 Commerce St, Dallas TX 75226 · (214) 555-0388',
      date: 'Apr 10, 2026', txn: '55910',
      items: [
        ['Massage Table Sheets (set/3)', '$28.00'],
        ['Flannel Blanket', '$17.00'],
      ],
      total: '$45.00', payment: 'Visa ...4821',
    }),
  },
  {
    txId: '9abc0bd8-b7ea-4c5b-a486-98e203249760',
    filename: 'receipt-equipment-apr08.svg',
    receipt: makeSVGReceipt({
      store: 'BODY THERAPY SUPPLY',
      addr: 'bodytherapysupply.com · Order BTS-44812',
      date: 'Apr 8, 2026', txn: 'BTS-44812',
      items: [
        ['Aromatherapy Diffuser', '$42.00'],
        ['Eucalyptus Essential Oil 4oz', '$14.00'],
        ['Peppermint Essential Oil 4oz', '$9.00'],
      ],
      total: '$65.00', payment: 'Visa ...4821',
    }),
  },
  {
    txId: '6b6a6244-a3a6-4683-bd27-07db0d9f9d38',
    filename: 'receipt-software-apr05.svg',
    receipt: makeSVGReceipt({
      store: 'JANE APP',
      addr: 'jane.app · Booking & Practice Management',
      date: 'Apr 5, 2026', txn: 'INV-2026-04-SAGE',
      items: [
        ['Solo Practitioner Plan · April 2026', '$25.00'],
      ],
      total: '$25.00', payment: 'Visa ...4821',
    }),
  },
]

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'demo@bookwise.app',
    password: 'Demo2025!',
  })
  if (authErr) throw new Error(`Auth failed: ${authErr.message}`)
  console.log('Signed in as demo@bookwise.app')

  for (const { txId, filename, receipt } of RECEIPTS) {
    const storagePath = `receipts/${DEMO_USER_ID}/2026-04/${filename}`
    const blob = new Blob([receipt], { type: 'image/svg+xml' })

    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(storagePath, blob, { contentType: 'image/svg+xml', upsert: true })

    if (uploadErr) {
      console.error(`  UPLOAD FAILED ${filename}: ${uploadErr.message}`)
      continue
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath)

    const { error: updateErr } = await supabase
      .from('transactions')
      .update({ receipt_url: urlData.publicUrl })
      .eq('id', txId)

    if (updateErr) {
      console.error(`  DB UPDATE FAILED ${txId}: ${updateErr.message}`)
    } else {
      console.log(`  ✓ ${filename}`)
    }
  }

  await supabase.auth.signOut()
  console.log('\nAll done.')
}

main().catch(err => { console.error(err); process.exit(1) })
