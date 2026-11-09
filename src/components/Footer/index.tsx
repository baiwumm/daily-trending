/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2025-11-20 09:43:44
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-07-31 17:18:59
 * @Description: 底部版权
 */
'use client'
import type { ReactNode } from 'react'

import { Chip, cn, Description, Link, Separator } from '@heroui/react'
import Image from 'next/image'
import { useState } from 'react'

import { AUTHOR_HANDLE } from '@/lib/author'
import pkg from '#/package.json'

interface Social {
  icon?: ReactNode
  image?: string
  url: string
  label: string
}

export default function Footer() {
  // 版权年份：渲染期间固定（state 惰性初始化，避免渲染期调用 new Date 导致不纯）
  const [year] = useState(() => new Date().getFullYear())
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

  return (
    <footer className="shrink-0 mx-auto w-full container! px-6 py-4 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
      <div className="flex items-center gap-3 justify-self-center sm:justify-self-start">
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
      <Description className="justify-self-center">
        &copy; {year}{' '}
        <a
          className="hover:text-accent transition-colors"
          href={pkg.author.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {AUTHOR_HANDLE}
        </a>
        . All rights reserved.
      </Description>
      <div className="flex gap-2 items-center flex-col sm:flex-row justify-self-center sm:justify-self-end">
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
