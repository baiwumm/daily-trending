/**
 * zhihu-daily 热榜
 *
 * 路由映射：edge-functions/api/zhihu-daily.js → GET /api/zhihu-daily（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/zhihu-daily/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://daily.zhihu.com/api/4/news/latest'

  return handleHotList(context, {
    cacheKey: 'https://daily.zhihu.com/api/4/news/latest',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url, {headers: { Referer: 'https://daily.zhihu.com/api/4/news/latest', Host: 'daily.zhihu.com' }})
    const data = responseBody?.stories
    
          if (!data) {
            return []
          }
    
          return data.map((v) => ({
            id: v.id,
            title: v.title,
            url: v.url,
            mobileUrl: v.url,
          }))
        }
  })
}
