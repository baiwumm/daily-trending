/**
 * hupu 热榜
 *
 * 路由映射：edge-functions/api/hupu.js → GET /api/hupu（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/hupu/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://bbs.hupu.com/all-gambia'

  return handleHotList(context, {
    cacheKey: 'https://bbs.hupu.com/all-gambia',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, {  })
    // 页面数据在首个 <script> 的 window.$$data= 之后，取其后的 pageData.threads。
          // 注意：虎扑 2026-11 起对无 UA 请求返回 405（Next 版历史注释「对桌面 UA 返回反爬页」
          // 已过时），恢复默认 Chrome UA 即可正常取数
          const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    
          if (!scriptMatch || !scriptMatch[1].includes('window.$$data=')) {
            return []
          }
    
          const data = JSON.parse(scriptMatch[1].split('window.$$data=')[1])
    
          return data.pageData.threads.map((v) => ({
            id: v.tid,
            title: v.title,
            desc: v.desc,
            pic: v.cover,
            tip: v.lights,
            url: `https://bbs.hupu.com${v.url}`,
            mobileUrl: `https://bbs.hupu.com${v.url}`,
          }))
        })())
  })
}
