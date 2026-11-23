/**
 * juejin 热榜
 *
 * 路由映射：edge-functions/api/juejin.js → GET /api/juejin（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/juejin/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot'

  return handleHotList(context, {
    cacheKey: 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.err_msg === 'success') {
            return responseBody.data.map((v) => ({
              id: v.content.content_id,
              title: v.content.title,
              hot: v.content_counter.hot_rank,
              url: `https://juejin.cn/post/${v.content.content_id}`,
              mobileUrl: `https://juejin.cn/post/${v.content.content_id}`,
            }))
          }
    
          return []
        }
  })
}
