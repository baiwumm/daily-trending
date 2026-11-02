/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2025-11-19 15:55:09
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-08-10 10:03:28
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
import MotionProvider from '@/components/MotionProvider'
import { HOT_ITEMS } from '@/config/hot-list'
import pkg from '#/package.json'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hot.baiwumm.com'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL), // 基础 URL,用于补全相对路径
  title: `${process.env.NEXT_PUBLIC_APP_DESC} - ${process.env.NEXT_PUBLIC_APP_NAME}`, // 网站标题
  description: process.env.NEXT_PUBLIC_APP_DESC, // 网站描述
  applicationName: process.env.NEXT_PUBLIC_APP_NAME, // 应用名称
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
  keywords: HOT_ITEMS.items.map(({ raw }) => `${raw.label}${raw.tip}`), // 网站关键词
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: APP_URL,
    title: process.env.NEXT_PUBLIC_APP_NAME,
    description: process.env.NEXT_PUBLIC_APP_DESC,
    siteName: process.env.NEXT_PUBLIC_APP_NAME,
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
    title: process.env.NEXT_PUBLIC_APP_NAME,
    description: process.env.NEXT_PUBLIC_APP_DESC,
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
