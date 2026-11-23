/**
 * jin10 热榜
 *
 * 路由映射：edge-functions/api/jin10.js → GET /api/jin10（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/jin10/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, fetchUpstreamText, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://www.jin10.com/flash_newest.js'

  return handleHotList(context, {
    cacheKey: 'https://www.jin10.com/flash_newest.js',
    loader:
async () => sanitizeHotList(await (async () => {
          const html = await fetchUpstreamText(url, {  })
    // 上游返回 JS 文件 var newest = [...];，剥离后解析
          const list = JSON.parse(html.replace(/^var newest = /, '').replace(/;\s*$/, ''))
    
          if (!Array.isArray(list)) {
            return []
          }
    
          return list
            .filter((v) => v.id && (v.data?.title || v.data?.content))
            .map((v) => {
              // 个别条目文本混入 HTML 标签，统一剥离
              const strip = (text) => text.replace(/<[^>]+>/g, '')
              const title = strip(String(v.data.title ?? '')) || strip(String(v.data.content ?? ''))
              const content = strip(String(v.data.content ?? ''))
    
              return {
                id: v.id,
                title,
                desc: v.data.title ? content : undefined,
                pic: v.data.pic || undefined,
                tip: String(v.time ?? '').slice(11, 16),
                label: v.important === 1 ? '重要' : undefined,
                url: `https://flash.jin10.com/detail/${v.id}`,
                mobileUrl: `https://flash.jin10.com/detail/${v.id}`,
              }
            })
        })())
  })
}
