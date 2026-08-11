import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReasoningPanel from './ReasoningPanel.vue'
import type { ReasoningStep, ExecStepNode } from '@/shared/api/modules/agent'

// mp-html 的 uni-app 版 SFC 无法在 vitest 的 @vue/compiler-sfc 下解析（含 uni 特有语法），
// 单测场景仅需占位渲染 content prop，模块级 mock 替代真实组件（沿用 ReasoningPanel.spec 既有 mock 做法）。
vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: { name: 'mp-html', props: ['content'], template: '<div><slot />{{ content }}</div>' },
}))

describe('ReasoningPanel', () => {
  const steps: ReasoningStep[] = [
    { node: 'qa_router', text: '我先把问题拆解为两步', status: 'done', startAt: 1000, endAt: 2000 },
    { node: 'skill_executor', text: '正在收集 600519 的行情', status: 'done', startAt: 2000, endAt: 3000 },
  ]
  const execSteps: ExecStepNode[] = [
    {
      node: 'skill_executor',
      label: '收集证据',
      startAt: 1000,
      endAt: 2000,
      tools: [{ tool: 'get_quote', label: '查询个股行情', startAt: 1000, endAt: 1500, status: 'done' }],
      thinkingMs: 200,
    },
  ]

  it('思考链默认折叠，显示步数', () => {
    const wrapper = mount(ReasoningPanel, { props: { steps, execSteps } })
    expect(wrapper.text()).toContain('AI 思考过程')
    expect(wrapper.text()).toContain('2 步')
  })

  it('点击思考链头展开显示 step 文本（node label 映射）', async () => {
    const wrapper = mount(ReasoningPanel, { props: { steps, execSteps } })
    await wrapper.find('.rp-think-header').trigger('tap')
    expect(wrapper.text()).toContain('我先把问题拆解为两步')
    expect(wrapper.text()).toContain('理解问题')
  })

  it('执行细节子区独立折叠，默认收起，点击展开显示节点/工具', async () => {
    const wrapper = mount(ReasoningPanel, { props: { steps, execSteps } })
    // 默认收起：不显示工具名
    expect(wrapper.text()).not.toContain('查询个股行情')
    await wrapper.find('.rp-exec-header').trigger('tap')
    expect(wrapper.text()).toContain('执行细节')
    expect(wrapper.text()).toContain('查询个股行情')
  })

  it('两个展开状态互不影响（思考链折叠时执行细节可展开）', async () => {
    const wrapper = mount(ReasoningPanel, { props: { steps, execSteps } })
    await wrapper.find('.rp-exec-header').trigger('tap')
    expect(wrapper.text()).toContain('查询个股行情')
    expect(wrapper.text()).not.toContain('我先把问题拆解为两步')
  })

  it('streaming 步骤高亮（dot 动画承接 P3-fix-2）', () => {
    const streamingSteps: ReasoningStep[] = [
      { node: 'qa_router', text: 'thinking...', status: 'streaming', startAt: 1000 },
    ]
    const wrapper = mount(ReasoningPanel, { props: { steps: streamingSteps, execSteps: [] } })
    expect(wrapper.find('.rp-step.streaming').exists()).toBe(true)
  })

  it('steps 与 execSteps 均为空时不渲染', () => {
    const wrapper = mount(ReasoningPanel, { props: { steps: [], execSteps: [] } })
    expect(wrapper.find('.reasoning-panel').exists()).toBe(false)
  })

  it('改进14：容器为卡片风格（reasoning-panel class 存在）', () => {
    const wrapper = mount(ReasoningPanel, { props: { steps, execSteps } })
    const panel = wrapper.find('.reasoning-panel')
    expect(panel.exists()).toBe(true)
  })

  it('改进14：思考链头部含卡片容器结构', () => {
    const wrapper = mount(ReasoningPanel, { props: { steps, execSteps } })
    expect(wrapper.find('.rp-think').exists()).toBe(true)
    expect(wrapper.find('.rp-think-header').exists()).toBe(true)
  })
})
