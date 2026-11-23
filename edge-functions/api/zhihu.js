/**
 * zhihu 热榜
 *
 * 路由映射：edge-functions/api/zhihu.js → GET /api/zhihu（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/zhihu/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://api.zhihu.com/topstory/hot-list'

  return handleHotList(context, {
    cacheKey: 'https://api.zhihu.com/topstory/hot-list',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.data) {
            return responseBody.data.map((v) => {
              // detail_text 形如 "493万热度"，缺失时不换算，避免整条 hot 变成 NaN
              const hotDigits = v.detail_text?.replace(/\D/g, '')
    
              return {
                id: v.id,
                title: v.target?.title,
                pic: v.children?.[0]?.thumbnail,
                hot: hotDigits ? Number.parseInt(hotDigits, 10) * 10000 : undefined,
                url: `https://www.zhihu.com/question/${v.card_id?.replace('Q_', '')}`,
                mobileUrl: `https://www.zhihu.com/question/${v.card_id?.replace('Q_', '')}`,
              }
            })
          }
    
          return []
        }
  })
}
