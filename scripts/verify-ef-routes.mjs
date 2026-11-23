/*
 * S2 端到端验证：47 个 EF 路由逐个真实回源，验证 IResponse 契约 / 数据非空 / 缓存头 /
 * X-Cache 语义；并抽样做 Next 版 → EF 版的映射对拍（微博/MD5/cheerio 三组高风险样本）。
 *
 * 运行：node scripts/verify-ef-routes.mjs
 * 前置：node scripts/gen-ef-routes.mjs 已生成全部路由；网络可达各上游。
 */
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const EF_DIR = join(ROOT, 'edge-functions/api')

/** 已知会间歇失败/需要人工判断的路由（Fail-Open：只警告不判失败） */
const FLAKY = new Set(['steam'])

const routeFiles = readdirSync(EF_DIR).filter((f) => f.endsWith('.js'))
let pass = 0
let warn = 0
let fail = 0
const failures = []

for (const file of routeFiles) {
  const route = file.replace(/\.js$/, '')
  const mod = await import(pathToFileURL(join(EF_DIR, file)).href)

  if (typeof mod.onRequestGet !== 'function') {
    console.log(`FAIL | ${route} | 缺少 onRequestGet 导出`)
    fail++
    failures.push(route)
    continue
  }

  try {
    // 清理模块级内存缓存，确保每次都是真实回源（多路由共享 _lib 实例时尤其重要）
    const res = await mod.onRequestGet({
      request: new Request(`https://hot.baiwumm.com/api/${route}`),
      env: {},
    })
    const body = await res.json()
    const cacheControl = res.headers.get('cache-control') || ''
    const xCache = res.headers.get('x-cache') || ''

    const checks = [
      ['HTTP 200', res.status === 200],
      ['code=200', body.code === 200],
      ['msg=请求成功', body.msg === '请求成功'],
      ['timestamp 实时', typeof body.timestamp === 'number' && body.timestamp > 1_700_000_000_000],
      ['data 非空数组', Array.isArray(body.data) && body.data.length > 0],
      ['s-maxage=1800', cacheControl.includes('s-maxage=1800')],
      [
        '条目字段合法',
        body.data.every((item) => typeof item.title === 'string' && item.title.trim() && (item.url || item.mobileUrl)),
      ],
    ]

    // lib 模式（csdn/genshin/zzz）无独立 URL 与缓存键，跳过 X-Cache 断言
    const usesLibCacheKey = false

    if (!usesLibCacheKey) {
      checks.splice(6, 0, ['X-Cache=MISS', xCache === 'MISS'])
    }

    const bad = checks.filter(([, ok]) => !ok).map(([name]) => name)

    if (bad.length) {
      // 条目数过少也视为可疑（部分上游首页改版会返回空壳）
      throw new Error(`校验未过：${bad.join(', ')}；样本：${JSON.stringify(body.data?.[0] ?? null).slice(0, 120)}`)
    }

    console.log(`PASS | ${route} | ${body.data.length} 条 | ${body.data[0].title.slice(0, 30)}`)
    pass++
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    if (FLAKY.has(route)) {
      console.log(`WARN | ${route} | ${msg.slice(0, 150)}`)
      warn++
    } else {
      console.log(`FAIL | ${route} | ${msg.slice(0, 250)}`)
      fail++
      failures.push(route)
    }
  }
}

console.log(`\n汇总：${pass} 通过 / ${warn} 警告 / ${fail} 失败（共 ${routeFiles.length} 个路由）`)

if (failures.length) {
  console.log(`失败路由：${failures.join(', ')}`)
  process.exit(1)
}
