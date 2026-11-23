/**
 * kuaishou 热榜
 *
 * 路由映射：edge-functions/api/kuaishou.js → GET /api/kuaishou（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/kuaishou/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://www.kuaishou.com/?isHome=1'

  return handleHotList(context, {
    cacheKey: 'https://www.kuaishou.com/?isHome=1',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, {  })
    // 快手首页：window.__APOLLO_STATE__ 内嵌 Apollo 缓存
          const match = html.match(/window\.__APOLLO_STATE__=([\s\S]*?);\(function\(\)/)
    
          if (!match) {
            return []
          }
    
          const jsonObject = JSON.parse(match[1]).defaultClient
          const idPattern = /clientCacheKey=([A-Za-z0-9]+)/
          const allItems = jsonObject['visionHotRank({"page":"home","refreshSessionId":"","pageCount":1,"sessionId":""})']?.items
            || jsonObject['$ROOT_QUERY.visionHotRank({"page":"home"})'].items
          const result = []
    
          for (const v of allItems) {
            const info = jsonObject[v.id]
            const id = info?.poster?.match(idPattern)?.[1]
    
            // 上游偶发缺失条目数据或海报链接，跳过该条，避免一条脏数据打挂整个榜单
            if (!id) {
              continue
            }
    
            // 热度形如 "123.4万"，缺失时不输出 NaN
            result.push({
              id,
              title: info.name,
              hot: info.hotValue ? Number.parseFloat(info.hotValue) * 10000 : undefined,
              url: `https://www.kuaishou.com/short-video/${id}`,
              mobileUrl: `https://www.kuaishou.com/short-video/${id}`,
            })
          }
    
          return result
        })())
  })
}
