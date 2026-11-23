/**
 * smzdm（什么值得买）热榜解析：**上游改版后的重新设计**（2026-11-23）。
 *
 * 原 Next 版依赖 `.feed-hot-title`（文章卡片标题），上游改版后该结构已不存在——
 * 线上 cheerio 版返回空 data。新结构（实测样本）：
 *   <a class="feed-deal-card__title-link" href="https://www.smzdm.com/p/<id>/" ...>标题</a>
 * 同一文章的多个入口（标题链接/评论数链接）按 id 去重，保留标题链接（首个出现）。
 */

export function parseSmzdmTop(html) {
  const seen = new Set()
  const result = []
  // 标题链接锚点（class 精确匹配 feed-deal-card__title-link）
  const anchorRe = /<a\s[^>]*class="[^"]*feed-deal-card__title-link[^"]*"[^>]*href="([^"]*smzdm\.com\/p\/(\d+)[^"]*)"[^>]*>/g
  let match

  while ((match = anchorRe.exec(html)) !== null) {
    const id = match[2]

    if (seen.has(id)) {
      continue
    }

    const closeIdx = html.indexOf('</a>', match.index + match[0].length)
    const inner = closeIdx > -1 ? html.slice(match.index + match[0].length, closeIdx) : ''
    const title = inner
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z#0-9]+;/gi, (entity) => decodeEntity(entity))
      .replace(/\s+/g, ' ')
      .trim()

    if (!title) {
      continue
    }

    seen.add(id)

    result.push({
      id,
      title,
      url: `https://www.smzdm.com/p/${id}/`,
      mobileUrl: `https://www.smzdm.com/p/${id}/`,
    })
  }

  return result
}

function decodeEntity(entity) {
  const named = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&amp;': '&' }
  if (named[entity]) return named[entity]
  const dec = entity.match(/&#(\d+);/i)
  if (dec) return String.fromCharCode(Number(dec[1]))
  const hex = entity.match(/&#x([0-9a-f]+);/i)
  if (hex) return String.fromCharCode(Number.parseInt(hex[1], 16))
  return entity
}
