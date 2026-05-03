import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bookwise — Financial Clarity for Coaches, Trainers, and Bodyworkers',
  description: 'Track every dollar in and out. Know exactly what to save for taxes. See what to pay yourself this month. Built for wellness practitioners by The Zen Bookkeeper.',
  alternates: {
    canonical: '/landing',
  },
  openGraph: {
    title: 'Bookwise — Financial Clarity for Wellness Practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself. Built for coaches, trainers, and bodyworkers.',
    url: '/landing',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bookwise app dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bookwise — Financial Clarity for Wellness Practitioners',
    description: 'Track every dollar. See what to save for taxes. Know what to pay yourself.',
    images: ['/og-image.png'],
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
