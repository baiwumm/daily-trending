/**
 * qq 热榜
 *
 * 路由映射：edge-functions/api/qq.js → GET /api/qq（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/qq/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://r.inews.qq.com/gw/event/hot_ranking_list'

  return handleHotList(context, {
    cacheKey: 'https://r.inews.qq.com/gw/event/hot_ranking_list',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.ret === 0) {
            return responseBody.idlist[0].newslist.slice(1).map((v) => ({
              id: v.id,
              title: v.title,
              desc: v.abstract,
              pic: v.miniProShareImage,
              hot: v.readCount,
              url: `https://new.qq.com/rain/a/${v.id}`,
              mobileUrl: `https://view.inews.qq.com/a/${v.id}`,
            }))
          }
    
          return []
        }
  })
}
