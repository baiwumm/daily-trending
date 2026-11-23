/**
 * netease-music 热榜
 *
 * 路由映射：edge-functions/api/netease-music.js → GET /api/netease-music（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/netease-music/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { convertMillisecondsToTime, fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://music.163.com/api/playlist/detail?id=3778678'

  return handleHotList(context, {
    cacheKey: 'https://music.163.com/api/playlist/detail?id=3778678',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url, {headers: { authority: 'music.163.com', referer: 'https://music.163.com/' }})
    if (responseBody.code === 200) {
            return responseBody.result.tracks.map((v) => ({
              id: v.id,
              title: v.name,
              pic: v.album?.picUrl,
              tip: convertMillisecondsToTime(v.duration),
              url: `https://music.163.com/#/song?id=${v.id}`,
              mobileUrl: `https://music.163.com/m/song?id=${v.id}`,
            }))
          }
    
          return []
        }
  })
}
