/**
 * 定时器 Hook
 * 提供自动清理的定时器，避免组件卸载后内存泄漏
 */
import { onUnmounted } from 'vue'

export function useTimer() {
  const timers = new Set<number>()

  /** 设置定时器，组件卸载时自动清理 */
  function setInterval(cb: () => void, interval: number): number {
    const id = window.setInterval(cb, interval) as unknown as number
    timers.add(id)
    return id
  }

  /** 设置延时器，组件卸载时自动清理 */
  function setTimeout(cb: () => void, delay: number): number {
    const id = window.setTimeout(cb, delay) as unknown as number
    timers.add(id)
    return id
  }

  /** 清除指定定时器 */
  function clear(id: number) {
    // #ifdef H5
    window.clearInterval(id)
    window.clearTimeout(id)
    // #endif
    // #ifndef H5
    clearInterval(id)
    clearTimeout(id)
    // #endif
    timers.delete(id)
  }

  /** 清除所有定时器 */
  function clearAll() {
    timers.forEach((id) => {
      // #ifdef H5
      window.clearInterval(id)
      window.clearTimeout(id)
      // #endif
      // #ifndef H5
      clearInterval(id)
      clearTimeout(id)
      // #endif
    })
    timers.clear()
  }

  onUnmounted(() => clearAll())

  return { setInterval, setTimeout, clear, clearAll }
}
