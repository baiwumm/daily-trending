/**
 * @Description: CSDN 热榜抓取：反爬请求头 + WAF 挑战退避重试
 *
 * CSDN 的 hot-rank 接口未失效（响应字段也未变化），失败原因是 WAF 风控。
 * 在 GitHub Actions runner 上的对照实测（单变量、8 组）：
 * - 带 Chrome 桌面 UA → 521 挑战页；换 iPhone UA / 裸 Mozilla/5.0 / 空 UA → 稳定 200。
 *   即桌面 Chrome UA 本身被 WAF 判为爬虫特征，故此处不用项目默认的 UA_CHROME。
 * - 缺少 Referer 同样会被拦，故 Referer 必须带。
 *
 * 挑战页在持续高频请求后会升级为 TLS 握手层拦截（连接可建立但握手被重置），
 * 此时任何请求头都无效，只能退避等待风控窗口过去。
 */
import type { HotListItem } from '@/types'

import { fetchJson } from '@/lib/request'

/** 官方热榜接口 */
const HOT_RANK_URL = 'https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=100'

/**
 * 反爬请求头
 *
 * UA 刻意不用项目默认的 UA_CHROME（桌面 Chrome）：实测带该 UA 会被 WAF 直接判为爬虫并返 521，
 * 换移动端 UA 即可正常取数。
 */
const CSDN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1',
  Referer: 'https://blog.csdn.net/',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

/** WAF 挑战状态码：返回 JS 挑战页而非业务数据 */
const CHALLENGE_STATUS = 521

/** 失败重试次数（总尝试次数 = 重试次数 + 1） */
const MAX_ATTEMPTS = 3

/** 重试基础间隔（ms）：指数退避 5s → 10s，给 WAF 足够的冷却窗口 */
const RETRY_BASE_DELAY = 5_000

interface CsdnHotRankItem {
  articleTitle?: string
  articleDetailUrl?: string
  pcHotRankScore?: string
}

interface CsdnHotRankResponse {
  code?: number
  data?: CsdnHotRankItem[]
}

/** 等待指定毫秒 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 判断错误是否为 WAF 挑战：fetchJson 对非 2xx 抛出的错误信息含状态码
 */
const isChallengeError = (error: unknown) => error instanceof Error && error.message.includes(String(CHALLENGE_STATUS))

/**
 * 拉取 CSDN 热榜，遇 WAF 挑战时退避重试
 * @param refresh 手动刷新时绕过服务端数据缓存
 */
export async function getCsdnHotRank(refresh = false): Promise<HotListItem[]> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const responseBody = await fetchJson<CsdnHotRankResponse>(HOT_RANK_URL, {
        refresh,
        headers: CSDN_HEADERS,
      })

      if (responseBody.code === 200 && Array.isArray(responseBody.data)) {
        return responseBody.data.map((v) => ({
          id: v.articleDetailUrl ?? '',
          title: v.articleTitle ?? '',
          tip: v.pcHotRankScore,
          url: v.articleDetailUrl ?? '',
          mobileUrl: v.articleDetailUrl ?? '',
        }))
      }

      return []
    } catch (error) {
      lastError = error

      // 仅 WAF 挑战值得重试：换其他错误重试只会持续撞墙并放大请求量
      if (!isChallengeError(error) || attempt === MAX_ATTEMPTS - 1) {
        throw error
      }

      await wait(RETRY_BASE_DELAY * 2 ** attempt)
    }
  }

  throw lastError
}
