/**
 * @description: 客户端门控缓存（localStorage）：按源缓存榜单数据，服务端窗口内重复访问不发请求。
 * 背景：CDN 不缓存边缘函数响应，每次请求都会执行边缘函数并回源上游——
 * 用户侧先把重复访问挡在本地，是最便宜的减量层。
 */

import type { HotListItem } from '@/types'

import { API_CACHE_SECONDS } from '@/config/response'

const CACHE_PREFIX = 'hot-list:v1:'

interface PackedCache {
  /** 数据抓取时间戳：作为 updateTime 口径，保证「xx 前更新」如实反映数据年龄 */
  ts: number
  list: HotListItem[]
}

export interface ClientCacheEntry {
  ts: number
  list: HotListItem[]
}

/**
 * 读取某源的门控缓存：未过期且有数据才返回，其余一律视为未命中。
 * 过期即弃（不返回陈旧数据）：数据陈旧时走正常请求路径，失败语义由请求层处理。
 */
export function readClientCache(value: string): ClientCacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + value)

    if (!raw) return null

    const packed = JSON.parse(raw) as PackedCache

    if (!packed || typeof packed.ts !== 'number') return null
    if (Date.now() - packed.ts >= API_CACHE_SECONDS * 1000) return null
    if (!Array.isArray(packed.list) || !packed.list.length) return null

    return { ts: packed.ts, list: packed.list }
  } catch {
    // 缓存体损坏按未命中处理
    return null
  }
}

/**
 * 写入门控缓存：localStorage 写满（47 源 × 数十 KB 逼近 5MB 配额）或隐私模式等
 * 异常静默放弃——门控是纯增益，丢缓存只损失免请求命中，不影响任何功能。
 */
export function writeClientCache(value: string, ts: number, list: HotListItem[]): void {
  try {
    const packed: PackedCache = { ts, list }

    localStorage.setItem(CACHE_PREFIX + value, JSON.stringify(packed))
  } catch {
    // 静默失败
  }
}
