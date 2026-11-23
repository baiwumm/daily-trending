/**
 * wallstcn 热榜
 *
 * 路由映射：edge-functions/api/wallstcn.js → GET /api/wallstcn（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/wallstcn/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all'

  return handleHotList(context, {
    cacheKey: 'https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.code === 20000 && Array.isArray(responseBody.data?.day_items)) {
            return responseBody.data.day_items.map((v) => ({
              id: v.id,
              title: v.title,
              hot: v.pageviews,
              url: v.uri || `https://wallstreetcn.com/articles/${v.id}`,
              mobileUrl: v.uri || `https://wallstreetcn.com/articles/${v.id}`,
            }))
          }
    
          return []
        }
  })
}
