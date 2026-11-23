/**
 * gp（和平精英官网）新闻解析：正则版，与 Next 原路由的 cheerio 选择器对拍等价。
 *
 * 上游两种条目形态（cheerio 版按 `a[href*="/gicp/news/"]` 全量抓取后按标题来源降级）：
 *   ① <a class="sec2-sub-info-link" href="/gicp/news/<ch>/<id>.html">
 *        <span class="sec2-sub-text">标题</span></a>                        （无日期）
 *   ② <a class="sec2-info-rg" title="标题" href="/gicp/news/<ch>/<id>.html">
 *        <p class="sec2-info-body-text">标题</p>
 *        <span class="sec2-info-time-text">MM-DD</span></a>                （有日期）
 * 正则版按锚点块切分，标题按同一优先级（sec2-sub-text → sec2-info-body-text → title 属性），
 * 按文章 ID 去重（页面同一条新闻在多 tab 区块重复渲染）。
 */

/** 剥离 HTML 注释（cheerio 按 HTML 规范不解析注释内容，正则版须先剥离再匹配） */
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '')
}

/** 从 GBK 解码后的 HTML 中解析新闻列表 */
export function parseGpNews(rawHtml) {
  const html = stripComments(rawHtml)
  const seen = new Set()
  const result = []
  const anchorRe = /<a\s[^>]*href="([^"]*\/gicp\/news\/[^"]*)"[^>]*>/g
  let match

  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1]
    const id = href.match(/\/(\d+)\.html/)?.[1]

    if (!id || seen.has(id)) {
      continue
    }

    // 取锚点开始标签之后、本锚点 </a> 之前作为块（标题/日期都在锚点内部；
    // sec2-sub-text 形态无日期，若块越过 </a> 会顺带匹配到下一条的日期 span）
    const blockStart = match.index + match[0].length
    const closeIdx = html.indexOf('</a>', blockStart)
    const block = closeIdx > -1 ? html.slice(blockStart, closeIdx) : html.slice(blockStart, blockStart + 1200)
    const subText = block.match(/<span class="sec2-sub-text">([\s\S]*?)<\/span>/)
    const bodyText = block.match(/<p class="sec2-info-body-text">([\s\S]*?)<\/p>/)
    const timeText = block.match(/<span class="sec2-info-time-text">([\s\S]*?)<\/span>/)
    // title 属性在开始标签自身（cheerio 的 dom.attr('title')；不存在时是空串而非 undefined）
    const titleAttr = match[0].match(/title="([^"]*)"/)?.[1] ?? ''

    // 与 cheerio 版同一优先级：.sec2-sub-text → .sec2-info-body-text → title 属性。
    // 横幅图片锚点的 title 在 <img alt> 上而非 <a> 上，cheerio 取不到即空串被过滤——
    // 正则版用 ?.[1] ?? '' 复现该语义（不能用 ||，空串 title 也参与后续 trim 判定）
    const title = (subText?.[1] ?? bodyText?.[1] ?? titleAttr).replace(/\s+/g, ' ').trim()

    if (!title) {
      continue
    }

    seen.add(id)
    const date = timeText ? timeText[1].trim() : ''

    result.push({
      id,
      title,
      tip: date || undefined,
      url: new URL(href, 'https://gp.qq.com/').toString(),
      mobileUrl: new URL(href, 'https://gp.qq.com/').toString(),
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
