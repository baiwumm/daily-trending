/**
 * hello-github 热榜
 *
 * 路由映射：edge-functions/api/hello-github.js → GET /api/hello-github（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/hello-github/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://api.hellogithub.com/v1/?sort_by=featured&page=1&rank_by=newest&tid=all'

  return handleHotList(context, {
    cacheKey: 'https://api.hellogithub.com/v1/?sort_by=featured&page=1&rank_by=newest&tid=all',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.success) {
            return responseBody.data.map((v) => ({
              id: v.item_id,
              title: `${v.name}-${v.title}`,
              desc: v.summary,
              hot: v.clicks_total,
              url: `https://hellogithub.com/repository/${v.full_name}`,
              mobileUrl: `https://hellogithub.com/repository/${v.full_name}`,
            }))
          }
    
          return []
        }
  })
}
