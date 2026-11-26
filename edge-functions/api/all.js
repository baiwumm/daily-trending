/**
 * 聚合端点：edge-functions/api/all.js → GET /api/all
 *
 * 一次请求返回全部已缓存榜单的合并数据，供前端聚合加载（自动加载从每会话 ~10 个
 * 单源请求降为 1 个聚合请求）。设计要点：
 *
 * - 只读 KV：单源路由的 withCache 在被访问时已把 { ts, data } 写入 KV（键 = 上游 URL），
 *   本端点批量读取并过滤新鲜（ts 在服务端窗口内），**不回源任何上游**——
 *   单次执行 = 47 次 KV 读 + 字符串拼接
 * - 零解析透传：KV 值本身是完整 JSON，直接作为响应的拼接片段（ts 用正则提取判新鲜，
 *   不做整包 JSON.parse）——命中路径 CPU 降到 ~1ms 级
 * - 过期/缺失的源不出现在响应里：客户端按既有逻辑回退到单源请求（会顺带填充 KV）
 * - KV 未绑定（hot_kv 未注入）或读取异常：返回空 data，客户端自动回退单源路径
 */

/** 榜单 value → KV 缓存键（= 各自 loader 的上游 URL，与 hotItemsConfig 的 value 一一对应） */
const CACHE_KEYS = {
  '10jqka': 'https://news.10jqka.com.cn/tapp/news/push/stock/?page=1&pagesize=50',
  '36kr': 'https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot',
  acfun: 'https://www.acfun.cn/rest/pc-direct/rank/channel?channelId=1&subchannelId=1&rankLimit=30&rankPeriod=DAY',
  arknights: 'https://ak.hypergryph.com/api/news',
  baidu: 'https://top.baidu.com/api/board?platform=wise&tab=realtime',
  baidutieba: 'https://tieba.baidu.com/hottopic/browse/topicList',
  bilibili: 'https://api.bilibili.com/x/web-interface/ranking/v2',
  cls: 'https://www.cls.cn/v2/article/hot/list',
  csdn: 'https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=100',
  'douban-book': 'https://m.douban.com/rexxar/api/v2/subject_collection/book',
  'douban-movie': 'https://movie.douban.com/chart/',
  dongchedi: 'https://www.dongchedi.com/',
  douyin: 'https://aweme.snssdk.com/aweme/v1/hot/search/list/',
  genshin: 'https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?gids=2',
  'github-trending': 'https://github.com/trending',
  gp: 'https://gp.qq.com/main.shtml',
  'hello-github': 'https://api.hellogithub.com/v1/?sort_by=featured&page=1&rank_by=newest&tid=all',
  hupu: 'https://bbs.hupu.com/all-gambia',
  huxiu: 'https://moment-api.huxiu.com/web-v3/moment/feed?platform=www',
  ifanr: 'https://sso.ifanr.com/api/v5/wp/buzz/?limit=50&offset=0',
  ithome: 'https://m.ithome.com/rankm',
  jin10: 'https://www.jin10.com/flash_newest.js',
  jjwxc: 'https://www.jjwxc.net/topten.php?orderstr=7',
  juejin: 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot',
  kuaishou: 'https://www.kuaishou.com/?isHome=1',
  lol: 'https://apps.game.qq.com/cmc/zmMcnTargetContentList?page=1&num=50&target=24&source=web_pc',
  netease: 'https://m.163.com/fe/api/hot/news/flow',
  'netease-music': 'https://music.163.com/api/playlist/detail?id=3778678',
  qq: 'https://r.inews.qq.com/gw/event/hot_ranking_list',
  'qq-music': 'https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid=26&format=json',
  quark: 'https://iflow.quark.cn/iflow/api/v1/article/aggregation?aggregation_id=16665090098771297825&count=50&bottom_pos=0',
  'sina-news':
    'https://top.news.sina.com.cn/ws/GetTopDataList.php?top_type=day&top_cat=www_www_all_suda_suda&top_time=today&top_show_num=50',
  smzdm: 'https://www.smzdm.com/top/',
  sspai: 'https://sspai.com/api/v1/article/hot/page/get?free=1&offset=0&limit=30',
  steam: 'https://store.steampowered.com/api/featuredcategories/?cc=cn&l=schinese',
  thepaper: 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
  toutiao: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
  wallstcn: 'https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all',
  weibo: 'https://weibo.com/ajax/side/hotSearch',
  weread: 'https://weread.qq.com/web/bookListInCategory/rising?rank=1',
  woshipm: 'https://www.woshipm.com/api2/app/article/popular/daily',
  yjwujian: 'https://www.yjwujian.cn/news/',
  zhihu: 'https://api.zhihu.com/topstory/hot-list',
  'zhihu-daily': 'https://daily.zhihu.com/api/4/news/latest',
  zzz: 'https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?gids=8',
  // eastmoney / history-today 的键含动态段（req_trace / 当月月份），此处为哨兵条目——
  // dynamicCacheKey() 对这两个 value 返回按公式现算的完整键；静态表只提供遍历清单
  eastmoney: 'https://np-listapi.eastmoney.com/comm/web/getFastNewsList',
  'history-today': 'https://baike.baidu.com/cms/home/eventsOnHistory',
}

/** 动态缓存键：与对应 loader 的 URL 公式保持一致 */
function dynamicCacheKey(value) {
  if (value === 'eastmoney') {
    // req_trace 按缓存窗口取整（窗口取代码默认 1800，与 loader 一致）
    const reqTrace = Math.floor(Date.now() / (1800 * 1000))

    return `https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=&pageSize=50&req_trace=${reqTrace}`
  }

  if (value === 'history-today') {
    // 按东八区当日取数（en-CA 格式固定 YYYY-MM-DD，便于拆分）
    const [, month, day] = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date())
      .split('-')

    return `https://baike.baidu.com/cms/home/eventsOnHistory/${month}.json`
  }

  return CACHE_KEYS[value]
}

/** 缓存窗口：代码默认 1800 与仓库 .env 一致（本端点无 env 覆盖需求，保持公式简单） */
const AGG_WINDOW_MS = 1800 * 1000

/**
 * 爬虫早退（与 _lib.js 的 BOT_UA_RE 同一份特征表）：/api/all 是 47 源合并的
 * 大响应端点，爬虫高频抓取单次 CPU 成本最高，必须在入口早退
 */
const BOT_UA_RE =
  /(?:bot|spider|crawl|slurp|bytespider|petalbot|yisou|datespider|okhttp|python-requests|python-urllib|aiohttp|httpx|go-http-client|java\/|curl\/|wget|axios|scrapy|headlesschrome|lighthouse|pagespeed|gptbot|claudebot|anthropic-ai|perplexitybot|oai-searchbot|meta-externalagent|meta-webindexer|dataforseo|ahrefs|semrush|mj12bot|dotbot|megaindex|seostar|serpstat|buzzsumo|feedly|rss|feedfetcher|arkwright|checkmarknetwork|serpcluster|nanobot|zpider|survey|monitor|scanner|fuzz|nuclei|masscan|zmap|dirbuster|nmap|sqlmap|nikto|acunetix|netsparker|qualys)/i

/** 无 UA 也视为脚本（浏览器必带 UA） */
const UA_EMPTY = ''

export async function onRequestGet(req) {
  const ua = req.headers.get('user-agent') ?? ''

  // 爬虫早退：在任何 KV 读取之前（单次 ~0.1ms，对比正常聚合执行 ~10-25ms）
  if (ua === UA_EMPTY || BOT_UA_RE.test(ua)) {
    return new Response(JSON.stringify({ msg: '请求过于频繁', code: 429, timestamp: Date.now() }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  // KV 是命名空间绑定的全局变量；未绑定/异常时返回空 data，客户端自动回退单源路径
  if (typeof hot_kv === 'undefined' || !hot_kv) {
    return new Response(JSON.stringify({ msg: '请求成功', code: 200, data: {}, timestamp: Date.now() }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60',
        'X-Aggregate': 'kv-unbound',
      },
    })
  }

  const now = Date.now()
  const values = Object.keys(CACHE_KEYS)
  const pieces = []
  let freshCount = 0

  // 分批并行读 KV（每批 12 个，避免瞬时并发过高）
  for (let i = 0; i < values.length; i += 12) {
    await Promise.all(
      values.slice(i, i + 12).map(async (value) => {
        try {
          const key = dynamicCacheKey(value)
          const packed = await hot_kv.get(key)

          if (!packed) return

          // 只提取 ts 判新鲜（避免整包 JSON.parse——命中路径的 CPU 优化核心）
          const tsMatch = packed.match(/"ts":(\d+)/)
          const ts = tsMatch ? Number(tsMatch[1]) : 0

          if (!ts || now - ts >= AGG_WINDOW_MS) return
          // 空数据条目（"data":[]）跳过：withCache 不写空，此处防御 hot_kv 里的历史脏数据
          if (packed.includes('"data":[]')) return

          freshCount++
          pieces.push(`"${value}":${packed}`)
        } catch {
          // 单源读取失败（键损坏/暂时不可用）不影响其余源
        }
      }),
    )
  }

  // 零解析拼接：各源的 KV 原始 JSON 直接作为 data 的字段值复用
  const body = `{"msg":"请求成功","code":200,"data":{${pieces.join(',')}},"timestamp":${now}}`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=60`,
      'X-Aggregate': `${freshCount}/${values.length}`,
    },
  })
}
