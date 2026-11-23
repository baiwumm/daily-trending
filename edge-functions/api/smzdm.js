/**
 * smzdm 热榜
 *
 * 路由映射：edge-functions/api/smzdm.js → GET /api/smzdm（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/smzdm/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'
import { parseSmzdmTop } from '../parsers/smzdm.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://www.smzdm.com/top/'

  return handleHotList(context, {
    cacheKey: 'https://www.smzdm.com/top/',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, {  })
          return parseSmzdmTop(html)
        })())
  })
}
