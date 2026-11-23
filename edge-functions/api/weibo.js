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

function successResponse(data, cacheSeconds, cacheState, timestamp = Date.now()) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': `public, s-maxage=${data?.length ? cacheSeconds : SHORT_CACHE_SECONDS}, stale-while-revalidate=60`,
  }

  if (cacheState) {
    headers['X-Cache'] = cacheState
  }

  return new Response(JSON.stringify({ msg: '请求成功', code: 200, data, timestamp }), { headers })
}

/** 手动刷新判断：客户端刷新按钮在 URL 上加 ?t=，同步绕过函数内缓存回源拿最新 */
function isManualRefresh(request) {
  return new URL(request.url).searchParams.has('t')
}

const CACHE_NAMESPACE = 'hot-list-v1'

/**
 * isolate 内存缓存兜底：Cache API 不可用或操作失败时，同 isolate 的后续请求
 * 仍能命中缓存（多 isolate 各自维护，效果按 PoP 打折，但回源量依旧大幅下降）。
 */
const memoryCache = new Map()

/**
 * 缓存存储仲裁：KV（跨节点一致，命名空间绑定的全局变量 hot_kv）→ Cache API → isolate 内存。
 * 任一层获取失败自动降级下一层；缓存键为上游真实 URL（同时满足 Cache API 的合法键校验）。
 */
async function resolveCacheStore() {
  // KV 优先：命名空间绑定的全局变量（未绑定时 typeof 判定安全跳过，不影响部署）
  try {
    if (typeof hot_kv !== 'undefined' && hot_kv) {
      return {
        match: async (key) => {
          const packed = await hot_kv.get(key)

          return packed === null || packed === undefined ? undefined : new Response(packed)
        },
        put: async (key, response) => {
          await hot_kv.put(key, await response.text())
        },
      }
    }
  } catch {
    // KV 访问异常，降级到 Cache API
  }

  try {
    if (typeof caches !== 'undefined' && typeof caches.open === 'function') {
      return await caches.open(CACHE_NAMESPACE)
    }
  } catch {
    // Cache API 不可用，降级到内存缓存
  }

  return {
    match: async (key) => {
      const packed = memoryCache.get(key)

      return packed === undefined ? undefined : new Response(packed)
    },
    put: async (key, response) => {
      // 控制内存占用：超过 50 条按插入序淘汰
      if (memoryCache.size >= 50) {
        const firstKey = memoryCache.keys().next().value

        memoryCache.delete(firstKey)
      }

      memoryCache.set(key, await response.clone().text())
    },
  }
}

/**
 * 函数内缓存层：以「时间戳 + 数据」整包存储，读取时按 TTL 自行判新鲜——
 * 不依赖平台对 Cache-Control 过期语义的实现。缓存键必须是合法 URL
 * （Cache API 的 match/put 会校验）。缓存层任何失败都不影响请求本身：
 * 读失败按未命中、写失败静默跳过、回源失败降级返回过期缓存（STALE）。
 * 空数据不写缓存：避免把上游偶发的空结果钉住整个窗口。
 */
async function withCache(cacheKey, ttlMs, loader, forceRefresh = false) {
  let store = null
  let stale = null

  try {
    store = await resolveCacheStore()
  } catch {
    store = null
  }

  if (store && !forceRefresh) {
    try {
      const hit = await store.match(cacheKey)

      if (hit) {
        const packed = await hit.json()

        if (Date.now() - packed.ts < ttlMs) {
          return { data: packed.data, cacheState: 'HIT', ts: packed.ts }
        }

        stale = packed
      }
    } catch {
      // 读缓存失败按未命中处理
    }
  }

  try {
    const data = await loader()
    const ts = Date.now()

    if (store && data?.length) {
      try {
        await store.put(cacheKey, new Response(JSON.stringify({ ts, data })))
      } catch {
        // 写缓存失败不影响响应
      }
    }

    return { data, cacheState: 'MISS', ts }
  } catch (error) {
    if (stale) {
      return { data: stale.data, cacheState: 'STALE', ts: stale.ts }
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
    const { data, cacheState, ts } = await withCache(
      'https://weibo.com/ajax/side/hotSearch',
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

    return successResponse(data, cacheSeconds, cacheState, ts)
  } catch (error) {
    console.error('上游请求失败：', error)

    return errorResponse()
  }
}
