import { describe, it, expect } from 'vitest'
import { localDayKey, decideRhythmRefresh, shouldSetErrorMsg } from './fgRhythmGate'

describe('localDayKey', () => {
  it('月/日补零为 YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 8, 5))).toBe('2026-09-05')
  })
  it('两位月日不加多余零', () => {
    expect(localDayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('decideRhythmRefresh', () => {
  it('主面板无缓存 → 整体重拉', () => {
    expect(decideRhythmRefresh({ hasDashboard: false, dashboardLoadedDay: '', storedSummaryDay: '2026-09-15', today: '2026-09-15' })).toBe('load')
  })
  it('主面板跨日（即使摘要在当日内已新鲜）→ 整体重拉', () => {
    expect(decideRhythmRefresh({ hasDashboard: true, dashboardLoadedDay: '2026-09-14', storedSummaryDay: '2026-09-15', today: '2026-09-15' })).toBe('load')
  })
  it('主面板与摘要当日内均新鲜 → 不动', () => {
    expect(decideRhythmRefresh({ hasDashboard: true, dashboardLoadedDay: '2026-09-15', storedSummaryDay: '2026-09-15', today: '2026-09-15' })).toBe('none')
  })
  it('主面板新鲜、摘要从未成功（存储为空）→ 只补拉摘要（不连带重拉主面板）', () => {
    expect(decideRhythmRefresh({ hasDashboard: true, dashboardLoadedDay: '2026-09-15', storedSummaryDay: null, today: '2026-09-15' })).toBe('summary')
  })
  it('主面板新鲜、摘要为昨日（昨日拉取失败未写存储之外的跨日场景）→ 只补拉摘要', () => {
    expect(decideRhythmRefresh({ hasDashboard: true, dashboardLoadedDay: '2026-09-15', storedSummaryDay: '2026-09-14', today: '2026-09-15' })).toBe('summary')
  })
  it('主面板与摘要同时跨日 → 整体重拉（不重复补拉摘要）', () => {
    expect(decideRhythmRefresh({ hasDashboard: true, dashboardLoadedDay: '2026-09-14', storedSummaryDay: '2026-09-14', today: '2026-09-15' })).toBe('load')
  })
})

describe('shouldSetErrorMsg', () => {
  it('无缓存 → 置错误态', () => {
    expect(shouldSetErrorMsg(false)).toBe(true)
  })
  it('有缓存 → 保留数据不置错误态（策略冻结）', () => {
    expect(shouldSetErrorMsg(true)).toBe(false)
  })
})
