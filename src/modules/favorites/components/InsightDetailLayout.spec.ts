import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { WatchlistInsight } from '@/shared/api/modules/insight'

// SvgIcon 必桩
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

import InsightDetailLayout from './InsightDetailLayout.vue'

const confirmedDetail: WatchlistInsight = {
  event_id: 'evt_001',
  symbol: '600519',
  stock_name: '贵州茅台',
  trade_date: '2026-08-07',
  event_type: 'limit_up_radar',
  direction: 'up',
  attribution_status: 'confirmed',
  confidence: 'high',
  primary_driver: {
    label: '白酒批价企稳叠加旺季备货',
    category: 'industry_theme',
    confidence: 'high',
  },
  secondary_drivers: [
    { label: '直销占比提升', category: 'company_event', confidence: 'medium' },
  ],
  display_report: {
    summary: '批价企稳 + 旺季备货双击',
    details: '飞天批价企稳回升确认渠道库存去化，旺季备货需求逐步释放。',
  },
  title: '贵州茅台放量拉升，白酒板块集体走强',
  keywords: ['放量拉升', '白酒', '批价'],
  published_at: '2026-08-07 10:30',
  source_url: 'https://example.com/news/001',
  created_at: '2026-08-07T10:45:00+08:00',
}

const unconfirmedDetail: WatchlistInsight = {
  ...confirmedDetail,
  event_id: 'evt_002',
  attribution_status: 'unconfirmed',
  confidence: 'unconfirmed',
  primary_driver: null,
  secondary_drivers: [],
  display_report: undefined,
}

describe('InsightDetailLayout', () => {
  it('渲染头部卡（股票名、代码、日期、direction Tag）', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    const header = wrapper.find('.insight-detail-layout__header')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('贵州茅台')
    expect(header.text()).toContain('600519')
    expect(header.text()).toContain('2026-08-07')
  })

  it('primary_driver 存在 → 渲染主因卡', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    const primary = wrapper.find('.insight-detail-layout__primary')
    expect(primary.exists()).toBe(true)
    expect(primary.text()).toContain('白酒批价企稳叠加旺季备货')
    expect(primary.text()).toContain('行业题材')
    expect(primary.text()).toContain('高置信')
  })

  it('primary_driver 为 null → 不渲染主因卡', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: unconfirmedDetail } })
    expect(wrapper.find('.insight-detail-layout__primary').exists()).toBe(false)
  })

  it('secondary_drivers 非空 → 渲染次因卡', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    const secondary = wrapper.find('.insight-detail-layout__secondary')
    expect(secondary.exists()).toBe(true)
    expect(secondary.text()).toContain('直销占比提升')
  })

  it('secondary_drivers 为空 → 不渲染次因卡', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: unconfirmedDetail } })
    expect(wrapper.find('.insight-detail-layout__secondary').exists()).toBe(false)
  })

  it('attribution_status=unconfirmed → 渲染待验证提示条', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: unconfirmedDetail } })
    const warn = wrapper.find('.insight-detail-layout__warn')
    expect(warn.exists()).toBe(true)
    expect(warn.text()).toContain('主因待验证')
  })

  it('attribution_status=confirmed → 不渲染待验证提示条', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    expect(wrapper.find('.insight-detail-layout__warn').exists()).toBe(false)
  })

  it('display_report.details 存在 → 渲染详情卡', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    const report = wrapper.find('.insight-detail-layout__report')
    expect(report.exists()).toBe(true)
    expect(report.text()).toContain('飞天批价企稳回升')
  })

  it('display_report 不存在 → 不渲染详情卡', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: unconfirmedDetail } })
    expect(wrapper.find('.insight-detail-layout__report').exists()).toBe(false)
  })

  it('渲染来源卡（标题、关键词、发布时间）', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    const source = wrapper.find('.insight-detail-layout__source')
    expect(source.exists()).toBe(true)
    expect(source.text()).toContain('贵州茅台放量拉升')
    expect(source.text()).toContain('放量拉升')
    expect(source.text()).toContain('2026-08-07 10:30')
  })

  it('点击来源卡 → 触发 open-source 事件', async () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    const source = wrapper.find('.insight-detail-layout__source')
    await source.trigger('tap')
    expect(wrapper.emitted('open-source')).toBeTruthy()
  })

  it('direction=up → 主因卡左侧色条 is-up 类', () => {
    const wrapper = mount(InsightDetailLayout, { props: { detail: confirmedDetail } })
    const bar = wrapper.find('.insight-detail-layout__primary-bar')
    expect(bar.classes()).toContain('is-up')
  })

  it('direction=down → 主因卡左侧色条 is-down 类', () => {
    const wrapper = mount(InsightDetailLayout, {
      props: { detail: { ...confirmedDetail, direction: 'down' } },
    })
    const bar = wrapper.find('.insight-detail-layout__primary-bar')
    expect(bar.classes()).toContain('is-down')
  })
})
