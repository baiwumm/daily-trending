/**
 * qq-music 热榜
 *
 * 路由映射：edge-functions/api/qq-music.js → GET /api/qq-music（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/qq-music/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { convertMillisecondsToTime, fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid=26&format=json'

  return handleHotList(context, {
    cacheKey: 'https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid=26&format=json',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url, {headers: { referer: 'https://y.qq.com/' }})
    if (responseBody.code === 0 && Array.isArray(responseBody.songlist)) {
            return responseBody.songlist.map((v) => {
              const singers = (v.data.singer ?? []).map((s) => s.name).join('/')
    
              return {
                id: v.data.songid,
                title: `${v.data.songname} - ${singers}`,
                pic: `https://y.gtimg.cn/music/photo_new/T002R500x500M000${v.data.albummid}.jpg`,
                tip: convertMillisecondsToTime(v.data.interval * 1000),
                url: `https://y.qq.com/n/ryqq/songDetail/${v.data.songmid}`,
                mobileUrl: `https://y.qq.com/n/ryqq/songDetail/${v.data.songmid}`,
              }
            })
          }
    
          return []
        }
  })
}
