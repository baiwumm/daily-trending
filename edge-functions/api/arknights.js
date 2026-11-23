/**
 * arknights 热榜
 *
 * 路由映射：edge-functions/api/arknights.js → GET /api/arknights（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/arknights/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, formatCnMonthDay, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = ''

  return handleHotList(context, {
    cacheKey: 'https://ak.hypergryph.com/api/news',
    loader:
async () => sanitizeHotList(await (async () => {
    const pageUrls = [1, 2].map((page) => `https://ak.hypergryph.com/api/news?page=${page}`)
          const responses = await Promise.all(pageUrls.map((url) => fetchUpstreamJson(url)))
          const seen = new Set()
    
          return responses
            .flatMap((responseBody) =>
              responseBody.code === 0 && Array.isArray(responseBody.data?.list) ? responseBody.data.list : [],
            )
            .filter((item) => {
              if (seen.has(item.cid)) {
                return false
              }
    
              seen.add(item.cid)
    
              return true
            })
            .map((v) => ({
              id: v.cid,
              title: v.title,
              desc: v.brief || undefined,
              pic: v.cover || undefined,
              tip: formatCnMonthDay(v.displayTime),
              url: `https://ak.hypergryph.com/news/${v.cid}`,
              mobileUrl: `https://ak.hypergryph.com/news/${v.cid}`,
            }))
        })())
  })
}
