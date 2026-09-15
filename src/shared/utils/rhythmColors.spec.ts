import { describe, it, expect } from 'vitest'
import { RHYTHM_LEVEL_COLORS, RHYTHM_LEVEL_SHORT, RHYTHM_GREY, RHYTHM_LEVEL_KEYS } from './rhythmColors'

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
})
