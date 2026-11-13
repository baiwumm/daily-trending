/**
 * @description: 请求状态与缓存窗口（纯常量，无 JSX 依赖，供服务端 API routes 与客户端共用）
 */

/**
 * 解析服务端缓存窗口（秒）：
 * - 默认 300s（5 分钟）
 * - 支持环境变量 NEXT_PUBLIC_HOT_CACHE_SECONDS 覆盖
 * - 范围限制 60~3600s：越界收敛到边界值，非法值回退默认值
 */
function resolveCacheSeconds(): number {
  const DEFAULT_SECONDS = 300
  const MIN_SECONDS = 60
  const MAX_SECONDS = 3600

  const raw = process.env.NEXT_PUBLIC_HOT_CACHE_SECONDS

  if (!raw) return DEFAULT_SECONDS

  const value = Number.parseInt(raw, 10)

  if (Number.isNaN(value)) return DEFAULT_SECONDS

  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, value))
}

/**
 * 服务端缓存窗口（秒）：CDN 边缘 s-maxage 与 Next Data Cache revalidate 共用
 * 默认 5 分钟，可用 NEXT_PUBLIC_HOT_CACHE_SECONDS 覆盖（范围 60~3600）
 *
 * 该窗口决定「榜单数据多久自动更新一次」，直接决定上游请求量与边缘函数调用量，
 * 是配额消耗的主要杠杆：只有 CDN 层的 s-maxage 能省下边缘函数调用，
 * Next 的 revalidate 只省上游请求。
 */
export const API_CACHE_SECONDS = resolveCacheSeconds()

/**
 * 客户端刷新冷却（秒）：手动刷新按钮的节流窗口，与服务端缓存窗口解耦
 *
 * 两者目标不同：服务端窗口为省上游请求与边缘额度（可放大到 30 分钟），
 * 冷却只为防用户连点（保持 5 分钟）。手动强刷走 ?t= 参数绕过全部缓存层，
 * 始终能拿到最新数据，因此放大服务端窗口不会削弱刷新能力。
 */
export const CLIENT_COOLDOWN_SECONDS = 300

const responseConfig = {
  SUCCESS: { value: 200, label: '请求成功' },
  ERROR: { value: 500, label: '请求失败' },
} as const

/** 请求状态码类型 */
export type ResponseValue = (typeof responseConfig)[keyof typeof responseConfig]['value']

export const RESPONSE = {
  SUCCESS: responseConfig.SUCCESS.value,
  ERROR: responseConfig.ERROR.value,
  /** 根据状态码获取文案 */
  label: (value: ResponseValue) =>
    value === responseConfig.SUCCESS.value ? responseConfig.SUCCESS.label : responseConfig.ERROR.label,
}
