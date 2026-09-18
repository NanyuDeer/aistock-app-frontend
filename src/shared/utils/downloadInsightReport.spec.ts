import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock constants 确保 vitest 中 API_BASE_URL 恒为 /api（避免 App fallback 干扰精确断言）
vi.mock('@/shared/utils/constants', () => ({
  API_BASE_URL: '/api',
}))

import { buildInsightReportUrl, downloadInsightReport } from './downloadInsightReport'

describe('buildInsightReportUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', { getStorageSync: vi.fn(() => 'test-token') })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('精确拼接报告 URL：base=/api 时期望 /api/cn/favorites/movements/<encoded>/report.pdf', () => {
    const eventId = 'mv:003018:2026-09-04:1788485647932:up'
    const url = buildInsightReportUrl(eventId)
    expect(url).toBe(`/api/cn/favorites/movements/${encodeURIComponent(eventId)}/report.pdf`)
  })
})

describe('downloadInsightReport (H5 分支)', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', { getStorageSync: vi.fn(() => 'test-token') })
    // URL.createObjectURL / revokeObjectURL happy-dom 已实现，覆写为 mock
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock') as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('409 → reject 该异动暂无完整归因', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 409 })
    vi.stubGlobal('fetch', mockFetch)
    await expect(downloadInsightReport('test-event')).rejects.toThrow('该异动暂无完整归因')
  })

  it('非 200（如 500）→ reject 报告生成失败，请重试', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 500 })
    vi.stubGlobal('fetch', mockFetch)
    await expect(downloadInsightReport('test-event')).rejects.toThrow('报告生成失败，请重试')
  })

  it('200 → resolve 并触发下载（createObjectURL 被调用）', async () => {
    const blob = new Blob(['fake-pdf'], { type: 'application/pdf' })
    const mockFetch = vi.fn().mockResolvedValue({ status: 200, blob: () => Promise.resolve(blob) })
    vi.stubGlobal('fetch', mockFetch)

    await downloadInsightReport('test-event')

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
  })

  it('DOM 操作抛错时仍释放 objectUrl', async () => {
    const blob = new Blob(['fake-pdf'], { type: 'application/pdf' })
    const mockFetch = vi.fn().mockResolvedValue({ status: 200, blob: () => Promise.resolve(blob) })
    vi.stubGlobal('fetch', mockFetch)
    const origAppendChild = document.body.appendChild
    document.body.appendChild = vi.fn(() => { throw new Error('DOM error') }) as typeof origAppendChild

    await expect(downloadInsightReport('test-event')).rejects.toThrow('DOM error')
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
  })
})
