import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

/**
 * 主因卡（页面标题「异动原因」）的置信度徽标：仅 `artifactJson.confidence.level === 'high'` 时展示「可信度高」，
 * medium / low 一律不展示（用户要求：低/中置信不再显示，且高置信改文案为「可信度高」）。
 */
const stockTraceMock = vi.hoisted(() => ({
  get: vi.fn(),
  getAnalysis: vi.fn(),
}))
vi.mock('@/shared/api/modules/stockTrace', () => ({ stockTraceApi: stockTraceMock }))

// SubPageCard2 桩（避免渲染 GlobalChatBar/FloatingPodcast 副作用）
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: {
    name: 'SubPageCard2',
    props: ['title', 'subtitle'],
    template: '<view class="subpage-stub"><slot /></view>',
  },
}))

vi.stubGlobal('uni', { showToast: vi.fn(), getStorageSync: vi.fn() })

// onLoad 同步回调（同 insight-detail.spec.ts：setTimeout 会排在 flushPromises 的 setImmediate 之后）
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: (query: Record<string, string>) => void) => { cb({ event_id: 'mv:TEST' }) },
  onUnload: vi.fn(),
}))

import insightDetailMove from './insight-detail-move.vue'

const event = {
  event_id: 'mv:TEST', trigger_revision: 1, symbol: '002342', stock_name: '巨力索具',
  event_type: 'price' as const, direction: 'up' as const, triggered_at: '2026-09-24T13:40:00+08:00',
  latest_price: 8.12, previous_close: 7.54, change_pct: 7.69, threshold_pct: 7,
  severity: 'medium' as const, rule_version: 'v1', analysis_status: 'completed' as const,
}

/** 构造归因结果；候选/主链齐全，使「一句话主因」非空、主因卡得以渲染 */
function analysisWithLevel(level: 'high' | 'medium' | 'low') {
  return {
    event_id: 'mv:TEST',
    trigger_revision: 1,
    processing_status: 'completed' as const,
    artifact: {
      artifactId: 'a1',
      artifactVersion: 0,
      createdAt: '2026-09-24T13:46:00+08:00',
      artifactJson: {
        attribution_status: 'confirmed',
        confidence: { score: 0.78, level },
        primary_chain_id: 'c1',
        candidates: [{
          candidateId: 'c1', rank: 1, layer: 'company', status: 'supported',
          verdict: '公司层面存在未被快照覆盖的基本面变化', supportingEvidenceIds: [],
        }],
        chains: [{ chainId: 'c1', candidateId: 'c1', role: 'primary', nodes: [] }],
      },
      movementView: {},
    },
  }
}

describe('insight-detail-move.vue 主因卡（异动原因）标题与置信度徽标', () => {
  beforeEach(() => {
    stockTraceMock.get.mockReset()
    stockTraceMock.getAnalysis.mockReset()
    stockTraceMock.get.mockResolvedValue(event)
  })

  it('主因卡标题为「异动原因」', async () => {
    stockTraceMock.getAnalysis.mockResolvedValue(analysisWithLevel('high'))
    const wrapper = mount(insightDetailMove)
    await flushPromises()
    expect(wrapper.find('.main-title-row .section-title').text()).toBe('异动原因')
  })

  it('高可信度 → 主因卡右上展示「可信度高」', async () => {
    stockTraceMock.getAnalysis.mockResolvedValue(analysisWithLevel('high'))
    const wrapper = mount(insightDetailMove)
    await flushPromises()
    expect(wrapper.find('.main-title-row .badge').text()).toBe('可信度高')
  })

  it('中可信度 → 不展示徽标', async () => {
    stockTraceMock.getAnalysis.mockResolvedValue(analysisWithLevel('medium'))
    const wrapper = mount(insightDetailMove)
    await flushPromises()
    expect(wrapper.find('.main-title-row .badge').exists()).toBe(false)
  })

  it('低可信度 → 不展示徽标', async () => {
    stockTraceMock.getAnalysis.mockResolvedValue(analysisWithLevel('low'))
    const wrapper = mount(insightDetailMove)
    await flushPromises()
    expect(wrapper.find('.main-title-row .badge').exists()).toBe(false)
  })
})

// ---- 归因失败状态（2026-10-06）：processing_status === 'failed' 须渲染「归因失败」，而非静默 ----
describe('insight-detail-move.vue 归因失败状态展示', () => {
  beforeEach(() => {
    stockTraceMock.get.mockReset()
    stockTraceMock.getAnalysis.mockReset()
    stockTraceMock.get.mockResolvedValue(event)
  })

  it('processing_status = failed → 渲染「归因失败」状态块', async () => {
    stockTraceMock.getAnalysis.mockResolvedValue({
      event_id: 'mv:TEST',
      trigger_revision: 1,
      processing_status: 'failed',
      artifact: null,
    })
    const wrapper = mount(insightDetailMove)
    await flushPromises()
    const status = wrapper.find('.section.status-failed')
    expect(status.exists()).toBe(true)
    expect(status.find('.status-text').text()).toBe('归因失败')
  })

  it('processing_status = failed 时不挂报告入口（非 completed）', async () => {
    stockTraceMock.getAnalysis.mockResolvedValue({
      event_id: 'mv:TEST',
      trigger_revision: 1,
      processing_status: 'failed',
      artifact: null,
    })
    const wrapper = mount(insightDetailMove)
    await flushPromises()
    expect(wrapper.find('.report-actions').exists()).toBe(false)
  })
})
