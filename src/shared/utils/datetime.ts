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
