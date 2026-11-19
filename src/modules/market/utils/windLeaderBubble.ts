import type { WindLeaderSector } from '@/shared/api/modules/stock'

export type CycleKind = 'long' | 'short'

/** 泡泡半径：按各档位量级归一化——长线以 120 天为满格、短线以 10 天为满格，
 * 半径 20→50px 线性，超过满格封顶。 */
export function calcBubbleRadius(kind: CycleKind, days: number): number {
  const fullDays = kind === 'long' ? 120 : 10
  return Math.min(50, Math.max(20, 20 + (days / fullDays) * 30))
}

/**
 * 泡泡颜色色阶（0.1~0.9 九档，索引 = 值×10-1）。0.1/0.2 与 0.3 同色——低于 cycle 门槛
 * （短线 heat≥0.3、长线 conf≥0.5）的板块会被筛选掉，直接用最浅色收敛。
 * 长线蓝系：0.3 浅蓝 → 0.5 普通蓝 → 0.9 近黑蓝
 * 短线橙红系：0.3 浅橙 → 0.5 普通橙 → 0.8 起转红 → 0.9 暗红
 */
const LONG_SCALE = ['#dbeafe', '#dbeafe', '#dbeafe', '#7ab1f8', '#3b82f6', '#1552d0', '#1e3a8a', '#1b2a6b', '#121a44']
const SHORT_SCALE = ['#fed7aa', '#fed7aa', '#fed7aa', '#fdba74', '#f97316', '#c2410c', '#9a3412', '#7f1d1d', '#5b1414']
const SCALES: Record<CycleKind, string[]> = { long: LONG_SCALE, short: SHORT_SCALE }

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 按强度值在两档色阶间线性插值，返回 rgb(...) 字符串；值收敛到 [0.1, 0.9] 档位内 */
export function calcBubbleColor(kind: CycleKind, value: number): string {
  const scale = SCALES[kind]
  const v = Math.min(0.9, Math.max(0.1, value))
  const pos = ((v - 0.1) / 0.8) * (scale.length - 1)
  const i = Math.min(scale.length - 2, Math.floor(pos))
  const t = pos - i
  const c1 = hexToRgb(scale[i])
  const c2 = hexToRgb(scale[i + 1])
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mix(c1[0], c2[0])}, ${mix(c1[1], c2[1])}, ${mix(c1[2], c2[2])})`
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

// ===== 今日风口榜泡泡：成交额线性大小 + 涨跌幅 19 档颜色（红 9 / 绿 9 / 灰 1） =====

export const TODAY_BUBBLE_NEUTRAL = '#9ca3af'

/** 上涨 9 档（浅 → 深），每 1% 一档 */
export const TODAY_BUBBLE_RED_SCALE = [
  '#f7b3b3',
  '#f28e8e',
  '#ec6a6a',
  '#e54d5e',
  '#cf3b4b',
  '#b52d3c',
  '#97222f',
  '#761a24',
  '#55111a',
] as const

/** 下跌 9 档（浅 → 深），按跌幅绝对值每 1% 一档 */
export const TODAY_BUBBLE_GREEN_SCALE = [
  '#a7dcb8',
  '#86cfa0',
  '#63c187',
  '#18a058',
  '#158a4c',
  '#127340',
  '#0f5c34',
  '#0b4628',
  '#07301c',
] as const

/** 今日泡泡半径：成交额线性映射 20~50px（与波段/长线同区间，最大成交额归一） */
export function calcTodayBubbleRadius(amount: number | null | undefined, maxAmount: number): number {
  const value = typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : 0
  const ratio = maxAmount > 0 ? Math.min(1, value / maxAmount) : 0
  return 20 + ratio * 30
}

/** 今日泡泡颜色：涨红 9 档 + 跌绿 9 档 + 平/无数据灰，每 1% 一档，≥8% 封顶第 9 档 */
export function calcTodayBubbleColor(changePct: number | null | undefined): string {
  if (changePct === null || changePct === undefined || !Number.isFinite(changePct) || changePct === 0) {
    return TODAY_BUBBLE_NEUTRAL
  }
  const scale = changePct > 0 ? TODAY_BUBBLE_RED_SCALE : TODAY_BUBBLE_GREEN_SCALE
  const step = Math.min(9, Math.max(1, Math.ceil(Math.abs(changePct))))
  return scale[step - 1]
}
