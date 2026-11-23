/**
 * bilibili 热榜
 *
 * 路由映射：edge-functions/api/bilibili.js → GET /api/bilibili（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/bilibili/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://api.bilibili.com/x/web-interface/ranking/v2'

  return handleHotList(context, {
    cacheKey: 'https://api.bilibili.com/x/web-interface/ranking/v2',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url, {headers: { Referer: 'https://www.bilibili.com/ranking/all' }})
    const data = responseBody?.data?.realtime || responseBody?.data?.list
    
          if (!data) {
            return []
          }
    
          return data.map((v) => ({
            id: v.bvid,
            title: v.title,
            desc: v.desc,
            pic: v.pic?.replace(/http:/, 'https:'),
            hot: v.stat?.view,
            url: v.short_link_v2 || `https://b23.tv/${v.bvid}`,
            mobileUrl: `https://m.bilibili.com/video/${v.bvid}`,
          }))
        }
  })
}
