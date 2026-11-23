/**
 * IT之家-热榜
 *
 * 路由映射：edge-functions/api/ithome.js → GET /api/ithome。
 * V8 运行时无 npm 包，cheerio 不可用——用正则按 .placeholder 块切分解析，
 * 规则与 Next 版 cheerio 选择器一一对应（含数字/十六进制 HTML 实体解码）。
 */
import { decodeEntities, fetchUpstreamText, handleHotList, sanitizeHotList, stripTags } from '../_lib.js'

/** 链接转换：移动端短链转 PC 端文章页（与 Next 版 replaceLink 同一正则） */
function replaceLink(url) {
  const match = url.match(/[html|ive]\/(\d+)\.htm/)

  if (match && match[1]) {
    return `https://www.ithome.com/0/${match[1].slice(0, 3)}/${match[1].slice(3)}.htm`
  }

  return url
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
      title: stripTags(decodeEntities(titleMatch[1])),
      pic: picMatch ? picMatch[1] : undefined,
      hot: hotMatch ? Number(hotMatch[1]) : 0,
      url: replaceLink(hrefMatch[1]),
      mobileUrl: replaceLink(hrefMatch[1]),
    })
  }

  return result
}

export async function onRequestGet(context) {
  return handleHotList(context, {
    cacheKey: 'https://m.ithome.com/rankm',
    loader: async () => {
      const html = await fetchUpstreamText('https://m.ithome.com/rankm')

      return sanitizeHotList(parseIthomeRank(html))
    },
  })
}
