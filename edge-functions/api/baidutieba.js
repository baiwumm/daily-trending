/**
 * baidutieba 热榜
 *
 * 路由映射：edge-functions/api/baidutieba.js → GET /api/baidutieba（前端 URL 不变）。
 * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。
 * 从 src/app/api/baidutieba/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。
 */
import { fetchUpstreamJson, handleHotList, resolveCacheSeconds, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  const cacheSeconds = resolveCacheSeconds(context.env)
  const url = 'https://tieba.baidu.com/hottopic/browse/topicList'

  return handleHotList(context, {
    cacheKey: 'https://tieba.baidu.com/hottopic/browse/topicList',
    loader:
async () => {
          const responseBody = await fetchUpstreamJson(url)
    if (responseBody.errmsg === 'success') {
            return responseBody.data.bang_topic.topic_list.map((v) => ({
              id: v.topic_id.toString(),
              title: v.topic_name,
              desc: v.topic_desc,
              pic: v.topic_pic,
              hot: v.discuss_num,
              url: v.topic_url,
              mobileUrl: v.topic_url,
            }))
          }
    
          return []
        }
  })
}
