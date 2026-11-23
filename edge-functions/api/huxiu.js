/**
 * huxiu 热榜
 *
 * 路由映射：edge-functions/api/huxiu.js → GET /api/huxiu（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/huxiu/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://moment-api.huxiu.com/web-v3/moment/feed?platform=www'

  return handleHotList(context, {
    cacheKey: 'https://moment-api.huxiu.com/web-v3/moment/feed?platform=www',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url, {headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.huxiu.com/moment/' }})
    if (responseBody.success) {
            return responseBody?.data?.moment_list?.datalist.map((v) => {
              const content = (v.content || '').replace(/<br\s*\/?>/gi, '\n')
              const [titleLine, ...rest] = content
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
    
              return {
                id: v.object_id,
                title: titleLine?.replace(/。$/, '') || '',
                desc: rest.join('\n'),
                tip: v.format_time,
                url: `https://www.huxiu.com/moment/${v.object_id}.html`,
                mobileUrl: `https://m.huxiu.com/moment/${v.object_id}.html`,
              }
            })
          }
    
          return []
        }
  })
}
