/**
 * 聚合数据客户端层：一次 /api/all 请求服务全部卡片与搜索索引。
 *
 * 演进说明：取代早期的按源 localStorage 门控（client-cache）——47 份按源缓存与
 * 聚合缓存双写会逼近 localStorage 5MB 配额，且首屏仍需多次请求；聚合层把
 * 「每会话 ~10 个单源请求」压缩为「1 个聚合请求」，其余卡片秒开。
 *
 * 三级读取：内存 → localStorage（10 分钟客户端 TTL，短于服务端 30 分钟窗口，
 * 窗口后段回源聚合顺带刷新）→ /api/all。失败返回 null，调用方回退单源请求。
 */
import type { HotListItem } from '@/types'

const STORAGE_KEY = 'hot-aggregate:v1'
/** 旧版按源门控缓存的前缀：一次性清理，避免残留占用配额 */
const LEGACY_PREFIX = 'hot-list:v1:'

export interface AggregateEntry {
  /** 数据在服务端的真实抓取时间（作为卡片 updateTime 口径） */
  ts: number
  /** 榜单条目（服务端零解析透传的 KV 值，字段名与单源 IResponse.data 对齐） */
  data: HotListItem[]
}

type AggregateData = Record<string, AggregateEntry>

interface PackedAggregate {
  /** 聚合响应的接收时间（客户端 TTL 基准） */
  fetchedAt: number
  data: AggregateData
}

/** 客户端聚合 TTL：10 分钟（短于服务端 30 分钟窗口，窗口后段回源聚合刷新数据） */
const CLIENT_TTL_MS = 10 * 60 * 1000

let memory: PackedAggregate | null = null
let inflight: Promise<AggregateData | null> | null = null
let legacyPurged = false

function readLocal(): PackedAggregate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) return null

    const packed = JSON.parse(raw) as PackedAggregate

    if (!packed || typeof packed.fetchedAt !== 'number' || !packed.data) return null

    return packed
  } catch {
    // 缓存体损坏按未命中处理
    return null
  }
}

function writeLocal(packed: PackedAggregate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packed))
  } catch {
    // 配额满/隐私模式静默放弃：聚合是增益，丢缓存只损失免请求命中
  }
}

/** 一次性清理旧版按源门控缓存（47 个键约 2MB，避免与聚合缓存叠加超配额） */
function purgeLegacyGateCache(): void {
  if (legacyPurged) return

  legacyPurged = true

  try {
    const stale: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (key?.startsWith(LEGACY_PREFIX)) {
        stale.push(key)
      }
    }

    stale.forEach((key) => localStorage.removeItem(key))
  } catch {
    // 静默失败
  }
}

/**
 * 取聚合数据：内存 → localStorage → /api/all。
 * 返回 null 表示聚合不可用（网络失败/服务端空），调用方回退单源请求。
 */
export async function getAggregate(): Promise<AggregateData | null> {
  purgeLegacyGateCache()

  const now = Date.now()

  if (memory && now - memory.fetchedAt < CLIENT_TTL_MS) {
    return memory.data
  }

  const local = readLocal()

  if (local && now - local.fetchedAt < CLIENT_TTL_MS) {
    memory = local

    return local.data
  }

  if (!inflight) {
    inflight = (async () => {
      try {
        const response = await fetch('/api/all')

        if (!response.ok) return null

        const body = await response.json()

        if (body.code !== 200 || !body.data) return null

        const packed: PackedAggregate = { fetchedAt: Date.now(), data: body.data as AggregateData }

        memory = packed
        writeLocal(packed)

        return packed.data
      } catch {
        return null
      } finally {
        inflight = null
      }
    })()
  }

  return inflight
}

/** 手动刷新单源后合并新数据（内存 + localStorage），避免其他卡片重新拉取聚合 */
export function mergeAggregateSource(value: string, ts: number, data: HotListItem[]): void {
  const base: PackedAggregate = memory ?? readLocal() ?? { fetchedAt: Date.now(), data: {} }

  base.data[value] = { ts, data }
  base.fetchedAt = Date.now()
  memory = base
  writeLocal(base)
}
