/**
 * ifanr 热榜
 *
 * 路由映射：edge-functions/api/ifanr.js → GET /api/ifanr（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/ifanr/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://sso.ifanr.com/api/v5/wp/buzz/?limit=50&offset=0'

  return handleHotList(context, {
    cacheKey: 'https://sso.ifanr.com/api/v5/wp/buzz/?limit=50&offset=0',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    const data = responseBody?.objects
    
          if (!data) {
            return []
          }
    
          return data.map((v) => ({
            id: v.post_id,
            title: v.post_title,
            url: v.buzz_original_url || `https://www.ifanr.com/${v.post_id}`,
            mobileUrl: v.buzz_original_url || `https://www.ifanr.com/digest/${v.post_id}`,
          }))
        }
  })
}
