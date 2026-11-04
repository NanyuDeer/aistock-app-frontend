import { describe, it, expect } from 'vitest'
import {
  RHYTHM_POSITION_COLORS,
  RHYTHM_POSITION_SHORT,
  RHYTHM_POSITION_LABEL,
  RHYTHM_GREY,
  isRhythmPositionIndex,
  positionColor,
  positionShort,
  positionLabel,
} from './rhythmColors'

describe('rhythmColors 仓位唯一副本', () => {
  it('五档色值保持原值不变（冷→暖，0 空 → 4 满）：防漂移黄金值', () => {
    expect(RHYTHM_POSITION_COLORS).toEqual(['#8a6fae', '#2f9e9e', '#4d7cfe', '#f59e0b', '#ef4444'])
  })
  it('灰格色与仓位短码/全称', () => {
    expect(RHYTHM_GREY).toBe('#eceef1')
    expect(RHYTHM_POSITION_SHORT).toEqual(['空', '轻', '半', '重', '满'])
    expect(RHYTHM_POSITION_LABEL).toEqual(['空仓', '轻仓', '半仓', '重仓', '满仓'])
  })
  it('三张表恒 5 档且顺序固定（0→4 与色/短码/全称一一对应）', () => {
    expect(RHYTHM_POSITION_COLORS).toHaveLength(5)
    expect(RHYTHM_POSITION_SHORT).toHaveLength(5)
    expect(RHYTHM_POSITION_LABEL).toHaveLength(5)
  })
  it('isRhythmPositionIndex()：仅 0-4 整数为真（NaN/小数/越界/空值均为假）', () => {
    for (const i of [0, 1, 2, 3, 4]) expect(isRhythmPositionIndex(i)).toBe(true)
    expect(isRhythmPositionIndex(null)).toBe(false)
    expect(isRhythmPositionIndex(undefined)).toBe(false)
    expect(isRhythmPositionIndex(5)).toBe(false)
    expect(isRhythmPositionIndex(-1)).toBe(false)
    expect(isRhythmPositionIndex(1.5)).toBe(false)
    expect(isRhythmPositionIndex(Number.NaN)).toBe(false)
  })
  it('positionColor()：合法档位取色，缺失/越界一律灰格（禁止凭 level 猜档位）', () => {
    expect(positionColor(0)).toBe('#8a6fae')
    expect(positionColor(3)).toBe('#f59e0b')
    expect(positionColor(null)).toBe(RHYTHM_GREY)
    expect(positionColor(undefined)).toBe(RHYTHM_GREY)
    expect(positionColor(5)).toBe(RHYTHM_GREY)
    expect(positionColor(-1)).toBe(RHYTHM_GREY)
  })
  it('positionShort()/positionLabel()：合法档位取表；缺失/越界如实给空串（不伪造）', () => {
    expect(positionShort(0)).toBe('空')
    expect(positionShort(4)).toBe('满')
    expect(positionShort(null)).toBe('')
    expect(positionShort(9)).toBe('')
    expect(positionLabel(0)).toBe('空仓')
    expect(positionLabel(2)).toBe('半仓')
    expect(positionLabel(undefined)).toBe('')
  })
})
