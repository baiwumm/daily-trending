import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    // allow-all：不屏蔽任何爬虫——发现类爬虫（OAI-SearchBot/PerplexityBot/Claude-SearchBot）需可达
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
