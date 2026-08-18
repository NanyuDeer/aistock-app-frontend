// src/shared/utils/traceDate.ts
import { addCalendarDays } from './tradingTime'

/**
 * 溯源报告候选日期：从 today 起，依次取今天、前1日、…前 maxFallbackDays 日。
 * 用于"市场洞见回退显示最近已完成交易日报告"。逐日回退，规避未实现的
 * 后端交易日历端点（/agent/trading-calendar/* 当前无路由）。
 */
export function traceDateCandidates(today: string, maxFallbackDays = 3): string[] {
  const size = Math.max(0, Math.floor(maxFallbackDays))
  const dates: string[] = []
  for (let i = 0; i <= size; i++) {
    dates.push(addCalendarDays(today, -i))
  }
  return dates
}