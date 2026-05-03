import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://bookwise-coral.vercel.app/landing', lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://bookwise-coral.vercel.app/login',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]
}
