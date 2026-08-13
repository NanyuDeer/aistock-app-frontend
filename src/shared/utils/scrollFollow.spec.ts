import { describe, it, expect } from 'vitest'
import { isNearBottom, SCROLL_FOLLOW_THRESHOLD } from './scrollFollow'

describe('isNearBottom 贴底判定（改进 16 滚动跟随）', () => {
  it('内容高度未知（<=0）→ 视为贴底（不打断跟随，避免误判上滑）', () => {
    expect(isNearBottom(0, 0, 600)).toBe(true)
    expect(isNearBottom(123, -1, 600)).toBe(true)
  })

  it('距底距离 ≤ 阈值 → 贴底', () => {
    // remaining = scrollHeight - viewport - scrollTop = 2000-600-1320 = 80 = 阈值边界 → 贴底
    expect(isNearBottom(1320, 2000, 600)).toBe(true)
    expect(isNearBottom(1400, 2000, 600)).toBe(true)
  })

  it('距底距离 > 阈值 → 用户上滑离开底部，暂停跟随', () => {
    expect(isNearBottom(0, 2000, 600)).toBe(false)
    expect(isNearBottom(1000, 2000, 600)).toBe(false)
  })

  it('阈值默认 80px（可配置）', () => {
    expect(SCROLL_FOLLOW_THRESHOLD).toBe(80)
  })
})
