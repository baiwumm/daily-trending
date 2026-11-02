/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-01-12 15:12:53
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-07-31 17:33:53
 * @Description: 动态列表子项
 */
import type { HotListItem } from '@/types'
import type { ReactNode } from 'react'

import { Description } from '@heroui/react'
import { memo } from 'react'

import OverflowDetector from '@/components/OverflowDetector'
import { formatNumber, hotLabelColor, hotTagColor } from '@/lib/utils'

interface RowData {
  index: number
  data: HotListItem[]
  /** 排名趋势：标题 → 名次变化（正数上升 / 负数下降 / 0 持平）；null 表示无对比基准 */
  trends?: Record<string, number> | null
  /** 搜索跳转高亮的行号（仅命中行收到非 null 值，配合行级 memo 避免整卡重渲染） */
  highlightIndex?: number | null
  prefix?: ReactNode
  suffix?: ReactNode
}

function HotDisplay({ value, prefix, suffix }: { value: string | number; prefix?: ReactNode; suffix?: ReactNode }) {
  return (
    <Description className="shrink-0 flex items-center gap-0.5">
      {prefix}
      {value}
      {suffix}
    </Description>
  )
}

// Vercel 最佳实践：虚拟列表行组件用 memo，避免滚动/数据更新时无关行重渲染
const HotListRow = memo(function HotListRow({ index, data, trends, highlightIndex, prefix, suffix }: RowData) {
  const item = data[index]
  const { label, title } = item

  // 简单的查表取值（primitive / 小对象）无需 useMemo：行组件自身已按 props memo，重渲染频率很低
  const labelColor = label ? hotLabelColor[label as keyof typeof hotLabelColor] : hotTagColor[index]
  const colorStyle = {
    backgroundColor: labelColor || 'var(--default)',
    color: labelColor ? '#fff' : 'var(--default-foreground)',
  }

  // Vercel 最佳实践：primitive 派生值无需 useMemo 缓存
  const displayText = label ? label.slice(0, 1) : index + 1

  // 排名趋势：无对比基准（首次查看 / 基准过期 / 新条目过半熔断）不显示任何标记；
  // 右列不是热度数值（tip 型时间流榜单，如夸克）时同样不显示——箭头跟在时间后会被误读为热度变化；
  // 条目自带平台编辑标签（微博/百度的「新」「热」）时不再叠加趋势「新」，避免同字形重复（↑/↓ 保留）
  const titleKey = title.trim()
  const delta = trends?.[titleKey]
  const trendNode =
    !item.hot || trends == null ? null : delta === undefined ? (
      label ? null : (
        <span className="shrink-0 text-warning text-xs leading-none">新</span>
      )
    ) : delta > 0 ? (
      <span className="shrink-0 text-danger text-xs leading-none">↑{delta}</span>
    ) : delta < 0 ? (
      <span className="shrink-0 text-success text-xs leading-none">↓{-delta}</span>
    ) : null

  // 右侧内容：热度值 / 提示文案 + 趋势标记（行组件已按 props memo，无需再包 useMemo）
  const hotNode = item.hot ? (
    <HotDisplay value={formatNumber(item.hot)} />
  ) : item.tip ? (
    <HotDisplay prefix={prefix} suffix={suffix} value={item.tip} />
  ) : null
  const endContent =
    hotNode || trendNode ? (
      <div className="shrink-0 flex items-center gap-1.5">
        {hotNode}
        {trendNode}
      </div>
    ) : null

  return (
    <div
      className={`flex group justify-between items-center gap-1 min-w-0 py-1.5 w-full border-b border-default${
        highlightIndex === index ? ' row-flash' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="text-xs size-6 rounded shrink-0 flex items-center justify-center" style={colorStyle}>
          {displayText}
        </div>
        <OverflowDetector record={item} />
      </div>
      {endContent}
    </div>
  )
})

export default HotListRow
