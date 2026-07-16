/**
 * 布局工具：统一计算底部固定栏（GlobalChatBar + AppBottomBar）高度
 *
 * 解决问题：硬编码 147rpx 没有补偿 env(safe-area-inset-bottom)，
 * 导致刘海屏设备上 GlobalChatBar 实际高度 > 预留高度，
 * scroll-view 底部内容被遮挡。
 *
 * 所有需要预留底部空间的组件（SubPageCard / PageCard / AppBottomBar）
 * 必须使用本模块的函数，禁止再硬编码 rpx 值。
 */

let _sysInfo: UniApp.GetSystemInfoResult | null = null

function getSysInfo(): UniApp.GetSystemInfoResult {
  if (!_sysInfo) {
    _sysInfo = uni.getSystemInfoSync()
  }
  return _sysInfo
}

/**
 * rpx → px 转换
 *
 * 使用 uni.upx2px() 替代手动 windowWidth 计算。
 * 原因：H5 dev 模式下 getSystemInfoSync().windowWidth 返回浏览器全宽（如 1463px），
 * 而非模拟移动端宽度（375px），导致 JS 中的 rpx→px 换算严重偏大。
 * uni.upx2px() 内部使用与 CSS rpx 相同的基准宽度，保证 JS 和 CSS 换算一致。
 */
export function rpx2px(rpx: number): number {
  try {
    return uni.upx2px(rpx)
  } catch {
    return rpx / 2
  }
}

/**
 * px → rpx 转换（rpx2px 的逆运算）
 * 通过 uni.upx2px(750) 获取基准屏幕宽度，确保与 rpx2px 使用相同的换算基准。
 */
export function px2rpx(px: number): number {
  try {
    const basePx = uni.upx2px(750)
    if (basePx > 0) return Math.round((px * 750) / basePx)
    return px * 2
  } catch {
    return px * 2
  }
}

/**
 * 获取安全区底部高度（px）
 * - iPhone X+ 约为 34px
 * - Android 全面屏约为 0-24px
 * - H5 桌面端为 0
 */
export function getSafeAreaInsetBottom(): number {
  try {
    const info = getSysInfo()
    // H5 / 小程序：safeArea.bottom 与 screenHeight 的差值
    const safeArea = info.safeArea
    const screenHeight = info.screenHeight || 0
    if (safeArea && screenHeight) {
      const inset = screenHeight - safeArea.bottom
      if (inset > 0 && inset < 100) return inset
    }
    // App 端：safeAreaInsets
    const insets = (info as unknown as Record<string, unknown>).safeAreaInsets as
      | { bottom?: number }
      | undefined
    if (insets && insets.bottom && insets.bottom > 0) return insets.bottom
    return 0
  } catch {
    return 0
  }
}

/**
 * GlobalChatBar 实际高度（px）
 *
 * 构成：padding-top(8rpx) + chat-row(88rpx) + disclaimer(44rpx) + padding-bottom(8rpx)
 *      = 148rpx + env(safe-area-inset-bottom)
 */
export function getChatBarHeightPx(): number {
  return rpx2px(148) + getSafeAreaInsetBottom()
}

/**
 * AppBottomBar 的 bottom 定位值（px）
 * Tab 栏固定在 GlobalChatBar 正上方，所以 bottom = ChatBar 高度
 */
export function getTabBarBottomPx(): number {
  return getChatBarHeightPx()
}

/**
 * AppBottomBar 自身高度（px）
 * = tab-item(40rpx) + padding-bottom(4rpx)
 */
export function getTabBarHeightPx(): number {
  return rpx2px(44)
}

/**
 * 底部固定栏总高度（px）= ChatBar + TabBar + 间距
 *
 * 用于 PageCard 等主 tab 页面的 scrollHeight 计算和 CSS marginBottom。
 * @param extraGapRpx 额外间距（rpx），默认 16rpx
 */
export function getBottomFixedHeightPx(extraGapRpx = 16): number {
  return getChatBarHeightPx() + getTabBarHeightPx() + rpx2px(extraGapRpx)
}
