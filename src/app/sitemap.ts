import type { MetadataRoute } from 'next'

import { HOT_ITEMS } from '@/config/hot-list'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

// lastmod 取内容常量而非构建时间：lastmod 只在平台配置/落地页内容实际变更时手工更新，
// 避免每次构建都刷新 lastmod 造成的索引噪声（Google 对频繁跳变且无实质变化的 lastmod 会降权采信）
const CONTENT_UPDATED = new Date('2026-11-23')

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: CONTENT_UPDATED,
      changeFrequency: 'daily',
      priority: 1,
    },
    // 平台落地页：从唯一数据源 HOT_ITEMS 构建期派生，新增平台自动进 sitemap，不维护第二份清单
    ...HOT_ITEMS.items.map(({ value }) => ({
      url: `${APP_URL}/hot/${value}`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
