/**
 * eastmoney 热榜
 *
 * 路由映射：edge-functions/api/eastmoney.js → GET /api/eastmoney（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/eastmoney/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = `https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=&pageSize=50&req_trace=${Math.floor(Date.now() / (cacheSeconds * 1000))}`

  return handleHotList(context, {
    cacheKey: url,
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.code === '1' && Array.isArray(responseBody.data?.fastNewsList)) {
            return responseBody.data.fastNewsList.map((v) => ({
              id: v.code,
              title: (v.title || v.summary || '').replace(/<[^>]+>/g, '').trim(),
              tip: typeof v.showTime === 'string' ? v.showTime.slice(11, 16) : undefined,
              url: `https://finance.eastmoney.com/a/${v.code}.html`,
              mobileUrl: `https://finance.eastmoney.com/a/${v.code}.html`,
            }))
          }
    
          return []
        }
  })
}
