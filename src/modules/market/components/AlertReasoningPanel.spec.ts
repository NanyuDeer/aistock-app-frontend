import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertReasoningPanel from './AlertReasoningPanel.vue'
import type { ReasoningStep } from '@/shared/api/modules/agent'

// mp-html 的 uni-app 版 SFC 无法在 vitest 的 @vue/compiler-sfc 下解析（含 uni 特有语法及 node.vue 多 script 块），
// 单测场景仅需占位渲染 content prop，模块级 mock 替代真实组件（沿用 chat 侧 ReasoningPanel.spec 既有 mock 做法）。
vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: { name: 'mp-html', props: ['content'], template: '<div><slot />{{ content }}</div>' },
}))

const step = (
  over: Partial<{ node: string; text: string; status: 'streaming' | 'done' | 'failed' }> = {},
) => ({
  node: 'alert_scan', text: '我在并行核查资讯与盘口', status: 'streaming',
  startAt: Date.now(), ...over,
}) as ReasoningStep

describe('AlertReasoningPanel', () => {
  it('steps 为空时不渲染', () => {
    const w = mount(AlertReasoningPanel, { props: { steps: [] } })
    expect(w.find('.alert-reasoning-panel').exists()).toBe(false)
  })

  it('渲染标题与步数', () => {
    const w = mount(AlertReasoningPanel, {
      props: { steps: [step(), step({ node: 'alert_master' })] },
    })
    expect(w.text()).toContain('AI 思考过程')
    expect(w.text()).toContain('2 步')
  })

  it('有 streaming 步骤时默认展开', () => {
    const w = mount(AlertReasoningPanel, { props: { steps: [step()] } })
    expect(w.find('.arp-think-body').exists()).toBe(true)
    expect(w.find('.arp-step.streaming').exists()).toBe(true)
  })

  it('全部 done 时默认折叠，点击头部后展开', async () => {
    const w = mount(AlertReasoningPanel, {
      props: { steps: [step({ status: 'done' })] },
    })
    expect(w.find('.arp-think-body').exists()).toBe(false)
    await w.find('.arp-think-header').trigger('tap')
    expect(w.find('.arp-think-body').exists()).toBe(true)
  })

  it('节点名映射为中文', () => {
    const w = mount(AlertReasoningPanel, {
      props: { steps: [step({ node: 'alert_scan' }), step({ node: 'alert_master' })] },
    })
    expect(w.text()).toContain('多维分析')
    expect(w.text()).toContain('汇聚研判')
  })

  // Task 7 复审问题 2：expanded 只在 setup 时求值，对 props 后续变化不响应。
  it('props 后续新增 streaming 步骤时自动展开（实时解说可见）', async () => {
    const w = mount(AlertReasoningPanel, { props: { steps: [] } })
    // 初值为空 → 面板不渲染
    expect(w.find('.alert-reasoning-panel').exists()).toBe(false)
    // 首个 streaming 步骤流式到达 → 面板出现且应自动展开
    await w.setProps({ steps: [step()] })
    expect(w.find('.alert-reasoning-panel').exists()).toBe(true)
    expect(w.find('.arp-think-body').exists()).toBe(true)
  })

  // 用户手动折叠后，后续 streaming 步骤不得把面板抢着展开（尊重用户操作优先）
  it('用户手动折叠后 streaming 不被抢展开', async () => {
    const w = mount(AlertReasoningPanel, { props: { steps: [step()] } })
    expect(w.find('.arp-think-body').exists()).toBe(true)
    await w.find('.arp-think-header').trigger('tap')
    expect(w.find('.arp-think-body').exists()).toBe(false)
    // 传入另一个 streaming 步骤（不同 node），仍应保持折叠
    await w.setProps({ steps: [step({ node: 'alert_master', text: '我在汇聚多方信号' })] })
    expect(w.find('.arp-think-body').exists()).toBe(false)
  })
})