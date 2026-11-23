/**
 * zzz 热榜
 *
 * 路由映射：edge-functions/api/zzz.js → GET /api/zzz（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/zzz/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, getMiyousheAnnouncements, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)

  return handleHotList(context, {
    cacheKey: 'https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?gids=8',
    loader:
async () => sanitizeHotList(await getMiyousheAnnouncements(8, 'zz'))
  })
}
