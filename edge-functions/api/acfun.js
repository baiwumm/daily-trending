/**
 * acfun 热榜
 *
 * 路由映射：edge-functions/api/acfun.js → GET /api/acfun（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/acfun/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://www.acfun.cn/rest/pc-direct/rank/channel?channelId=1&subchannelId=1&rankLimit=30&rankPeriod=DAY'

  return handleHotList(context, {
    cacheKey: 'https://www.acfun.cn/rest/pc-direct/rank/channel?channelId=1&subchannelId=1&rankLimit=30&rankPeriod=DAY',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.result === 0 && Array.isArray(responseBody.rankList)) {
            return responseBody.rankList.map((v) => ({
              id: v.contentId,
              title: v.contentTitle,
              pic: v.videoCover,
              hot: v.viewCount,
              tip: v.userName,
              url: `https://www.acfun.cn/v/ac${v.contentId}`,
              mobileUrl: `https://www.acfun.cn/v/ac${v.contentId}`,
            }))
          }
    
          return []
        }
  })
}
