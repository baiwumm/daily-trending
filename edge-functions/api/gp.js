/**
 * gp 热榜
 *
 * 路由映射：edge-functions/api/gp.js → GET /api/gp（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/gp/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'
import { parseGpNews } from '../parsers/gp.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://gp.qq.com/main.shtml'

  return handleHotList(context, {
    cacheKey: 'https://gp.qq.com/main.shtml',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, { encoding: 'gbk' })
          return parseGpNews(html)
        })())
  })
}
