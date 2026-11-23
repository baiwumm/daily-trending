/**
 * baidu 热榜
 *
 * 路由映射：edge-functions/api/baidu.js → GET /api/baidu（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/baidu/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://top.baidu.com/api/board?platform=wise&tab=realtime'

  return handleHotList(context, {
    cacheKey: 'https://top.baidu.com/api/board?platform=wise&tab=realtime',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.success) {
            return responseBody.data.cards[0]?.content[0]?.content.map((v) => ({
              id: v.index,
              title: v.word,
              label: v.newHotName,
              url: `https://www.baidu.com/s?wd=${encodeURIComponent(v.word)}`,
              mobileUrl: v.url,
            }))
          }
    
          return []
        }
  })
}
