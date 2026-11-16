import type { HotListItem, IResponse } from '@/types'

import { NextResponse } from 'next/server'

import { API_CACHE_SECONDS, RESPONSE } from '@/config/response'

/**
 * 成功响应缓存头：CDN 边缘缓存窗口与服务端 fetch revalidate、客户端刷新冷却三层同源，
 * 均取自 API_CACHE_SECONDS，stale-while-revalidate 平滑刷新
 */
const CACHE_HEADERS = { 'Cache-Control': `public, s-maxage=${API_CACHE_SECONDS}, stale-while-revalidate=60` }
/**
 * 失败/空数据响应的兜底短缓存：故障期间仍给 CDN 一层保护，
 * 避免每次请求都回源触发 Cloud Functions（配额消耗的最后一道闸）；
 * 60s 上限保证上游恢复后最多 1 分钟自愈。手动强刷走 ?t= 新变体，不受此影响。
 */
const SHORT_CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60' }

/**
 * 失败响应：60s 短缓存（原 no-store 会在上游故障期间让每次请求都零保护回源），时间戳实时
 */
export function errorResponse(): NextResponse {
  const body: IResponse = {
    msg: RESPONSE.label(RESPONSE.ERROR),
    code: RESPONSE.ERROR,
    timestamp: Date.now(),
  }

  return NextResponse.json(body, { headers: SHORT_CACHE_HEADERS })
}

/**
 * 榜单数据消毒：在响应出口统一兜底上游字段异常——
 * - 剔除非对象条目、title 非字符串或空白（客户端排名对比与搜索会对 title 调 trim/toLowerCase，异常值直接炸渲染）
 * - 按 id 去重（重复 id 会导致虚拟列表 React key 冲突）；无 id 的条目不参与去重、原样保留
 * 只清洗不改结构：IResponse 契约与成功/失败语义不变，各路由无需自行防御
 */
function sanitizeHotList(list?: HotListItem[]): HotListItem[] {
  const seen = new Set<string>()

  return (list ?? []).filter((item) => {
    if (!item || typeof item.title !== 'string' || !item.title.trim()) {
      return false
    }

    if (item.id === undefined || item.id === null) {
      return true
    }

    const key = String(item.id)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

/**
 * 成功响应：统一封装 + 出口数据消毒 + CDN 缓存头
 * 空数据按 60s 短缓存处理（原为不缓存）：客户端把空列表视为失败会立即重试，
 * 长窗口缓存会把空结果钉住整个窗口；60s 在「省回源」与「上游恢复快速自愈」间取平衡
 */
export function successResponse(list?: HotListItem[]): NextResponse {
  const data = sanitizeHotList(list)
  const body: IResponse = {
    msg: RESPONSE.label(RESPONSE.SUCCESS),
    code: RESPONSE.SUCCESS,
    data,
    timestamp: Date.now(),
  }

  return NextResponse.json(body, { headers: data.length ? CACHE_HEADERS : SHORT_CACHE_HEADERS })
}
