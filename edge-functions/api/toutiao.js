/**
 * toutiao 热榜
 *
 * 路由映射：edge-functions/api/toutiao.js → GET /api/toutiao（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/toutiao/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc'

  return handleHotList(context, {
    cacheKey: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.status === 'success') {
            return responseBody.data.map((v) => ({
              id: v.ClusterId,
              title: v.Title,
              pic: v.Image?.url,
              hot: v.HotValue,
              url: `https://www.toutiao.com/trending/${v.ClusterIdStr}/`,
              mobileUrl: `https://api.toutiaoapi.com/feoffline/amos_land/new/html/main/index.html?topic_id=${v.ClusterIdStr}`,
            }))
          }
    
          return []
        }
  })
}
