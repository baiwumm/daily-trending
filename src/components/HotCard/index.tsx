/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2025-11-20 14:33:28
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-07-31 17:38:56
 * @Description: 热榜卡片
 */
'use client'
import type { HotListConfig, IResponse } from '@/types'

import { ArrowsRotateRight, CircleCheckFill, CircleXmarkFill, Star, StarFill } from '@gravity-ui/icons'
import { Button, Card, Chip, Description, Label, ScrollShadow, Separator, Spinner, Tooltip } from '@heroui/react'
import { motion, useInView } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import HotListVirtual from './HotListVirtual'

import BlurFade from '@/components/BlurFade'
import SkeletonCard from '@/components/SkeletonCard'
import { API_CACHE_SECONDS, RESPONSE } from '@/config/response'
import { FatalRequestError, useRequest } from '@/hooks/use-request'
import { smoothScrollTo } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

function HotCard({ value, label, tip, prefix, suffix }: HotListConfig) {
  const setUpdateTime = useAppStore((state) => state.setUpdateTime)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  // 常看收藏：窄选择器只让星标状态变化的这张卡重渲染
  const isFavorite = useAppStore((state) => state.favoriteItems.includes(value))
  const toggleFavorite = useAppStore((state) => state.toggleFavorite)

  // 更新相对时间
  const relativeText = useAppStore((state) => state.getRelativeTime(value))

  // 上次成功更新时间 + 当前时间（分钟级心跳，用于刷新冷却判断）
  const updateTime = useAppStore((state) => state.UpdateTime[value])
  const now = useAppStore((state) => state.now)
  // 已过分钟数（与"x 分钟前更新"的 fromNow 同源同取整，保证显示自洽）
  const elapsedMin = updateTime ? Math.round((now - updateTime) / 60_000) : 0
  // 剩余分钟 = 缓存窗口 - 已过分钟（两者相加恒等于缓存窗口）
  const remainMin = Math.round(API_CACHE_SECONDS / 60) - elapsedMin
  // 精确冷却判断（毫秒）：冷却结束才恢复可刷新
  // 注意：isCooldown 需在 useRequest 之后基于 error 计算（失败时允许立即重试）
  const cooldownMs = updateTime ? API_CACHE_SECONDS * 1000 - (now - updateTime) : 0

  // 手动刷新时绕过 CDN 缓存（URL 加时间戳），自动加载走缓存
  const bypassCacheRef = useRef(false)

  const { data, loading, error, run } = useRequest(
    async () => {
      const url = bypassCacheRef.current ? `/api/${value}?t=${Date.now()}` : `/api/${value}`

      // 一次性消费标记
      bypassCacheRef.current = false
      const response = await fetch(url)

      // 429：Firewall Rate Limit 在到达路由前就于边缘拒绝。自动重试只会持续撞墙、
      // 放大请求量并拖长误伤恢复时间，直接判失败交给用户手动刷新
      if (response.status === 429) {
        throw new FatalRequestError('Rate limited')
      }

      if (response.status !== RESPONSE.SUCCESS) {
        throw new Error('Request failed')
      }
      const result: IResponse = await response.json()

      if (result.code === RESPONSE.ERROR) {
        throw new Error('API returned error')
      }
      const list = result.data || []

      // 空数据视为失败：不写入更新时间（否则会显示"xx 前更新"并触发刷新冷却，导致无法立即重试）
      if (!list.length) {
        throw new Error('API returned empty data')
      }
      // 仅在请求成功且有数据时记录更新时间，失败/空数据时保留旧值
      setUpdateTime({ [value]: Date.now() })

      return list
    },
    {
      manual: true,
      debounceWait: 300,
      retryCount: 3,
    },
  )

  // ✅ 使用 ready 控制自动加载（更可靠）
  // 失败状态强制可刷新：即使 localStorage 残留了上次"假成功"写入的更新时间，
  // error 时也不进入冷却，保证用户能立即重试
  const isCooldown = !error && cooldownMs > 0

  // 排名趋势：数据到达后与上次快照对比。基准是本地持久化的上次数据（跨会话有效），
  // 首次查看无基准时不显示任何标记；同一份数据重复触发由 store 幂等跳过
  const recordRankSnapshot = useAppStore((state) => state.recordRankSnapshot)
  const trends = useAppStore((state) => state.rankTrends[value])

  useEffect(() => {
    if (!data?.length) return

    // 用标题做匹配 key：部分源的条目 id 按排名生成（如懂车帝 id=序号），跨请求不稳定
    const ranks: Record<string, number> = {}
    const titles: string[] = []

    data.forEach((item, idx) => {
      const key = item.title.trim()

      titles.push(key)
      ranks[key] = idx + 1
    })

    recordRankSnapshot(value, titles.join('\n'), ranks)
  }, [data, recordRankSnapshot, value])

  // 消费搜索跳转（两段式）：先滚动页面把卡片带入视口（未加载的卡片借此触发 useInView 拉数据），
  // 数据到达后再定位卡内条目并高亮。两段缺一不可：合并成一个 effect 会造成
  // 「没数据 → 不滚动 → 永远没数据」的死锁。
  const searchJump = useAppStore((state) => state.searchJump)
  const setSearchJump = useAppStore((state) => state.setSearchJump)
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null)

  useEffect(() => {
    if (searchJump?.value !== value || !ref.current) return

    // 滚动到卡片垂直居中的位置（smoothScrollTo 为 rAF 自绘动画，跨环境行为一致）
    const rect = ref.current.getBoundingClientRect()
    const targetTop = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2

    smoothScrollTo(targetTop)
  }, [searchJump, value])

  useEffect(() => {
    if (searchJump?.value !== value || !data?.length) return

    setHighlightIndex(searchJump.index >= 0 ? searchJump.index : null)
    setSearchJump(null)
  }, [searchJump, data, value, setSearchJump])

  // 高亮短暂保留后清除，避免常亮干扰
  useEffect(() => {
    if (highlightIndex === null) return

    const timer = setTimeout(() => setHighlightIndex(null), 3200)

    return () => clearTimeout(timer)
  }, [highlightIndex])

  useEffect(() => {
    if (isInView) {
      run()
    }
  }, [isInView, run])

  // 手动刷新：绕过 CDN 缓存拿最新数据
  const handleRefresh = () => {
    bypassCacheRef.current = true
    run()
  }

  return (
    <Card ref={ref} className="p-0 gap-0">
      <Card.Header className="flex justify-between items-center flex-row p-3">
        <div className="flex items-center gap-2">
          <img
            alt={`${label}${tip}`}
            className="rounded-md shrink-0"
            height={24}
            src={`/images/${value}.svg`}
            width={24}
          />
          <Label className="font-bold">{label}</Label>
        </div>
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          initial={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <Chip
            className="px-2 py-0.5"
            color={!isInView || loading ? undefined : data?.length ? 'success' : 'danger'}
            size="sm"
            variant="soft"
          >
            {!isInView ? null : loading ? (
              <Spinner size="sm" />
            ) : data?.length ? (
              <CircleCheckFill width={14} />
            ) : (
              <CircleXmarkFill width={14} />
            )}
            {tip}
          </Chip>
        </motion.div>
      </Card.Header>
      <Separator />
      <Card.Content className="relative py-0">
        <ScrollShadow hideScrollBar className="h-81.75 relative" visibility="bottom">
          {/* 「请求未触发」（useInView 未命中）与加载中共用骨架，避免还没轮到加载就被误读成加载失败 */}
          {loading || !isInView ? (
            <SkeletonCard />
          ) : !data?.length ? (
            <Description className="flex h-full justify-center items-center px-8 text-center leading-5">
              {error instanceof FatalRequestError
                ? '请求过于频繁，请稍后再试'
                : '抱歉，可能服务器遇到问题了，请稍后重试，或者打开右上角设置关闭热榜显示！🤔'}
            </Description>
          ) : (
            <BlurFade className="h-full pl-3">
              <HotListVirtual data={data} highlight={highlightIndex} prefix={prefix} suffix={suffix} trends={trends} />
            </BlurFade>
          )}
        </ScrollShadow>
      </Card.Content>
      <Separator />
      <Card.Footer className="p-3">
        <div className="flex text-center justify-between w-full items-center space-x-4 text-small h-5">
          <Description className="w-1/2">
            {loading || !isInView ? '正在加载中...' : error ? '更新失败' : `${relativeText}更新`}
          </Description>
          <Separator className="flex-none" orientation="vertical" />
          <div className="flex w-1/2 justify-center gap-1">
            <Tooltip delay={0}>
              <Button
                isIconOnly
                className={`text-muted${isCooldown ? ' opacity-50' : ''}`}
                isDisabled={loading}
                size="sm"
                variant="ghost"
                // 冷却时不禁用按钮（否则 hover 不触发 Tooltip），改为拦截点击 + 视觉淡化
                onPress={isCooldown ? undefined : handleRefresh}
              >
                {/* Vercel 最佳实践：动画加在包装层而非 SVG 元素上 */}
                <div className={loading ? 'animate-spin' : ''}>
                  <ArrowsRotateRight />
                </div>
              </Button>
              <Tooltip.Content showArrow placement="bottom">
                <Tooltip.Arrow />
                {isCooldown
                  ? remainMin > 0
                    ? `缓存中，约 ${remainMin} 分钟后可刷新`
                    : '缓存中，即将可刷新'
                  : '获取最新'}
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0}>
              <Button
                isIconOnly
                aria-label={isFavorite ? '取消常看' : '设为常看'}
                className={isFavorite ? 'text-warning' : 'text-muted'}
                size="sm"
                variant="ghost"
                onPress={() => toggleFavorite(value)}
              >
                {isFavorite ? <StarFill width={16} /> : <Star width={16} />}
              </Button>
              <Tooltip.Content showArrow placement="bottom">
                <Tooltip.Arrow />
                {isFavorite ? '取消常看' : '设为常看'}
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </Card.Footer>
    </Card>
  )
}

export default HotCard
