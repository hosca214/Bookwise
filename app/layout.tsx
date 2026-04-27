import type { Metadata } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { IQProvider } from '@/context/IQContext'
import { VibeProvider } from '@/context/VibeContext'
import '@/styles/globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-fraunces',
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
  description: 'AI-powered bookkeeping for wellness professionals',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Bookwise',
    description: 'AI-powered bookkeeping for wellness professionals',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Bookwise',
    description: 'AI-powered bookkeeping for wellness professionals',
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
    <html lang="en" data-vibe="sage" suppressHydrationWarning className={`${fraunces.variable} ${jakarta.variable}`}>
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
