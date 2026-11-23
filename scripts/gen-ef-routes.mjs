/*
 * S2 批量生成器：读取 Next 版路由的「URL + 映射逻辑」，生成等价的 Edge Functions 路由。
 *
 * 设计原则：映射逻辑从原 Next route.ts 逐行搬运（只改 import 与请求/响应封装），
 * 不重新发明——保证数据契约等价。生成后由对拍测试（本地真实回源）兜底验证。
 * 用法：node scripts/gen-ef-routes.mjs
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const API_DIR = join(ROOT, 'src/app/api')
const EF_DIR = join(ROOT, 'edge-functions/api')

/** 已由 PoC 手写完成的三个路由（不走模板，但需要删 Next 路由） */
const HANDWRITTEN = ['weibo', 'ithome', 'weread']

/**
 * 第二批路由（HTML 解析，待与 cheerio 版逐一对拍后迁移）：
 * 生成时跳过 + 不删 Next 目录——它们继续在 Next 版上服务，映射定义保留在 ROUTES 里作素材。
 * 跳过原因：正则解析与 cheerio 的等价性需要真实页面反复对拍（smzdm/gp 上游已改版需重新设计），
 * 不带着疑问上线。
 */
const DEFERRED = new Set(['douban-movie', 'github-trending', 'gp', 'jjwxc', 'smzdm', 'yjwujian'])

/** 每个路由的 EF 定义：cacheKey、抓取方式与映射逻辑（从 Next 版搬运） */
const ROUTES = {
  '10jqka': {
    url: 'https://news.10jqka.com.cn/tapp/news/push/stock/?page=1&pagesize=50',
    map: `if (Array.isArray(responseBody?.data?.list)) {
        return responseBody.data.list.map((v) => ({
          id: v.id,
          title: v.title,
          desc: v.digest || undefined,
          url: v.url,
          mobileUrl: v.appUrl || v.url,
          tip: formatCnMonthDay(v.ctime),
        }))
      }

      return []`,
  },
  '36kr': {
    url: 'https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot',
    method: 'POST',
    body: `JSON.stringify({ partner_id: 'wap', param: { siteId: 1, platformId: 2 }, timestamp: Date.now() })`,
    headers: `{
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }`,
    map: `if (responseBody.code === 0) {
        return responseBody.data?.hotRankList.map((v) => ({
          id: v.itemId,
          title: v?.templateMaterial?.widgetTitle,
          pic: v?.templateMaterial?.widgetImage,
          hot: v?.templateMaterial?.statRead,
          url: \`https://www.36kr.com/p/\${v.itemId}\`,
          mobileUrl: \`https://m.36kr.com/p/\${v.itemId}\`,
        }))
      }

      return []`,
  },
  acfun: {
    url: 'https://www.acfun.cn/rest/pc-direct/rank/channel?channelId=1&subchannelId=1&rankLimit=30&rankPeriod=DAY',
    map: `if (responseBody.result === 0 && Array.isArray(responseBody.rankList)) {
        return responseBody.rankList.map((v) => ({
          id: v.contentId,
          title: v.contentTitle,
          pic: v.videoCover,
          hot: v.viewCount,
          tip: v.userName,
          url: \`https://www.acfun.cn/v/ac\${v.contentId}\`,
          mobileUrl: \`https://www.acfun.cn/v/ac\${v.contentId}\`,
        }))
      }

      return []`,
  },
  arknights: {
    // 明日方舟官网资讯：每页固定 6 条共 12 条，两页并行拉取 + 按 cid 去重
    parallel: true,
    cacheKey: 'https://ak.hypergryph.com/api/news',
    map: `const pageUrls = [1, 2].map((page) => \`https://ak.hypergryph.com/api/news?page=\${page}\`)
      const responses = await Promise.all(pageUrls.map((url) => fetchUpstreamJson(url)))
      const seen = new Set()

      return responses
        .flatMap((responseBody) =>
          responseBody.code === 0 && Array.isArray(responseBody.data?.list) ? responseBody.data.list : [],
        )
        .filter((item) => {
          if (seen.has(item.cid)) {
            return false
          }

          seen.add(item.cid)

          return true
        })
        .map((v) => ({
          id: v.cid,
          title: v.title,
          desc: v.brief || undefined,
          pic: v.cover || undefined,
          tip: formatCnMonthDay(v.displayTime),
          url: \`https://ak.hypergryph.com/news/\${v.cid}\`,
          mobileUrl: \`https://ak.hypergryph.com/news/\${v.cid}\`,
        }))`,
    imports: ['formatCnMonthDay'],
  },
  baidu: {
    url: 'https://top.baidu.com/api/board?platform=wise&tab=realtime',
    map: `if (responseBody.success) {
        return responseBody.data.cards[0]?.content[0]?.content.map((v) => ({
          id: v.index,
          title: v.word,
          label: v.newHotName,
          url: \`https://www.baidu.com/s?wd=\${encodeURIComponent(v.word)}\`,
          mobileUrl: v.url,
        }))
      }

      return []`,
  },
  baidutieba: {
    url: 'https://tieba.baidu.com/hottopic/browse/topicList',
    map: `if (responseBody.errmsg === 'success') {
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

      return []`,
  },
  bilibili: {
    url: 'https://api.bilibili.com/x/web-interface/ranking/v2',
    headers: `{ Referer: 'https://www.bilibili.com/ranking/all' }`,
    map: `const data = responseBody?.data?.realtime || responseBody?.data?.list

      if (!data) {
        return []
      }

      return data.map((v) => ({
        id: v.bvid,
        title: v.title,
        desc: v.desc,
        pic: v.pic?.replace(/http:/, 'https:'),
        hot: v.stat?.view,
        url: v.short_link_v2 || \`https://b23.tv/\${v.bvid}\`,
        mobileUrl: \`https://m.bilibili.com/video/\${v.bvid}\`,
      }))`,
  },
  cls: {
    // 财联社签名：sign = MD5(SHA1(按参数名排序的 querystring))，参数静态无时间戳，
    // URL 依赖 loader 内派生（动态模式），缓存键用接口基址
    dynamic: true,
    cacheKey: 'https://www.cls.cn/v2/article/hot/list',
    map: `const params = new URLSearchParams({ appName: 'CailianpressWeb', os: 'web', sv: '8.7.9' })

      params.sort()

      const sha1 = await sha1Hex(params.toString())

      params.append('sign', md5Hex(sha1))

      const responseBody = await fetchUpstreamJson(\`https://www.cls.cn/v2/article/hot/list?\${params.toString()}\`)

      if (Array.isArray(responseBody.data)) {
        return responseBody.data.map((v) => ({
          id: v.id,
          title: stripTags(v.title || v.brief) || '',
          desc: v.title ? stripTags(v.brief) || undefined : undefined,
          tip: formatCnMonthDay(v.ctime),
          url: \`https://www.cls.cn/detail/\${v.id}\`,
          mobileUrl: \`https://www.cls.cn/detail/\${v.id}\`,
        }))
      }

      return []`,
  },
  csdn: {
    // CSDN 走共享库的退避重试抓取（WAF 521 挑战 + 移动端 UA）
    lib: 'getCsdnHotRank',
    cacheKey: 'https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=100',
    map: `getCsdnHotRank()`,
  },
  dongchedi: {
    url: 'https://www.dongchedi.com/',
    text: true,
    map: `// 上游为 Next.js 页面，数据在 <script id="__NEXT_DATA__"> 内嵌 JSON
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)<\\/script>/)

      if (!match) {
        return []
      }

      const data = JSON.parse(match[1])
      const todayNews = data?.props?.pageProps?.todayNews

      return [...(todayNews?.head_article ?? []), ...(todayNews?.content_article ?? [])].map((v, idx) => ({
        id: idx + 1,
        title: v.title,
        url: \`https://www.dongchedi.com/article/\${v.gid_str}\`,
        mobileUrl: \`https://www.dongchedi.com/article/\${v.gid_str}\`,
      }))`,
  },
  'douban-book': {
    // 两个榜单并行拉取 + 跨榜去重（虚构在前、非虚构在后）
    parallel: true,
    cacheKey: 'https://m.douban.com/rexxar/api/v2/subject_collection/book',
    map: `const BOOK_TYPES = ['fiction', 'nonfiction']
      const responses = await Promise.all(
        BOOK_TYPES.map((type) =>
          fetchUpstreamJson(
            \`https://m.douban.com/rexxar/api/v2/subject_collection/book_\${type}/items?start=0&count=50\`,
            { headers: { referer: \`https://m.douban.com/book/\${type}\` } },
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
          tip: v.rating?.value ? \`\${v.rating.value}分\` : undefined,
          url: \`https://book.douban.com/subject/\${v.id}/\`,
          mobileUrl: \`https://m.douban.com/book/subject/\${v.id}/\`,
        }))`,
  },
  'douban-movie': {
    url: 'https://movie.douban.com/chart/',
    text: true,
    map: `// 每周榜单·电影：按 <tr class="item"> 行解析（cheerio 版为 .article tr.item）
      const rows = html.split('<tr class="item"').slice(1)
      const getNumbers = (text) => {
        if (!text) return 10000000

        const match = text.match(/\\d+/)

        return match ? Number(match[0]) : 10000000
      }

      return rows.map((row) => {
        const urlMatch = row.match(/<a href="([^"]+)"/)
        const url = urlMatch ? decodeEntities(urlMatch[1]) : ''
        const titleMatch = row.match(/<p class="pl2"><a[^>]*>([\\s\\S]*?)<\\/a>/)
        const title = titleMatch ? stripTags(decodeEntities(titleMatch[1])).replace(/\\s+/g, ' ').trim() : ''
        const descMatch = row.match(/<p class="pl">([\\s\\S]*?)<\\/p>/)
        const hotMatch = row.match(/<span class="pl">([\\s\\S]*?)<\\/span>/)

        return {
          id: String(getNumbers(url)),
          title,
          desc: descMatch ? stripTags(decodeEntities(descMatch[1])).trim() : undefined,
          hot: hotMatch ? getNumbers(stripTags(decodeEntities(hotMatch[1]))) : undefined,
          url,
          mobileUrl: \`https://m.douban.com/movie/subject/\${getNumbers(url)}/\`,
        }
      })`,
    imports: ['decodeEntities', 'stripTags'],
  },
  douyin: {
    url: 'https://aweme.snssdk.com/aweme/v1/hot/search/list/',
    map: `if (responseBody.status_code === 0) {
        return responseBody.data.word_list.map((v) => ({
          id: v.group_id,
          title: v.word,
          pic: v.word_cover?.url_list?.[0],
          hot: Number(v.hot_value),
          url: \`https://www.douyin.com/hot/\${encodeURIComponent(v.sentence_id)}\`,
          mobileUrl: \`https://www.douyin.com/hot/\${encodeURIComponent(v.sentence_id)}\`,
        }))
      }

      return []`,
  },
  douyin: {
    url: 'https://aweme.snssdk.com/aweme/v1/hot/search/list/',
    map: `if (responseBody.status_code === 0) {
        return responseBody.data.word_list.map((v) => ({
          id: v.group_id,
          title: v.word,
          pic: v.word_cover?.url_list?.[0],
          hot: Number(v.hot_value),
          url: \`https://www.douyin.com/hot/\${encodeURIComponent(v.sentence_id)}\`,
          mobileUrl: \`https://www.douyin.com/hot/\${encodeURIComponent(v.sentence_id)}\`,
        }))
      }

      return []`,
  },
  hupu: {
    url: 'https://bbs.hupu.com/all-gambia',
    text: true,
    noUA: true,
    map: `// 虎扑对桌面 UA 返回反爬页，共享库以 'User-Agent': '' 不发送该头。
      // 页面数据在首个 <script> 的 window.$$data= 之后，取其后的 pageData.threads
      const scriptMatch = html.match(/<script[^>]*>([\\s\\S]*?)<\\/script>/)

      if (!scriptMatch || !scriptMatch[1].includes('window.$$data=')) {
        return []
      }

      const data = JSON.parse(scriptMatch[1].split('window.$$data=')[1])

      return data.pageData.threads.map((v) => ({
        id: v.tid,
        title: v.title,
        desc: v.desc,
        pic: v.cover,
        tip: v.lights,
        url: \`https://bbs.hupu.com\${v.url}\`,
        mobileUrl: \`https://bbs.hupu.com\${v.url}\`,
      }))`,
  },
  jjwxc: {
    url: 'https://www.jjwxc.net/topten.php?orderstr=7',
    text: true,
    encoding: 'gb18030',
    map: `// 晋江文学城·TOP10：GB18030 页面，按 <a href*="onebook.php"> 抓取并按作品 ID 去重
      const anchors = html.split(/<a\\s[^>]*href="[^"]*onebook\\.php[^"]*"[^>]*>/).slice(1)
      const seen = new Set()
      const result = []

      for (let i = 0; i < anchors.length; i++) {
        const chunk = anchors[i].split('</a>')[0]
        const hrefMatch = chunk.match(/href="([^"]*onebook\\.php[^"]*)"/)
        const href = hrefMatch ? hrefMatch[1] : ''
        const novelid = href.match(/novelid=(\\d+)/)?.[1]
        const title = stripTags(decodeEntities(chunk))
          .replace(/\\s+/g, ' ')
          .trim()

        if (!novelid || !title || seen.has(novelid)) {
          continue
        }

        seen.add(novelid)

        result.push({
          id: novelid,
          title,
          url: \`https://www.jjwxc.net/onebook.php?novelid=\${novelid}\`,
          mobileUrl: \`https://www.jjwxc.net/onebook.php?novelid=\${novelid}\`,
        })
      }

      return result`,
    imports: ['decodeEntities', 'stripTags'],
  },
  smzdm: {
    url: 'https://www.smzdm.com/top/',
    text: true,
    map: `// 什么值得买·热榜：按 <a href*="smzdm.com/p/"> 抓取，标题在 .feed-hot-title 内，按 id 去重
      const anchors = html.split(/<a\\s[^>]*href="[^"]*smzdm\\.com\\/p\\/[^"]*"[^>]*>/).slice(1)
      const seen = new Set()
      const result = []

      for (let i = 0; i < anchors.length; i++) {
        const chunk = anchors[i].split('</a>')[0]
        const hrefMatch = chunk.match(/href="([^"]*smzdm\\.com\\/p\\/(\\d+)[^"]*)"/)
        const id = hrefMatch ? hrefMatch[2] : ''
        const titleMatch = chunk.match(/class="feed-hot-title">([\\s\\S]*?)<\\//)
        const title = titleMatch ? stripTags(decodeEntities(titleMatch[1])).replace(/\\s+/g, ' ').trim() : ''

        if (!id || !title || seen.has(id)) {
          continue
        }

        seen.add(id)

        result.push({
          id,
          title,
          url: \`https://www.smzdm.com/p/\${id}/\`,
          mobileUrl: \`https://www.smzdm.com/p/\${id}/\`,
        })
      }

      return result`,
    imports: ['decodeEntities', 'stripTags'],
  },
  yjwujian: {
    url: 'https://www.yjwujian.cn/news/',
    text: true,
    map: `// 一局游戏新闻列表：按 official/update/guide 三分类链接抓取，锚文本为「标题 [MM-DD]」格式
      const anchors = html.split(/<a\\s[^>]*href="[^"]*\\/news\\/(?:official|update|guide)\\/[^"]*"[^>]*>/).slice(1)
      const seen = new Set()
      const result = []

      for (let i = 0; i < anchors.length; i++) {
        const chunk = anchors[i].split('</a>')[0]
        const hrefMatch = chunk.match(/href="([^"]*)"/)
        const href = hrefMatch ? hrefMatch[1] : ''
        const text = stripTags(decodeEntities(chunk))
          .replace(/\\s+/g, ' ')
          .trim()
        const match = text.match(/^(.+?)\\s\\[(\\d{2}-\\d{2})\\]$/)

        if (!match || !href || seen.has(href)) {
          continue
        }

        seen.add(href)

        result.push({
          id: href,
          title: match[1].trim(),
          tip: match[2],
          url: href,
          mobileUrl: href,
        })
      }

      return result`,
    imports: ['decodeEntities', 'stripTags'],
  },
  eastmoney: {
    // req_trace 按缓存窗口取整，保证 Data Cache 的 URL 键稳定（EF 侧由 withCache 统一门控，
    // 取整只影响上游 URL 本身，保留该行为使缓存键语义与 Next 版一致）
    url: (cacheSeconds) =>
      `\`https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=&pageSize=50&req_trace=\${Math.floor(Date.now() / (${cacheSeconds} * 1000))}\``,
    map: `if (responseBody.code === '1' && Array.isArray(responseBody.data?.fastNewsList)) {
        return responseBody.data.fastNewsList.map((v) => ({
          id: v.code,
          title: (v.title || v.summary || '').replace(/<[^>]+>/g, '').trim(),
          tip: typeof v.showTime === 'string' ? v.showTime.slice(11, 16) : undefined,
          url: \`https://finance.eastmoney.com/a/\${v.code}.html\`,
          mobileUrl: \`https://finance.eastmoney.com/a/\${v.code}.html\`,
        }))
      }

      return []`,
  },
  genshin: {
    lib: 'getMiyousheAnnouncements',
    cacheKey: 'https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?gids=2',
    map: `getMiyousheAnnouncements(2, 'ys')`,
  },
  'github-trending': {
    url: 'https://github.com/trending',
    text: true,
    map: `// GitHub Trending：按 <article class="Box-row"> 解析，star 数紧凑格式化
      const formatStars = (count) => {
        if (count < 1000) return count.toString()

        if (count < 1_000_000) {
          return \`\${(count / 1000).toFixed(1).replace(/\\.0$/, '')}K\`
        }

        return \`\${(count / 1_000_000).toFixed(1).replace(/\\.0$/, '')}M\`
      }

      const articles = html.split('<article class="Box-row"').slice(1)

      return articles.map((article, index) => {
        const hrefMatch = article.match(/<h[23][^>]*>\\s*<a[^>]*href="([^"]+)"/)
        const relativeUrl = hrefMatch ? hrefMatch[1] : ''
        const descMatch = article.match(/<p class="my-1"[^>]*>([\\s\\S]*?)<\\/p>/)
        const starMatch = article.match(/aria-label='star'[\\s\\S]*?<\\/svg>\\s*([\\d,]+)/)
        const stars = starMatch ? Number.parseInt(starMatch[1].replace(/,/g, ''), 10) : 0

        return {
          id: relativeUrl || String(index),
          title: (relativeUrl || '').replace(/^\\//, ''),
          desc: descMatch ? stripTags(decodeEntities(descMatch[1])).trim() : '',
          tip: formatStars(stars),
          url: \`https://github.com\${relativeUrl}\`,
          mobileUrl: \`https://github.com\${relativeUrl}\`,
        }
      })`,
    imports: ['decodeEntities', 'stripTags'],
  },
  gp: {
    url: 'https://gp.qq.com/main.shtml',
    text: true,
    encoding: 'gbk',
    map: `// 和平精英官网新闻区：GBK 页面，按 <a href*="/gicp/news/"> 抓取并按文章 ID 去重
      const anchors = html.split(/<a\\s[^>]*href="[^"]*\\/gicp\\/news\\/[^"]*"[^>]*>/).slice(1)
      const seen = new Set()
      const result = []

      for (let i = 0; i < anchors.length; i++) {
        const chunk = anchors[i].split('</a>')[0]
        const hrefMatch = chunk.match(/href="([^"]*\\/gicp\\/news\\/[^"]*)"/)
        const href = hrefMatch ? hrefMatch[1] : ''
        const id = href.match(/\\/(\\d+)\\.html/)?.[1]
        const title = (
          chunk.match(/class="sec2-sub-text">([\\s\\S]*?)<\\//)?.[1] ||
          chunk.match(/class="sec2-info-body-text">([\\s\\S]*?)<\\//)?.[1] ||
          chunk.match(/title="([^"]*)"/)?.[1] ||
          ''
        )
          .replace(/\\s+/g, ' ')
          .trim()

        if (!id || !title || seen.has(id)) {
          continue
        }

        seen.add(id)

        const dateMatch = chunk.match(/class="sec2-info-time-text">([\\s\\S]*?)<\\//)
        const articleUrl = new URL(href, 'https://gp.qq.com/').toString()

        result.push({
          id,
          title,
          tip: dateMatch ? dateMatch[1].trim() : undefined,
          url: articleUrl,
          mobileUrl: articleUrl,
        })
      }

      return result`,
  },
  'hello-github': {
    url: 'https://api.hellogithub.com/v1/?sort_by=featured&page=1&rank_by=newest&tid=all',
    map: `if (responseBody.success) {
        return responseBody.data.map((v) => ({
          id: v.item_id,
          title: \`\${v.name}-\${v.title}\`,
          desc: v.summary,
          hot: v.clicks_total,
          url: \`https://hellogithub.com/repository/\${v.full_name}\`,
          mobileUrl: \`https://hellogithub.com/repository/\${v.full_name}\`,
        }))
      }

      return []`,
  },
  'history-today': {
    // 百度百科·历史上的今天：按东八区当日取 JSON（每日变一次键，天然按天缓存）
    dynamic: true,
    cacheKey: 'https://baike.baidu.com/cms/home/eventsOnHistory/today',
    map: `// en-CA 日期格式固定 YYYY-MM-DD，便于直接拆分
      const [, month, day] = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .format(new Date())
        .split('-')

      const responseBody = await fetchUpstreamJson(\`https://baike.baidu.com/cms/home/eventsOnHistory/\${month}.json\`)

      return responseBody[month][month + day].map((v, index) => ({
        id: index,
        title: v.title.replace(/<[^>]+>/g, ''),
        tip: v.year,
        url: v.link,
        mobileUrl: v.link,
      }))`,
  },
  huxiu: {
    url: 'https://moment-api.huxiu.com/web-v3/moment/feed?platform=www',
    headers: `{ 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.huxiu.com/moment/' }`,
    map: `if (responseBody.success) {
        return responseBody?.data?.moment_list?.datalist.map((v) => {
          const content = (v.content || '').replace(/<br\\s*\\/?>/gi, '\\n')
          const [titleLine, ...rest] = content
            .split('\\n')
            .map((s) => s.trim())
            .filter(Boolean)

          return {
            id: v.object_id,
            title: titleLine?.replace(/。$/, '') || '',
            desc: rest.join('\\n'),
            tip: v.format_time,
            url: \`https://www.huxiu.com/moment/\${v.object_id}.html\`,
            mobileUrl: \`https://m.huxiu.com/moment/\${v.object_id}.html\`,
          }
        })
      }

      return []`,
  },
  ifanr: {
    url: 'https://sso.ifanr.com/api/v5/wp/buzz/?limit=50&offset=0',
    map: `const data = responseBody?.objects

      if (!data) {
        return []
      }

      return data.map((v) => ({
        id: v.post_id,
        title: v.post_title,
        url: v.buzz_original_url || \`https://www.ifanr.com/\${v.post_id}\`,
        mobileUrl: v.buzz_original_url || \`https://www.ifanr.com/digest/\${v.post_id}\`,
      }))`,
  },
  ithome: null, // 手写
  jin10: {
    url: 'https://www.jin10.com/flash_newest.js',
    text: true,
    map: `// 上游返回 JS 文件 var newest = [...];，剥离后解析
      const list = JSON.parse(html.replace(/^var newest = /, '').replace(/;\\s*$/, ''))

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
            url: \`https://flash.jin10.com/detail/\${v.id}\`,
            mobileUrl: \`https://flash.jin10.com/detail/\${v.id}\`,
          }
        })`,
  },
  juejin: {
    url: 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot',
    map: `if (responseBody.err_msg === 'success') {
        return responseBody.data.map((v) => ({
          id: v.content.content_id,
          title: v.content.title,
          hot: v.content_counter.hot_rank,
          url: \`https://juejin.cn/post/\${v.content.content_id}\`,
          mobileUrl: \`https://juejin.cn/post/\${v.content.content_id}\`,
        }))
      }

      return []`,
  },
  kuaishou: {
    url: 'https://www.kuaishou.com/?isHome=1',
    text: true,
    map: `// 快手首页：window.__APOLLO_STATE__ 内嵌 Apollo 缓存
      const match = html.match(/window\\.__APOLLO_STATE__=([\\s\\S]*?);\\(function\\(\\)/)

      if (!match) {
        return []
      }

      const jsonObject = JSON.parse(match[1]).defaultClient
      const idPattern = /clientCacheKey=([A-Za-z0-9]+)/
      const allItems = jsonObject['visionHotRank({"page":"home","refreshSessionId":"","pageCount":1,"sessionId":""})']?.items
        || jsonObject['$ROOT_QUERY.visionHotRank({"page":"home"})'].items
      const result = []

      for (const v of allItems) {
        const info = jsonObject[v.id]
        const id = info?.poster?.match(idPattern)?.[1]

        // 上游偶发缺失条目数据或海报链接，跳过该条，避免一条脏数据打挂整个榜单
        if (!id) {
          continue
        }

        // 热度形如 "123.4万"，缺失时不输出 NaN
        result.push({
          id,
          title: info.name,
          hot: info.hotValue ? Number.parseFloat(info.hotValue) * 10000 : undefined,
          url: \`https://www.kuaishou.com/short-video/\${id}\`,
          mobileUrl: \`https://www.kuaishou.com/short-video/\${id}\`,
        })
      }

      return result`,
  },
  lol: {
    url: 'https://apps.game.qq.com/cmc/zmMcnTargetContentList?page=1&num=50&target=24&source=web_pc',
    map: `if (responseBody.status === 1) {
        return responseBody.data.result.map((v) => ({
          id: v.iDocID,
          title: v.sTitle,
          desc: v.sAuthor,
          pic: v.sIMG,
          hot: Number(v.iTotalPlay),
          url: \`https://lol.qq.com/news/detail.shtml?docid=\${encodeURIComponent(v.iDocID)}\`,
          mobileUrl: \`https://lol.qq.com/news/detail.shtml?docid=\${encodeURIComponent(v.iDocID)}\`,
        }))
      }

      return []`,
  },
  netease: {
    url: 'https://m.163.com/fe/api/hot/news/flow',
    map: `if (responseBody.msg === 'success') {
        return responseBody.data.list.map((v) => ({
          id: v.skipID,
          title: v.title,
          desc: v._keyword,
          pic: v.imgsrc,
          url: \`https://www.163.com/dy/article/\${v.skipID}.html\`,
          mobileUrl: v.url,
        }))
      }

      return []`,
  },
  'netease-music': {
    url: 'https://music.163.com/api/playlist/detail?id=3778678',
    headers: `{ authority: 'music.163.com', referer: 'https://music.163.com/' }`,
    map: `if (responseBody.code === 200) {
        return responseBody.result.tracks.map((v) => ({
          id: v.id,
          title: v.name,
          pic: v.album?.picUrl,
          tip: convertMillisecondsToTime(v.duration),
          url: \`https://music.163.com/#/song?id=\${v.id}\`,
          mobileUrl: \`https://music.163.com/m/song?id=\${v.id}\`,
        }))
      }

      return []`,
    imports: ['convertMillisecondsToTime'],
  },
  'qq-music': {
    url: 'https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid=26&format=json',
    headers: `{ referer: 'https://y.qq.com/' }`,
    map: `if (responseBody.code === 0 && Array.isArray(responseBody.songlist)) {
        return responseBody.songlist.map((v) => {
          const singers = (v.data.singer ?? []).map((s) => s.name).join('/')

          return {
            id: v.data.songid,
            title: \`\${v.data.songname} - \${singers}\`,
            pic: \`https://y.gtimg.cn/music/photo_new/T002R500x500M000\${v.data.albummid}.jpg\`,
            tip: convertMillisecondsToTime(v.data.interval * 1000),
            url: \`https://y.qq.com/n/ryqq/songDetail/\${v.data.songmid}\`,
            mobileUrl: \`https://y.qq.com/n/ryqq/songDetail/\${v.data.songmid}\`,
          }
        })
      }

      return []`,
    imports: ['convertMillisecondsToTime'],
  },
  qq: {
    url: 'https://r.inews.qq.com/gw/event/hot_ranking_list',
    map: `if (responseBody.ret === 0) {
        return responseBody.idlist[0].newslist.slice(1).map((v) => ({
          id: v.id,
          title: v.title,
          desc: v.abstract,
          pic: v.miniProShareImage,
          hot: v.readCount,
          url: \`https://new.qq.com/rain/a/\${v.id}\`,
          mobileUrl: \`https://view.inews.qq.com/a/\${v.id}\`,
        }))
      }

      return []`,
  },
  quark: {
    url: 'https://iflow.quark.cn/iflow/api/v1/article/aggregation?aggregation_id=16665090098771297825&count=50&bottom_pos=0',
    map: `if (responseBody.status === 0) {
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
            url: \`https://123.quark.cn/detail?item_id=\${v.id}\`,
            mobileUrl: \`https://123.quark.cn/detail?item_id=\${v.id}\`,
          }
        })
      }

      return []`,
  },
  'sina-news': {
    url: 'https://top.news.sina.com.cn/ws/GetTopDataList.php?top_type=day&top_cat=www_www_all_suda_suda&top_time=today&top_show_num=50',
    text: true,
    map: `// 非纯 JSON（前缀 var data = ），取首尾大括号之间的内容
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

      return []`,
  },
  sspai: {
    url: 'https://sspai.com/api/v1/article/hot/page/get?free=1&offset=0&limit=30',
    map: `if (responseBody.error === 0 && Array.isArray(responseBody.data)) {
        return responseBody.data.map((v) => ({
          id: v.id,
          title: v.title,
          desc: v.summary,
          pic: v.banner ? \`https://cdn.sspai.com/\${v.banner}\` : undefined,
          hot: v.like_count,
          url: \`https://sspai.com/post/\${v.id}\`,
          mobileUrl: \`https://sspai.com/post/\${v.id}\`,
        }))
      }

      return []`,
  },
  steam: {
    url: 'https://store.steampowered.com/api/featuredcategories/?cc=cn&l=schinese',
    map: `const items = responseBody?.top_sellers?.items

      if (Array.isArray(items)) {
        // 价格为分单位，换算为元展示
        return items.map((v) => ({
          id: v.id,
          title: v.name,
          url: v.url || \`https://store.steampowered.com/app/\${v.id}/\`,
          mobileUrl: v.url || \`https://store.steampowered.com/app/\${v.id}/\`,
          tip: v.final_price ? \`¥\${Math.round(v.final_price / 100)}\` : undefined,
        }))
      }

      return []`,
  },
  thepaper: {
    url: 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
    map: `if (responseBody.resultCode === 1) {
        return responseBody.data.hotNews.map((v) => ({
          id: v.contId,
          title: v.name,
          pic: v.pic,
          hot: v.praiseTimes,
          url: \`https://www.thepaper.cn/newsDetail_forward_\${v.contId}\`,
          mobileUrl: \`https://m.thepaper.cn/newsDetail_forward_\${v.contId}\`,
        }))
      }

      return []`,
  },
  toutiao: {
    url: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
    map: `if (responseBody.status === 'success') {
        return responseBody.data.map((v) => ({
          id: v.ClusterId,
          title: v.Title,
          pic: v.Image?.url,
          hot: v.HotValue,
          url: \`https://www.toutiao.com/trending/\${v.ClusterIdStr}/\`,
          mobileUrl: \`https://api.toutiaoapi.com/feoffline/amos_land/new/html/main/index.html?topic_id=\${v.ClusterIdStr}\`,
        }))
      }

      return []`,
  },
  wallstcn: {
    url: 'https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all',
    map: `if (responseBody.code === 20000 && Array.isArray(responseBody.data?.day_items)) {
        return responseBody.data.day_items.map((v) => ({
          id: v.id,
          title: v.title,
          hot: v.pageviews,
          url: v.uri || \`https://wallstreetcn.com/articles/\${v.id}\`,
          mobileUrl: v.uri || \`https://wallstreetcn.com/articles/\${v.id}\`,
        }))
      }

      return []`,
  },
  woshipm: {
    url: 'https://www.woshipm.com/api2/app/article/popular/daily',
    map: `if (responseBody.CODE === 200) {
        return responseBody.RESULT.map((v) => {
          const url = \`https://www.woshipm.com/\${v.data.type}/\${v.data.id}.html\`

          return {
            id: v.data.id,
            title: v.data.articleTitle,
            desc: v.data.articleSummary,
            hot: v.scores,
            pic: v.data.imageUrl,
            url,
            mobileUrl: url,
          }
        })
      }

      return []`,
  },
  zhihu: {
    url: 'https://api.zhihu.com/topstory/hot-list',
    map: `if (responseBody.data) {
        return responseBody.data.map((v) => {
          // detail_text 形如 "493万热度"，缺失时不换算，避免整条 hot 变成 NaN
          const hotDigits = v.detail_text?.replace(/\\D/g, '')

          return {
            id: v.id,
            title: v.target?.title,
            pic: v.children?.[0]?.thumbnail,
            hot: hotDigits ? Number.parseInt(hotDigits, 10) * 10000 : undefined,
            url: \`https://www.zhihu.com/question/\${v.card_id?.replace('Q_', '')}\`,
            mobileUrl: \`https://www.zhihu.com/question/\${v.card_id?.replace('Q_', '')}\`,
          }
        })
      }

      return []`,
  },
  'zhihu-daily': {
    url: 'https://daily.zhihu.com/api/4/news/latest',
    headers: `{ Referer: 'https://daily.zhihu.com/api/4/news/latest', Host: 'daily.zhihu.com' }`,
    map: `const data = responseBody?.stories

      if (!data) {
        return []
      }

      return data.map((v) => ({
        id: v.id,
        title: v.title,
        url: v.url,
        mobileUrl: v.url,
      }))`,
  },
  zzz: {
    lib: 'getMiyousheAnnouncements',
    cacheKey: 'https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?gids=8',
    map: `getMiyousheAnnouncements(8, 'zz')`,
  },
}

/** Next 目录名即 EF 文件名（全路由同名，无需显式映射） */
const FILE_NAME = {}

/* ================= 模板渲染 ================= */

function renderImports(config) {
  const names = new Set(['fetchUpstreamJson', 'handleHotList', 'sanitizeHotList', 'resolveCacheSeconds'])

  if (config.text) names.add('fetchUpstreamText')
  if (config.lib) names.add(config.lib)
  ;(config.imports ?? []).forEach((n) => names.add(n))

  // 扫描 map/prelude 文本里引用到的共享库导出名，缺漏的自动补齐
  // （此前 10jqka 的 formatCnMonthDay 就是这样漏掉的——映射文本引用了工具函数但忘了声明）
  const libExports = [
    'formatCnMonthDay',
    'convertMillisecondsToTime',
    'stripTags',
    'decodeEntities',
    'md5Hex',
    'sha1Hex',
    'getWereadID',
    'getMiyousheAnnouncements',
    'getCsdnHotRank',
  ]
  const scanText = `${config.map ?? ''}\n${config.prelude ?? ''}\n${config.body ?? ''}\n${config.headers ?? ''}`

  for (const name of libExports) {
    if (scanText.includes(name)) {
      names.add(name)
    }
  }

  return `import { ${[...names].sort().join(', ')} } from '../_lib.js'`
}

function renderLoader(config) {
  if (config.lib) {
    return `async () => sanitizeHotList(await ${config.map})`
  }

  if (config.parallel) {
    return `async () => sanitizeHotList(await (async () => {
${config.map}
    })())`
  }

  if (config.dynamic) {
    return `async () => sanitizeHotList(await (async () => {
${config.map}
    })())`
  }

  if (config.text) {
    const fetchOptions = [
      config.encoding ? `encoding: '${config.encoding}'` : '',
      config.noUA ? `headers: { 'User-Agent': '' }` : '',
    ]
      .filter(Boolean)
      .join(', ')

    return `async () => sanitizeHotList(await (async () => {
      const html = await fetchUpstreamText(url, { ${fetchOptions} })
${config.map}
    })())`
  }

  const fetchCall = [
    'await fetchUpstreamJson(url',
    config.headers || config.method || config.body ? ', {' : '',
    config.headers ? `headers: ${config.headers}` : '',
    config.method ? `${config.headers ? ', ' : ''}method: '${config.method}'` : '',
    config.body ? `${config.headers || config.method ? ', ' : ''}body: ${config.body}` : '',
    config.headers || config.method || config.body ? '}' : '',
    ')',
  ].join('')

  return `async () => {
      const responseBody = ${fetchCall}
${config.map}
    }`
}

function renderFile(config, routeName) {
  const hasUrl = Boolean(config.url)
  const urlExpr =
    typeof config.url === 'function'
      ? config.url('cacheSeconds')
      : `'${String(config.url ?? '').replace(/'/g, "\\'")}'`
  const needsUrlVar = !config.lib
  const cacheKeyExpr = config.cacheKey ? `'${config.cacheKey}'` : hasUrl ? (typeof config.url === 'function' ? 'url' : urlExpr) : "''"
  const lines = []

  lines.push(`/**`)
  lines.push(` * ${routeName} 热榜`)
  lines.push(` *`)
  lines.push(` * 路由映射：edge-functions/api/${routeName}.js → GET /api/${routeName}（前端 URL 不变）。`)
  lines.push(` * 行为与 Next 版路由一致：同一 IResponse 契约、同一数据映射、同一缓存窗口。`)
  lines.push(` * 从 src/app/api/${routeName}/route.ts 逐行搬运（请求/响应封装由 ../_lib.js 提供）。`)
  lines.push(` */`)
  lines.push(renderImports(config))
  lines.push('')

  if (config.prelude) {
    lines.push(config.prelude)
    lines.push('')
  }

  lines.push(`export async function onRequestGet(context) {`)
  lines.push(`  const cacheSeconds = resolveCacheSeconds(context.env)`)

  if (needsUrlVar) {
    lines.push(`  const url = ${urlExpr}`)
  }

  lines.push('')
  lines.push(`  return handleHotList(context, {`)
  lines.push(`    cacheKey: ${cacheKeyExpr},`)
  lines.push(`    loader:`)
  lines.push(renderLoader(config).split('\n').join('\n    '))
  lines.push(`  })`)
  lines.push(`}`)
  lines.push('')

  return lines.join('\n')
}

/* ================= 主流程 ================= */

const skipped = []
const generated = []
const deferred = []

for (const [routeName, config] of Object.entries(ROUTES)) {
  if (!config) {
    skipped.push(routeName)
    continue
  }

  // 第二批路由：跳过生成，Next 目录保留
  if (DEFERRED.has(routeName)) {
    deferred.push(routeName)
    continue
  }

  // resolveCacheSeconds 按需 import
  if (!renderImports(config).includes('resolveCacheSeconds')) {
    // 模板里统一需要它：补 import
  }

  let content = renderFile(config, routeName)

  const filePath = join(EF_DIR, `${FILE_NAME[routeName] ?? routeName}.js`)

  // 防呆：无 url 又无 cacheKey 且不是 lib/parallel/dynamic（URL 在 loader 内部构造）时拒绝生成
  if (!config.cacheKey && !config.url && !config.lib && !config.parallel && !config.dynamic) {
    throw new Error(`路由 ${routeName} 缺少 url/cacheKey，拒绝生成`)
  }

  // lib/parallel/dynamic 型（URL 在 loader 内部构造）必须显式给 cacheKey，否则缓存键为空
  if (!config.cacheKey && !config.url) {
    throw new Error(`路由 ${routeName} 需要显式 cacheKey`)
  }

  writeFileSync(filePath, content, 'utf8')
  generated.push(routeName)
}

// 删除已迁移路由的 Next API 目录；第二批路由（DEFERRED）与手写路由（HANDWRITTEN 已由 PoC 删除）不动
let removedDirs = 0

for (const routeName of Object.keys(ROUTES)) {
  if (DEFERRED.has(routeName) || HANDWRITTEN.includes(routeName)) {
    continue
  }

  const nextDir = join(API_DIR, routeName)

  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true })
    removedDirs++
  }
}

console.log(`生成 EF 路由 ${generated.length} 个：${generated.join(', ')}`)
console.log(`跳过（手写）：${skipped.join(', ')}`)
console.log(`第二批（保留 Next 版，待对拍）：${deferred.join(', ')}`)
console.log(`删除 Next 路由目录 ${removedDirs} 个`)
