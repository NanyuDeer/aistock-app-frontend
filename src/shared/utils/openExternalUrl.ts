/**
 * 统一外链打开工具（事件传导标题 → 原文，2026-08-14）
 *
 * 背景：后端已透传可信原文 URL（event.sourceInfo.url），
 * 前端仅需"标题点击 → 打开原文"。本工具统一处理：
 * - URL 合法性校验（http/https）
 * - H5：window.open 新窗口打开（项目既有方式）
 * - App：项目无已注册的 WebView 页面（pages.json 未注册 /pages-sub-app/webview），
 *   复用既有降级方案：复制原文链接到剪贴板并提示
 * - 非法/空 URL：返回 false，由调用方降级（如进入事件详情）
 *
 * 不引入第三方依赖，不改动任何 API/数据库字段。
 */

/** 校验是否为合法 http(s) 外链。 */
export function isHttpUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim())
}

/**
 * 打开外部链接。
 *
 * @returns true=已处理（H5 新窗口打开 / App 复制链接）；
 *          false=URL 非法或为空，调用方应自行降级。
 */
export function openExternalUrl(url: string | null | undefined): boolean {
  if (!isHttpUrl(url)) return false
  const target = (url as string).trim()
  // #ifdef H5
  window.open(target, '_blank')
  // #endif
  // #ifndef H5
  // App 端无可靠 WebView 页面，采用项目既有降级：复制到剪贴板并提示
  uni.setClipboardData({
    data: target,
    success: () => {
      uni.showToast({ title: '原文链接已复制，请在浏览器中打开', icon: 'none' })
    },
  })
  // #endif
  return true
}
