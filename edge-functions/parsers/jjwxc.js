/**
 * jjwxc（晋江文学城）TOP10 解析：正则版，与 Next 原路由的 cheerio 选择器对拍等价。
 *
 * 上游形态（GB18030 页面）：<a ... href="onebook.php?novelid=<id>" rel="【简介...】">标题</a>
 * 同一作品以标题、封面等多个链接出现，cheerio 版按 novelid 去重（保留首次出现——
 * 页面中首个出现的是标题链接，封面链接文本为空会被 title 非空条件过滤）。
 * 注意：rel 属性里含 <br> 与全文简介，但属性不参与 text()，锚文本即标题。
 */

/** 从 GB18030 解码后的 HTML 中解析榜单 */
export function parseJjwxcTopten(html) {
  const seen = new Set()
  const result = []
  // 锚点开始标签（href 含 onebook.php）。属性值内可能含 > 字符（rel 里有 <br> 与 HTML），
  // 标签结束须用引号感知扫描定位，不能直接 indexOf('>')
  const anchorRe = /<a\s[^>]*?href="([^"]*onebook\.php[^"]*)"/g
  let match

  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1]
    const novelid = href.match(/novelid=(\d+)/)?.[1]

    if (!novelid || seen.has(novelid)) {
      continue
    }

    // 从 href 属性位置向后引号感知扫描，定位开始标签真正的结束 '>'
    const tagEnd = findTagEnd(html, match.index)
    const closeIdx = html.indexOf('</a>', tagEnd)
    const inner = closeIdx > -1 ? html.slice(tagEnd + 1, closeIdx) : ''
    const title = inner
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z#0-9]+;/gi, (entity) => decodeEntity(entity))
      .replace(/\s+/g, ' ')
      .trim()

    if (!title) {
      continue
    }

    seen.add(novelid)

    result.push({
      id: novelid,
      title,
      url: `https://www.jjwxc.net/onebook.php?novelid=${novelid}`,
      mobileUrl: `https://www.jjwxc.net/onebook.php?novelid=${novelid}`,
    })
  }

  return result
}

/**
 * 引号感知的标签结束定位：从标签起点向后扫描，跳过 ' " 引号包裹的属性值内的 >，
 * 返回开始标签结束 '>' 的下标。属性值未闭合（截断）时回退到朴素 indexOf('>')。
 */
function findTagEnd(html, tagStart) {
  let inQuote = null

  for (let i = tagStart; i < html.length; i++) {
    const ch = html[i]

    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      }

      continue
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch
      continue
    }

    if (ch === '>') {
      return i
    }
  }

  return html.indexOf('>', tagStart)
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
