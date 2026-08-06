import type { WindLeaderSector } from '@/shared/api/modules/stock'

export type CycleKind = 'long' | 'short'

/** 泡泡半径：按各档位量级归一化——长线以 120 天为满格、短线以 10 天为满格，
 * 半径 20→50px 线性，超过满格封顶。 */
export function calcBubbleRadius(kind: CycleKind, days: number): number {
  const fullDays = kind === 'long' ? 120 : 10
  return Math.min(50, Math.max(20, 20 + (days / fullDays) * 30))
}

// 双色阶：只规定最浅/最深两端，中间值在 HSL 上线性插值调整颜色深浅。
// 长线蓝系（浅蓝→藏青）、短线橙红系（浅橙→暗红），0.5 附近即普通蓝/普通橙。
// [色相 h, 饱和度 s%, 亮度 l%]
const SCALE_STOPS: Record<CycleKind, { from: [number, number, number]; to: [number, number, number] }> = {
  long: { from: [220, 88, 96], to: [225, 82, 18] },
  short: { from: [32, 95, 96], to: [2, 75, 24] },
}

/** 泡泡底色：值 0~1 在色阶两端（最浅→最深）间 HSL 线性插值 */
export function calcBubbleColor(kind: CycleKind, value: number): string {
  const v = Math.min(1, Math.max(0, value))
  const { from, to } = SCALE_STOPS[kind]
  const h = from[0] + (to[0] - from[0]) * v
  const s = from[1] + (to[1] - from[1]) * v
  const l = from[2] + (to[2] - from[2]) * v
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`
}

/** 泡泡文字颜色：底色较深（强度 ≥0.5）用白字，较浅用深色字，保证可读 */
export function calcBubbleTextColor(value: number): string {
  return value >= 0.5 ? '#ffffff' : '#1f2937'
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
