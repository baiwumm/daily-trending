/**
 * 36kr 热榜
 *
 * 路由映射：edge-functions/api/36kr.js → GET /api/36kr（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/36kr/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot'

  return handleHotList(context, {
    cacheKey: 'https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url, {headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          }, method: 'POST', body: JSON.stringify({ partner_id: 'wap', param: { siteId: 1, platformId: 2 }, timestamp: Date.now() })})
    if (responseBody.code === 0) {
            return responseBody.data?.hotRankList.map((v) => ({
              id: v.itemId,
              title: v?.templateMaterial?.widgetTitle,
              pic: v?.templateMaterial?.widgetImage,
              hot: v?.templateMaterial?.statRead,
              url: `https://www.36kr.com/p/${v.itemId}`,
              mobileUrl: `https://m.36kr.com/p/${v.itemId}`,
            }))
          }
    
          return []
        }
  })
}
