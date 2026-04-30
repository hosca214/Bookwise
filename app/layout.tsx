import type { Metadata } from 'next'
import { Lora, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { IQProvider } from '@/context/IQContext'
import { VibeProvider } from '@/context/VibeContext'
import '@/styles/globals.css'

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-lora',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bookwise',
  description: 'Always know where your money goes. Never get surprised by your tax bill. Financial clarity for coaches, trainers, and bodyworkers.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Bookwise — Financial clarity for wellness practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself. Built for coaches, trainers, and bodyworkers.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bookwise — Financial clarity for wellness practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself.',
  },
}

export const viewport = {
  themeColor: '#F5F2EC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Bookwise',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'AI-powered bookkeeping for wellness professionals',
  offers: { '@type': 'Offer', price: '0' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-vibe="sage" suppressHydrationWarning className={`${lora.variable} ${jakarta.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <VibeProvider>
          <IQProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  fontFamily: 'var(--font-sans)',
                  fontSize: '15px',
                  borderRadius: '10px',
                  background: 'var(--color-card)',
                  color: 'var(--color-foreground)',
                  border: '1px solid var(--color-border)',
                },
              }}
            />
          </IQProvider>
        </VibeProvider>
      </body>
    </html>
  )
}
