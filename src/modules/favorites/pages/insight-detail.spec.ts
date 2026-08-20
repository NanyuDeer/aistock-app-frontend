import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// mock API
const insightApiMock = vi.hoisted(() => ({
  getInsightDetail: vi.fn(),
}))
vi.mock('@/shared/api/modules/insight', () => ({
  watchlistInsightApi: insightApiMock,
}))

// 测试数据：本地内联，不依赖 mock-data.ts（已移除）
const testDetail = {
  event_id: 'd1', symbol: '600519', stock_name: '贵州茅台',
  trade_date: '2026-08-07', event_type: 'limit_up_radar',
  direction: 'up', attribution_status: 'confirmed', confidence: 'high',
  primary_driver: { label: '白酒板块', category: 'industry_theme', confidence: 'high' },
  secondary_drivers: [{ label: '直销占比', category: 'company_event', confidence: 'medium' }],
  display_report: { summary: '摘要', details: '详情内容' },
  source_id: 's1',
  title: '原始来源标题',
  keywords: ['白酒', '批价'],
  published_at: '2026-08-07 10:30',
  source_url: 'https://example.com/001',
  created_at: '2026-08-07T10:45:00+08:00',
}

// SubPageCard2 桩（避免渲染 GlobalChatBar/FloatingPodcast 副作用）
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: {
    name: 'SubPageCard2',
    props: ['title', 'subtitle'],
    template: '<view class="subpage-stub"><slot /></view>',
  },
}))

// InsightResultBlock 桩（避免渲染真实组件，专注验证页面层逻辑）
vi.mock('@/shared/components/InsightResultBlock.vue', () => ({
  default: {
    name: 'InsightResultBlock',
    props: ['insight'],
    template: '<view class="irb-stub" />',
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
    vi.mocked(uni.navigateTo).mockClear()
    vi.mocked(uni.setClipboardData).mockClear()
  })

  it('加载中 → 渲染加载状态', () => {
    insightApiMock.getInsightDetail.mockReturnValue(new Promise(() => {})) // 永不 resolve
    const wrapper = mount(insightDetail)
    expect(wrapper.find('.state').exists()).toBe(true)
    expect(wrapper.find('.state').text()).toContain('加载中')
  })

  it('接口成功 → 渲染 InsightResultBlock', async () => {
    insightApiMock.getInsightDetail.mockResolvedValue(testDetail)
    const wrapper = mount(insightDetail)
    await flushPromises()
    const block = wrapper.findComponent({ name: 'InsightResultBlock' })
    expect(block.exists()).toBe(true)
    expect(block.props('insight').event_id).toBe('d1')
  })

  it('接口返回空 → 展示空状态', async () => {
    insightApiMock.getInsightDetail.mockResolvedValue(null)
    const wrapper = mount(insightDetail)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'InsightResultBlock' }).exists()).toBe(false)
    expect(wrapper.find('.state').exists()).toBe(true)
  })

  it('接口失败 → 展示空状态', async () => {
    insightApiMock.getInsightDetail.mockRejectedValue(new Error('network'))
    const wrapper = mount(insightDetail)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'InsightResultBlock' }).exists()).toBe(false)
    expect(wrapper.find('.state').exists()).toBe(true)
  })

  it('点击原始来源 → 调用 openSource（H5 window.open）', async () => {
    // H5 平台 openSource 走 window.open
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    insightApiMock.getInsightDetail.mockResolvedValue(testDetail)
    const wrapper = mount(insightDetail)
    await flushPromises()
    await wrapper.find('.src').trigger('tap')
    await flushPromises()
    expect(openSpy).toHaveBeenCalledWith('https://example.com/001', '_blank', 'noopener')
    openSpy.mockRestore()
  })

  it('渲染 SubPageCard2 容器（title="洞察详情"）', async () => {
    insightApiMock.getInsightDetail.mockResolvedValue(testDetail)
    const wrapper = mount(insightDetail)
    await flushPromises()
    const subPage = wrapper.findComponent({ name: 'SubPageCard2' })
    expect(subPage.exists()).toBe(true)
    expect(subPage.props('title')).toBe('洞察详情')
  })
})
