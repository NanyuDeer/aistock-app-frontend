/**
 * MiniKLine 纯逻辑（无 DOM / 跨端可测）。
 * 抽离自 MiniKLine.vue：分时/五日折线的归一化、分组、尺度和可渲染判定。
 * 目的：让 renderjs 视图层以外的判定逻辑可被 vitest 单测锁定，避免回归。
 */
import type { KLineItem } from '@/shared/api/modules/stock'

export type MiniPeriod = 'minute' | 'five' | 'daily' | 'weekly' | 'monthly'

/** SVG 画布与价格/成交量区域边界（与业务渲染共用单一来源，避免抽离后不一致） */
export const VIEW_W = 200
export const VIEW_H = 100
export const PRICE_TOP = 6
export const PRICE_BOTTOM = 78
export const VOL_TOP = 86
export const VOL_BOTTOM = 96

export interface LineGroup {
  label: string
  values: number[]
}

export interface PriceScale {
  yFor(v: number): number
}

/** 分时/五日走折线，日/周/月走蜡烛 */
export function isLinePeriod(period: MiniPeriod): boolean {
  return period === 'minute' || period === 'five'
}

/** 按日期（YYYYMMDD）分组，供五日按日叠加与分时取最近交易日 */
export function groupByDate(items: KLineItem[]): [string, KLineItem[]][] {
  const map = new Map<string, KLineItem[]>()
  items.forEach((item) => {
    const d = String(item.date || '').replace(/\D/g, '').slice(0, 8)
    if (!d) return
    const list = map.get(d) || []
    list.push(item)
    map.set(d, list)
  })
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

/** 折线分组：分时=最近一个交易日单线；五日=按日叠加取最近 5 个交易日；蜡烛周期返回空 */
export function buildLineGroupsRaw(period: MiniPeriod, data: KLineItem[]): LineGroup[] {
  if (!isLinePeriod(period)) return []
  if (period === 'five') {
    return groupByDate(data).slice(-5).map(([label, list]) => ({
      label,
      values: list.map((i) => Number(i.close) || 0).filter((v) => v > 0),
    }))
  }
  // 分时：取最近一个交易日的分钟序列
  const groups = groupByDate(data)
  const source = groups.length ? groups[groups.length - 1][1] : data
  return [{
    label: groups.length ? groups[groups.length - 1][0] : '',
    values: source.map((i) => Number(i.close) || 0).filter((v) => v > 0),
  }]
}

/** 折线可渲染判定：任一分组有效收盘价 >=2（分时至少 2 个分笔点才画得出折线） */
export function isLineRenderable(period: MiniPeriod, data: KLineItem[]): boolean {
  if (!isLinePeriod(period)) return false
  return buildLineGroupsRaw(period, data).some((g) => g.values.length >= 2)
}

/** 生成价格区域 y 映射（统一按全部折线点归一化，保证五日各日同尺度可比）；<2 点返回 null */
export function buildScale(values: number[]): PriceScale | null {
  const nums = values.filter((v) => Number.isFinite(v))
  if (nums.length < 2) return null
  let min = Math.min(...nums)
  let max = Math.max(...nums)
  if (min === max) {
    min -= 0.5
    max += 0.5
  }
  const pad = (max - min) * 0.12
  min -= pad
  max += pad
  const range = max - min || 1
  return {
    yFor: (v: number) => PRICE_TOP + ((max - v) / range) * (PRICE_BOTTOM - PRICE_TOP),
  }
}