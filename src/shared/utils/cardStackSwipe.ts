/**
 * 首页悬浮「自选股消息卡」堆叠滑动手势纯逻辑。
 * 无 Vue / 无 DOM 依赖，组件只负责把结果套到内联样式上（便于单测锁定手感口径）。
 */

/** 手势主轴锁定的最小位移（px）：低于此值视为手指抖动，不锁定方向 */
export const AXIS_LOCK_PX = 8

/** 滑动方向：-1 = 看下一张（左滑 / 上滑），1 = 看上一张（右滑 / 下滑），0 = 未达阈值 */
export type SwipeDirection = -1 | 0 | 1

/** 手势主轴：none = 未锁定；horizontal = 横向跟手拖卡；vertical = 纵向沿用上/下滑切换 */
export type DragAxis = 'none' | 'horizontal' | 'vertical'

export function resolveDragAxis(dx: number, dy: number, lockPx: number = AXIS_LOCK_PX): DragAxis {
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  // 两个方向都没超过锁定阈值：不锁定，交由后续按下/抬起逻辑自行处理
  if (Math.max(absX, absY) < lockPx) return 'none'
  // 位移占优方向即主轴（相等时按横向处理，左/右滑更符合"翻卡"直觉）
  return absX >= absY ? 'horizontal' : 'vertical'
}

export function dragProgress(dx: number, switchPx: number): number {
  if (switchPx <= 0) return 0
  return Math.min(1, Math.abs(dx) / switchPx)
}

export function resolveSwipeDirection(dx: number, switchPx: number): SwipeDirection {
  if (switchPx <= 0 || Math.abs(dx) < switchPx) return 0
  return dx < 0 ? -1 : 1
}

export function tiltDegrees(dx: number, maxDeg: number, capPx: number): number {
  if (capPx <= 0) return 0
  const ratio = Math.max(-1, Math.min(1, dx / capPx))
  return ratio * maxDeg
}

export function lerp(from: number, to: number, p: number): number {
  return from + (to - from) * p
}

export function rotateOrder<T>(order: readonly T[], dir: SwipeDirection): T[] {
  if (dir === 0 || order.length < 2) return [...order]
  return dir < 0
    ? [...order.slice(1), order[0]]
    : [order[order.length - 1], ...order.slice(0, -1)]
}
