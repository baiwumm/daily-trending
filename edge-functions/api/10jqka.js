/**
 * 10jqka 热榜
 *
 * 路由映射：edge-functions/api/10jqka.js → GET /api/10jqka（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/10jqka/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, formatCnMonthDay, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://news.10jqka.com.cn/tapp/news/push/stock/?page=1&pagesize=50'

  return handleHotList(context, {
    cacheKey: 'https://news.10jqka.com.cn/tapp/news/push/stock/?page=1&pagesize=50',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (Array.isArray(responseBody?.data?.list)) {
            return responseBody.data.list.map((v) => ({
              id: v.id,
              title: v.title,
              desc: v.digest || undefined,
              url: v.url,
              mobileUrl: v.appUrl || v.url,
              tip: formatCnMonthDay(v.ctime),
            }))
          }
    
          return []
        }
  })
}
