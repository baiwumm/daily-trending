/**
 * 本地 EF 模拟服务：在 node 里直接运行 edge-functions/api/*.js 的路由模块，
 * 让本地开发（next dev）拥有与线上一致的数据能力。
 *
 * 背景：Edge Functions 与 KV 是 EdgeOne Makers 平台能力，只在部署环境存在——
 * 本地 next dev 没有 /api 路由，全部数据请求 404。本服务用 node 起一个
 * 同 URL 形态的模拟端点，配合 next.config.ts 的 dev-only rewrites 使用。
 *
 * 实现方式：动态加载 edge-functions/api/ 下全部路由模块（与线上一字不差的代码），
 * 按 URL 分发调用其 onRequestGet；KV 层用进程内存模拟（30 分钟窗口语义一致，
 * 但不跨进程/节点）。
 *
 * 用法：node scripts/local-api.mjs（默认 127.0.0.1:3101，与 next.config.ts 的
 * dev rewrites 对应）；须与 next dev 同时运行。
 */
import http from 'node:http'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const API_DIR = join(ROOT, 'edge-functions/api')
const PORT = Number(process.env.LOCAL_API_PORT || 3101)

/** 动态加载全部路由模块（文件名 = 榜单 value） */
const routes = new Map()

for (const file of readdirSync(API_DIR)) {
  if (!file.endsWith('.js')) continue

  const name = file.replace(/\.js$/, '')
  const mod = await import(pathToFileURL(join(API_DIR, file)).href)

  if (typeof mod.onRequestGet === 'function') {
    routes.set(name, mod)
  }
}

console.log(`已加载 ${routes.size} 个路由模块`)

/** 进程内缓存：与线上一致的 30 分钟窗口语义（含数据真实抓取时间） */
const memoryCache = new Map()
const WINDOW_MS = 30 * 60 * 1000

/** 逐源执行路由模块的 onRequestGet（context 按 Makers 运行时形态构造） */
async function serveSource(name) {
  const mod = routes.get(name)

  if (!mod) {
    return new Response(JSON.stringify({ msg: '请求失败', code: 500, timestamp: Date.now() }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = Date.now()
  const cached = memoryCache.get(name)

  // 窗口内命中：直接复用（含数据真实抓取时间，保证「xx 前更新」语义）
  if (cached && now - cached.ts < WINDOW_MS) {
    return new Response(
      JSON.stringify({ msg: '请求成功', code: 200, data: cached.data, timestamp: cached.ts }),
      { headers: { 'Content-Type': 'application/json', 'X-Local-Cache': 'HIT' } },
    )
  }

  try {
    const context = { request: new Request(`http://127.0.0.1:${PORT}/api/${name}`), env: {} }
    const response = await mod.onRequestGet(context)
    const body = await response.json()

    // 与线上 withCache 同语义：空数据不缓存（避免上游偶发空结果被钉住）
    if (body.code === 200 && body.data?.length) {
      memoryCache.set(name, { ts: body.timestamp, data: body.data })
    }

    return new Response(JSON.stringify(body), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'X-Local-Cache': 'MISS' },
    })
  } catch (error) {
    // 回源失败时降级返回过期缓存（与线上 STALE 语义一致）
    if (cached) {
      return new Response(
        JSON.stringify({ msg: '请求成功', code: 200, data: cached.data, timestamp: cached.ts }),
        { headers: { 'Content-Type': 'application/json', 'X-Local-Cache': 'STALE' } },
      )
    }

    console.error(`[${name}] 上游请求失败：`, error?.message)

    return new Response(JSON.stringify({ msg: '请求失败', code: 500, timestamp: Date.now() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/** 聚合端点：与线上 /api/all 同语义（合并全部源，30 分钟窗口） */
async function serveAggregate() {
  const now = Date.now()
  const data = {}

  await Promise.all(
    [...routes.keys()].map(async (name) => {
      try {
        const cached = memoryCache.get(name)

        if (cached && now - cached.ts < WINDOW_MS) {
          data[name] = { ts: cached.ts, data: cached.data }

          return
        }

        const context = { request: new Request(`http://127.0.0.1:${PORT}/api/${name}`), env: {} }
        const response = await routes.get(name).onRequestGet(context)
        const body = await response.json()

        if (body.code === 200 && body.data?.length) {
          const ts = body.timestamp

          memoryCache.set(name, { ts, data: body.data })
          data[name] = { ts, data: body.data }
        }
      } catch (error) {
        console.error(`[${name}] 聚合回源失败：`, error?.message)
      }
    }),
  )

  return new Response(JSON.stringify({ msg: '请求成功', code: 200, data, timestamp: Date.now() }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Aggregate': `${Object.keys(data).length}/${routes.size}`,
    },
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)

  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    if (url.pathname === '/api/all') {
      const response = await serveAggregate()

      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(await response.text())

      return
    }

    const match = url.pathname.match(/^\/api\/([a-z0-9-]+)$/)

    if (match) {
      const response = await serveSource(match[1])

      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(await response.text())

      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ msg: '请求失败', code: 500, timestamp: Date.now() }))
  } catch (error) {
    console.error('本地模拟服务异常：', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ msg: '请求失败', code: 500, timestamp: Date.now() }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`本地 EF 模拟服务：http://127.0.0.1:${PORT}（${routes.size} 个路由，配合 next dev 的 dev rewrites 使用）`)
})
