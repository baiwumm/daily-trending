/**
 * lol 热榜
 *
 * 路由映射：edge-functions/api/lol.js → GET /api/lol（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/lol/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://apps.game.qq.com/cmc/zmMcnTargetContentList?page=1&num=50&target=24&source=web_pc'

  return handleHotList(context, {
    cacheKey: 'https://apps.game.qq.com/cmc/zmMcnTargetContentList?page=1&num=50&target=24&source=web_pc',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.status === 1) {
            return responseBody.data.result.map((v) => ({
              id: v.iDocID,
              title: v.sTitle,
              desc: v.sAuthor,
              pic: v.sIMG,
              hot: Number(v.iTotalPlay),
              url: `https://lol.qq.com/news/detail.shtml?docid=${encodeURIComponent(v.iDocID)}`,
              mobileUrl: `https://lol.qq.com/news/detail.shtml?docid=${encodeURIComponent(v.iDocID)}`,
            }))
          }
    
          return []
        }
  })
}
