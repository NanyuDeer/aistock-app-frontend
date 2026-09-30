import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// 供 vi.mock 工厂引用的多态 ref：必须用 vi.hoisted —— vitest 会把 vi.mock 提升到模块顶部执行，
// 若用文件底部的 const 声明则工厂真正执行时仍处于 TDZ（"Cannot access ... before initialization"）。
// 仓库既有 monitor.spec.ts / chat-report-detail.spec.ts 均为此处用 vi.hoisted 的先例。
// 附 `__vIsRef`（注意：Vue 用 `__v_isRef === true`）以让模板对 `:steps="reasoningSteps"` 等绑定正确 unref，
// 否则页面会把 { value: [] } 对象直传给子组件（如 AlertReasoningPanel 的 props.steps.some 会崩）。
const previewRef = vi.hoisted(() => ({ __v_isRef: true, value: null as null | { summary?: string; impact?: string; keywords?: string[] } }))
const resultRef = vi.hoisted(() => ({ __v_isRef: true, value: null as null | { displayReport: Record<string, unknown>; podcastBrief: string; raw: string } }))
const reasoningRef = vi.hoisted(() => ({ __v_isRef: true, value: [] as unknown[] }))

vi.mock('@/modules/market/utils/useAlertSSE', () => ({
  useAlertSSE: () => ({
    content: ref(''),
    toolSteps: ref([]),
    reasoningSteps: reasoningRef,
    preview: previewRef,
    loading: ref(false),
    error: ref(''),
    done: ref(true),
    result: resultRef,
    start: vi.fn(),
    stop: vi.fn(),
    loadFromCache: vi.fn(async () => true),
  }),
}))

// @dcloudio/uni-app 的 onLoad 在非 uni 运行时不可用，桩成 no-op（页面不再走 begin()/SSE）
vi.mock('@dcloudio/uni-app', () => ({ onLoad: () => {} }))

// mp-html 的 uni-app 版 SFC 无法在 vitest 的 @vue/compiler-sfc 下解析（含 uni 特有语法及 node.vue 多 script 块），
// 单测仅需占位渲染 content，模块级 mock 替代真实组件（沿用 chat 侧 ReasoningPanel.spec / AlertReasoningPanel.spec 既有做法）
vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: { name: 'mp-html', props: ['content'], template: '<div>{{ content }}</div>' },
}))

// SubPageCard2 桩：避免 GlobalChatBar / FloatingPodcast 等副组件连带编译与副作用
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: { name: 'SubPageCard2', props: ['title', 'subtitle'], template: '<view class="subpage-stub"><slot /></view>' },
}))

// SvgIcon 桩：happy-dom 无 svg-cache 的 require.context，桩成空渲染（页面断言不涉及图标内容）
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// barrel 桩：@/shared/components 会连带编译 KLineChart 等 renderjs 双 <script> SFC，在 vitest 下编译失败
// （既有基线问题，见 monitor.spec.ts / chat-report-detail.spec.ts 的注释）。本测试只关心页面数据流，
// 把页面用到的 6 个组件桩成透传 slot 的占位（断言文本均来自页面自身模板/插槽，不受桩影响）。
vi.mock('@/shared/components', () => ({
  LoadingState: { name: 'LoadingState', props: ['text'], template: '<view class="loading-stub">{{ text }}<slot /></view>' },
  EmptyState: { name: 'EmptyState', props: ['title', 'description', 'icon'], template: '<view class="empty-stub">{{ title }} {{ description }}<slot /></view>' },
  Card: { name: 'Card', template: '<view class="card-stub"><slot /></view>' },
  Button: { name: 'Button', emits: ['click'], template: '<button class="btn-stub" @click="$emit(\'click\')"><slot /></button>' },
  Tag: { name: 'Tag', props: ['type', 'size'], template: '<text class="tag-stub"><slot /></text>' },
  Badge: { name: 'Badge', props: ['type', 'size'], template: '<text class="badge-stub"><slot /></text>' },
}))

// podcast store 桩：usePodcastStore 需 active Pinia，且真实 store 含音视频副作用；
// 断言不涉及播报，open 桩为 no-op 即可。
vi.mock('@/shared/store/modules/podcast', () => ({
  usePodcastStore: () => ({ open: vi.fn() }),
}))

import AlertAnalysis from './alert-analysis.vue'

beforeEach(() => {
  previewRef.value = null
  resultRef.value = null
  reasoningRef.value = []
})

describe('alert-analysis 速览数据源', () => {
  it('preview 到达即渲染一句话速览（result 尚未到）', async () => {
    previewRef.value = { summary: '速览结论', impact: '利好', keywords: ['涨价'] }
    const w = mount(AlertAnalysis)
    await flushPromises()
    expect(w.text()).toContain('速览结论')
    expect(w.text()).toContain('涨价')
  })

  it('result 到达时以 result 为准（缓存路径无 preview）', async () => {
    resultRef.value = {
      displayReport: { summary: '最终结论', impact: '利空', keywords: ['跌价'], details: '## 详情' },
      podcastBrief: '', raw: '',
    }
    const w = mount(AlertAnalysis)
    await flushPromises()
    expect(w.text()).toContain('最终结论')
  })
})