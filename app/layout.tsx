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
  metadataBase: new URL('https://bookwise-coral.vercel.app'),
  title: 'Bookwise',
  description: 'Always know where your money goes. Never get surprised by your tax bill. Financial clarity for coaches, trainers, and bodyworkers.',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Bookwise — Financial clarity for wellness practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself. Built for coaches, trainers, and bodyworkers.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bookwise app dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bookwise — Financial clarity for wellness practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself.',
    images: ['/og-image.png'],
  },
}

export const viewport = {
  themeColor: '#F5F2EC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const jsonLdApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Bookwise',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'AI-powered bookkeeping for wellness practitioners — coaches, personal trainers, and bodyworkers. Track income and expenses, see what to save for taxes, know what to pay yourself, and get daily AI insights in plain language.',
  offers: { '@type': 'Offer', price: '19.00', priceCurrency: 'USD', priceValidUntil: '2027-01-01' },
  creator: { '@type': 'Organization', name: 'The Zen Bookkeeper', url: 'https://thezenbookkeeper.net' },
  featureList: ['AI receipt scanning', 'Sage AI daily insights', 'Plain language financial labels', 'Tax set-aside calculator', 'CPA export', 'Stripe and Plaid integration'],
}

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Is this real bookkeeping?', acceptedAnswer: { '@type': 'Answer', text: 'Bookwise organizes your income and expenses with clarity. For tax filing, we always recommend working with a licensed CPA. We make their job easier and your bill smaller.' } },
    { '@type': 'Question', name: 'Do I need to know accounting?', acceptedAnswer: { '@type': 'Answer', text: 'Not at all. Every label in Bookwise is written in plain language for your profession. No spreadsheets. No jargon. Just your numbers.' } },
    { '@type': 'Question', name: 'What about my existing data?', acceptedAnswer: { '@type': 'Answer', text: 'Connect your bank through Plaid. Import from Stripe if you take card payments. You can also add entries manually anytime.' } },
    { '@type': 'Question', name: 'Is my data safe?', acceptedAnswer: { '@type': 'Answer', text: 'Your records are private and encrypted. Only you can see them. We never sell your data, ever.' } },
    { '@type': 'Question', name: 'What does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'Bookwise starts with a free 30-day trial. No credit card required. After that, the Practitioner plan is $19 per month and Practice Pro is $49 per month. Beta testers in our founding 50 receive Practice Pro free for life.' } },
    { '@type': 'Question', name: 'What is the beta program?', acceptedAnswer: { '@type': 'Answer', text: 'We are opening Bookwise to 50 founding practitioners before we launch publicly. Beta testers get Practice Pro free for life, early access to new features, and a direct line to us as we build. We review every application and reach out within 5 business days.' } },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-vibe="sage" suppressHydrationWarning className={`${lora.variable} ${jakarta.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
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
