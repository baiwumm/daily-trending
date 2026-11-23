/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-11-23 11:00:00
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-11-23 11:00:00
 * @Description: 平台落地页（构建期全静态：平台介绍 + FAQ + 同分类内链，零请求期数据）
 */
import type { Metadata } from 'next'

import { ArrowRight } from '@gravity-ui/icons'
import { Breadcrumbs, Button, Card } from '@heroui/react'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import JsonLd from '@/components/JsonLd'
import { HOT_UPDATE_MINUTES, PLATFORM_CONTENT } from '@/content/platforms'
import { HOT_ITEMS } from '@/config/hot-list'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hot.baiwumm.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || '今日热榜'

// 落地页纯静态：内容全部构建期从配置与内容库派生，禁止任何请求期数据获取（EF/CF 额度红线）
export const dynamic = 'force-static'
// 未枚举的平台直接 404，运行时不会按需渲染新页面
export const dynamicParams = false

export function generateStaticParams() {
  return HOT_ITEMS.values.map((value) => ({ platform: value }))
}

// 榜单型（tip 含「榜」）与资讯型（公告/快讯）口径分开，避免把非排行类榜单描述成「热度排行」
function buildDescription(name: string, ranking: boolean) {
  return `${name}${ranking ? '实时热度排行' : '最新内容聚合'}，由今日热榜单约每 ${HOT_UPDATE_MINUTES} 分钟自动更新。今日热榜聚合微博、知乎、B 站、抖音、GitHub 等 ${HOT_ITEMS.values.length} 个平台热榜，按分类浏览，支持全局搜索。`
}

export async function generateMetadata({ params }: PageProps<'/hot/[platform]'>): Promise<Metadata> {
  const { platform } = await params
  const item = HOT_ITEMS.items.find((hot) => hot.value === platform)

  if (!item) {
    return {}
  }

  const name = `${item.label}${item.tip}`

  return {
    title: `${name} - ${APP_NAME}`,
    description: buildDescription(name, item.tip.includes('榜')),
    alternates: { canonical: `/hot/${item.value}` },
  }
}

export default async function PlatformPage({ params }: PageProps<'/hot/[platform]'>) {
  const { platform } = await params
  const item = HOT_ITEMS.items.find((hot) => hot.value === platform)
  const content = item && PLATFORM_CONTENT[item.value]

  // dynamicParams=false 已保证只有枚举值可达；双保险防配置与内容库不同步上线 thin 页
  if (!item || !content) {
    notFound()
  }

  const { label, tip, category, value } = item
  const name = `${label}${tip}`
  const pageUrl = `${APP_URL}/hot/${value}`
  const description = buildDescription(name, tip.includes('榜'))

  // 同分类其他平台（构建期派生，排除自身）：内链防孤岛，同时是页面级 ItemList 的内容源
  const siblings = HOT_ITEMS.items.filter((item) => item.category === category && item.value !== value)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name,
        description,
        url: pageUrl,
        inLanguage: 'zh-CN',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: APP_URL },
          { '@type': 'ListItem', position: 2, name: category, item: `${APP_URL}/#cat-${category}` },
          { '@type': 'ListItem', position: 3, name, item: pageUrl },
        ],
      },
      {
        '@type': 'ItemList',
        name: `${category}类热榜平台`,
        numberOfItems: siblings.length,
        itemListElement: siblings.map((sibling, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `${sibling.label}${sibling.tip}`,
          url: `${APP_URL}/hot/${sibling.value}`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: content.faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <article className="space-y-8 pb-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">首页</Breadcrumbs.Item>
          <Breadcrumbs.Item href={`/#cat-${category}`}>{category}</Breadcrumbs.Item>
          <Breadcrumbs.Item>{name}</Breadcrumbs.Item>
        </Breadcrumbs>

        <header className="space-y-3">
          <h1 className="text-2xl font-black sm:text-3xl">
            {name} - {APP_NAME}
          </h1>
          <p className="text-muted leading-7">{content.intro}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-black">常见问题</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {content.faqs.map(({ q, a }) => (
              <Card key={q} className="gap-1 p-4">
                <h3 className="text-sm font-bold">{q}</h3>
                <p className="text-muted text-sm leading-6">{a}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black">同类平台</h2>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
            {siblings.map((sibling) => (
              // 整卡可点：与 HotCard 一致的图标 + 名称 + 榜单名，hover 反馈用主题变量（暗色模式自动适配）
              <Link key={sibling.value} className="group" href={`/hot/${sibling.value}`}>
                <Card className="flex flex-row items-center gap-2 p-3 transition-colors group-hover:bg-default-hover">
                  <img
                    alt={`${sibling.label}${sibling.tip}`}
                    className="rounded-md shrink-0"
                    height={24}
                    src={`/images/${sibling.value}.svg`}
                    width={24}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{sibling.label}</p>
                    <p className="text-muted text-xs truncate">{sibling.tip}</p>
                  </div>
                  <ArrowRight className="ml-auto text-muted shrink-0" width={14} />
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <div className="flex justify-center pt-2">
          {/* CTA 跳首页锚点卡片（HotCard 根元素 id=card-<value>），实时数据仍走既有 EF 路由 */}
          <Link href={`/#card-${value}`}>
            <Button size="lg">
              查看实时{name}
              <ArrowRight width={16} />
            </Button>
          </Link>
        </div>
      </article>
    </>
  )
}
