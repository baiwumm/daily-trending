/**
 * github-trending 解析：正则版，与 Next 原路由的 cheerio 选择器对拍等价。
 *
 * 上游形态（GitHub Trending 页面，2026-11 结构）：
 *   <article class="Box-row">
 *     <h2/h3 ...><a href="/<owner>/<repo>"><svg.../><span>owner / </span>repo-name</a></h2>
 *     <p class="my-1 ...">描述</p>
 *     <a href="/<owner>/<repo>/stargazers">18,424</a>
 * cheerio 版：.h3 a[href] 取相对路径；p.my-1 取描述；
 *             .tmp-mr-3 svg[aria-label='star'] 的 parent().text() 取 star 数。
 * 正则版按 article 块切分，同源提取三要素。
 */

const STAR_FORMAT_BASE = 1000

/** star 数紧凑格式化（与 Next 版 formatStars 同实现） */
function formatStars(count) {
  if (count < STAR_FORMAT_BASE) return count.toString()

  if (count < 1_000_000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }

  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

export function parseGithubTrending(html) {
  const articles = html.split('<article class="Box-row"').slice(1)

  return articles.map((article, index) => {
    const hrefMatch = article.match(/<h[23][^>]*>\s*<a[^>]*href="([^"]+)"/)
    const relativeUrl = hrefMatch ? hrefMatch[1] : ''
    const descMatch = article.match(/<p[^>]*class="[^"]*my-1[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    // stargazers 锚点：href 含 /stargazers，其文本为带千分位的数字
    const starMatch = article.match(/<a[^>]*href="[^"]*\/stargazers"[^>]*>([\s\S]*?)<\/a>/)
    const stars = starMatch ? Number.parseInt(starMatch[1].replace(/<[^>]+>/g, '').replace(/,/g, '').trim(), 10) || 0 : 0

    return {
      id: relativeUrl || String(index),
      title: (relativeUrl || '').replace(/^\//, ''),
      // cheerio 的 .text() 会解实体，正则版需显式解码（&amp; → & 等）
      desc: descMatch ? decodeEntities(descMatch[1].replace(/<[^>]+>/g, '')).trim() : '',
      tip: formatStars(stars),
      url: `https://github.com${relativeUrl}`,
      mobileUrl: `https://github.com${relativeUrl}`,
    }
  })
}

/** HTML 实体解码（命名实体 + 数字/十六进制字符引用，&amp; 最后避免二次解码） */
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
