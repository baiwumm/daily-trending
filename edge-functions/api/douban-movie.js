/**
 * douban-movie 热榜
 *
 * 路由映射：edge-functions/api/douban-movie.js → GET /api/douban-movie（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/douban-movie/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'
import { parseDoubanMovieChart } from '../parsers/douban-movie.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://movie.douban.com/chart/'

  return handleHotList(context, {
    cacheKey: 'https://movie.douban.com/chart/',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, {  })
          return parseDoubanMovieChart(html)
        })())
  })
}
