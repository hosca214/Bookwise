import React from 'react'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const W = 400

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: bold ? 700 : 400, marginBottom: 3 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Divider({ style }: { style?: React.CSSProperties }) {
  return <div style={{ width: '100%', height: 1, background: '#ddd', margin: '10px 0', ...style }} />
}

function targetReceipt() {
  return new ImageResponse(
    (
      <div style={{ width: W, background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 24px', fontFamily: '"Courier New", monospace' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>T</span>
          </div>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#CC0000', letterSpacing: '-0.5px' }}>Target</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 10, color: '#555', marginBottom: 14 }}>
          <span>TARGET STORE #3847</span>
          <span>5201 W IRVING PARK RD, CHICAGO IL 60641</span>
          <span>TEL: (773) 685-4400</span>
        </div>
        <div style={{ width: '100%', height: 1, background: '#aaa', marginBottom: 10 }} />
        <div style={{ width: '100%', fontSize: 11, color: '#333', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, color: '#777' }}>
            <span>CASHIER: M. JOHNSON</span>
            <span>REG: 12  TRANS: 8821</span>
          </div>
          <Row label="MASSAGE TABLE COVER" value="$18.99" />
          <Row label="PILLOW CASES 4PK STD" value="$9.49" />
          <Row label="DRAPING FLAT SHEETS 2PK" value="$12.99" />
          <Row label="HAND SOAP REFILL 56oz" value="$5.49" />
          <div style={{ width: '100%', height: 1, background: '#ccc', margin: '8px 0', borderTop: '1px dashed #aaa' }} />
          <Row label="SUBTOTAL" value="$46.96" />
          <Row label="TAX (9.25%)" value="$4.34" />
          <div style={{ width: '100%', height: 1, background: '#aaa', margin: '6px 0' }} />
          <Row label="TOTAL" value="$51.30" bold />
          <div style={{ width: '100%', height: 1, background: '#aaa', margin: '6px 0' }} />
          <Row label="VISA ****5821" value="$51.30" />
          <Row label="CHANGE DUE" value="$0.00" />
        </div>
        <div style={{ width: '100%', height: 1, background: '#aaa', margin: '10px 0' }} />
        <div style={{ fontSize: 10, color: '#555', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 9, letterSpacing: 4, fontFamily: 'monospace', color: '#333' }}>||| || | ||| | || ||||| || ||| | || ||||</span>
          <span style={{ fontSize: 9 }}>3847-8821-0428-14</span>
          <span style={{ marginTop: 6, fontWeight: 700 }}>THANK YOU FOR SHOPPING AT TARGET!</span>
          <span style={{ fontSize: 9, marginTop: 2 }}>Returns accepted within 90 days with receipt.</span>
        </div>
      </div>
    ),
    { width: W, height: 680 }
  )
}

function onlineOrderReceipt() {
  return new ImageResponse(
    (
      <div style={{ width: W, background: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ background: '#1a6b4a', padding: '18px 24px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#a8e6c9', fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>NATURAL BODYWORK SUPPLY CO.</span>
          <span style={{ color: 'white', fontSize: 20, fontWeight: 800, marginTop: 2 }}>Order Confirmed</span>
          <span style={{ color: '#c8f0dc', fontSize: 11, marginTop: 4 }}>Order #NBS-44182 · Ships within 2 business days</span>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f7faf9', borderRadius: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e24' }}>Sweet Almond Carrier Oil 32oz</span>
                <span style={{ fontSize: 11, color: '#667' }}>Qty: 1 · SKU: SAO-32</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a6b4a' }}>$24.99</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f7faf9', borderRadius: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e24' }}>Lavender Essential Oil 4oz</span>
                <span style={{ fontSize: 11, color: '#667' }}>Qty: 2 · SKU: LEO-4</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a6b4a' }}>$28.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f7faf9', borderRadius: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e24' }}>Unscented Massage Lotion 16oz</span>
                <span style={{ fontSize: 11, color: '#667' }}>Qty: 1 · SKU: UML-16</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a6b4a' }}>$12.00</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e0ece8', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>
              <span>Subtotal</span><span>$64.99</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#1a6b4a' }}>
              <span>Shipping</span><span>FREE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#1a2e24', marginTop: 4 }}>
              <span>Order Total</span><span>$64.99</span>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#edf7f2', borderRadius: 8, fontSize: 11, color: '#1a6b4a' }}>
            <span style={{ fontWeight: 700 }}>Ships to:</span> 4841 N Ravenswood Ave, Chicago IL 60640
          </div>
        </div>
      </div>
    ),
    { width: W, height: 570 }
  )
}

function invoiceReceipt() {
  return new ImageResponse(
    (
      <div style={{ width: W, background: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Georgia, serif' }}>
        <div style={{ background: '#2c3e50', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#95a5a6', fontSize: 10, letterSpacing: 3, fontFamily: 'Arial' }}>INVOICE</span>
            <span style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 2 }}>Serenity Spaces LLC</span>
            <span style={{ color: '#bdc3c7', fontSize: 10, marginTop: 2, fontFamily: 'Arial' }}>3200 N Lincoln Ave, Suite 4B · Chicago IL</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: '#ecf0f1', fontSize: 22, fontWeight: 800, fontFamily: 'Arial' }}>$800.00</span>
            <span style={{ color: '#27ae60', fontSize: 10, fontFamily: 'Arial', background: '#1e8449', padding: '2px 8px', borderRadius: 4, marginTop: 4 }}>PAID</span>
          </div>
        </div>
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#777', letterSpacing: 1 }}>INVOICE NUMBER</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2c3e50' }}>SS-2024-041</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 10, color: '#777', letterSpacing: 1 }}>DATE ISSUED</span>
              <span style={{ fontSize: 13, color: '#2c3e50' }}>April 1, 2024</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#777', letterSpacing: 1 }}>BILLED TO</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50' }}>Hands & Heart Massage</span>
              <span style={{ fontSize: 11, color: '#555' }}>4841 N Ravenswood Ave</span>
            </div>
          </div>
          <div style={{ background: '#f8f9fa', padding: 14, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2c3e50' }}>Treatment Room Rental — Suite 4B</span>
                <span style={{ fontSize: 11, color: '#555', marginTop: 3 }}>April 2024 · 1 calendar month · 240 sq ft</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#2c3e50' }}>$800.00</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '2px solid #2c3e50', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#555' }}>Subtotal</span><span>$800.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#555' }}>Tax</span><span>$0.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, marginTop: 4 }}>
              <span>TOTAL</span><span>$800.00</span>
            </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 10, color: '#888', borderTop: '1px solid #eee', paddingTop: 10 }}>
            Payment received via ACH transfer on April 3, 2024. Thank you.
          </div>
        </div>
      </div>
    ),
    { width: W, height: 560 }
  )
}

function trainingReceipt() {
  return new ImageResponse(
    (
      <div style={{ width: W, background: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ background: '#5b4fcf', padding: '18px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 900 }}>A</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'white', fontSize: 14, fontWeight: 800 }}>ABMP Online Learning</span>
              <span style={{ color: '#c5bef7', fontSize: 10 }}>Associated Bodywork & Massage Professionals</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 900 }}>✓</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e' }}>Registration Confirmed</span>
          </div>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', display: 'flex', marginBottom: 6 }}>Myofascial Release Techniques: Level 2</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#555' }}>
              <span>Instructor: Patricia Holden, LMT</span>
              <span>Format: Online Self-Paced</span>
              <span>CE Hours Awarded: <span style={{ fontWeight: 700, color: '#5b4fcf' }}>6.0 CE Hours</span></span>
              <span>Access Period: 12 months from purchase</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Confirmation #</span>
              <span style={{ fontWeight: 600 }}>ABMP-2024-88291</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Course fee</span>
              <span>$140.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Member discount</span>
              <span style={{ color: '#22c55e' }}>-$10.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '1px solid #eee', paddingTop: 8, marginTop: 4 }}>
              <span>Total Charged</span>
              <span style={{ color: '#5b4fcf' }}>$130.00</span>
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Charged to Visa ****2241 on April 5, 2024</div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: 530 }
  )
}

function insuranceReceipt() {
  return new ImageResponse(
    (
      <div style={{ width: W, background: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ background: '#0f2d56', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#8ab4e8', fontSize: 9, letterSpacing: 2 }}>PROFESSIONAL PROTECT</span>
            <span style={{ color: 'white', fontSize: 17, fontWeight: 800 }}>Insurance Group</span>
          </div>
          <span style={{ color: '#4da6ff', fontSize: 11, fontWeight: 700, background: 'rgba(77,166,255,0.15)', padding: '4px 10px', borderRadius: 6 }}>PAYMENT RECEIPT</span>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#f0f7ff', border: '1px solid #bdd9f7', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, color: '#0f2d56', fontWeight: 700 }}>Professional Liability Insurance</span>
              <span style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Policy #MT-2024-88421</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#0f2d56' }}>$35.00</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>Insured</span>
              <span style={{ fontWeight: 600 }}>Hands & Heart Massage</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>Coverage Type</span>
              <span>Massage Therapy · $2M/$4M</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>Coverage Period</span>
              <span>Apr 1 – Apr 30, 2024</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>Payment Method</span>
              <span>Monthly Auto-Pay</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>Transaction ID</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>PP-TXN-20240401-9921</span>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#e8f5e9', borderRadius: 8, fontSize: 11, color: '#1b5e20' }}>
            Your coverage is active. Certificate of insurance available at professionalprotect.com.
          </div>
        </div>
      </div>
    ),
    { width: W, height: 460 }
  )
}

function subscriptionReceipt() {
  return new ImageResponse(
    (
      <div style={{ width: W, background: '#0f0f23', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 20, fontWeight: 900 }}>J</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>Jane App</span>
              <span style={{ color: '#8b8ba7', fontSize: 10 }}>Practice Management Software</span>
            </div>
          </div>
          <div style={{ background: '#1a1a35', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#8b8ba7', display: 'flex', marginBottom: 8 }}>SUBSCRIPTION RENEWED</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>Jane Solo Plan</span>
                <span style={{ color: '#8b8ba7', fontSize: 11, marginTop: 3 }}>Monthly · Up to 1 practitioner</span>
              </div>
              <span style={{ color: '#a78bfa', fontSize: 22, fontWeight: 900 }}>$25.00</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b8ba7' }}>Billing Period</span>
              <span style={{ color: '#e0e0f0' }}>Apr 1 – Apr 30, 2024</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b8ba7' }}>Next Charge</span>
              <span style={{ color: '#e0e0f0' }}>May 1, 2024</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b8ba7' }}>Card</span>
              <span style={{ color: '#e0e0f0' }}>Visa •••• 2241</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b8ba7' }}>Invoice</span>
              <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: 11 }}>JANE-INV-2024041</span>
            </div>
          </div>
          <div style={{ marginTop: 18, borderTop: '1px solid #2a2a45', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: '#8b8ba7' }}>Questions? help.janeapp.com</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#8b8ba7', fontSize: 10 }}>AMOUNT CHARGED</span>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>$25.00</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: 460 }
  )
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'target'
  switch (type) {
    case 'target':    return targetReceipt()
    case 'online':    return onlineOrderReceipt()
    case 'invoice':   return invoiceReceipt()
    case 'training':  return trainingReceipt()
    case 'insurance': return insuranceReceipt()
    case 'subscription': return subscriptionReceipt()
    default:          return targetReceipt()
  }
}
