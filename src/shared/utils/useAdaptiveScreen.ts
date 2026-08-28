/**
 * 自适应屏幕 hook（多端适配，2026-08-26）
 *
 * 用途：判断当前是否为宽屏（平板 / 折叠屏展开 / 横屏），供布局切换使用。
 * - App/H5/小程序端均支持 uni.onWindowResize：折叠屏展开/收起、平板旋转、
 *   窗口尺寸变化时触发，组件内布局可实时响应。
 * - 宽屏阈值默认 700px：折叠屏展开（约 720px+）、平板竖屏（768px+）、
 *   手机横屏（约 700px+）均视为宽屏。
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'
// #ifdef H5
import { getCanvasMode, CANVAS_MODES, H5_CANVAS_CHANGE_EVENT } from './h5-scale'
// #endif

export interface AdaptiveScreen {
  /** 是否宽屏（windowWidth > threshold） */
  isWide: Ref<boolean>
  /** 当前窗口宽度（px） */
  windowWidth: Ref<number>
  /** 设备类型：phone / pad / pc（uni.getDeviceInfo） */
  deviceType: Ref<string>
}

/** 获取窗口宽度的安全封装（兼容旧版 uni API） */
function getRealWindowWidth(): number {
  try {
    const info = (uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()) as {
      windowWidth?: number
    }
    return info?.windowWidth ?? 0
  } catch {
    return 0
  }
}

/** 获取窗口宽度：H5 统一返回画布宽度（手机=390 恒窄屏），保证手机画布下布局不被浏览器窗口宽度误判为宽屏 */
function getWindowWidth(): number {
  // #ifdef H5
  try {
    // H5 固定画布预览：始终以画布宽度作为窗口宽度判断。
    // 手机画布(390) → 恒窄屏（2 列布局）；平板/大屏画布 → 按模拟设备宽度触发宽屏布局。
    const mode = getCanvasMode()
    return CANVAS_MODES[mode].width
  } catch {
    /* 忽略，回退真实宽度 */
  }
  // #endif
  return getRealWindowWidth()
}

/** 获取设备类型的安全封装（phone / pad / pc） */
function getDeviceType(): string {
  try {
    const info = (uni.getDeviceInfo ? uni.getDeviceInfo() : uni.getSystemInfoSync()) as {
      deviceType?: string
    }
    return info?.deviceType ?? 'phone'
  } catch {
    return 'phone'
  }
}

export function useAdaptiveScreen(threshold = 700): AdaptiveScreen {
  const isWide = ref(false)
  const windowWidth = ref(0)
  const deviceType = ref('phone')

  function update() {
    windowWidth.value = getWindowWidth()
    deviceType.value = getDeviceType()
    isWide.value = windowWidth.value > threshold
  }

  onMounted(() => {
    update()
    // 折叠屏展开/收起、平板旋转、窗口尺寸变化时实时刷新
    // （unmounted 前注册，保证首次挂载即获取到正确尺寸）
    if (typeof uni.onWindowResize === 'function') {
      uni.onWindowResize(update)
    }
    // #ifdef H5
    // H5 画布切换（手机/平板/大屏）不触发原生 resize，监听自定义事件同步宽屏状态
    window.addEventListener(H5_CANVAS_CHANGE_EVENT, update)
    // #endif
  })

  onUnmounted(() => {
    if (typeof uni.offWindowResize === 'function') {
      uni.offWindowResize(update)
    }
    // #ifdef H5
    window.removeEventListener(H5_CANVAS_CHANGE_EVENT, update)
    // #endif
  })

  return { isWide, windowWidth, deviceType }
}
