/**
 * H5 端固定容器等比缩放工具
 *
 * 解决问题：#app 固定为画布尺寸（默认 390×693，9:16），但浏览器视口可能更小，
 * 导致内容被裁剪。本工具动态计算缩放比例，通过 CSS transform: scale() 缩放
 * #app 以适应视口，同时保持内部布局尺寸不变（rpx 换算基准随画布宽度变化）。
 *
 * 为什么用 JS 而非 CSS min()：
 * CSS min() 无法混合 <number>（scale 参数）和 <length>（vw/vh）类型，
 * Sass 编译器也会尝试在编译时计算 min() 导致类型不兼容错误。
 * 因此改用 JS 在运行时计算并应用缩放。
 *
 * 多端调试（2026-08-26）：
 * 支持手机/平板/大屏三种画布模式切换，用于预览大屏适配效果。
 * 切换时同步更新 html font-size（rpx 基准）与 #app 尺寸，模拟真机 rpx 换算。
 * 仅开发环境显示右下角悬浮切换按钮；模式持久化到 localStorage。
 */

/** 默认画布尺寸（手机 9:16，与 global.scss 中 #app 默认一致） */
export const DESIGN_WIDTH = 390
export const DESIGN_HEIGHT = 693

/** 画布模式：phone 手机 9:16 / tablet 平板竖屏 / tabletLandscape 平板横屏 / landscape 大屏 */
export type CanvasMode = 'phone' | 'tablet' | 'tabletLandscape' | 'landscape'

export const CANVAS_MODES: Record<CanvasMode, { width: number; height: number; label: string }> = {
  phone: { width: 390, height: 693, label: '手机 390×693' },
  // 平板竖屏：宽按 iPad 768 基准提至 860（组件/文字整体明显放大），高压到 900 以便常见视口完整显示不缩放
  tablet: { width: 860, height: 900, label: '平板竖屏 860×900' },
  // 平板横屏：iPad Pro 11" 真实横屏 CSS 尺寸（1194×834）
  tabletLandscape: { width: 1194, height: 834, label: '平板横屏 1194×834' },
  landscape: { width: 1024, height: 768, label: '大屏 1024×768' },
}

/** 画布切换事件名：H5 画布切换不触发 window resize，通过该事件通知 useAdaptiveScreen 同步宽屏状态 */
export const H5_CANVAS_CHANGE_EVENT = 'h5-canvas-change'

const STORAGE_KEY = 'h5_canvas_mode'
const MODE_ORDER: CanvasMode[] = ['phone', 'tablet', 'tabletLandscape', 'landscape']

function getStoredMode(): CanvasMode {
  const saved = localStorage.getItem(STORAGE_KEY) as CanvasMode | null
  return saved && CANVAS_MODES[saved] ? saved : 'phone'
}

function getCurrentMode(): CanvasMode {
  let mode: CanvasMode = 'phone'
  try {
    mode = getStoredMode()
  } catch {
    mode = 'phone'
  }
  return mode
}

/**
 * 应用画布模式：
 * 1. html font-size = 画布宽 / 750 * 32，让 rpx 按目标设备宽度换算（inline 覆盖 global.scss 的 !important）
 * 2. #app 宽高 = 目标设备画布尺寸
 * 3. 重新计算缩放比例（所有模式统一完整显示，与手机/横屏一致，不滚动）
 */
function applyMode(mode: CanvasMode): void {
  const canvas = CANVAS_MODES[mode]
  const app = document.getElementById('app')
  if (!app) return
  document.documentElement.style.fontSize = `${(canvas.width / 750) * 32}px`
  app.style.width = `${canvas.width}px`
  app.style.height = `${canvas.height}px`
  // 所有模式统一居中、完整显示（不滚动查看）
  document.body.style.overflow = 'hidden'
  document.body.style.alignItems = 'center'
  applyScale()
}

/**
 * 计算并应用缩放比例到 #app（所有模式统一）
 * scale = min(1, 视口宽/画布宽, 视口高/画布高)，完整显示且始终保持画布长宽比
 */
function applyScale(): void {
  const app = document.getElementById('app')
  if (!app) return

  const mode = getCurrentMode()
  const canvas = CANVAS_MODES[mode]

  const scaleX = window.innerWidth / canvas.width
  const scaleY = window.innerHeight / canvas.height
  const scale = Math.min(1, scaleX, scaleY)

  // translateZ(0) 创建包含块，让 position:fixed 子元素相对于 #app 定位
  app.style.transform = `translateZ(0) scale(${scale})`
}

/** 切换画布模式（对外暴露，供调试组件调用） */
export function setCanvasMode(mode: CanvasMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* 忽略存储异常 */
  }
  applyMode(mode)
  // 通知 useAdaptiveScreen 等依赖窗口宽度的组件同步更新（画布切换不触发原生 resize）
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(H5_CANVAS_CHANGE_EVENT))
  }
}

/** 获取当前画布模式 */
export function getCanvasMode(): CanvasMode {
  return getCurrentMode()
}

/** 创建右下角画布切换调试按钮（仅 H5 开发环境；纯 DOM 实现，避免受 #app 缩放影响） */
function createModeSwitcher(): void {
  // #ifdef H5
  if (!import.meta.env.DEV) return
  const existing = document.getElementById('h5-canvas-switcher')
  if (existing) return

  const btn = document.createElement('div')
  btn.id = 'h5-canvas-switcher'
  btn.textContent = CANVAS_MODES[getCurrentMode()].label
  Object.assign(btn.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: '99999',
    padding: '6px 12px',
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#0b5fff',
    background: '#ffffff',
    border: '1px solid #0b5fff',
    borderRadius: '999px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    userSelect: 'none',
  })

  btn.addEventListener('click', () => {
    const current = getCurrentMode()
    const next = MODE_ORDER[(MODE_ORDER.indexOf(current) + 1) % MODE_ORDER.length]
    setCanvasMode(next)
    btn.textContent = CANVAS_MODES[next].label
  })

  document.body.appendChild(btn)
  // #endif
}

/**
 * 初始化 H5 端缩放
 * 在 App.vue onLaunch 中调用（仅 H5 端生效，条件编译保证不影响 App/小程序）
 */
export function initH5Scale(): void {
  // #ifdef H5
  applyMode(getCurrentMode())
  window.addEventListener('resize', applyScale)
  window.addEventListener('orientationchange', applyScale)
  createModeSwitcher()
  // #endif
}

/**
 * 销毁 H5 端缩放监听（App 卸载时调用）
 */
export function destroyH5Scale(): void {
  // #ifdef H5
  window.removeEventListener('resize', applyScale)
  window.removeEventListener('orientationchange', applyScale)
  const btn = document.getElementById('h5-canvas-switcher')
  if (btn) btn.remove()
  // #endif
}
