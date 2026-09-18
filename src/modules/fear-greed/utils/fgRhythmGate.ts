/**
 * 恐贪页入口卡刷新门控纯函数（无 IO）。
 * 跨日判断一律用**本地自然日** `YYYY-MM-DD` 字符串比较；不得用 `basis_date`
 * （交易日周末不前进，会导致次日漏判）。
 */

/** 本地自然日 `YYYY-MM-DD`（补零） */
export function localDayKey(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** `onShow` 刷新决策：整体重拉 / 仅补拉摘要 / 不动 */
export type RhythmRefreshAction = 'load' | 'summary' | 'none'

export interface RhythmRefreshInput {
  /** 主面板内存缓存是否非空 */
  hasDashboard: boolean
  /** 主面板内存缓存的拉取日（从未拉取过 = 空串） */
  dashboardLoadedDay: string
  /** 摘要拉取日的存储值（从未成功拉取 = null） */
  storedSummaryDay: string | null
  /** 本地今日 */
  today: string
}

/**
 * `onShow` 刷新决策：
 * - `load`：主面板无缓存或跨日 → 整体重拉（`load()` 内含摘要拉取）
 * - `summary`：主面板当日内新鲜、仅摘要跨日/从未成功 → **只补拉摘要**，不连带重拉 dashboard/sectors
 * - `none`：两者当日内均新鲜 → 不动
 * 摘要接口持续失败时不写存储 → 恒走 `summary`（单请求隐式重试），不得放大成整体重拉。
 */
export function decideRhythmRefresh(input: RhythmRefreshInput): RhythmRefreshAction {
  const { hasDashboard, dashboardLoadedDay, storedSummaryDay, today } = input
  if (!hasDashboard || dashboardLoadedDay !== today) return 'load'
  return storedSummaryDay === today ? 'none' : 'summary'
}

/** 主面板错误态策略：仅无缓存时才置 `errorMsg`（有缓存保留数据，避免错误页覆盖） */
export function shouldSetErrorMsg(hasDashboard: boolean): boolean {
  return !hasDashboard
}
