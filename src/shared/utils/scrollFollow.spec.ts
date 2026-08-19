import { describe, it, expect } from 'vitest'
import { measureProximity, clampScrollTop, SCROLL_FOLLOW_THRESHOLD } from './scrollFollow'

describe('measureProximity 贴底三态判定（5B，2026-08-17）', () => {
  it('测失败（scrollHeight<=0）→ unknown（不打断跟随、不谎称贴底）', () => {
    expect(measureProximity(0, 0, 600)).toBe('unknown')
    expect(measureProximity(123, -1, 600)).toBe('unknown')
  })

  it('真空内容（scrollHeight>0 且距底≤阈值）→ near', () => {
    // remaining = 2000-600-1320 = 80 = 阈值边界 → near
    expect(measureProximity(1320, 2000, 600)).toBe('near')
    expect(measureProximity(1400, 2000, 600)).toBe('near')
  })

  it('距底 > 阈值 → far（用户上滑离开底部）', () => {
    expect(measureProximity(0, 2000, 600)).toBe('far')
    expect(measureProximity(1000, 2000, 600)).toBe('far')
  })

  it('阈值默认 80px（可配置）', () => {
    expect(SCROLL_FOLLOW_THRESHOLD).toBe(80)
  })
})

describe('clampScrollTop（G6 恢复钳制，2026-08-17）', () => {
  it('目标超出可滚范围 → 钳到最大值', () => {
    expect(clampScrollTop(99999, 2000, 600)).toBe(1400)
  })
  it('目标在范围内 → 原样返回', () => {
    expect(clampScrollTop(800, 2000, 600)).toBe(800)
  })
  it('内容不足视口 → 钳到 0', () => {
    expect(clampScrollTop(500, 400, 600)).toBe(0)
  })
})
