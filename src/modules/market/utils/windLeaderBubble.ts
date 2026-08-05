import type { WindLeaderSector } from '@/shared/api/modules/stock'

export type CycleKind = 'long' | 'short'

/** 泡泡半径：长线 coef 0.6 / 短线 coef 1.2，clamp(26 + days×coef, 22, 65) */
export function calcBubbleRadius(kind: CycleKind, days: number): number {
  const coef = kind === 'long' ? 0.6 : 1.2
  return Math.min(65, Math.max(22, 26 + days * coef))
}

/** 泡泡颜色深浅：0.4 + 0.6 × value（value 收敛到 0~1） */
export function calcBubbleOpacity(kind: CycleKind, value: number): number {
  const v = Math.min(1, Math.max(0, value))
  return 0.4 + 0.6 * v
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
