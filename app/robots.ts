import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/ledger', '/reports', '/settings', '/onboarding', '/api/'],
    },
    sitemap: 'https://bookwise-coral.vercel.app/sitemap.xml',
  }
}
