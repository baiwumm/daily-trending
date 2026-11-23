/**
 * 微信读书-飙升榜
 *
 * 路由映射：edge-functions/api/weread.js → GET /api/weread。
 * node:crypto 与 Web Crypto 都不含 MD5（Web Crypto 刻意不收录），
 * getWereadID 换算逻辑用共享库的纯 JS md5Hex 实现（与 node:crypto 输出逐条对拍一致）。
 */
import { fetchUpstreamJson, handleHotList, getWereadID, sanitizeHotList } from '../_lib.js'

export async function onRequestGet(context) {
  return handleHotList(context, {
    cacheKey: 'https://weread.qq.com/web/bookListInCategory/rising?rank=1',
    loader: async () => {
      const responseBody = await fetchUpstreamJson('https://weread.qq.com/web/bookListInCategory/rising?rank=1')

      if (!responseBody.books) {
        return []
      }

      return sanitizeHotList(
        responseBody.books.map((v) => {
          const info = v.bookInfo

          return {
            id: info.bookId,
            title: info.title,
            hot: v.readingCount,
            pic: info.cover.replace('s_', 't9_'),
            url: `https://weread.qq.com/web/bookDetail/${getWereadID(info.bookId)}`,
            mobileUrl: `https://weread.qq.com/web/bookDetail/${getWereadID(info.bookId)}`,
          }
        }),
      )
    },
  })
}
