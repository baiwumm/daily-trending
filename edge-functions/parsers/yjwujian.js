/**
 * yjwujian（一局游戏）新闻列表解析：正则版，与 Next 原路由的 cheerio 选择器对拍等价。
 *
 * 上游结构：<a href=".../news/{official,update}/YYYYMMDD/<id>.html" class="news-itme">
 *            <span class="title">标题</span><span class="date">[MM-DD]</span></a>
 * cheerio 版按「文本去空白后匹配 `标题 [MM-DD]`」过滤；正则版直接按锚点块提取两个
 * span，语义相同且不依赖空白折叠——对拍以 cheerio 输出为基线。
 */

/** 从 HTML 中切出新闻锚点块并解析 */
export function parseYjwujianNews(html) {
  // 锚点开始标签（href 指向三个新闻分类之一）
  const anchorRe = /<a\s[^>]*href="([^"]*\/news\/(?:official|update|guide)\/[^"]*)"[^>]*>/g
  const result = []
  let match

  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1]
    const blockStart = match.index + match[0].length
    // 只在本锚点内部（到 </a> 为止）找 title/date span——导航链接（如 guide/index.html）
    // 内部没有这两个 span，但其后紧跟的新闻锚点有；不限制边界会跨块污染
    const closeIdx = html.indexOf('</a>', blockStart)
    const block = closeIdx > -1 ? html.slice(blockStart, closeIdx) : html.slice(blockStart, blockStart + 800)
    const titleMatch = block.match(/<span class="title">([\s\S]*?)<\/span>/)
    const dateMatch = block.match(/<span class="date">\[(\d{2}-\d{2})\]<\/span>/)

    // 无标题 span 或无日期的按 cheerio 版的文本匹配规则跳过（导航链接等）
    if (!titleMatch || !dateMatch) {
      continue
    }

    const title = decodeEntities(titleMatch[1]).trim()

    if (!title) {
      continue
    }

    result.push({
      id: href,
      title,
      tip: dateMatch[1],
      url: href,
      mobileUrl: href,
    })
  }

  return result
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
