/**
 * IT之家-热榜（Edge Functions 版）
 *
 * 迁移动机同 weibo.js：抓取等待时间从 Cloud Functions 的内存时长计费（已超额）
 * 换到 Edge Functions 的 CPU-ms 计费（I/O 等待不计入）。
 *
 * V8 运行时差异：无 npm 包，cheerio 不可用——改用正则解析。上游页面结构稳定
 * （.placeholder 块内含 a[href] / .plc-title / img[data-original] / .review-num），
 * 解析规则与 Next 版的 cheerio 选择器一一对应，并有本地对拍测试保障输出一致。
 */

const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

/** 代码默认窗口：与仓库 .env 的 NEXT_PUBLIC_HOT_CACHE_SECONDS 保持一致 */
const FALLBACK_CACHE_SECONDS = 1800

const REQUEST_TIMEOUT = 15000

/** 失败/空数据响应的兜底短缓存（与 src/lib/response.ts 语义一致） */
const SHORT_CACHE_SECONDS = 60

/** 链接转换：移动端短链转 PC 端文章页（与 Next 版 replaceLink 同一正则） */
function replaceLink(url) {
  const match = url.match(/[html|ive]\/(\d+)\.htm/)

  if (match && match[1]) {
    return `https://www.ithome.com/0/${match[1].slice(0, 3)}/${match[1].slice(3)}.htm`
  }

  return url
}

/** 常见 HTML 实体解码（&amp; 最后替换避免二次解码），对齐 cheerio .text() 的实体还原行为 */
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** 正则解析榜单：按 .placeholder 块切分，逐块提取链接/标题/封面/评论数 */
function parseIthomeRank(html) {
  const blocks = html.split('<div class="placeholder').slice(1)
  const result = []

  for (const block of blocks) {
    const anchorEnd = block.indexOf('</a>')
    const segment = anchorEnd > -1 ? block.slice(0, anchorEnd) : block
    const hrefMatch = segment.match(/<a[^>]*href="([^"]+)"/)
    const titleMatch = segment.match(/<p class="plc-title">([\s\S]*?)<\/p>/)

    if (!hrefMatch || !titleMatch) {
      continue
    }

    const picMatch = segment.match(/data-original="([^"]+)"/)
    const hotMatch = segment.match(/<span class="review-num">(\d+)/)

    result.push({
      id: result.length,
      title: decodeEntities(titleMatch[1]).trim(),
      pic: picMatch ? picMatch[1] : undefined,
      hot: hotMatch ? Number(hotMatch[1]) : 0,
      url: replaceLink(hrefMatch[1]),
      mobileUrl: replaceLink(hrefMatch[1]),
    })
  }

  return result
}

/* ---------- 缓存与请求封装（与 weibo.js 相同的内联约定） ---------- */

function resolveCacheSeconds(env) {
  const MIN_SECONDS = 60
  const MAX_SECONDS = 3600
  const raw = env?.NEXT_PUBLIC_HOT_CACHE_SECONDS
  const value = Number.parseInt(raw, 10)

  if (!raw || Number.isNaN(value)) return FALLBACK_CACHE_SECONDS

  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, value))
}

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
      'ithome:rankm',
      cacheSeconds * 1000,
      async () => {
        const response = await fetchUpstream('https://m.ithome.com/rankm')

        if (!response.ok) {
          throw new Error(`上游请求失败：${response.status}`)
        }

        const html = new TextDecoder().decode(await response.arrayBuffer())

        return sanitizeHotList(parseIthomeRank(html))
      },
      isManualRefresh(context.request),
    )

    return successResponse(data, cacheSeconds, cacheState)
  } catch (error) {
    console.error('上游请求失败：', error)

    return errorResponse()
  }
}
