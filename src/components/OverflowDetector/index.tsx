/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2025-11-20 14:36:58
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-07-31 17:33:46
 * @Description: 判断文本是否溢出
 */
'use client'

import type { HotListItem } from '@/types'

import { Tooltip } from '@heroui/react'
import { memo, useEffect, useRef, useState } from 'react'

import { useIsMobile } from '@/hooks/use-is-mobile'

interface OverflowDetectorProps {
  record: HotListItem
}

const OverflowDetector = memo(function OverflowDetector({ record }: OverflowDetectorProps) {
  const ref = useRef<HTMLAnchorElement>(null)

  // 判断是否是移动端
  const isMobile = useIsMobile()

  // 内容是否溢出
  const [isOverflowing, setIsOverflowing] = useState(false)

  // 只在组件挂载时检测一次 overflow
  useEffect(() => {
    const el = ref.current

    if (!el) return

    const checkOverflow = () => {
      setIsOverflowing(el.scrollWidth > el.clientWidth)
    }

    // 等 DOM 渲染完成
    requestAnimationFrame(checkOverflow)

    // 自托管字体异步加载完成后文本宽度会变化，复检一次避免 tooltip 误判
    void document.fonts.ready.then(checkOverflow)
  }, [])

  return (
    <Tooltip delay={0} isDisabled={!isOverflowing}>
      <Tooltip.Trigger aria-label={record.title} className="min-w-0 flex-1">
        <a
          ref={ref}
          className="truncate block transition-transform ease-in duration-300 text-sm relative py-1 after:absolute after:content-[''] after:h-0.5 after:w-0 after:left-0 after:bottom-0 after:bg-border after:transition-[width] after:duration-500 hover:translate-x-1 hover:after:w-full"
          href={isMobile ? record.mobileUrl : record.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {record.title}
        </a>
      </Tooltip.Trigger>

      <Tooltip.Content placement="top">
        <Tooltip.Arrow />
        <p>{record.title}</p>
      </Tooltip.Content>
    </Tooltip>
  )
})

export default OverflowDetector
