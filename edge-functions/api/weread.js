/**
 * 微信读书-飙升榜（Edge Functions 版）
 *
 * 迁移动机同 weibo.js：抓取等待时间从 Cloud Functions 的内存时长计费（已超额）
 * 换到 Edge Functions 的 CPU-ms 计费（I/O 等待不计入）。
 *
 * V8 运行时差异：node:crypto 与 Web Crypto 都没有 MD5（Web Crypto 刻意不收录），
 * 故内置纯 JS MD5 实现——输出与 node createHash('md5').digest('hex') 完全一致
 * （小写十六进制），getWereadID 的换算逻辑与 src/lib/weread.ts 逐行对齐。
 */

const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

/** 代码默认窗口：与仓库 .env 的 NEXT_PUBLIC_HOT_CACHE_SECONDS 保持一致 */
const FALLBACK_CACHE_SECONDS = 1800

const REQUEST_TIMEOUT = 15000

/** 失败/空数据响应的兜底短缓存（与 src/lib/response.ts 语义一致） */
const SHORT_CACHE_SECONDS = 60

/* ---------- 纯 JS MD5（经典 Joseph Myers 实现，输出小写 hex） ---------- */

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
function md5Hex(input) {
  const bytes = new TextEncoder().encode(input)
  let binary = ''

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return md51(binary)
    .map(rhex)
    .join('')
}

/* ---------- getWereadID（与 src/lib/weread.ts 逐行对齐） ---------- */

function getWereadID(bookId) {
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

/** Cache API 不可用时返回内存缓存适配器（同一 match/put 接口） */
async function resolveCacheStore() {
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
      'https://weread.qq.com/web/bookListInCategory/rising?rank=1',
      cacheSeconds * 1000,
      async () => {
        const response = await fetchUpstream('https://weread.qq.com/web/bookListInCategory/rising?rank=1')

        if (!response.ok) {
          throw new Error(`上游请求失败：${response.status}`)
        }

        const responseBody = await response.json()

        if (!responseBody.books) {
          return []
        }

        return sanitizeHotList(
          responseBody.books.map((v) => {
            const info = v.bookInfo

            return {
              id: info.bookId,
              title: info.title,
              hot: v.readingCount,
              pic: info.cover.replace('s_', 't9_'),
              url: `https://weread.qq.com/web/bookDetail/${getWereadID(info.bookId)}`,
              mobileUrl: `https://weread.qq.com/web/bookDetail/${getWereadID(info.bookId)}`,
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
