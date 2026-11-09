/**
 * @description: 上游请求公共工具：统一 UA、超时、缓存与错误日志
 */

import { API_CACHE_SECONDS } from '@/config/response'

/** Chrome 桌面端 UA（多数上游 JSON API 的反爬要求） */
export const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

/** 默认请求超时（ms）：上游挂死时避免请求永久挂起 */
export const REQUEST_TIMEOUT = 15_000

interface RequestInitLike {
  headers?: Record<string, string>
  signal?: AbortSignal
  /** 显式缓存策略（传了则跳过默认 revalidate） */
  cache?: RequestCache
  /** 显式 Next.js 缓存配置（传了则跳过默认 revalidate） */
  next?: { revalidate?: number }
  /** 手动刷新：绕过 Next Data Cache 直接回源（配合客户端 ?t= 绕过 CDN，才能真正拿到最新数据） */
  refresh?: boolean
  /** 文本解码编码（默认 utf-8；GBK 页面如腾讯游戏官网传 'gbk'） */
  encoding?: string
  [key: string]: unknown
}

/**
 * 判断请求是否为手动刷新：客户端刷新按钮会在 URL 上加 ?t= 时间戳绕过 CDN 边缘缓存，
 * 服务端需同步绕过 Data Cache，否则刷新拿到的仍是数据缓存里的旧数据（timestamp 却是新的）
 */
export function isManualRefresh(request: Request): boolean {
  return new URL(request.url).searchParams.has('t')
}

/**
 * 组装 fetch 参数并发起请求：UA / 超时 / 缓存策略的公共层，fetchJson 与 fetchText 共用
 */
async function fetchWithDefaults(url: string, init: RequestInitLike): Promise<Response> {
  const { cache, next, headers, signal, refresh, ...restInit } = init

  return fetch(url, {
    ...restInit,
    ...(cache ? { cache } : {}),
    // 默认 revalidate 缓存；调用方显式传 cache / next 时尊重调用方
    ...(next ?? (cache ? {} : { next: { revalidate: API_CACHE_SECONDS } })),
    // 手动刷新优先级最高：no-store 不读写数据缓存，保证回源拿最新
    ...(refresh ? { cache: 'no-store' as RequestCache } : {}),
    signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT),
    headers: buildHeaders(headers),
  })
}

/**
 * 统一 GET 请求并解析 JSON
 * - 默认携带 Chrome UA（可被 init.headers 覆盖，传空字符串可移除）
 * - 默认 15s 超时（可被 init.signal 覆盖）
 * - 默认缓存 API_CACHE_SECONDS 秒（可被 init.cache / init.next 覆盖）
 * - 非 2xx 直接抛错（错误信息含状态码与 URL）
 */
export async function fetchJson<T = any>(url: string, init: RequestInitLike = {}): Promise<T> {
  const response = await fetchWithDefaults(url, init)

  if (!response.ok) {
    throw new Error(`上游请求失败：${response.status} ${url}`)
  }

  return response.json() as Promise<T>
}

/**
 * 统一 GET 请求并返回文本（用于 cheerio / 正则解析的 HTML 页面）
 * - 默认按 UTF-8 解码；GBK 等非 UTF-8 页面需显式传 encoding（response.text() 固定 UTF-8 会乱码）
 */
export async function fetchText(url: string, init: RequestInitLike = {}): Promise<string> {
  const response = await fetchWithDefaults(url, init)

  if (!response.ok) {
    throw new Error(`上游请求失败：${response.status} ${url}`)
  }

  const buffer = await response.arrayBuffer()

  return new TextDecoder(typeof init.encoding === 'string' ? init.encoding : 'utf-8').decode(buffer)
}

/**
 * 统一 GET 请求并返回二进制（图片等），与 fetchJson / fetchText 共用 UA、超时与缓存策略
 */
export async function fetchBuffer(url: string, init: RequestInitLike = {}): Promise<ArrayBuffer> {
  const response = await fetchWithDefaults(url, init)

  if (!response.ok) {
    throw new Error(`上游请求失败：${response.status} ${url}`)
  }

  return response.arrayBuffer()
}

/**
 * 组装请求头：
 * - 未显式设置 User-Agent 时注入默认 Chrome UA
 * - 显式传 'User-Agent': '' 表示不发送 UA 头（个别上游对桌面 UA 返回反爬页）
 */
function buildHeaders(initHeaders?: Record<string, string>) {
  const headers = new Headers()
  let hasExplicitUA = false

  for (const [key, value] of Object.entries(initHeaders ?? {})) {
    if (key.toLowerCase() === 'user-agent') {
      hasExplicitUA = true
      if (value) headers.set(key, value)
    } else {
      headers.set(key, value)
    }
  }

  if (!hasExplicitUA) {
    headers.set('User-Agent', UA_CHROME)
  }

  return headers
}
