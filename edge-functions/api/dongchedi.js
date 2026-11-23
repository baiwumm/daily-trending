/**
 * dongchedi 热榜
 *
 * 路由映射：edge-functions/api/dongchedi.js → GET /api/dongchedi（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/dongchedi/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://www.dongchedi.com/'

  return handleHotList(context, {
    cacheKey: 'https://www.dongchedi.com/',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, {  })
    // 上游为 Next.js 页面，数据在 <script id="__NEXT_DATA__"> 内嵌 JSON
          const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    
          if (!match) {
            return []
          }
    
          const data = JSON.parse(match[1])
          const todayNews = data?.props?.pageProps?.todayNews
    
          return [...(todayNews?.head_article ?? []), ...(todayNews?.content_article ?? [])].map((v, idx) => ({
            id: idx + 1,
            title: v.title,
            url: `https://www.dongchedi.com/article/${v.gid_str}`,
            mobileUrl: `https://www.dongchedi.com/article/${v.gid_str}`,
          }))
        })())
  })
}
