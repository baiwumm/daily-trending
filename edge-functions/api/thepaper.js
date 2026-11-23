/**
 * thepaper 热榜
 *
 * 路由映射：edge-functions/api/thepaper.js → GET /api/thepaper（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/thepaper/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar'

  return handleHotList(context, {
    cacheKey: 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.resultCode === 1) {
            return responseBody.data.hotNews.map((v) => ({
              id: v.contId,
              title: v.name,
              pic: v.pic,
              hot: v.praiseTimes,
              url: `https://www.thepaper.cn/newsDetail_forward_${v.contId}`,
              mobileUrl: `https://m.thepaper.cn/newsDetail_forward_${v.contId}`,
            }))
          }
    
          return []
        }
  })
}
