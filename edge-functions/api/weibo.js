/**
 * 微博-热搜榜（Edge Functions 版）
 *
 * 为什么迁到边缘函数：Cloud Functions 按「内存 × 墙钟时长」计费，抓上游的等待时间全部计入
 * 内存时长配额（已超额）；Edge Functions 按 CPU-ms 计费且 I/O 等待不计入，同样的抓取
 * 等待成本降约三个数量级。行为与 Next 版路由保持一致：同一 IResponse 契约、同一数据映射。
 *
 * 与 src/lib/* 的差异（V8 运行时无 npm 包与 Node 内置模块）：请求封装（UA / 超时）、
 * 响应封装（IResponse + 消毒）在此内联，PoC 验证通过后再统一收敛公共层。
 * 缓存窗口代码默认取 1800 与仓库 .env 对齐，控制台环境变量可覆盖（context.env）。
 */

const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

/** 代码默认窗口：与仓库 .env 的 NEXT_PUBLIC_HOT_CACHE_SECONDS 保持一致 */
const FALLBACK_CACHE_SECONDS = 1800

const REQUEST_TIMEOUT = 15000

/** 失败/空数据响应的兜底短缓存：故障期保 CDN 命中、上游恢复后快速自愈（与 src/lib/response.ts 语义一致） */
const SHORT_CACHE_SECONDS = 60

/** 缓存窗口解析：环境变量覆盖，范围收敛 60~3600（与 src/config/response.ts 同规则） */
function resolveCacheSeconds(env) {
  const MIN_SECONDS = 60
  const MAX_SECONDS = 3600
  const raw = env?.NEXT_PUBLIC_HOT_CACHE_SECONDS
  const value = Number.parseInt(raw, 10)

  if (!raw || Number.isNaN(value)) return FALLBACK_CACHE_SECONDS

  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, value))
}

/** 上游请求：统一 Chrome UA 与 15s 超时（V8 无 AbortSignal.timeout，用 AbortController 兜底） */
async function fetchUpstream(url, headers = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    return await fetch(url, {
      headers: { 'User-Agent': UA_CHROME, ...headers },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** 榜单数据消毒：剔除非对象/空白 title 条目并按 id 去重（与 src/lib/response.ts 同规则） */
function sanitizeHotList(list) {
  const seen = new Set()

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

function successResponse(data, cacheSeconds, cacheState) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': `public, s-maxage=${data?.length ? cacheSeconds : SHORT_CACHE_SECONDS}, stale-while-revalidate=60`,
  }

  if (cacheState) {
    headers['X-Cache'] = cacheState
  }

  return new Response(JSON.stringify({ msg: '请求成功', code: 200, data, timestamp: Date.now() }), { headers })
}

/** 手动刷新判断：客户端刷新按钮在 URL 上加 ?t=，同步绕过函数内缓存回源拿最新 */
function isManualRefresh(request) {
  return new URL(request.url).searchParams.has('t')
}

const CACHE_NAMESPACE = 'hot-list-v1'

/**
 * 函数内缓存层（Cache API，PoP 就近缓存，无需控制台审批；KV 审批通过后升级为跨节点一致）：
 * 以「时间戳 + 数据」整包存储，读取时按 TTL 自行判新鲜——不依赖平台对 Cache-Control
 * 过期语义的实现。回源失败时降级返回过期缓存（上游抖动不直接报错给用户）。
 * 空数据不写缓存：避免把上游偶发的空结果钉住整个窗口。
 */
async function withCache(cacheKey, ttlMs, loader, forceRefresh = false) {
  if (typeof caches === 'undefined') {
    return { data: await loader(), cacheState: 'MISS' }
  }

  const cache = await caches.open(CACHE_NAMESPACE)
  let stale = null

  if (!forceRefresh) {
    const hit = await cache.match(cacheKey)

    if (hit) {
      try {
        const packed = await hit.json()

        if (Date.now() - packed.ts < ttlMs) {
          return { data: packed.data, cacheState: 'HIT' }
        }

        stale = packed.data
      } catch {
        // 缓存体损坏按未命中处理
      }
    }
  }

  try {
    const data = await loader()

    if (data?.length) {
      await cache.put(cacheKey, new Response(JSON.stringify({ ts: Date.now(), data })))
    }

    return { data, cacheState: 'MISS' }
  } catch (error) {
    if (stale) {
      return { data: stale, cacheState: 'STALE' }
    }

    throw error
  }
}

function errorResponse() {
  return new Response(JSON.stringify({ msg: '请求失败', code: 500, timestamp: Date.now() }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${SHORT_CACHE_SECONDS}`,
    },
  })
}

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)

  try {
    const { data, cacheState } = await withCache(
      'weibo:hotSearch',
      cacheSeconds * 1000,
      async () => {
        const response = await fetchUpstream('https://weibo.com/ajax/side/hotSearch', {
          Referer: 'https://weibo.com/',
          Accept: 'application/json',
        })

        if (!response.ok) {
          throw new Error(`上游请求失败：${response.status}`)
        }

        const responseBody = await response.json()

        if (responseBody.ok !== 1) {
          return []
        }

        return sanitizeHotList(
          responseBody.data.realtime.map((v) => {
            const key = v.word_scheme ? v.word_scheme : `#${v.word}`

            return {
              id: v.mid,
              title: v.word,
              desc: key,
              hot: v.num,
              label: v.label_name,
              url: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
              mobileUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
            }
          }),
        )
      },
      isManualRefresh(context.request),
    )

    return successResponse(data, cacheSeconds, cacheState)
  } catch (error) {
    console.error('上游请求失败：', error)

    return errorResponse()
  }
}
