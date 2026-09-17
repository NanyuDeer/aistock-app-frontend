import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildInsightReportUrl } from './downloadInsightReport'

describe('downloadInsightReport URL 构造', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', { getStorageSync: vi.fn(() => 'test-token') })
  })

  it('拼接 report.pdf 路径并编码 eventId', () => {
    const url = buildInsightReportUrl('mv:003018:2026-09-04:1788485647932:up')
    expect(url).toContain('/api/cn/favorites/movements/')
    expect(url).toContain('/report.pdf')
    expect(url).toContain(encodeURIComponent('mv:003018:2026-09-04:1788485647932:up'))
  })
})