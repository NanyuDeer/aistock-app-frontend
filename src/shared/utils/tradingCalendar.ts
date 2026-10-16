/**
 * 交易日历缓存（前端只读副本）
 *
 * 项目约定：交易日判定的唯一事实源是后端 `trading_calendar` 表（Tushare trade_cal 刷新），
 * 前端不得自建节假日表。本模块只保存后端下发的一份「最近 N 个交易日」窗口，
 * 供 `tradingTime.isTradingDay` 同步查询；数据未加载或超出窗口时返回 null，
 * 由调用方降级回退到「周一~周五」判定（与后端降级策略一致，绝不静默假成功）。
 *
 * ⚠️ 本文件刻意不 import 任何模块（拉取动作在 App.vue 触发），
 * 避免 tradingTime → tradingCalendar → agentApi → store → tradingTime 的循环依赖。
 */

let tradingDays: Set<string> | null = null
/** 窗口下界（取后端返回的最早交易日）；早于此日期的查询一律降级 */
let windowStart = ''
/** 窗口上界（= 拉取时使用的「今天」，含）；晚于此日期的查询一律降级 */
let windowEnd = ''

/** 写入后端返回的交易日窗口；endDate = 请求时使用的「今天」（窗口上界，含）。 */
export function setTradingCalendar(days: string[], endDate: string): void {
  if (!Array.isArray(days) || days.length === 0 || !endDate) return
  const sorted = days.filter((d): d is string => typeof d === 'string' && d.length > 0).sort()
  if (sorted.length === 0) return
  tradingDays = new Set(sorted)
  windowStart = sorted[0]
  windowEnd = endDate
}

/** 清空缓存（登出/调试用）。 */
export function resetTradingCalendar(): void {
  tradingDays = null
  windowStart = ''
  windowEnd = ''
}

/** 缓存是否已加载（用于判断是否需要拉取）。 */
export function hasTradingCalendar(): boolean {
  return tradingDays !== null
}

/** 缓存对应的窗口上界（日期串）；未加载返回空串。 */
export function tradingCalendarWindowEnd(): string {
  return windowEnd
}

/**
 * 查询某日是否为交易日。
 * @returns true/false = 后端日历给出的确定答案；null = 未加载或超出窗口，调用方需降级到周末判定。
 */
export function checkTradingDay(date: string): boolean | null {
  if (!tradingDays) return null
  if (date < windowStart || date > windowEnd) return null
  return tradingDays.has(date)
}
