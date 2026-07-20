/**
 * H5 端固定容器等比缩放工具
 *
 * 解决问题：#app 固定为 390×693px（9:16 长宽比），但浏览器视口可能更小，
 * 导致内容被裁剪。本工具动态计算缩放比例，通过 CSS transform: scale() 缩放
 * #app 以适应视口，同时保持内部布局尺寸不变（rpx 换算基准始终为 390px）。
 *
 * 为什么用 JS 而非 CSS min()：
 * CSS min() 无法混合 <number>（scale 参数）和 <length>（vw/vh）类型，
 * Sass 编译器也会尝试在编译时计算 min() 导致类型不兼容错误。
 * 因此改用 JS 在运行时计算并应用缩放。
 */

/** 设计稿宽度（与 global.scss 中 #app width 一致） */
const DESIGN_WIDTH = 390
/** 设计稿高度（390 × 16 ÷ 9 ≈ 693，与 global.scss 中 #app height 一致） */
const DESIGN_HEIGHT = 693

/**
 * 计算并应用缩放比例到 #app
 * scale = min(1, 视口宽/390, 视口高/693)
 * 确保完整显示且始终保持 9:16 长宽比
 */
function applyScale(): void {
  const app = document.getElementById('app')
  if (!app) return

  const scaleX = window.innerWidth / DESIGN_WIDTH
  const scaleY = window.innerHeight / DESIGN_HEIGHT
  const scale = Math.min(1, scaleX, scaleY)

  // translateZ(0) 创建包含块，让 position:fixed 子元素相对于 #app 定位
  app.style.transform = `translateZ(0) scale(${scale})`
}

/**
 * 初始化 H5 端缩放
 * 在 App.vue onLaunch 中调用（仅 H5 端生效，条件编译保证不影响 App/小程序）
 */
export function initH5Scale(): void {
  // #ifdef H5
  applyScale()
  window.addEventListener('resize', applyScale)
  window.addEventListener('orientationchange', applyScale)
  // #endif
}

/**
 * 销毁 H5 端缩放监听（App 卸载时调用）
 */
export function destroyH5Scale(): void {
  // #ifdef H5
  window.removeEventListener('resize', applyScale)
  window.removeEventListener('orientationchange', applyScale)
  // #endif
}
