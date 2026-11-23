/**
 * csdn 热榜
 *
 * 路由映射：edge-functions/api/csdn.js → GET /api/csdn（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/csdn/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, getCsdnHotRank, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)

  return handleHotList(context, {
    cacheKey: 'https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=100',
    loader:
async () => sanitizeHotList(await getCsdnHotRank())
  })
}
