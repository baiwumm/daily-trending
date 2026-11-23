/**
 * sina-news 热榜
 *
 * 路由映射：edge-functions/api/sina-news.js → GET /api/sina-news（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/sina-news/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://top.news.sina.com.cn/ws/GetTopDataList.php?top_type=day&top_cat=www_www_all_suda_suda&top_time=today&top_show_num=50'

  return handleHotList(context, {
    cacheKey: 'https://top.news.sina.com.cn/ws/GetTopDataList.php?top_type=day&top_cat=www_www_all_suda_suda&top_time=today&top_show_num=50',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, {  })
    // 非纯 JSON（前缀 var data = ），取首尾大括号之间的内容
          const jsonStart = html.indexOf('{')
          const jsonEnd = html.lastIndexOf('}')
    
          if (jsonStart < 0 || jsonEnd < 0) {
            return []
          }
    
          const json = JSON.parse(html.slice(jsonStart, jsonEnd + 1))
    
          // 接口对部分无标题条目会把 title 写成 false（布尔值），过滤避免下游 trim 报错
          if (Array.isArray(json?.data)) {
            return json.data
              .filter((v) => typeof v.title === 'string' && v.title.trim())
              .map((v) => ({
                id: v.id,
                title: v.title,
                url: v.url,
                mobileUrl: v.url,
                tip: v.create_time,
              }))
          }
    
          return []
        })())
  })
}
