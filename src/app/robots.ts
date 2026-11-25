import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    // allow-all：不屏蔽任何爬虫——发现类爬虫（OAI-SearchBot/PerplexityBot/Claude-SearchBot）需可达。
    // 例外：/api/ 不对爬虫开放——JSON 接口非搜索内容，且爬虫高频抓取会消耗 Edge Functions
    // 配额（CDN 不缓存边缘函数响应，每次请求都执行函数）；搜索引擎的内容页是落地页与首页
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
