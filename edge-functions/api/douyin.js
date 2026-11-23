/**
 * douyin 热榜
 *
 * 路由映射：edge-functions/api/douyin.js → GET /api/douyin（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/douyin/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://aweme.snssdk.com/aweme/v1/hot/search/list/'

  return handleHotList(context, {
    cacheKey: 'https://aweme.snssdk.com/aweme/v1/hot/search/list/',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.status_code === 0) {
            return responseBody.data.word_list.map((v) => ({
              id: v.group_id,
              title: v.word,
              pic: v.word_cover?.url_list?.[0],
              hot: Number(v.hot_value),
              url: `https://www.douyin.com/hot/${encodeURIComponent(v.sentence_id)}`,
              mobileUrl: `https://www.douyin.com/hot/${encodeURIComponent(v.sentence_id)}`,
            }))
          }
    
          return []
        }
  })
}
