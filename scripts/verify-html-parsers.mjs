/*
 * 第二批 HTML 解析路由对拍框架：
 * 同一份真实页面 HTML，cheerio 版（复刻 Next 原路由逻辑）与正则版（EF 实现）输出逐字节对比。
 * 运行：node scripts/verify-html-parsers.mjs
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SAMPLES = 'C:/Users/Administrator/AppData/Local/Temp/s2-test'
const requireProj = createRequire(join(ROOT, 'package.json'))
const cheerio = requireProj('cheerio')

let pass = 0
let fail = 0

function compare(route, cheerioItems, regexItems) {
  const a = JSON.stringify(cheerioItems)
  const b = JSON.stringify(regexItems)

  if (a === b) {
    console.log(`PASS | ${route} | ${cheerioItems.length} 条完全一致`)
    pass++
    return
  }

  fail++
  console.log(`FAIL | ${route} | cheerio ${cheerioItems.length} 条 vs 正则 ${regexItems.length} 条`)

  for (let i = 0; i < Math.max(cheerioItems.length, regexItems.length); i++) {
    if (JSON.stringify(cheerioItems[i]) !== JSON.stringify(regexItems[i])) {
      console.log(`  首个差异 @${i}`)
      console.log(`  cheerio: ${JSON.stringify(cheerioItems[i])?.slice(0, 200)}`)
      console.log(`  正则  : ${JSON.stringify(regexItems[i])?.slice(0, 200)}`)
      break
    }
  }
}

function loadSample(name) {
  return readFileSync(join(SAMPLES, name), 'utf8')
}

/** GBK/GB18030 样本读取（Node Buffer → TextDecoder） */
function loadSampleEncoded(name, encoding) {
  const buf = readFileSync(join(SAMPLES, name))

  return new TextDecoder(encoding).decode(buf)
}

/* ================= gp ================= */
{
  const html = loadSampleEncoded('gp.html', 'gbk')

  // cheerio 版（复刻 Next 原路由）
  const $ = cheerio.load(html)
  const seen = new Set()
  const cheerioItems = []

  $('a[href*="/gicp/news/"]').each((_i, item) => {
    const dom = $(item)
    const href = dom.attr('href') || ''
    const id = href.match(/\/(\d+)\.html/)?.[1]
    const title = (
      dom.find('.sec2-sub-text').text() ||
      dom.find('.sec2-info-body-text').text() ||
      dom.attr('title') ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim()

    if (!id || !title || seen.has(id)) return

    seen.add(id)
    const date = dom.find('.sec2-info-time-text').text().trim()

    cheerioItems.push({
      id,
      title,
      tip: date || undefined,
      url: new URL(href, 'https://gp.qq.com/').toString(),
      mobileUrl: new URL(href, 'https://gp.qq.com/').toString(),
    })
  })

  // 正则版（EF 实现——从 edge-functions/api/gp.js 的解析函数提取逻辑，此处内联同款）
  const { parseGpNews } = await import('../edge-functions/parsers/gp.js')
  const regexItems = parseGpNews(html)

  compare('gp', cheerioItems, regexItems)
}

/* ================= jjwxc ================= */
{
  const html = loadSampleEncoded('jjwxc.html', 'gb18030')

  const $ = cheerio.load(html)
  const seen = new Set()
  const cheerioItems = []

  $('a[href*="onebook.php"]').each((_i, item) => {
    const dom = $(item)
    const novelid = (dom.attr('href') || '').match(/novelid=(\d+)/)?.[1]
    const title = dom.text().replace(/\s+/g, ' ').trim()

    if (!novelid || !title || seen.has(novelid)) return

    seen.add(novelid)

    cheerioItems.push({
      id: novelid,
      title,
      url: `https://www.jjwxc.net/onebook.php?novelid=${novelid}`,
      mobileUrl: `https://www.jjwxc.net/onebook.php?novelid=${novelid}`,
    })
  })

  const { parseJjwxcTopten } = await import('../edge-functions/parsers/jjwxc.js')
  const regexItems = parseJjwxcTopten(html)

  compare('jjwxc', cheerioItems, regexItems)
}

/* ================= yjwujian ================= */
{
  const html = loadSample('yjwujian.html')

  const $ = cheerio.load(html)
  const seen = new Set()
  const cheerioItems = []

  $('a[href*="/news/official/"], a[href*="/news/update/"], a[href*="/news/guide/"]').each((_i, item) => {
    const dom = $(item)
    const href = dom.attr('href') || ''
    const match = dom
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .match(/^(.+?)\s\[(\d{2}-\d{2})\]$/)

    if (!match || seen.has(href)) return

    seen.add(href)

    cheerioItems.push({
      id: href,
      title: match[1].trim(),
      tip: match[2],
      url: href,
      mobileUrl: href,
    })
  })

  const { parseYjwujianNews } = await import('../edge-functions/parsers/yjwujian.js')
  const regexItems = parseYjwujianNews(html)

  compare('yjwujian', cheerioItems, regexItems)
}

/* ================= douban-movie（反爬样本缺失时跳过并提示） ================= */
{
  const html = loadSample('douban-movie.html')

  if (html.length < 1000 || html.includes('redirected you')) {
    console.log(`WARN | douban-movie | 样本被豆瓣反爬拦截（${html.length}B），需浏览器 UA/Cookie 抓样本后补拍`)
  } else {
    const $ = cheerio.load(html)
    const getNumbers = (text) => {
      if (!text) return 10000000

      const match = text.match(/\d+/)

      return match ? Number(match[0]) : 10000000
    }

    const cheerioItems = $('.article tr.item')
      .toArray()
      .map((item) => {
        const dom = $(item)
        const url = dom.find('a').attr('href') || ''

        return {
          id: String(getNumbers(url)),
          title: `${dom.find('.pl2 a').text().replace(/\s+/g, ' ').trim().replace(/\n/g, '')}`,
          desc: dom.find('p.pl').text(),
          hot: getNumbers(dom.find('span.pl').text()),
          url,
          mobileUrl: `https://m.douban.com/movie/subject/${getNumbers(url)}/`,
        }
      })

    const { parseDoubanMovieChart } = await import('../edge-functions/parsers/douban-movie.js')
    const regexItems = parseDoubanMovieChart(html)

    compare('douban-movie', cheerioItems, regexItems)
  }
}

/* ================= github-trending ================= */
{
  const html = loadSample('github.html')

  const $ = cheerio.load(html)
  const formatStars = (count) => {
    if (count < 1000) return count.toString()

    if (count < 1_000_000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
    }

    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }

  const cheerioItems = $('.Box article.Box-row')
    .get()
    .map((repo, index) => {
      const $repo = $(repo)
      const relativeUrl = $repo.find('.h3').find('a').attr('href')

      return {
        id: relativeUrl || String(index),
        title: (relativeUrl || '').replace(/^\//, ''),
        desc: $repo.find('p.my-1').text().trim() || '',
        tip: formatStars(
          parseInt(
            $repo
              .find(".tmp-mr-3 svg[aria-label='star']")
              .first()
              .parent()
              .text()
              .trim()
              .replace(',', '') || '0',
            10,
          ),
        ),
        url: `https://github.com${relativeUrl}`,
        mobileUrl: `https://github.com${relativeUrl}`,
      }
    })

  const { parseGithubTrending } = await import('../edge-functions/parsers/github-trending.js')
  const regexItems = parseGithubTrending(html)

  compare('github-trending', cheerioItems, regexItems)
}

/* ================= smzdm（上游已改版：先记录 cheerio 版实际输出作为基线） ================= */
{
  const html = loadSample('smzdm.html')

  const $ = cheerio.load(html)
  const seen = new Set()
  const cheerioItems = []

  $('a[href*="smzdm.com/p/"]').each((_i, item) => {
    const dom = $(item)
    const id = (dom.attr('href') || '').match(/smzdm\.com\/p\/(\d+)/)?.[1]
    const title = dom.find('.feed-hot-title').text().replace(/\s+/g, ' ').trim()

    if (!id || !title || seen.has(id)) return

    seen.add(id)

    cheerioItems.push({
      id,
      title,
      url: `https://www.smzdm.com/p/${id}/`,
      mobileUrl: `https://www.smzdm.com/p/${id}/`,
    })
  })

  console.log(`INFO | smzdm | cheerio 原版（.feed-hot-title）输出 ${cheerioItems.length} 条——上游改版后此选择器已失效`)

  const { parseSmzdmTop } = await import('../edge-functions/parsers/smzdm.js')
  const regexItems = parseSmzdmTop(html)

  console.log(`INFO | smzdm | 新设计（.feed-deal-card__title-link）输出 ${regexItems.length} 条`)

  if (regexItems.length > 0) {
    console.log(`PASS | smzdm | 新选择器产出数据（非空即通过；无 cheerio 基线可比）`)
    pass++
  } else {
    console.log(`FAIL | smzdm | 新选择器仍无数据`)
    fail++
  }
}


/* ================= hupu（步行街热帖；页面改版后无 cheerio 基线，用人工核对值回归） ================= */
{
  const html = loadSample('hupu-gambia.html')

  const { parseHupuGambia } = await import('../edge-functions/parsers/hupu.js')
  const items = parseHupuGambia(html)

  // 人工核对基线（2026-11-23 从真实页面提取）：条数 + 前 3 条关键字段
  // 页面 2026-11 改版（window.$$data → 服务端渲染 list-item），旧 cheerio 选择器已不可用，
  // 故改用人工核对值做回归断言；URL 仍是 /all-gambia，标题「步行街热帖」语义不变
  const expectedTop = [
    { id: '644149363', title: '一位日本人来中国后的一些感受，目前已有超百万的浏览量', tip: 50, desc: '863回复' },
    { id: '644149022', title: '新中国开国大典《签到表》，书法百花齐放，一个个如天将下凡！', tip: 50, desc: '284回复' },
    { id: '644148078', title: '说唱歌手凭啥这么有钱', tip: 50, desc: '396回复' },
  ]

  const topOk =
    items.length >= 60 &&
    expectedTop.every(
      (exp, i) =>
        items[i] &&
        items[i].id === exp.id &&
        items[i].title === exp.title &&
        items[i].tip === exp.tip &&
        items[i].desc === exp.desc &&
        items[i].url === `https://bbs.hupu.com/${exp.id}.html`,
    )
  // 全量 id 唯一性（虚拟列表 key）
  const idsUnique = new Set(items.map((i) => i.id)).size === items.length

  if (topOk && idsUnique) {
    console.log(`PASS | hupu | ${items.length} 条，前 3 条与人工核对基线一致，id 唯一`)
    pass++
  } else {
    console.log(`FAIL | hupu | ${items.length} 条`)
    for (let i = 0; i < expectedTop.length; i++) {
      if (JSON.stringify(items[i]) !== JSON.stringify({ ...expectedTop[i], url: `https://bbs.hupu.com/${expectedTop[i].id}.html`, mobileUrl: `https://bbs.hupu.com/${expectedTop[i].id}.html` })) {
        console.log(`  差异 @${i}: 实际 ${JSON.stringify(items[i])}`)
        console.log(`           期望 ${JSON.stringify({ ...expectedTop[i], url: `https://bbs.hupu.com/${expectedTop[i].id}.html`, mobileUrl: `https://bbs.hupu.com/${expectedTop[i].id}.html` })}`)
        break
      }
    }
    fail++
  }
}

console.log(`\n汇总：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
