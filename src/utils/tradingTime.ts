/**
 * 交易时间相关工具
 */

/** 判断当前是否为交易日（周末非交易日） */
export function isTradingDay(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/**
 * 判断当前是否在 A 股交易时段内
 * 上午：09:30 - 11:30
 * 下午：13:00 - 15:00
 */
export function isTradingTime(date: Date = new Date()): boolean {
  if (!isTradingDay(date)) return false
  const h = date.getHours()
  const m = date.getMinutes()
  const minutes = h * 60 + m
  const morningStart = 9 * 60 + 30
  const morningEnd = 11 * 60 + 30
  const afternoonStart = 13 * 60
  const afternoonEnd = 15 * 60
  return (
    (minutes >= morningStart && minutes <= morningEnd) ||
    (minutes >= afternoonStart && minutes <= afternoonEnd)
  )
}

/** 判断当前是否在集合竞价时段（09:15 - 09:25） */
export function isCallAuction(date: Date = new Date()): boolean {
  if (!isTradingDay(date)) return false
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes >= 9 * 60 + 15 && minutes <= 9 * 60 + 25
}

/** 获取交易状态文案 */
export function getMarketStatus(date: Date = new Date()): string {
  if (!isTradingDay(date)) return '休市'
  if (isTradingTime(date)) return '交易中'
  if (isCallAuction(date)) return '集合竞价'
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes < 9 * 60 + 15) return '未开盘'
  if (minutes > 15 * 60) return '已收盘'
  return '午间休市'
}

/**
 * 计算下次开盘时间（毫秒时间戳）
 * 仅交易日判断，不含节假日
 */
export function nextOpenTime(date: Date = new Date()): number {
  const d = new Date(date)
  // 当天下午开盘前
  if (isTradingDay(d)) {
    const minutes = d.getHours() * 60 + d.getMinutes()
    if (minutes < 9 * 60 + 30) {
      d.setHours(9, 30, 0, 0)
      return d.getTime()
    }
    if (minutes < 13 * 60) {
      d.setHours(13, 0, 0, 0)
      return d.getTime()
    }
  }
  // 找下一个交易日
  let next = new Date(d)
  next.setDate(next.getDate() + 1)
  while (!isTradingDay(next)) {
    next.setDate(next.getDate() + 1)
  }
  next.setHours(9, 30, 0, 0)
  return next.getTime()
}
