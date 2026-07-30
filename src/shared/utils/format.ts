/**
 * 通用格式化工具函数
 * 提取自多个图表组件的重复实现，统一维护
 */

/**
 * 紧凑数字格式化：大数取整，小数保留有效位
 * - |v| >= 10: 取整
 * - |v| >= 1: 保留2位小数，去尾零
 * - |v| < 1: 保留2位小数，去尾零
 */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '--'
  const abs = Math.abs(value)
  if (abs >= 10) return value.toFixed(0)
  return value.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * 判断指标值是否为无效占位值（0、空、NaN 等）
 * 用于清洗后端返回的无意义默认值
 */
export function isInvalidValue(val: unknown): boolean {
  if (val == null) return true
  const str = String(val).trim()
  return str === '' || str === '-' || str === '0' || str === '0.0' || str === '0.00' ||
    str === '0%' || str === '0.0%' || str === '0.00%' || str === 'NaN' ||
    str === 'null' || str === 'undefined'
}

/**
 * 清洗指标值：无效值替换为 '--'
 */
export function cleanValue(val: unknown): string {
  return isInvalidValue(val) ? '--' : String(val)
}
