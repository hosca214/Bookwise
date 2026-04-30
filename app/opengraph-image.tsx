import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Bookwise — Financial clarity for coaches, trainers, and bodyworkers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  const loraFont = await fetch(
    'https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOxE7fSWef8Pml6kSc.woff2'
  ).then(r => r.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#F5F2EC',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 100px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* green left accent bar */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          background: '#7C9A7E',
          display: 'flex',
        }} />

        {/* eyebrow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 40,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#7C9A7E',
            display: 'flex',
          }} />
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#7C9A7E',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Financial clarity for coaches, trainers, and bodyworkers
          </span>
        </div>

        {/* headline */}
        <div style={{
          fontFamily: 'Lora',
          fontSize: 72,
          fontWeight: 700,
          color: '#2C3528',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <span>Always know where your money goes.</span>
          <span style={{ color: '#4E6E52' }}>Never get surprised by your tax bill.</span>
        </div>

        {/* tagline */}
        <div style={{
          fontSize: 24,
          color: '#6B7566',
          lineHeight: 1.5,
          display: 'flex',
        }}>
          Track every dollar. See what to save for taxes. Know what to pay yourself.
        </div>

        {/* logo bottom right */}
        <div style={{
          position: 'absolute',
          bottom: 56,
          right: 100,
          fontFamily: 'Lora',
          fontSize: 28,
          fontWeight: 700,
          color: '#2C3528',
          display: 'flex',
        }}>
          Bookwise
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Lora', data: loraFont, weight: 700 }],
    }
  )
}
