/**
 * steam 热榜
 *
 * 路由映射：edge-functions/api/steam.js → GET /api/steam（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/steam/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://store.steampowered.com/api/featuredcategories/?cc=cn&l=schinese'

  return handleHotList(context, {
    cacheKey: 'https://store.steampowered.com/api/featuredcategories/?cc=cn&l=schinese',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    const items = responseBody?.top_sellers?.items
    
          if (Array.isArray(items)) {
            // 价格为分单位，换算为元展示
            return items.map((v) => ({
              id: v.id,
              title: v.name,
              url: v.url || `https://store.steampowered.com/app/${v.id}/`,
              mobileUrl: v.url || `https://store.steampowered.com/app/${v.id}/`,
              tip: v.final_price ? `¥${Math.round(v.final_price / 100)}` : undefined,
            }))
          }
    
          return []
        }
  })
}
