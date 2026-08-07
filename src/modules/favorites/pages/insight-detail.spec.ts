import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// mock API
const insightApiMock = vi.hoisted(() => ({
  getInsightDetail: vi.fn(),
}))
vi.mock('@/shared/api/modules/insight', () => ({
  watchlistInsightApi: insightApiMock,
}))

// mock mock-data
const mockDataMock = vi.hoisted(() => ({
  mockWatchlistInsights: [
    {
      event_id: 'd1', symbol: '600519', stock_name: '贵州茅台',
      trade_date: '2026-08-07', event_type: 'limit_up_radar',
      direction: 'up', attribution_status: 'confirmed', confidence: 'high',
      primary_driver: { label: '白酒板块', category: 'industry_theme', confidence: 'high' },
      secondary_drivers: [{ label: '直销占比', category: 'company_event', confidence: 'medium' }],
      display_report: { summary: '摘要', details: '详情内容' },
      title: '原始来源标题',
      keywords: ['白酒', '批价'],
      published_at: '2026-08-07 10:30',
      source_url: 'https://example.com/001',
      created_at: '2026-08-07T10:45:00+08:00',
    },
  ],
  isInsightsMockForced: vi.fn(() => false),
}))
vi.mock('../mock-data', () => mockDataMock)

// SvgIcon 桩
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// SubPageCard2 桩（避免渲染 GlobalChatBar/FloatingPodcast 副作用）
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: {
    name: 'SubPageCard2',
    props: ['title', 'subtitle'],
    template: '<view class="subpage-stub"><slot /></view>',
  },
}))

// InsightDetailLayout 桩（避免渲染真实组件，专注验证页面层逻辑）
vi.mock('@/modules/favorites/components/InsightDetailLayout.vue', () => ({
  default: {
    name: 'InsightDetailLayout',
    props: ['detail'],
    emits: ['open-source'],
    template: '<view class="insight-detail-layout-stub" :data-event-id="detail.event_id" />',
  },
}))

// uni 全局
vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
  setClipboardData: vi.fn(),
})

// mock onLoad query（同步调用 cb，模拟 uni-app onLoad 生命周期；
// 用 setTimeout 会导致 flushPromises 的 setImmediate 先于 setTimeout 触发，断言时 cb 尚未执行）
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: (query: Record<string, string>) => void) => {
    // 默认模拟 event_id=d1
    cb({ event_id: 'd1' })
  },
}))

import insightDetail from './insight-detail.vue'

describe('insight-detail.vue 洞察详情页', () => {
  beforeEach(() => {
    insightApiMock.getInsightDetail.mockReset()
    mockDataMock.isInsightsMockForced.mockReset()
    mockDataMock.isInsightsMockForced.mockReturnValue(false)
    vi.mocked(uni.navigateTo).mockClear()
    vi.mocked(uni.setClipboardData).mockClear()
  })

  it('加载中 → 渲染 LoadingState', () => {
    insightApiMock.getInsightDetail.mockReturnValue(new Promise(() => {})) // 永不 resolve
    const wrapper = mount(insightDetail)
    expect(wrapper.findComponent({ name: 'LoadingState' }).exists()).toBe(true)
  })

  it('接口成功 → 渲染 InsightDetailLayout', async () => {
    insightApiMock.getInsightDetail.mockResolvedValue(mockDataMock.mockWatchlistInsights[0])
    const wrapper = mount(insightDetail)
    await flushPromises()
    const layout = wrapper.findComponent({ name: 'InsightDetailLayout' })
    expect(layout.exists()).toBe(true)
    expect(layout.props('detail').event_id).toBe('d1')
  })

  it('接口返回空 → 回退 mock，仍渲染 InsightDetailLayout', async () => {
    insightApiMock.getInsightDetail.mockResolvedValue(null)
    const wrapper = mount(insightDetail)
    await flushPromises()
    const layout = wrapper.findComponent({ name: 'InsightDetailLayout' })
    expect(layout.exists()).toBe(true)
    expect(layout.props('detail').event_id).toBe('d1')
  })

  it('接口失败 → 回退 mock，仍渲染 InsightDetailLayout', async () => {
    insightApiMock.getInsightDetail.mockRejectedValue(new Error('network'))
    const wrapper = mount(insightDetail)
    await flushPromises()
    const layout = wrapper.findComponent({ name: 'InsightDetailLayout' })
    expect(layout.exists()).toBe(true)
  })

  it('InsightDetailLayout 触发 open-source → 调用 openSource（H5 window.open）', async () => {
    // H5 平台 openSource 走 window.open
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    insightApiMock.getInsightDetail.mockResolvedValue(mockDataMock.mockWatchlistInsights[0])
    const wrapper = mount(insightDetail)
    await flushPromises()
    const layout = wrapper.findComponent({ name: 'InsightDetailLayout' })
    layout.vm.$emit('open-source')
    await flushPromises()
    expect(openSpy).toHaveBeenCalledWith('https://example.com/001', '_blank', 'noopener')
    openSpy.mockRestore()
  })

  it('渲染 SubPageCard2 容器（title="洞察详情"）', async () => {
    insightApiMock.getInsightDetail.mockResolvedValue(mockDataMock.mockWatchlistInsights[0])
    const wrapper = mount(insightDetail)
    await flushPromises()
    const subPage = wrapper.findComponent({ name: 'SubPageCard2' })
    expect(subPage.exists()).toBe(true)
    expect(subPage.props('title')).toBe('洞察详情')
  })
})
