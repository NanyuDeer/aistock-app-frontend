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

/** 项目 H5 设计基准宽度（与 global.scss #app 390px 及 html font-size 基准一致） */
const DESIGN_WIDTH = 390

/**
 * 将字符串中的所有 Nrpx 替换为对应的固定 px 值（按项目 390px 设计基准）。
 * 1rpx = 390 / 750 = 0.52px
 *
 * 用途：H5 预览环境中"固定设计尺寸"组件（如 Rate 星星、Sparkline 高度）的内联
 * :style。这些组件应跟随全局 rpx 基准（#app 390px），而非视口基准 vw——
 * 否则宽屏视口下 vw 会线性放大（如 18rpx→2.4vw，1920px 视口时 46px），
 * 与固定 390px 基准的卡片/字体脱节。
 *
 * 与 rpxToVw 的区别：rpxToVw 用于确实需要随视口响应的场景；本函数用于
 * 项目既定"固定 390px 设计基准"下的固定尺寸。非 rpx 值（如 '100%'）原样返回。
 *
 * @example
 * rpxToPx('18rpx')        // '9.3600px'（18 × 390 / 750）
 * rpxToPx('80rpx')        // '41.6000px'
 * rpxToPx('100%')         // '100%'（无 rpx，原样返回）
 */
export function rpxToPx(value: string): string {
  if (!value || !value.includes('rpx')) return value
  return value.replace(
    /(\d+(\.\d+)?)rpx/g,
    (_match, num: string) => `${(Number(num) * DESIGN_WIDTH / 750).toFixed(4)}px`
  )
}
