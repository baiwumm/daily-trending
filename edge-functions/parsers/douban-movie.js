/**
 * douban-movie（豆瓣电影·每周榜单）解析：正则版。
 *
 * ⚠️ 对拍状态：上游对非浏览器请求返回重定向（本地样本被反爬拦截），
 * 本实现按 cheerio 版选择器（.article tr.item / .pl2 a / p.pl / span.pl）逐一对位编写，
 * 语义等价但**未经同 HTML 对拍**——上线后以线上数据健康为验收（见第二批线上验收清单）。
 *
 * cheerio 版逻辑（Next 原路由）：
 *   $('.article tr.item') 行 → a[href] 取链接；.pl2 a 取片名；p.pl 取简介；
 *   span.pl 取评分数（getNumbers：无数字回退 10000000）
 */

/** 从文本提取首个数字，无则回退 10000000（与 Next 版 getNumbers 同语义） */
function getNumbers(text) {
  if (!text) return 10000000

  const match = text.match(/\d+/)

  return match ? Number(match[0]) : 10000000
}

/** 取元素整体内容并剥标签（cheerio .text() 等价：拼接全部后代文本节点） */
function innerText(htmlFragment) {
  return decodeEntities(htmlFragment.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseDoubanMovieChart(html) {
  const rows = html.split('<tr class="item"').slice(1)

  return rows.map((row) => {
    const urlMatch = row.match(/<a href="([^"]+)"/)
    const url = urlMatch ? decodeEntities(urlMatch[1]) : ''
    // .pl2 a：cheerio 的 .text() 拼接锚内全部文本节点（含 span 内的）。
    // 注意上游是 <div class="pl2"> 而非 <p>，用类名匹配不限定标签类型
    const pl2Match = row.match(/class="pl2"[^>]*>([\s\S]*?)<\/div>/)
    const anchorInner = pl2Match ? pl2Match[1].match(/<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '' : ''
    const title = innerText(anchorInner)
    const descMatch = row.match(/<p class="pl">([\s\S]*?)<\/p>/)
    const hotMatch = row.match(/<span class="pl">([\s\S]*?)<\/span>/)

    return {
      id: String(getNumbers(url)),
      title,
      desc: descMatch ? innerText(descMatch[1]) : '',
      hot: hotMatch ? getNumbers(innerText(hotMatch[1])) : undefined,
      url,
      mobileUrl: `https://m.douban.com/movie/subject/${getNumbers(url)}/`,
    }
  })
}

function decodeEntities(text) {
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
