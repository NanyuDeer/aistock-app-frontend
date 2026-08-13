/**
 * 对话滚动跟随判定（改进 16，批次 1 2026-08-13）
 *
 * 豆包式滚动交互：AI 生成期间用户上滑翻看历史时不强制钉底。
 * 距底距离（scrollHeight - viewportHeight - scrollTop）超过阈值 → 视为用户
 * 上滑离开底部，暂停跟随；回到底部附近 → 恢复跟随。
 * 纯函数便于单测；视口高度由调用方测量传入（缺失时调用方用默认值兜底）。
 */
/** 距底超过该值（px）视为"用户上滑离开底部" */
export const SCROLL_FOLLOW_THRESHOLD = 80

/**
 * 当前是否贴底（距底 ≤ 阈值）。
 * scrollHeight <= 0（内容高度未知，如初始/测量失败）→ 视为贴底，避免误判上滑打断跟随。
 */
export function isNearBottom(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number,
): boolean {
  if (scrollHeight <= 0) return true
  const remaining = scrollHeight - viewportHeight - scrollTop
  return remaining <= SCROLL_FOLLOW_THRESHOLD
}
