/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2025-11-20 09:43:44
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-11-09 17:05:00
 * @Description: 底部版权
 */
import type { ReactNode } from 'react'

import { Chip, cn, Description, Link, Separator } from '@heroui/react'
import Image from 'next/image'

import { getGithubAuthor } from '@/lib/author'
import pkg from '#/package.json'

const CURRENT_YEAR = new Date().getFullYear()

interface Social {
  icon?: ReactNode
  image?: string
  url: string
  label: string
}

// 备案信息
const IcpLinks: Social[] = [
  {
    image: '/icp.png',
    url: 'https://beian.miit.gov.cn/#/Integrated/index',
    label: process.env.NEXT_PUBLIC_ICP!,
  },
  {
    image: '/gongan.png',
    url: 'https://beian.mps.gov.cn/#/query/webSearch',
    label: process.env.NEXT_PUBLIC_GONGAN!,
  },
]

// 异步服务端组件：版权名跟随 GitHub 账户（fetch 缓存一天），失败回退 package.json 的 author.name
async function Footer() {
  const { name: authorName } = await getGithubAuthor()

  return (
    // 三列布局只在 xl（≥1280px）启用：备案号一行需要约 368px，
    // lg 档（≥1024px）三等分每列仅约 311px，会被挤成两行
    <footer className="shrink-0 mx-auto w-full container! px-6 py-4 grid grid-cols-1 xl:grid-cols-3 items-center gap-3 xl:gap-4">
      <div className="flex items-center justify-center gap-3 justify-self-center xl:justify-self-start whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="size-5 relative">
            <Image fill alt="Logo" src="/logo.svg" />
          </div>
          <span className="text-sm font-bold">{process.env.NEXT_PUBLIC_APP_NAME}</span>
        </div>
        <Separator className="h-4 self-center" orientation="vertical" />
        <Chip className="px-2 py-0.5 text-[10px]" color="success" size="sm" variant="soft">
          <div
            className={cn(
              'relative flex size-2 shrink-0 rounded-full bg-success',
              'before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-inherit',
              'after:absolute after:inset-0.5 after:rounded-full after:bg-inherit',
            )}
            data-slot="status-indicator"
          />
          <Chip.Label>服务状态正常</Chip.Label>
        </Chip>
      </div>
      <Description className="justify-self-center text-center whitespace-nowrap">
        &copy; {CURRENT_YEAR}{' '}
        <a
          className="hover:text-accent transition-colors"
          href={pkg.author.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {authorName}
        </a>
        . All rights reserved.
      </Description>
      {/* 单列堆叠时三行全部居中；xl 起三列布局，备案行回到右对齐 */}
      <div className="flex gap-2 items-center flex-col sm:flex-row justify-self-center xl:justify-self-end whitespace-nowrap">
        {IcpLinks.map(({ image, url, label }) => (
          <Link key={url} className="flex gap-1 items-center no-underline" href={url} target="_blank">
            <Image alt={label} height={14} src={image!} width={14} />
            <Description className="hover:text-accent transition-colors">{label}</Description>
          </Link>
        ))}
      </div>
    </footer>
  )
}

export default Footer
