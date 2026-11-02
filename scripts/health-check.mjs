/**
 * @description: 上游源健康巡检（GitHub Actions 定时任务调用）
 * 对本机构建启动的生产服务逐个请求全部榜单 API，判定「HTTP 200 + code=200 + data 非空数组」为健康；
 * 结果写入 GitHub Step Summary，并在 Actions 环境中自动开/更新跟踪 issue，全部恢复后自动关闭。
 * 巡检走本地回源而非线上域名：线上多层缓存（CDN 边缘 / Next Data Cache）命中会返回旧数据，掩盖上游真实故障。
 * 分批限流 + 失败重试：runner 出口是共享数据中心 IP，30 路并发突发会触发快手/网易等上游风控，
 * 产生随机误报（失败集合逐次漂移）；失败响应 no-store 不落缓存，重试是真实回源。
 * 无论巡检结果如何都以 0 退出——异常信号由 issue 与 Summary 承载，避免每次失败都产生红色运行记录。
 */
/* eslint-disable no-console -- CLI 工具脚本，输出即功能 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const TIMEOUT_MS = 20_000
const CONCURRENCY = 5
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 3_000
const ISSUE_LABEL = 'upstream-health'
const ISSUE_TITLE = '上游源异常（自动巡检跟踪）'
const inActions = Boolean(process.env.GITHUB_REPOSITORY && process.env.GITHUB_TOKEN)

/** 详情文本截断并转义表格竖线，避免撑破 Markdown 表格 */
const truncate = (text) => String(text ?? '').replace(/\|/g, '\\|').slice(0, 80) || '无'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const checkPlatform = async (platform) => {
  const startedAt = Date.now()

  try {
    const response = await fetch(`${BASE_URL}/api/${platform}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    const payload = await response.json().catch(() => ({}))
    const data = Array.isArray(payload.data) ? payload.data : []
    const ok = response.status === 200 && payload.code === 200 && data.length > 0

    return {
      platform,
      ok,
      detail: ok ? '' : `HTTP ${response.status} / code ${payload.code ?? '-'} / ${data.length} 条 / ${truncate(payload.msg)}`,
      durationMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      platform,
      ok: false,
      detail: `请求异常 / ${truncate(error?.cause?.message ?? error.message)}`,
      durationMs: Date.now() - startedAt,
    }
  }
}

/** 失败重试：仅对未通过的重试，间隔 RETRY_DELAY_MS，失败响应不落缓存所以重试是真实回源 */
const checkWithRetry = async (platform) => {
  let result

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = await checkPlatform(platform)

    if (result.ok) break
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS)
  }

  return result
}

/** 分批限流执行，替代全量 Promise.all 并发突发 */
const runBatches = async (items, worker) => {
  const results = []

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    results.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(worker))))
  }

  return results
}

const platforms = readdirSync(join(process.cwd(), 'src', 'app', 'api')).sort()
const results = await runBatches(platforms, checkWithRetry)
const failures = results.filter((result) => !result.ok)

const table = (list) =>
  [
    '| 平台 | 详情 | 耗时 |',
    '| --- | --- | --- |',
    ...list.map((result) => `| ${result.platform} | ${result.detail} | ${(result.durationMs / 1000).toFixed(1)}s |`),
  ].join('\n')

if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = failures.length
    ? `## ⚠️ 上游巡检：${failures.length}/${results.length} 个源异常\n\n${table(failures)}\n`
    : `## ✅ 上游巡检：全部 ${results.length} 个源正常\n`

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
}

/** Actions 环境下维护跟踪 issue：异常时创建/更新，恢复时关闭；本地运行跳过 */
const manageIssue = () => {
  const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' }).trim()

  try {
    gh(['label', 'create', ISSUE_LABEL, '--color', 'D93F0B', '--description', '上游源自动巡检'])
  } catch {
    // 标签已存在
  }

  let openNumber = null

  try {
    openNumber = JSON.parse(gh(['issue', 'list', '--label', ISSUE_LABEL, '--state', 'open', '--json', 'number']))[0]?.number ?? null
  } catch {
    return console.warn('查询跟踪 issue 失败，跳过 issue 维护')
  }

  const runLink = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  const stamp = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`

  if (failures.length) {
    const body = [
      `自动巡检发现 **${failures.length}/${results.length}** 个上游源异常。`,
      '',
      `> 最近检查：${stamp}（[运行日志](${runLink})）`,
      '',
      table(failures),
      '',
      '> 本 issue 由 Upstream Health Check workflow 自动维护：异常时更新本正文，全部恢复后自动关闭。',
    ].join('\n')

    if (openNumber) {
      gh(['issue', 'edit', String(openNumber), '--body', body])
      console.log(`已更新跟踪 issue #${openNumber}`)
    } else {
      const issueUrl = gh(['issue', 'create', '--label', ISSUE_LABEL, '--title', ISSUE_TITLE, '--body', body])
      console.log(`已创建跟踪 issue：${issueUrl}`)
    }

    return
  }

  if (openNumber) {
    gh(['issue', 'close', String(openNumber), '--comment', `全部 ${results.length} 个源已恢复正常（${stamp}）。`])
    console.log(`已关闭跟踪 issue #${openNumber}`)
  }
}

if (inActions) manageIssue()

console.log(`巡检完成：${results.length - failures.length}/${results.length} 正常`)

for (const failure of failures) {
  console.log(`  ✖ ${failure.platform}：${failure.detail}`)
}
