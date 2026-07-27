/**
 * 交易时间相关工具
 */

/**
 * 获取上海自然日的 YYYY-MM-DD 字符串。
 *
 * 播报/Brief 页面未传日期时必须使用上海交易日，不能使用
 * `new Date().toISOString().split('T')[0]`：toISOString 始终返回 UTC 日期，
 * 凌晨 0:00-8:00（上海时间）期间 UTC 仍是前一天，会取到错误的播报。
 *
 * 本函数显式取 UTC+8（Asia/Shanghai 无夏令时），不依赖设备本地时区，
 * 确保任何环境下都返回上海自然日。
 */
export interface ShanghaiDateTimeParts {
  year: number
  month: number
  day: number
  weekday: number
  hour: number
  minute: number
}

/** 以固定 UTC+8 读取上海自然日和钟表时间，不依赖设备时区。 */
export function shanghaiDateTimeParts(date: Date = new Date()): ShanghaiDateTimeParts {
  const shanghai = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return {
    year: shanghai.getUTCFullYear(),
    month: shanghai.getUTCMonth() + 1,
    day: shanghai.getUTCDate(),
    weekday: shanghai.getUTCDay(),
    hour: shanghai.getUTCHours(),
    minute: shanghai.getUTCMinutes(),
  }
}

export function shanghaiDateString(date: Date = new Date()): string {
  const { year, month, day } = shanghaiDateTimeParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 对 YYYY-MM-DD 纯日历日期加减，不经过设备本地时区。 */
export function addCalendarDays(dateString: string, delta: number): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + delta)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/** 判断当前是否为交易日（周末非交易日） */
export function isTradingDay(date: Date = new Date()): boolean {
  const { weekday } = shanghaiDateTimeParts(date)
  return weekday !== 0 && weekday !== 6
}

/**
 * 判断当前是否在 A 股交易时段内
 * 上午：09:30 - 11:30
 * 下午：13:00 - 15:00
 */
export function isTradingTime(date: Date = new Date()): boolean {
  if (!isTradingDay(date)) return false
  const { hour, minute } = shanghaiDateTimeParts(date)
  const minutes = hour * 60 + minute
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
  const { hour, minute } = shanghaiDateTimeParts(date)
  const minutes = hour * 60 + minute
  return minutes >= 9 * 60 + 15 && minutes <= 9 * 60 + 25
}

/** 获取交易状态文案 */
export function getMarketStatus(date: Date = new Date()): string {
  if (!isTradingDay(date)) return '休市'
  if (isTradingTime(date)) return '交易中'
  if (isCallAuction(date)) return '集合竞价'
  const { hour, minute } = shanghaiDateTimeParts(date)
  const minutes = hour * 60 + minute
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
