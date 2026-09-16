import { describe, it, expect } from 'vitest'
import { RHYTHM_LEVEL_COLORS, RHYTHM_LEVEL_SHORT, RHYTHM_GREY, RHYTHM_LEVEL_KEYS, isRhythmLevelKey, levelShort } from './rhythmColors'

describe('rhythmColors 唯一副本', () => {
  it('五档色值以 RhythmCalendarPanel 现值为准（防漂移黄金值）', () => {
    expect(RHYTHM_LEVEL_COLORS).toEqual({
      ice: '#8a6fae', low: '#2f9e9e', normal: '#4d7cfe', active: '#f59e0b', euphoria: '#ef4444',
    })
  })
  it('灰格色与短码', () => {
    expect(RHYTHM_GREY).toBe('#eceef1')
    expect(RHYTHM_LEVEL_SHORT).toEqual({ ice: '冰', low: '低', normal: '常', active: '活', euphoria: '亢' })
  })
  it('LEVEL_KEYS 恒 5 档且顺序固定', () => {
    expect(RHYTHM_LEVEL_KEYS).toEqual(['ice', 'low', 'normal', 'active', 'euphoria'])
  })
  it('短码键完整性：RHYTHM_LEVEL_SHORT 的键集恒等于 RHYTHM_LEVEL_KEYS（收紧为 Record<RhythmLevelKey,string> 后定义处漏键即编译报错）', () => {
    expect(Object.keys(RHYTHM_LEVEL_SHORT)).toEqual(RHYTHM_LEVEL_KEYS)
  })
  it('levelShort()：已知档位回短码；未知档位/空值如实回退首字母（不伪造）', () => {
    expect(levelShort('active')).toBe('活')
    expect(levelShort('fomo')).toBe('f')
    expect(levelShort(null)).toBe('')
    expect(levelShort(undefined)).toBe('')
    expect(levelShort('toString')).toBe('t')
  })
  it('isRhythmLevelKey()：仅五档键为真（原型链键不算）', () => {
    expect(isRhythmLevelKey('ice')).toBe(true)
    expect(isRhythmLevelKey('fomo')).toBe(false)
    expect(isRhythmLevelKey(null)).toBe(false)
    expect(isRhythmLevelKey('')).toBe(false)
    expect(isRhythmLevelKey('toString')).toBe(false)
    expect(isRhythmLevelKey('constructor')).toBe(false)
  })
})
