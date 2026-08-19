/**
 * 自选股相关问句生成（Phase 4-2 Task 1：自选股联动）
 * 纯函数，便于单测；语义对齐 compare_stocks 边界（一次最多比较 5 只）。
 */
import type { FavoriteStock } from '@/shared/store/modules/favorites'

/** compare_stocks 一次最多比较的股票数量 */
const MAX_SHOWN = 5

/**
 * 生成"我的自选股"批量问句：
 * - 空列表 → 回退提示
 * - ≤5 只 → "我的自选股里 XX、YY 怎么样"
 * - >5 只 → 截断为前 5 只并追加提示，让 AI 知道还有更多
 */
export function buildFavoritesQuestion(favorites: FavoriteStock[]): string {
  const names = (favorites ?? [])
    .map((stock) => (stock?.name ?? '').trim())
    .filter((name) => name !== '')
  if (names.length === 0) return '我的自选股还是空的'

  const shown = names.slice(0, MAX_SHOWN)
  const truncatedHint = names.length > MAX_SHOWN ? `（仅展示前 ${MAX_SHOWN} 只）` : ''
  return `我的自选股里 ${shown.join('、')} 怎么样${truncatedHint}`
}

/**
 * 生成单只股票问句：
 * - 有名称 → "贵州茅台现在怎么样"
 * - 名称为空 → 通用回退问句
 */
export function buildStockQuestion(name: string): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '这只股票现在怎么样'
  return `${trimmed}现在怎么样`
}
