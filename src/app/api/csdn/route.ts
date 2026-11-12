/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-01-21 09:20:44
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-11-12 14:20:00
 * @Description: CSDN - 热榜
 */
import type { HotListItem } from '@/types'

import { getCsdnHotRank } from '@/lib/csdn'
import { isManualRefresh } from '@/lib/request'
import { errorResponse, successResponse } from '@/lib/response'

export async function GET(request: Request) {
  try {
    // 请求数据（带 Referer 与退避重试，抵御 CSDN WAF 挑战）
    const result: HotListItem[] = await getCsdnHotRank(isManualRefresh(request))

    return successResponse(result)
  } catch (error) {
    console.error('上游请求失败：', error)

    return errorResponse()
  }
}
