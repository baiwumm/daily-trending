/**
 * history-today 热榜
 *
 * 路由映射：edge-functions/api/history-today.js → GET /api/history-today（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/history-today/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = ''

  return handleHotList(context, {
    cacheKey: 'https://baike.baidu.com/cms/home/eventsOnHistory/today',
    loader:
async () => sanitizeHotList(await (async () => {
    // en-CA 日期格式固定 YYYY-MM-DD，便于直接拆分
          const [, month, day] = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
            .format(new Date())
            .split('-')
    
          const responseBody = await fetchUpstreamJson(`https://baike.baidu.com/cms/home/eventsOnHistory/${month}.json`)
    
          return responseBody[month][month + day].map((v, index) => ({
            id: index,
            title: v.title.replace(/<[^>]+>/g, ''),
            tip: v.year,
            url: v.link,
            mobileUrl: v.link,
          }))
        })())
  })
}
