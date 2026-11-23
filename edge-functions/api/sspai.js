/**
 * sspai 热榜
 *
 * 路由映射：edge-functions/api/sspai.js → GET /api/sspai（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/sspai/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://sspai.com/api/v1/article/hot/page/get?free=1&offset=0&limit=30'

  return handleHotList(context, {
    cacheKey: 'https://sspai.com/api/v1/article/hot/page/get?free=1&offset=0&limit=30',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.error === 0 && Array.isArray(responseBody.data)) {
            return responseBody.data.map((v) => ({
              id: v.id,
              title: v.title,
              desc: v.summary,
              pic: v.banner ? `https://cdn.sspai.com/${v.banner}` : undefined,
              hot: v.like_count,
              url: `https://sspai.com/post/${v.id}`,
              mobileUrl: `https://sspai.com/post/${v.id}`,
            }))
          }
    
          return []
        }
  })
}
