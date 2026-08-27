import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DeepAnalysisCard from './DeepAnalysisCard.vue'
import DeepSummaryCard from '../DeepSummaryCard.vue'
import type { ChatCard, DeepReportRef } from '@/shared/api/modules/agent'

// SvgIcon 桩：DeepSummaryCard 使用，避免依赖 svg-cache（与既有测试约定一致）
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// mp-html 桩：真实包内 node/node.vue 含 <script module="handler" lang="wxs">（WXS 模块），
// 非 uni-app 的 vite vue 插件无法编译该 SFC → 测试环境用 v-html 桩替代（保留既有文案断言）。
// 注：该限制为存量环境问题（CardRenderer.spec 同样受影响），此处仅测试内规避，不改业务代码。
vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: {
    name: 'mp-html',
    props: ['content'],
    template: '<view class="mp-html-stub" v-html="content"></view>',
  },
}))

// uni 全局桩：断言 navigateTo 精确跳转
vi.stubGlobal('uni', { navigateTo: vi.fn() })

// 共用 fixture（模块级，供 DeepAnalysisCard / DeepSummaryCard 两组用例复用）
const card: ChatCard = {
  card_type: 'deep',
  title: '深度分析',
  data: {
    worker: 'stock',
    report_id: 'r1',
    question: '分析贵州茅台',
    summary: '公司基本面稳健，估值处于历史中位。',
    symbols: ['600519', '000858'],
    tag_codes: ['白酒', '消费'],
    created_at: '2026-08-05T10:00:00+08:00',
  },
}

describe('DeepAnalysisCard', () => {
  it('渲染 worker 标签 / summary / symbols 标签', () => {
    const wrapper = mount(DeepAnalysisCard, { props: { card } })
    expect(wrapper.text()).toContain('深度分析')
    expect(wrapper.text()).toContain('个股')
    expect(wrapper.text()).toContain('公司基本面稳健')
    expect(wrapper.text()).toContain('600519')
    expect(wrapper.text()).toContain('白酒')
  })

  it('缺 summary/symbols 时容错（头部仍渲染）', () => {
    const wrapper = mount(DeepAnalysisCard, {
      props: { card: { ...card, data: { worker: 'hot_burst' } } },
    })
    expect(wrapper.find('.da-header').exists()).toBe(true)
  })
})

// ─── 改进 19（批次 2，Task 5）：深度卡片跳转报告详情入口 ───

describe('DeepAnalysisCard 跳转入口（改进19）', () => {
  beforeEach(() => {
    vi.mocked(uni.navigateTo).mockClear()
  })

  it('report_id 存在：整卡 tap → navigateTo 报告详情（精确 URL）', async () => {
    const wrapper = mount(DeepAnalysisCard, { props: { card } })
    await wrapper.find('.da-card').trigger('tap')
    expect(uni.navigateTo).toHaveBeenCalledTimes(1)
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/modules/chat/pages/chat-report-detail?reportId=r1' })
  })

  it('report_id 为 undefined/null/空串：tap 不跳转、不发请求', async () => {
    for (const rid of [undefined, null, '']) {
      const wrapper = mount(DeepAnalysisCard, {
        props: { card: { ...card, data: { ...card.data, report_id: rid } } },
      })
      await wrapper.find('.da-card').trigger('tap')
    }
    expect(uni.navigateTo).not.toHaveBeenCalled()
  })

  it('report_id 缺失：整卡无点击态（hover-class 为 none）', () => {
    const wrapper = mount(DeepAnalysisCard, {
      props: { card: { ...card, data: { worker: 'stock', summary: '摘要' } } },
    })
    expect(wrapper.find('.da-card').attributes('hover-class')).toBe('none')
  })
})

describe('DeepSummaryCard 跳转入口（改进19）', () => {
  const base: DeepReportRef = {
    worker: 'stock',
    summary: '公司基本面稳健。',
    symbols: ['600519'],
    created_at: '2026-08-05T10:00:00+08:00',
  }

  beforeEach(() => {
    vi.mocked(uni.navigateTo).mockClear()
  })

  it('report_id 存在：渲染详情子按钮，点击 → navigateTo 报告详情（精确 URL）', async () => {
    const wrapper = mount(DeepSummaryCard, { props: { report: { ...base, report_id: 'r1' } } })
    expect(wrapper.find('.ds-detail').exists()).toBe(true)
    await wrapper.find('.ds-detail').trigger('tap')
    expect(uni.navigateTo).toHaveBeenCalledTimes(1)
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/modules/chat/pages/chat-report-detail?reportId=r1' })
  })

  it('report_id 为 undefined/null/空串：不渲染详情子按钮、不跳转', () => {
    for (const rid of [undefined, null, '']) {
      const wrapper = mount(DeepSummaryCard, { props: { report: { ...base, report_id: rid } } })
      expect(wrapper.find('.ds-detail').exists()).toBe(false)
    }
    expect(uni.navigateTo).not.toHaveBeenCalled()
  })

  it('展开切换与跳转共存：header 只展开/折叠不跳转，详情按钮只跳转不折叠', async () => {
    const wrapper = mount(DeepSummaryCard, { props: { report: { ...base, report_id: 'r1' } } })
    // 展开：summary 可见，不跳转
    await wrapper.find('.ds-header').trigger('tap')
    expect(wrapper.find('.ds-summary').exists()).toBe(true)
    expect(uni.navigateTo).not.toHaveBeenCalled()
    // 折叠
    await wrapper.find('.ds-header').trigger('tap')
    expect(wrapper.find('.ds-summary').exists()).toBe(false)
    expect(uni.navigateTo).not.toHaveBeenCalled()
    // 详情按钮：跳转，且折叠状态不受影响（此时仍为折叠）
    await wrapper.find('.ds-detail').trigger('tap')
    expect(uni.navigateTo).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.ds-summary').exists()).toBe(false)
  })
})
