import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import type { MarketTraceReviewRecord } from '@/shared/api/modules/agent'

const lifecycle = vi.hoisted(() => ({
  onShow: undefined as (() => void) | undefined,
}))

const api = vi.hoisted(() => ({
  getMarketTraceReview: vi.fn(),
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => {
    lifecycle.onShow = callback
  },
}))

vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: api,
}))

vi.mock('@/shared/utils/tradingTime', () => ({
  shanghaiDateString: () => '2026-07-31',
}))

vi.mock('@/shared/components/SubPageCard.vue', () => ({
  default: { template: '<section><slot /></section>' },
}))

vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { template: '<i />' },
}))

vi.mock('@/shared/components', () => {
  const slotStub = { template: '<section><slot /></section>' }
  const buttonStub = {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  }
  const emptyStateStub = {
    props: ['title', 'description', 'text'],
    template: '<section>{{ title || text }}{{ description }}<slot /></section>',
  }
  return {
    Button: buttonStub,
    Card: slotStub,
    EmptyState: emptyStateStub,
    LoadingState: slotStub,
    Badge: slotStub,
    Tag: slotStub,
  }
})

import TraceabilityPage from '@/modules/analytics/pages/traceability.vue'

const report: MarketTraceReviewRecord = {
  report_type: 'review',
  report_date: '2026-07-31',
  status: 'completed',
  data_source: 'review_agent',
  created_at: '2026-07-31T19:25:07.173Z',
  content: {
    schema_version: '2.0',
    display_report: {
      summary: '真实市场摘要',
      details: '# 报告标题\n## 主导现象\n真实分析正文。',
      sectors: ['半导体'],
      risks: ['成交量不足'],
    },
    market_trace: {
      trace: { confidence: 'medium' },
    },
  },
}

const slotStub = { template: '<section><slot /></section>' }

describe('大盘溯源页面', () => {
  beforeEach(() => {
    api.getMarketTraceReview.mockReset()
    lifecycle.onShow = undefined
  })

  it('按上海日期展示真实复盘报告，而不是旧 Mock 内容', async () => {
    api.getMarketTraceReview.mockResolvedValue(report)
    const wrapper = mount(TraceabilityPage, {
      global: {
        stubs: {
          SubPageCard: slotStub,
          Card: slotStub,
          Badge: slotStub,
          Tag: slotStub,
          Button: slotStub,
          EmptyState: slotStub,
          LoadingState: slotStub,
          SvgIcon: { template: '<i />' },
          'rich-text': { props: ['nodes'], template: '<div v-html="nodes" />' },
        },
      },
    })

    lifecycle.onShow?.()
    await flushPromises()

    expect(api.getMarketTraceReview).toHaveBeenCalledWith('2026-07-31')
    expect(wrapper.text()).toContain('真实市场摘要')
    expect(wrapper.text()).toContain('2026-07-31')
    expect(wrapper.text()).toContain('2026-08-01 03:25')
    expect(wrapper.text()).toContain('半导体')
    expect(wrapper.text()).not.toContain('北向资金大幅流入半导体板块')
    expect(wrapper.html()).toContain('<h1 class="md-h1">报告标题</h1>')

    wrapper.unmount()
  })

  it('将未完成报告显示为生成中，而不是服务故障', async () => {
    api.getMarketTraceReview.mockResolvedValue({
      ...report,
      status: 'processing',
    })
    const wrapper = mount(TraceabilityPage, {
      global: {
        stubs: {
          SubPageCard: slotStub,
          Card: slotStub,
          Badge: slotStub,
          Tag: slotStub,
          Button: slotStub,
          EmptyState: {
            props: ['title', 'description', 'text'],
            template: '<section>{{ title || text }}{{ description }}<slot /></section>',
          },
          LoadingState: slotStub,
          SvgIcon: { template: '<i />' },
          'rich-text': { props: ['nodes'], template: '<div v-html="nodes" />' },
        },
      },
    })

    lifecycle.onShow?.()
    await flushPromises()

    expect(wrapper.text()).toContain('复盘报告生成中')
    expect(wrapper.text()).not.toContain('服务暂时不可用')

    wrapper.unmount()
  })

  it('将失败报告显示为不可用，而不是网络故障', async () => {
    api.getMarketTraceReview.mockResolvedValue({
      ...report,
      status: 'failed',
    })
    const wrapper = mount(TraceabilityPage, {
      global: {
        stubs: {
          SubPageCard: slotStub,
          Card: slotStub,
          Badge: slotStub,
          Tag: slotStub,
          Button: slotStub,
          EmptyState: {
            props: ['title', 'description', 'text'],
            template: '<section>{{ title || text }}{{ description }}<slot /></section>',
          },
          LoadingState: slotStub,
          SvgIcon: { template: '<i />' },
          'rich-text': { props: ['nodes'], template: '<div v-html="nodes" />' },
        },
      },
    })

    lifecycle.onShow?.()
    await flushPromises()

    expect(wrapper.text()).toContain('暂无可用的复盘报告')
    expect(wrapper.text()).not.toContain('服务暂时不可用')

    wrapper.unmount()
  })

  it('请求失败后可以通过重试按钮重新加载报告', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.getMarketTraceReview
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(report)
    const wrapper = mount(TraceabilityPage, {
      global: {
        stubs: {
          SubPageCard: slotStub,
          Card: slotStub,
          Badge: slotStub,
          Tag: slotStub,
          Button: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          EmptyState: {
            props: ['title', 'description', 'text'],
            template: '<section>{{ title || text }}{{ description }}<slot /></section>',
          },
          LoadingState: slotStub,
          SvgIcon: { template: '<i />' },
          'rich-text': { props: ['nodes'], template: '<div v-html="nodes" />' },
        },
      },
    })

    lifecycle.onShow?.()
    await flushPromises()
    expect(wrapper.text()).toContain('复盘报告暂不可用')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(api.getMarketTraceReview).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('真实市场摘要')

    wrapper.unmount()
    consoleError.mockRestore()
  })
})
