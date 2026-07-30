/**
 * rpx → vw 转换工具（H5 预览环境专用）
 *
 * 背景：vite.config.ts 中的 rpxToVw PostCSS 插件只处理 <style> 块中的 CSS 声明，
 * 不处理 Vue 模板中的内联 :style 绑定。浏览器不认识 rpx 单位，
 * 导致使用 rpx 的内联样式失效（元素尺寸为 0）。
 *
 * 此函数在 computed 中将 rpx 转为浏览器可识别的 vw，与 PostCSS 插件保持同一公式：
 * 1rpx = 100vw / 750 ≈ 0.1333vw
 *
 * 同步自 aistock-component-lib/src/utils/rpx.ts（同步时间：2026-07-28）
 */

/**
 * 将字符串中的所有 Nrpx 替换为对应的 vw 值。
 * 支持纯 rpx 值（'36rpx'）和包含 rpx 的 calc 表达式。
 *
 * @example
 * rpxToVw('36rpx')        // '4.8000vw'
 * rpxToVw('100%')         // '100%'（无 rpx，原样返回）
 * rpxToVw('calc(32rpx + env(safe-area-inset-bottom, 0px))')
 * // 'calc(4.2667vw + env(safe-area-inset-bottom, 0px))'
 */
export function rpxToVw(value: string): string {
  if (!value || !value.includes('rpx')) return value
  return value.replace(
    /(\d+(\.\d+)?)rpx/g,
    (_match, num: string) => `${(Number(num) * 100 / 750).toFixed(4)}vw`
  )
}
