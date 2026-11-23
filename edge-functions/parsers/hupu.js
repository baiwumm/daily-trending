/**
 * hupu（虎扑）步行街热帖解析：正则版。
 *
 * 2026-11-23 上游变更：旧版依赖的 window.$$data 内嵌 JSON 已不存在，页面改为
 * 服务端渲染的 list-item 结构；同时无 UA 请求会被拒（405），默认 Chrome UA 即可
 * （阿里云 WAF 为频率风控，缓存层 30 分钟一次回源的频率不会触发）。
 *
 * 页面结构：
 *   <div class="t-info">
 *     <a href="/<id>.html" target="_blank" class=" hot"><span class="t-title">标题</span></a>
 *     <span class="t-lights">50亮</span><span class="t-replies">863回复</span>
 *   </div>
 *   <div class="t-label"><a href="/1" target="_blank">步行街主干道</a></div>
 *
 * 字段映射与旧版（window.$$data）对齐：tip=亮数（配合配置 suffix:'亮' 显示「50亮」）、
 * desc=回复数；id 从链接路径提取（旧版为 tid）。
 */

const ITEM_RE =
  /<div class="t-info"><a href="\/([0-9]+)\.html"[^>]*class="[^"]*"[^>]*><span class="t-title">([\s\S]*?)<\/span><\/a><span class="t-lights">([^<]*)<\/span><span class="t-replies">([^<]*)<\/span><\/div>/g

/** 从步行街页面 HTML 解析热帖列表 */
export function parseHupuGambia(html) {
  const result = []
  let match

  while ((match = ITEM_RE.exec(html)) !== null) {
    const [, id, rawTitle, lights, replies] = match
    const title = decodeEntities(rawTitle).trim()

    if (!title) {
      continue
    }

    const lightCount = Number.parseInt(lights, 10)

    result.push({
      id,
      title,
      // 与旧版 tip=v.lights 语义一致：亮数交给 UI 拼 suffix「亮」；
      // hot 不设（旧版亦无），避免 UI 走 formatNumber 分支丢掉「亮」单位
      tip: Number.isNaN(lightCount) ? undefined : lightCount,
      desc: replies || undefined,
      url: `https://bbs.hupu.com/${id}.html`,
      mobileUrl: `https://bbs.hupu.com/${id}.html`,
    })
  }

  return result
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
