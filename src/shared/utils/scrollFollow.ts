/**
 * 对话滚动跟随判定（改进 16，批次 1 2026-08-13；5B 三态化 2026-08-17）
 *
 * 豆包式滚动交互：AI 生成期间用户上滑翻看历史时不强制钉底。
 * 距底距离（scrollHeight - viewportHeight - scrollTop）超过阈值 → 视为用户
 * 上滑离开底部，暂停跟随；回到底部附近 → 恢复跟随。
 *
 * 5B 修订：isNearBottom 布尔 → measureProximity 三态。scrollHeight<=0（测量失败/
 * 初始）不再谎称"贴底"（旧实现误判贴底 → resumeFollow 强拉回底部），返回
 * 'unknown'——调用方保持当前跟随状态不变（不打断、不钉底）。
 * 纯函数便于单测；视口高度由调用方测量传入（缺失时调用方用默认值兜底）。
 */
/** 距底超过该值（px）视为"用户上滑离开底部" */
export const SCROLL_FOLLOW_THRESHOLD = 80

/** 贴底三态：near=距底≤阈值；far=用户上滑离开；unknown=测量失败/初始（不参与判定） */
export type FollowProximity = 'near' | 'far' | 'unknown'

export function measureProximity(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number,
): FollowProximity {
  if (scrollHeight <= 0) return 'unknown'
  const remaining = scrollHeight - viewportHeight - scrollTop
  return remaining <= SCROLL_FOLLOW_THRESHOLD ? 'near' : 'far'
}

/** G6（2026-08-17）：恢复目标滚动位置钳制——不超过可滚最大值，不小于 0。 */
export function clampScrollTop(
  target: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const max = Math.max(0, scrollHeight - viewportHeight)
  return Math.min(target, max)
}
