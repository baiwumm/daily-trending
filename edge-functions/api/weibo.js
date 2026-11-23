/**
 * 微博-热搜榜
 *
 * 路由映射：edge-functions/api/weibo.js → GET /api/weibo（前端 URL 不变）。
 * 迁移动机：Cloud Functions 按「内存 × 墙钟时长」计费且已超额（12/12 起严格执行），
 * Edge Functions 按 CPU-ms 计费且 I/O 等待不计入——同一份抓取等待成本降约三个数量级。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 */
import { fetchUpstreamJson, handleHotList, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  return handleHotList(context, {
    cacheKey: 'https://weibo.com/ajax/side/hotSearch',
    loader: async () => {
      const responseBody = await fetchUpstreamJson('https://weibo.com/ajax/side/hotSearch', {
        headers: { Referer: 'https://weibo.com/', Accept: 'application/json' },
      })

      if (responseBody.ok !== 1) {
        return []
      }

      return sanitizeHotList(
        responseBody.data.realtime.map((v) => {
          const key = v.word_scheme ? v.word_scheme : `#${v.word}`

          return {
            id: v.mid,
            title: v.word,
            desc: key,
            hot: v.num,
            label: v.label_name,
            url: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
            mobileUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
          }
        }),
      )
    },
  })
}
