/**
 * Edge Functions 共享库：全部榜单路由的公共能力。
 *
 * 为什么收敛到这里：47 个路由的 请求封装（UA/超时/编码/POST）→ 响应封装（IResponse 契约 +
 * 数据消毒）→ 函数内缓存（KV → Cache API → 内存 三层降级）完全同构，只有「上游 URL +
 * 数据映射」是每路由差异；公共层单点维护，路由文件只保留各自的映射逻辑。
 *
 * V8 运行时约束：无 npm 包、无 Node 内置模块（crypto/fs），MD5 用纯 JS 实现、
 * SHA-1 走 Web Crypto（异步）、GBK 解码用 TextDecoder。
 *
 * 注意：本文件不带 onRequest 导出，不会被平台当作函数路由（_ 前缀 + 无 handler 双保险）。
 */

/* ================= 常量 ================= */

/** Chrome 桌面端 UA（多数上游 JSON API 的反爬要求） */
export const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

/** 代码默认缓存窗口：与仓库 .env 的 NEXT_PUBLIC_HOT_CACHE_SECONDS 保持一致 */
export const FALLBACK_CACHE_SECONDS = 1800

/** 默认请求超时（ms）：上游挂死时避免请求永久挂起 */
export const REQUEST_TIMEOUT = 15000

/** 失败/空数据响应的兜底短缓存（与 src/lib/response.ts 语义一致） */
export const SHORT_CACHE_SECONDS = 60

const CACHE_NAMESPACE = 'hot-list-v1'

/* ================= 缓存窗口 ================= */

/** 缓存窗口解析：环境变量覆盖，范围收敛 60~3600（与 src/config/response.ts 同规则） */
export function resolveCacheSeconds(env) {
  const MIN_SECONDS = 60
  const MAX_SECONDS = 3600
  const raw = env?.NEXT_PUBLIC_HOT_CACHE_SECONDS
  const value = Number.parseInt(raw, 10)

  if (!raw || Number.isNaN(value)) return FALLBACK_CACHE_SECONDS

  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, value))
}

/* ================= 请求封装 ================= */

/**
 * 组装请求头：未显式设置 UA 时注入 Chrome UA；显式传 'User-Agent': '' 表示
 * 不发送该头（虎扑/个别上游对桌面 UA 返回反爬页）
 */
function buildHeaders(initHeaders = {}) {
  const headers = {}
  let hasUA = false

  for (const [key, value] of Object.entries(initHeaders)) {
    if (key.toLowerCase() === 'user-agent') {
      hasUA = true

      if (value) headers[key] = value
    } else {
      headers[key] = value
    }
  }

  if (!hasUA) {
    headers['User-Agent'] = UA_CHROME
  }

  return headers
}

/**
 * 上游请求：统一 UA 注入 / 超时（AbortController 兜底）/ 自定义方法与请求体
 * - options.encoding：非 UTF-8 页面（GBK/GB18030）由 fetchUpstreamText 解码，此处不处理
 */
export async function fetchUpstream(url, options = {}) {
  const { headers = {}, method, body, timeout = REQUEST_TIMEOUT } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, {
      ...(method ? { method } : {}),
      ...(body ? { body } : {}),
      headers: buildHeaders(headers),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** 统一 GET/POST 并解析 JSON：非 2xx 抛错（错误信息含状态码与 URL） */
export async function fetchUpstreamJson(url, options = {}) {
  const response = await fetchUpstream(url, options)

  if (!response.ok) {
    throw new Error(`上游请求失败：${response.status} ${url}`)
  }

  return response.json()
}

/** 统一请求并返回解码文本：encoding 支持 gbk / gb18030（response.text() 固定 UTF-8 会乱码） */
export async function fetchUpstreamText(url, options = {}) {
  const response = await fetchUpstream(url, options)

  if (!response.ok) {
    throw new Error(`上游请求失败：${response.status} ${url}`)
  }

  return new TextDecoder(options.encoding || 'utf-8').decode(await response.arrayBuffer())
}

/** 手动刷新判断：客户端刷新按钮在 URL 上加 ?t=，同步绕过函数内缓存回源拿最新 */
export function isManualRefresh(request) {
  return new URL(request.url).searchParams.has('t')
}

/* ================= 爬虫早退（EF CPU 紧急止血） ================= */

/**
 * 已知爬虫/采集器 UA 特征（子串匹配，不区分大小写）。
 * 背景（2026-11-26）：EF 执行次数 = 全部 API 请求数（CDN 不缓存边缘函数响应），
 * 流量以爬虫为主且持续上涨，执行一次 ~10ms CPU 已致配额 80.7%、按速率次日耗尽。
 * 已知爬虫 UA 在函数入口早退（~0.1ms），成本降约 100 倍；
 * robots.txt（Disallow /api/）管得住守规矩的爬虫，此处兜住不守规矩的。
 */
const BOT_UA_RE =
  /(?:bot|spider|crawl|slurp|bytespider|petalbot|yisou|datespider|okhttp|python-requests|python-urllib|aiohttp|httpx|go-http-client|java\/|curl\/|wget|axios|scrapy|headlesschrome|lighthouse|pagespeed|gptbot|claudebot|anthropic-ai|perplexitybot|oai-searchbot|meta-externalagent|meta-webindexer|dataforseo|ahrefs|semrush|mj12bot|dotbot|megaindex|seostar|serpstat|buzzsumo|feedly|rss|feedfetcher|arkwright|checkmarknetwork|serpcluster|nanobot|zpider|survey|monitor|scanner|fuzz|nuclei|masscan|zmap|dirbuster|nmap|sqlmap|nikto|acunetix|netsparker|qualys)/i

/** 判断请求是否来自爬虫/脚本：无 UA 也视为脚本（浏览器必带 UA） */
export function isBotRequest(request) {
  const ua = request.headers.get('user-agent') ?? ''

  return ua === '' || BOT_UA_RE.test(ua)
}

/** 爬虫早退响应：429（前端已有 FatalRequestError 的「请求过于频繁」文案处理）+ 不缓存 */
export function botRejectResponse() {
  return new Response(JSON.stringify({ msg: '请求过于频繁', code: 429, timestamp: Date.now() }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

/* ================= 响应封装 ================= */

/** 榜单数据消毒：剔除非对象/空白 title 条目并按 id 去重（与 src/lib/response.ts 同规则） */
export function sanitizeHotList(list) {
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

/** 成功响应：IResponse 契约 + CDN 缓存头（空数据走 60s 短缓存）+ X-Cache 调试标记 */
export function successResponse(data, cacheSeconds, cacheState, timestamp = Date.now()) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': `public, s-maxage=${data?.length ? cacheSeconds : SHORT_CACHE_SECONDS}, stale-while-revalidate=60`,
  }

  if (cacheState) {
    headers['X-Cache'] = cacheState
  }

  return new Response(JSON.stringify({ msg: '请求成功', code: 200, data, timestamp }), { headers })
}

/** 失败响应：60s 短缓存（故障期保 CDN 命中、上游恢复后快速自愈），时间戳实时 */
export function errorResponse() {
  return new Response(JSON.stringify({ msg: '请求失败', code: 500, timestamp: Date.now() }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${SHORT_CACHE_SECONDS}`,
    },
  })
}

/* ================= 函数内缓存（KV → Cache API → isolate 内存） ================= */

/**
 * isolate 内存缓存兜底：Cache API 不可用或操作失败时，同 isolate 的后续请求
 * 仍能命中缓存（多 isolate 各自维护，效果按 PoP 打折，但回源量依旧大幅下降）。
 */
const memoryCache = new Map()

/** Cache API 不可用时返回内存缓存适配器（同一 match/put 接口） */
function memoryStore() {
  return {
    match: async (key) => {
      const packed = memoryCache.get(key)

      return packed === undefined ? undefined : new Response(packed)
    },
    put: async (key, response) => {
      // 控制内存占用：超过 64 条按插入序淘汰
      if (memoryCache.size >= 64) {
        const firstKey = memoryCache.keys().next().value

        memoryCache.delete(firstKey)
      }

      memoryCache.set(key, await response.clone().text())
    },
  }
}

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

  return memoryStore()
}

/**
 * 函数内缓存：以「时间戳 + 数据」整包存储，读取时按 TTL 自行判新鲜——
 * 不依赖平台对 Cache-Control 过期语义的实现。缓存层任何失败都不影响请求本身：
 * 读失败按未命中、写失败静默跳过、回源失败降级返回过期缓存（STALE）。
 * 空数据不写缓存：避免把上游偶发的空结果钉住整个窗口。
 */
export async function withCache(cacheKey, ttlMs, loader, forceRefresh = false) {
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

    // 空数据视为抓取失败（与客户端「空数据视为失败」同语义）：
    // 不写缓存，有陈旧缓存则降级返回（STALE）——防止上游偶发空结果
    // （反爬页、接口抖动）把缓存打空后用户看到空白
    if (!data?.length && stale) {
      return { data: stale.data, cacheState: 'STALE', ts: stale.ts }
    }

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

/**
 * 榜单路由标准 handler：缓存窗口解析 → withCache 门控 → IResponse 响应 → 失败兜底，
 * 47 个路由的执行骨架完全同构，路由文件只提供 cacheKey 与 loader（上游抓取 + 映射）。
 */
export async function handleHotList(context, { cacheKey, loader }) {
  // 爬虫早退：必须在任何缓存/回源逻辑之前（单次 ~0.1ms，对比正常执行 ~10ms）
  if (isBotRequest(context.request)) {
    return botRejectResponse()
  }

  const cacheSeconds = resolveCacheSeconds(context.env)

  try {
    const { data, cacheState, ts } = await withCache(
      cacheKey,
      cacheSeconds * 1000,
      loader,
      isManualRefresh(context.request),
    )

    return successResponse(data, cacheSeconds, cacheState, ts)
  } catch (error) {
    // 错误详情透出到 console 与响应头：EF 运行时的失败在线上只能看到 500，
    // 没有原因就无法定位（如 V8 fetch 对 POST body 的处理差异）
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)

    console.error('上游请求失败：', error)

    const response = errorResponse()

    response.headers.set('X-Error-Reason', encodeURIComponent(reason).slice(0, 400))

    return response
  }
}

/* ================= 文本工具 ================= */

/** 去除文本里夹杂的 HTML 标签并 trim */
export function stripTags(text) {
  return text ? text.replace(/<[^>]+>/g, '').trim() : undefined
}

/**
 * HTML 实体解码，对齐 cheerio .text() 的实体还原行为：
 * 覆盖命名实体与数字/十六进制字符引用（&#183; / &#xB7;），&amp; 最后替换避免二次解码。
 */
export function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** 两位数补零 */
const pad2 = (n) => n.toString().padStart(2, '0')

/** 秒级时间戳 → 东八区「MM-DD」（与 src/lib/utils.ts 同实现） */
export function formatCnMonthDay(timestamp) {
  if (!timestamp) return undefined

  const date = new Date(timestamp * 1000 + 8 * 3_600_000)

  return `${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/** 毫秒时长 → HH:MM:SS 或 MM:SS（与 src/lib/utils.ts 同实现） */
export function convertMillisecondsToTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0 ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`
}

/* ================= 纯 JS MD5（Web Crypto 不含 MD5，输出同 node:crypto 小写 hex） ================= */

function md5cycle(x, k) {
  let a = x[0]
  let b = x[1]
  let c = x[2]
  let d = x[3]

  a = ff(a, b, c, d, k[0], 7, -680876936)
  d = ff(d, a, b, c, k[1], 12, -389564586)
  c = ff(c, d, a, b, k[2], 17, 606105819)
  b = ff(b, c, d, a, k[3], 22, -1044525330)
  a = ff(a, b, c, d, k[4], 7, -176418897)
  d = ff(d, a, b, c, k[5], 12, 1200080426)
  c = ff(c, d, a, b, k[6], 17, -1473231341)
  b = ff(b, c, d, a, k[7], 22, -45705983)
  a = ff(a, b, c, d, k[8], 7, 1770035416)
  d = ff(d, a, b, c, k[9], 12, -1958414417)
  c = ff(c, d, a, b, k[10], 17, -42063)
  b = ff(b, c, d, a, k[11], 22, -1990404162)
  a = ff(a, b, c, d, k[12], 7, 1804603682)
  d = ff(d, a, b, c, k[13], 12, -40341101)
  c = ff(c, d, a, b, k[14], 17, -1502002290)
  b = ff(b, c, d, a, k[15], 22, 1236535329)

  a = gg(a, b, c, d, k[1], 5, -165796510)
  d = gg(d, a, b, c, k[6], 9, -1069501632)
  c = gg(c, d, a, b, k[11], 14, 643717713)
  b = gg(b, c, d, a, k[0], 20, -373897302)
  a = gg(a, b, c, d, k[5], 5, -701558691)
  d = gg(d, a, b, c, k[10], 9, 38016083)
  c = gg(c, d, a, b, k[15], 14, -660478335)
  b = gg(b, c, d, a, k[4], 20, -405537848)
  a = gg(a, b, c, d, k[9], 5, 568446438)
  d = gg(d, a, b, c, k[14], 9, -1019803690)
  c = gg(c, d, a, b, k[3], 14, -187363961)
  b = gg(b, c, d, a, k[8], 20, 1163531501)
  a = gg(a, b, c, d, k[13], 5, -1444681467)
  d = gg(d, a, b, c, k[2], 9, -51403784)
  c = gg(c, d, a, b, k[7], 14, 1735328473)
  b = gg(b, c, d, a, k[12], 20, -1926607734)

  a = hh(a, b, c, d, k[5], 4, -378558)
  d = hh(d, a, b, c, k[8], 11, -2022574463)
  c = hh(c, d, a, b, k[11], 16, 1839030562)
  b = hh(b, c, d, a, k[14], 23, -35309556)
  a = hh(a, b, c, d, k[1], 4, -1530992060)
  d = hh(d, a, b, c, k[4], 11, 1272893353)
  c = hh(c, d, a, b, k[7], 16, -155497632)
  b = hh(b, c, d, a, k[10], 23, -1094730640)
  a = hh(a, b, c, d, k[13], 4, 681279174)
  d = hh(d, a, b, c, k[0], 11, -358537222)
  c = hh(c, d, a, b, k[3], 16, -722521979)
  b = hh(b, c, d, a, k[6], 23, 76029189)
  a = hh(a, b, c, d, k[9], 4, -640364487)
  d = hh(d, a, b, c, k[12], 11, -421815835)
  c = hh(c, d, a, b, k[15], 16, 530742520)
  b = hh(b, c, d, a, k[2], 23, -995338651)

  a = ii(a, b, c, d, k[0], 6, -198630844)
  d = ii(d, a, b, c, k[7], 10, 1126891415)
  c = ii(c, d, a, b, k[14], 15, -1416354905)
  b = ii(b, c, d, a, k[5], 21, -57434055)
  a = ii(a, b, c, d, k[12], 6, 1700485571)
  d = ii(d, a, b, c, k[3], 10, -1894986606)
  c = ii(c, d, a, b, k[10], 15, -1051523)
  b = ii(b, c, d, a, k[1], 21, -2054922799)
  a = ii(a, b, c, d, k[8], 6, 1873313359)
  d = ii(d, a, b, c, k[15], 10, -30611744)
  c = ii(c, d, a, b, k[6], 15, -1560198380)
  b = ii(b, c, d, a, k[13], 21, 1309151649)
  a = ii(a, b, c, d, k[4], 6, -145523070)
  d = ii(d, a, b, c, k[11], 10, -1120210379)
  c = ii(c, d, a, b, k[2], 15, 718787259)
  b = ii(b, c, d, a, k[9], 21, -343485551)

  x[0] = add32(a, x[0])
  x[1] = add32(b, x[1])
  x[2] = add32(c, x[2])
  x[3] = add32(d, x[3])
}

function cmn(q, a, b, x, s, t) {
  a = add32(add32(a, q), add32(x, t))

  return add32((a << s) | (a >>> (32 - s)), b)
}

function ff(a, b, c, d, x, s, t) {
  return cmn((b & c) | (~b & d), a, b, x, s, t)
}

function gg(a, b, c, d, x, s, t) {
  return cmn((b & d) | (c & ~d), a, b, x, s, t)
}

function hh(a, b, c, d, x, s, t) {
  return cmn(b ^ c ^ d, a, b, x, s, t)
}

function ii(a, b, c, d, x, s, t) {
  return cmn(c ^ (b | ~d), a, b, x, s, t)
}

function md51(s) {
  const n = s.length
  const state = [1732584193, -271733879, -1732584194, 271733878]
  let i

  for (i = 64; i <= n; i += 64) {
    md5cycle(state, md5blk(s.substring(i - 64, i)))
  }

  const tail = new Array(16).fill(0)

  for (i = 0; i < n; i++) {
    tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3)
  }

  tail[i >> 2] |= 0x80 << ((i % 4) << 3)

  if (i > 55) {
    md5cycle(state, tail)

    for (i = 0; i < 16; i++) {
      tail[i] = 0
    }
  }

  tail[14] = n * 8
  md5cycle(state, tail)

  return state
}

function md5blk(s) {
  const blocks = []

  for (let i = 0; i < 64; i += 4) {
    blocks[i >> 2] =
      s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24)
  }

  return blocks
}

const HEX_CHARS = '0123456789abcdef'

function rhex(n) {
  let s = ''

  for (let j = 0; j < 4; j++) {
    s += HEX_CHARS[(n >> (j * 8 + 4)) & 0x0f] + HEX_CHARS[(n >> (j * 8)) & 0x0f]
  }

  return s
}

function add32(a, b) {
  return (a + b) & 0xffffffff
}

/** 与 node createHash('md5').digest('hex') 输出一致：先转 UTF-8 字节串再哈希 */
export function md5Hex(input) {
  const bytes = new TextEncoder().encode(input)
  let binary = ''

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return md51(binary)
    .map(rhex)
    .join('')
}

/** SHA-1（Web Crypto 原生支持，异步）：输出小写 hex，同 node:crypto */
export async function sha1Hex(input) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input))

  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 微信读书书籍 ID 换算（与 src/lib/weread.ts 逐行对齐：先 MD5 派生固定串，再 MD5 截尾）。
 * 纯 JS MD5 实现见 md5Hex，输出与 node:crypto 逐条对拍一致。
 */
export function getWereadID(bookId) {
  try {
    const str = md5Hex(bookId)
    let strSub = str.substring(0, 3)
    let fa

    if (/^\d*$/.test(bookId)) {
      const chunks = []

      for (let i = 0; i < bookId.length; i += 9) {
        chunks.push(Number.parseInt(bookId.substring(i, i + 9)).toString(16))
      }

      fa = ['3', chunks]
    } else {
      let hexStr = ''

      for (let i = 0; i < bookId.length; i++) {
        hexStr += bookId.charCodeAt(i).toString(16)
      }

      fa = ['4', [hexStr]]
    }

    strSub += fa[0]
    strSub += `2${str.substring(str.length - 2)}`

    for (let i = 0; i < fa[1].length; i++) {
      const sub = fa[1][i]
      const subLength = sub.length.toString(16)
      const subLengthPadded = subLength.length === 1 ? `0${subLength}` : subLength

      strSub += subLengthPadded + sub

      if (i < fa[1].length - 1) {
        strSub += 'g'
      }
    }

    if (strSub.length < 20) {
      strSub += str.substring(0, 20 - strSub.length)
    }

    const finalStr = md5Hex(strSub)

    strSub += finalStr.substring(0, 3)

    return strSub
  } catch (error) {
    console.error(`处理微信读书 ID 时出现错误：${error}`)

    return null
  }
}

/* ================= 跨路由共用业务逻辑 ================= */

/**
 * 米游社官方公告通用抓取：原神 / 绝区零共用同一族接口，仅分区 ID 与站点路径不同
 * @param gids 游戏分区 ID：2 原神 / 8 绝区零
 * @param site 详情页路径段：ys 原神 / zz 绝区零
 */
export async function getMiyousheAnnouncements(gids, site) {
  const url = `https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?client_type=4&gids=${gids}&last_id=&page_size=20&type=1`
  const responseBody = await fetchUpstreamJson(url)

  if (responseBody.retcode !== 0 || !Array.isArray(responseBody.data?.list)) {
    return []
  }

  return responseBody.data.list.map(({ post }) => ({
    id: post.post_id,
    title: post.subject,
    desc: post.summary || undefined,
    pic: post.cover || undefined,
    tip: formatCnMonthDay(post.created_at),
    url: `https://www.miyoushe.com/${site}/article/${post.post_id}`,
    mobileUrl: `https://m.miyoushe.com/${site}/#/article/${post.post_id}`,
  }))
}

const CSDN_HOT_RANK_URL = 'https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=100'

/**
 * CSDN 反爬请求头：UA 刻意不用 Chrome 桌面 UA（GH Actions 对照实测：桌面 Chrome UA 被
 * WAF 判为爬虫返 521，移动端 UA 稳定 200），Referer 必须带
 */
const CSDN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1',
  Referer: 'https://blog.csdn.net/',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

/** WAF 挑战状态码：返回 JS 挑战页而非业务数据 */
const CSDN_CHALLENGE_STATUS = 521

const CSDN_MAX_ATTEMPTS = 3

/** 重试基础间隔（ms）：指数退避 3s → 6s，给 WAF 冷却窗口（边缘函数无墙钟计费，等待不计成本） */
const CSDN_RETRY_BASE_DELAY = 3_000

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 拉取 CSDN 热榜，遇 WAF 挑战（521）时退避重试 */
export async function getCsdnHotRank() {
  let lastError = null

  for (let attempt = 0; attempt < CSDN_MAX_ATTEMPTS; attempt++) {
    try {
      const responseBody = await fetchUpstreamJson(CSDN_HOT_RANK_URL, { headers: CSDN_HEADERS })

      if (responseBody.code === 200 && Array.isArray(responseBody.data)) {
        return responseBody.data.map((v) => ({
          id: v.articleDetailUrl ?? '',
          title: v.articleTitle ?? '',
          tip: v.pcHotRankScore,
          url: v.articleDetailUrl ?? '',
          mobileUrl: v.articleDetailUrl ?? '',
        }))
      }

      return []
    } catch (error) {
      lastError = error

      const isChallenge = error instanceof Error && error.message.includes(String(CSDN_CHALLENGE_STATUS))

      // 仅 WAF 挑战值得重试：换其他错误重试只会持续撞墙并放大请求量
      if (!isChallenge || attempt >= CSDN_MAX_ATTEMPTS - 1) {
        break
      }

      await wait(CSDN_RETRY_BASE_DELAY * 2 ** attempt)
    }
  }

  throw lastError
}
