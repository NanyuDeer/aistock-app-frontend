import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReasoningCard from './ReasoningCard.vue'
import type { ReasoningStep } from '@/shared/api/modules/agent'

// mp-html 的 uni-app 版 SFC 无法在 vitest 的 @vue/compiler-sfc 下解析（含 uni 特有语法），
// 单测场景仅需占位渲染 content prop，模块级 mock 替代真实组件。
vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: { name: 'mp-html', props: ['content'], template: '<div><slot />{{ content }}</div>' },
}))

describe('ReasoningCard', () => {
  const steps: ReasoningStep[] = [
    { node: 'qa_router', text: '我先把问题拆解为两步', status: 'done', startAt: 1000, endAt: 2000 },
    { node: 'skill_executor', text: '正在收集 600519 的行情', status: 'done', startAt: 2000, endAt: 3000 },
  ]

  it('renders collapsed by default with step count', () => {
    const wrapper = mount(ReasoningCard, { props: { steps } })
    expect(wrapper.text()).toContain('AI 思考过程')
    expect(wrapper.text()).toContain('2 步')
  })

  it('expands to show step text on tap', async () => {
    const wrapper = mount(ReasoningCard, { props: { steps } })
    await wrapper.find('.rc-header').trigger('tap')
    expect(wrapper.text()).toContain('我先把问题拆解为两步')
  })

  it('highlights streaming step', () => {
    const streamingSteps: ReasoningStep[] = [
      { node: 'qa_router', text: 'thinking...', status: 'streaming', startAt: 1000 },
    ]
    const wrapper = mount(ReasoningCard, { props: { steps: streamingSteps } })
    expect(wrapper.find('.rc-step.streaming').exists()).toBe(true)
  })
})
