import type { WindLeaderSector } from '@/shared/api/modules/stock'

export type CycleKind = 'long' | 'short'

/** 泡泡半径：按各档位量级归一化——长线以 120 天为满格、短线以 10 天为满格，
 * 半径 22→65px 线性，超过满格封顶。修复原 clamp(26+days×coef,22,65) 长线 75+ 天全封顶、
 * 长短线系数不匹配各自量级的问题。 */
export function calcBubbleRadius(kind: CycleKind, days: number): number {
  const fullDays = kind === 'long' ? 120 : 10
  return Math.min(65, Math.max(22, 22 + (days / fullDays) * 43))
}

/** 泡泡颜色深浅：0.3 + 0.7 × value（value 收敛到 0~1）。
 * 相比 0.4+0.6×值，低强度更浅、高强度更深，对比度更强（实际 conf/heat 多集中在 0.3~0.6，
 * 原公式映射后几乎全是浅蓝无法区分）。 */
export function calcBubbleOpacity(kind: CycleKind, value: number): number {
  const v = Math.min(1, Math.max(0, value))
  return 0.3 + 0.7 * v
}

/** 取该维度持续天数（ai_analysis 缺省 0） */
export function getSectorDays(s: WindLeaderSector, kind: CycleKind): number {
  const a = typeof s.ai_analysis === 'object' ? s.ai_analysis : undefined
  return kind === 'long' ? a?.long_term_days ?? 0 : a?.short_term_days ?? 0
}

/** 取该维度强度（长线=置信度，短线=热度；缺省 0） */
export function getSectorStrength(s: WindLeaderSector, kind: CycleKind): number {
  const a = typeof s.ai_analysis === 'object' ? s.ai_analysis : undefined
  return kind === 'long' ? a?.long_confidence ?? 0 : a?.short_heat ?? 0
}
