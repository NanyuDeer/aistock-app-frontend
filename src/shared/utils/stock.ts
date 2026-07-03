/**
 * 股票数据格式化工具
 */

/** 格式化成交量（股 → 万股/亿股） */
export function formatVolume(vol: number): string {
  if (!vol) return '--'
  if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿股'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万股'
  return vol + '股'
}

/** 格式化金额（元 → 万/亿） */
export function formatAmount(amt: number): string {
  if (!amt) return '--'
  const abs = Math.abs(amt)
  if (abs >= 100000000) return (amt / 100000000).toFixed(2) + '亿'
  if (abs >= 10000) return (amt / 10000).toFixed(2) + '万'
  return amt.toFixed(2) + '元'
}

/** 格式化百分比 */
export function formatPct(val?: number | null): string {
  if (val === undefined || val === null) return '--'
  return Number(val).toFixed(2) + '%'
}

/** 带正负号的百分比 */
export function formatSignedPct(val?: number | null): string {
  if (val === undefined || val === null) return '--'
  const n = Number(val)
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

/** 根据涨跌幅返回 CSS 类名 */
export function changeClass(val?: number | null): string {
  if (val === undefined || val === null) return ''
  return val >= 0 ? 'up' : 'down'
}
