/**
 * woshipm 热榜
 *
 * 路由映射：edge-functions/api/woshipm.js → GET /api/woshipm（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/woshipm/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://www.woshipm.com/api2/app/article/popular/daily'

  return handleHotList(context, {
    cacheKey: 'https://www.woshipm.com/api2/app/article/popular/daily',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.CODE === 200) {
            return responseBody.RESULT.map((v) => {
              const url = `https://www.woshipm.com/${v.data.type}/${v.data.id}.html`
    
              return {
                id: v.data.id,
                title: v.data.articleTitle,
                desc: v.data.articleSummary,
                hot: v.scores,
                pic: v.data.imageUrl,
                url,
                mobileUrl: url,
              }
            })
          }
    
          return []
        }
  })
}
