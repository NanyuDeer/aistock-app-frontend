/**
 * MiniKLine 分时/五日折线纯逻辑单测（vitest）。
 * 仅测抽离出的 miniKLineLogic 纯函数：renderjs 构建真实 SVG 的 DOM 部分跨端不易在 happy-dom 复现，
 * 故把 isLinePeriod / buildLineGroupsRaw / isLineRenderable / groupByDate / buildScale 抽至独立模块逐断言。
 */
import { describe, it, expect } from 'vitest'
import type { KLineItem } from '@/shared/api/modules/stock'
import {
  isLinePeriod,
  buildLineGroupsRaw,
  isLineRenderable,
  groupByDate,
  buildScale,
  buildMinuteSeries,
  downsampleItems,
} from './miniKLineLogic'

const mk = (date: string, close: number): KLineItem => ({
  date,
  open: close,
  close,
  high: close + 0.1,
  low: close - 0.1,
  volume: 100,
})

describe('MiniKLine 分时折线判定', () => {
  const items: KLineItem[] = [
    mk('2026-08-24 09:30', 10.2),
    mk('2026-08-24 09:31', 10.5),
    mk('2026-08-24 09:32', 10.4),
  ]

  it('minute/five 周期识别为折线，其余为蜡烛', () => {
    expect(isLinePeriod('minute')).toBe(true)
    expect(isLinePeriod('five')).toBe(true)
    expect(isLinePeriod('daily')).toBe(false)
    expect(isLinePeriod('weekly')).toBe(false)
    expect(isLinePeriod('monthly')).toBe(false)
  })

  it('minute 有 >=2 有效收盘价 → renderable（分时折线可渲染）', () => {
    const group = buildLineGroupsRaw('minute', items)
    expect(group.length).toBe(1)
    expect(group[0].values.length).toBeGreaterThanOrEqual(2)
    expect(isLineRenderable('minute', items)).toBe(true)
  })

  it('分时只取最近交易日序列，跨日数据被合并到当日', () => {
    const twoDays = [...items, mk('2026-08-21 10:00', 9.5)]
    const group = buildLineGroupsRaw('minute', twoDays)
    expect(group.length).toBe(1)
    expect(group[0].label).toBe('20260824')
    expect(group[0].values).toEqual([10.2, 10.5, 10.4])
  })

  it('单点/无有效收盘 → 不 renderable（空态）', () => {
    expect(isLineRenderable('minute', [mk('2026-08-24 09:30', 10.2)])).toBe(false)
    expect(isLineRenderable('minute', [])).toBe(false)
    expect(isLineRenderable('minute', [{ ...mk('2026-08-24 09:30', 0), close: 0 }])).toBe(false)
  })

  it('five 周期按日分组且各日折点 >=1', () => {
    const five = buildLineGroupsRaw('five', items)
    expect(five.length).toBeGreaterThanOrEqual(1)
    expect(isLineRenderable('five', items)).toBe(true)
  })

  it('groupByDate 按 8 位日期归一化并升序排序', () => {
    const groups = groupByDate([mk('2026-08-24 09:30', 1), mk('2026-08-21 09:30', 1), mk('bad', 1)])
    const labels = groups.map(([l]) => l)
    expect(labels).toEqual(['20260821', '20260824'])
  })

  it('buildScale <2 点返回 null，>=2 点返回升序 y 映射（值越大 y 越小）', () => {
    expect(buildScale([10])).toBeNull()
    expect(buildScale([])).toBeNull()
    const scale = buildScale([10, 20])
    expect(scale).not.toBeNull()
    if (!scale) return
    expect(scale.yFor(20)).toBeLessThan(scale.yFor(10))
  })

  it('buildMinuteSeries 只取最近交易日原始序列（含 volume，不过滤）', () => {
    const series = buildMinuteSeries(twoDaySeries())
    expect(series.length).toBeGreaterThanOrEqual(2)
    expect(typeof series[0].volume).toBe('number')
  })

  it('downsampleItems 压到 maxPoints 并保留首尾；<=0 或长度不足原样返回', () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const out = downsampleItems(arr, 4)
    expect(out).toHaveLength(4)
    expect(out[0]).toBe(0)
    expect(out[out.length - 1]).toBe(9)
    expect(downsampleItems(arr, 0)).toBe(arr)
    expect(downsampleItems(arr, 20)).toBe(arr)
    expect(downsampleItems([1], 10)).toEqual([1])
  })
})

function twoDaySeries(): KLineItem[] {
  return [
    mk('2026-08-24 09:30', 10.2),
    mk('2026-08-24 09:31', 10.5),
    mk('2026-08-24 09:32', 10.4),
    mk('2026-08-21 09:30', 9.5),
  ]
}