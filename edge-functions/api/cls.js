/**
 * cls 热榜
 *
 * 路由映射：edge-functions/api/cls.js → GET /api/cls（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/cls/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, formatCnMonthDay, handleHotList, md5Hex, resolveCacheSeconds, sanitizeHotList, sha1Hex, stripTags } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = ''

  return handleHotList(context, {
    cacheKey: 'https://www.cls.cn/v2/article/hot/list',
    loader:
async () => sanitizeHotList(await (async () => {
    const params = new URLSearchParams({ appName: 'CailianpressWeb', os: 'web', sv: '8.7.9' })
    
          params.sort()
    
          const sha1 = await sha1Hex(params.toString())
    
          params.append('sign', md5Hex(sha1))
    
          const responseBody = await fetchUpstreamJson(`https://www.cls.cn/v2/article/hot/list?${params.toString()}`)
    
          if (Array.isArray(responseBody.data)) {
            return responseBody.data.map((v) => ({
              id: v.id,
              title: stripTags(v.title || v.brief) || '',
              desc: v.title ? stripTags(v.brief) || undefined : undefined,
              tip: formatCnMonthDay(v.ctime),
              url: `https://www.cls.cn/detail/${v.id}`,
              mobileUrl: `https://www.cls.cn/detail/${v.id}`,
            }))
          }
    
          return []
        })())
  })
}
