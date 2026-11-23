/**
 * douban-book 热榜
 *
 * 路由映射：edge-functions/api/douban-book.js → GET /api/douban-book（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/douban-book/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = ''

  return handleHotList(context, {
    cacheKey: 'https://m.douban.com/rexxar/api/v2/subject_collection/book',
    loader:
async () => sanitizeHotList(await (async () => {
    const BOOK_TYPES = ['fiction', 'nonfiction']
          const responses = await Promise.all(
            BOOK_TYPES.map((type) =>
              fetchUpstreamJson(
                `https://m.douban.com/rexxar/api/v2/subject_collection/book_${type}/items?start=0&count=50`,
                { headers: { referer: `https://m.douban.com/book/${type}` } },
              ),
            ),
          )
    
          const seen = new Set()
    
          return responses
            .flatMap((responseBody) =>
              Array.isArray(responseBody.subject_collection_items) ? responseBody.subject_collection_items : [],
            )
            .filter((v) => {
              if (!v?.id || seen.has(v.id)) {
                return false
              }
    
              seen.add(v.id)
    
              return true
            })
            .map((v) => ({
              id: v.id,
              title: v.title,
              desc: v.info || undefined,
              pic: typeof v.cover === 'string' ? v.cover : v.cover?.url,
              tip: v.rating?.value ? `${v.rating.value}分` : undefined,
              url: `https://book.douban.com/subject/${v.id}/`,
              mobileUrl: `https://m.douban.com/book/subject/${v.id}/`,
            }))
        })())
  })
}
