/**
 * 平台判断工具
 * 注意：uni-app 条件编译在 .ts 文件中会导致块作用域变量重声明错误，
 * 因此改用运行时平台检测。
 */
function detectPlatform(): { isH5: boolean; isApp: boolean; isMp: boolean } {
  // #ifdef H5
  return { isH5: true, isApp: false, isMp: false }
  // #endif
  // #ifdef APP-PLUS
  return { isH5: false, isApp: true, isMp: false }
  // #endif
  // #ifdef MP-WEIXIN
  return { isH5: false, isApp: false, isMp: true }
  // #endif
  // 兜底：通过 uni API 运行时判断
  try {
    const info = uni.getSystemInfoSync()
    const platform = (info as any).uniPlatform || (info as any).platform || ''
    if (platform === 'app' || platform === 'android' || platform === 'ios') {
      return { isH5: false, isApp: true, isMp: false }
    }
    if (platform === 'mp-weixin' || platform === 'web') {
      return { isH5: false, isApp: false, isMp: true }
    }
  } catch {}
  return { isH5: true, isApp: false, isMp: false }
}

const platform = detectPlatform()

export const isH5 = platform.isH5
export const isApp = platform.isApp
export const isMp = platform.isMp

/** 是否支持 WebSocket 长连接（App 端） */
export const supportsWebSocket = isApp

/** 是否支持 AI 对话（App 端完整，小程序降级，H5 引导下载） */
export const supportsAIChat = isApp || isMp

/** 是否支持双人对话播报（仅 App） */
export const supportsBriefing = isApp

/** 是否支持推送通知（仅 App） */
export const supportsPush = isApp
