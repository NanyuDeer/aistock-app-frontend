import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 响应式断点 hook
 * 范围：sm < 480 / md 480-768 / lg >= 768
 * App 端无 resize 事件，初始化时一次性判断；H5 监听 resize。
 */
export type Breakpoint = 'sm' | 'md' | 'lg'

export const BP_SM = 480
export const BP_MD = 768

export function getWindowWidthBreakpoint(windowWidth: number): Breakpoint {
  if (!windowWidth || windowWidth <= 0) return 'sm'
  if (windowWidth < BP_SM) return 'sm'
  if (windowWidth < BP_MD) return 'md'
  return 'lg'
}

export function useResponsive() {
  const breakpoint = ref<Breakpoint>('sm')

  function update() {
    try {
      const info = uni.getSystemInfoSync()
      breakpoint.value = getWindowWidthBreakpoint(info.windowWidth || 0)
    } catch {
      breakpoint.value = 'sm'
    }
  }

  let resizeHandler: (() => void) | null = null

  onMounted(() => {
    update()
    // H5 监听 resize
    // #ifdef H5
    if (typeof window !== 'undefined') {
      resizeHandler = () => update()
      window.addEventListener('resize', resizeHandler)
    }
    // #endif
  })

  onUnmounted(() => {
    // #ifdef H5
    if (resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
    // #endif
  })

  return {
    breakpoint,
    isMobile: computed(() => breakpoint.value === 'sm'),
    isTablet: computed(() => breakpoint.value === 'lg'),
    isSmall: computed(() => breakpoint.value === 'sm' || breakpoint.value === 'md'),
  }
}
