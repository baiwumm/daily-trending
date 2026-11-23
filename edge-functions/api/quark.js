/**
 * quark 热榜
 *
 * 路由映射：edge-functions/api/quark.js → GET /api/quark（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/quark/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://iflow.quark.cn/iflow/api/v1/article/aggregation?aggregation_id=16665090098771297825&count=50&bottom_pos=0'

  return handleHotList(context, {
    cacheKey: 'https://iflow.quark.cn/iflow/api/v1/article/aggregation?aggregation_id=16665090098771297825&count=50&bottom_pos=0',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.status === 0) {
            return responseBody.data.articles.map((v) => {
              // publish_time 为毫秒时间戳，按东八区格式化 HH:mm（服务端时区是 UTC，直接 getHours 会差 8 小时）
              const tip = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Shanghai',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(v.publish_time)
    
              return {
                id: v.id,
                title: v.title,
                tip,
                url: `https://123.quark.cn/detail?item_id=${v.id}`,
                mobileUrl: `https://123.quark.cn/detail?item_id=${v.id}`,
              }
            })
          }
    
          return []
        }
  })
}
