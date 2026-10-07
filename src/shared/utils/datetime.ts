/**
 * 日期时间工具函数
 */

/** 格式化时间，同一天只显示 HH:mm，否则显示 MM-DD HH:mm */
export function formatTime(t?: string | Date): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) {
    // 兼容无法解析的字符串
    return typeof t === 'string' ? t.replace('T', ' ').slice(0, 16) : ''
  }
  const now = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `${hh}:${mm}`
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(t?: string | Date): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${dd}`
}

/** 格式化日期时间为 YYYY-MM-DD HH:mm（设备本地时区）。 */
export function formatDateTime(t?: string | Date): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${dd} ${hh}:${mm}`
}

/** 格式化 UTC 时间戳为固定 UTC+8 的 YYYY-MM-DD HH:mm。 */
export function formatShanghaiDateTime(t?: string | Date): string {
  if (!t) return ''
  const date = new Date(t)
  if (isNaN(date.getTime())) return ''

  const shanghai = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const y = shanghai.getUTCFullYear()
  const mo = String(shanghai.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(shanghai.getUTCDate()).padStart(2, '0')
  const hh = String(shanghai.getUTCHours()).padStart(2, '0')
  const mm = String(shanghai.getUTCMinutes()).padStart(2, '0')
  return `${y}-${mo}-${dd} ${hh}:${mm}`
}

/**
 * 取「当前时刻的上海日期」往前 `days` 个自然日的 `YYYY-MM-DD`。
 * 中国无夏令时，按 **UTC+8 固定偏移**计算（等价 insightCards.ts::shanghaiDayKey 的既有写法），
 * **不依赖运行环境的本地时区**：先对 `Date.now()` 加 8h 后用 UTC getter 取上海年月日，
 * 再以「上海日期的 UTC 午夜」为基准减 `days * 24h`（无夏令时 ⇒ 每 24h 恰为一个自然日，
 * 跨月/跨年由 Date 内部处理）。供「最近两周洞察/异动」下界 `since = shanghaiDateKeyDaysAgo(13)` 使用。
 */
export function shanghaiDateKeyDaysAgo(days: number): string {
  const shanghaiNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const y = shanghaiNow.getUTCFullYear()
  const mo = shanghaiNow.getUTCMonth()
  const d = shanghaiNow.getUTCDate()
  // 用「上海日期的 UTC 午夜」做基准减 days 天，可纯按 UTC getter 输出、与运行环境时区无关
  const target = new Date(Date.UTC(y, mo, d) - days * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000)
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`
}

/**
 * 格式化"伪UTC上海时钟"时间字符串。
 * 后端部分字段（如 earnings_forecast.update_time）由 formatToChinaTimeWithMs 生成上海时钟，
 * 但以 UTC 标记存入数据库，导致前端拿到形如 `2026-07-25T00:00:14.176Z` 的字符串——
 * 其中的数字本身就是上海时间，不能用 new Date() 再做时区转换（否则会再偏 8 小时）。
 * 本函数直接取字符串前 16 位，输出 `YYYY-MM-DD HH:mm`。
 */
export function formatShanghaiClock(t?: string): string {
  if (!t || t === '--') return '--'
  const s = String(t).replace('T', ' ')
  return s.slice(0, 16)
}

/** 获取相对时间描述（刚刚 / x分钟前 / x小时前 / x天前） */
export function formatRelative(t?: string | Date): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}天前`
  return formatDate(t)
}
