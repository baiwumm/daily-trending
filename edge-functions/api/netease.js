/**
 * netease 热榜
 *
 * 路由映射：edge-functions/api/netease.js → GET /api/netease（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/netease/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://m.163.com/fe/api/hot/news/flow'

  return handleHotList(context, {
    cacheKey: 'https://m.163.com/fe/api/hot/news/flow',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.msg === 'success') {
            return responseBody.data.list.map((v) => ({
              id: v.skipID,
              title: v.title,
              desc: v._keyword,
              pic: v.imgsrc,
              url: `https://www.163.com/dy/article/${v.skipID}.html`,
              mobileUrl: v.url,
            }))
          }
    
          return []
        }
  })
}
