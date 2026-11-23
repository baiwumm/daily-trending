/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2025-11-19 15:55:09
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-11-23 10:20:00
 * @Description: 根布局文件
 */

import './globals.css'

import type { Metadata } from 'next'

import { Toast } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

import { BaiDuAnalytics, GoogleUtilities, MicrosoftClarity } from '@/components/Analytics'
import AppTimeTicker from '@/components/AppTimeTicker'
import BackTop from '@/components/BackTop'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import JsonLd from '@/components/JsonLd'
import MotionProvider from '@/components/MotionProvider'
import pkg from '#/package.json'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hot.baiwumm.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || '今日热榜'

// 站点标题：品牌词前置 + 品类词 + 核心平台词——「平台名+热榜」是本站核心搜索意图，title 必须覆盖
const APP_TITLE = `${APP_NAME} - 全网热榜聚合平台 | 微博·知乎·B站·抖音实时热点`

// meta description 长文案：与 Header 副标题/og 图的短口号（NEXT_PUBLIC_APP_DESC）解耦——
// 该 env 同时驱动 Header 排版与 opengraph-image 主标题，改成长文案会撑坏两处布局，故 SEO 描述在代码层单独定义
const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_SEO_DESC ||
  '今日热榜聚合微博、知乎、B 站、抖音、GitHub 等 47 个全网热门平台实时热榜，按分类浏览、支持全局搜索与排名趋势标记，看看全网都在聊什么。'

// 站点级结构化数据：WebSite + Organization 每页直出；平台清单 ItemList 由首页单独注入（见 page.tsx）
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: APP_NAME,
      url: APP_URL,
      inLanguage: 'zh-CN',
      description: APP_DESCRIPTION,
    },
    {
      '@type': 'Organization',
      name: APP_NAME,
      url: APP_URL,
      logo: `${APP_URL}/logo.png`,
      sameAs: [`https://github.com/${pkg.author.name}/${pkg.name}`],
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL), // 基础 URL,用于补全相对路径
  title: APP_TITLE, // 网站标题
  description: APP_DESCRIPTION, // 网站描述
  applicationName: APP_NAME, // 应用名称
  // canonical：EdgeOne 会对 query 变体/RSC 请求生成独立缓存对象，多 URL 形态客观存在，需显式归一
  alternates: { canonical: '/' },
  authors: [
    {
      name: pkg.author.name,
      url: pkg.author.url,
    },
  ],
  verification: {
    other: {
      'baidu-site-verification': 'codeva-kYzuuOyYCZ',
      'bytedance-verification-code': 'oPgCIrgBz/3Lhr9BoNE2',
    },
  }, // 网站验证
  // 收敛到核心词：原实现拼接全部 47 个平台名（约 500 字符）属堆砌，且 title 已覆盖平台词
  keywords: ['今日热榜', '全网热榜', '微博热榜', '知乎热榜', 'B站热榜', '抖音热榜', '热榜聚合'], // 网站关键词
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: APP_URL,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: `${APP_URL}/opengraph-image`,
        width: 1200,
        height: 630,
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [`${APP_URL}/opengraph-image`],
    creator: pkg.author.name,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressHydrationWarning lang="zh-CN">
      <head>
        <meta content={pkg.version} name="version" />
      </head>
      <body className="bg-background text-foreground flex flex-col min-h-screen">
        {/* 站点级结构化数据：构建期静态序列化，服务端直出 */}
        <JsonLd data={SITE_JSON_LD} />
        <NextThemesProvider disableTransitionOnChange attribute="class">
          <MotionProvider>
            <Header />
            <main className="flex-1 min-h-0 container! mx-auto p-4">{children}</main>
            <Footer />
            {/* 回到顶部 */}
            <BackTop />
            <AppTimeTicker />
            <Toast.Provider placement="top" />
          </MotionProvider>
        </NextThemesProvider>
        {/* Analytics */}
        <BaiDuAnalytics />
        <GoogleUtilities />
        <MicrosoftClarity />
      </body>
    </html>
  )
}
