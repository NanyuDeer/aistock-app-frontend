import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 捕获 onLoad 回调，测试中手动触发页面生命周期
const onLoadMock = vi.hoisted(() => vi.fn())
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: (options: Record<string, string | undefined>) => void) => onLoadMock(cb),
}))

// mock agent API：getChatAnalysisReport 返回值由各测试控制
const agentApiMock = vi.hoisted(() => ({
  getChatAnalysisReport: vi.fn(),
}))
vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: agentApiMock,
}))

// mp-html 桩：mp-html 包内含 WXS 双 script 块，vitest 编译即挂（既有基线问题，HEAD 上
// CardRenderer.spec.ts 同样受影响）——必须按页面精确导入路径 mock，不修 mp-html 本身
vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: {
    name: 'mp-html',
    props: ['content'],
    template: '<view class="mp-html-stub" v-html="content"></view>',
  },
}))

// SubPageCard2 桩：避免 GlobalChatBar / FloatingPodcast 副作用
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: {
    name: 'SubPageCard2',
    props: ['title', 'subtitle'],
    template: '<view class="subpage-stub"><slot /></view>',
  },
}))

// 共享组件桩：EmptyState / LoadingState / Card / Button
vi.mock('@/shared/components', () => ({
  LoadingState: {
    name: 'LoadingState',
    props: ['text'],
    template: '<view class="loading-stub">{{ text }}</view>',
  },
  EmptyState: {
    name: 'EmptyState',
    props: ['title', 'description', 'icon'],
    template: '<view class="empty-stub">{{ title }} {{ description }}<slot /></view>',
  },
  Card: {
    name: 'Card',
    template: '<view class="card-stub"><slot /></view>',
  },
  Button: {
    name: 'Button',
    // 声明 emits 阻止 onClick 属性 fallthrough 到原生 button（否则一次点击双重触发）
    emits: ['click'],
    template: '<button class="btn-stub" @click="$emit(\'click\')"><slot /></button>',
  },
}))

// uni 全局
vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
})

import ChatReportDetail from './chat-report-detail.vue'

const mockReport = {
  id: 'r1',
  report_type: 'chat_analysis',
  report_date: '2026-08-13',
  content: {
    display_report: {
      summary: '## 今日结论\n市场整体震荡上行。',
      details: '## 详细分析\n大盘延续上行趋势，量能温和放大。',
      stocks: ['600519'],
      risks: ['市场波动风险'],
    },
    schema_version: '2.0',
  },
}

describe('chat-report-detail.vue 深度分析报告详情页', () => {
  let onLoadCb: (options: Record<string, string | undefined>) => void

  beforeEach(() => {
    agentApiMock.getChatAnalysisReport.mockReset()
    onLoadMock.mockReset()
    // 捕获 onLoad 回调
    onLoadMock.mockImplementation((cb: (o: Record<string, string | undefined>) => void) => {
      onLoadCb = cb
    })
  })

  it('reportId 缺失 → 不发请求，直接空态（硬约束 8）', async () => {
    const wrapper = mount(ChatReportDetail)
    onLoadCb({})
    await flushPromises()
    expect(agentApiMock.getChatAnalysisReport).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('报告已过期或不存在')
  })

  it('接口成功 → 渲染结论摘要 / details 全文 / 风险段', async () => {
    agentApiMock.getChatAnalysisReport.mockResolvedValue(mockReport)
    const wrapper = mount(ChatReportDetail)
    onLoadCb({ reportId: 'r1' })
    await flushPromises()
    expect(agentApiMock.getChatAnalysisReport).toHaveBeenCalledWith('r1')
    expect(wrapper.text()).toContain('今日结论')
    expect(wrapper.text()).toContain('市场整体震荡上行')
    expect(wrapper.text()).toContain('详细分析')
    expect(wrapper.text()).toContain('大盘延续上行趋势')
    expect(wrapper.text()).toContain('风险提示')
    expect(wrapper.text()).toContain('市场波动风险')
  })

  it('接口返回 null → 空态文案"报告已过期或不存在"（G12，非"当日报告尚未生成"）', async () => {
    agentApiMock.getChatAnalysisReport.mockResolvedValue(null)
    const wrapper = mount(ChatReportDetail)
    onLoadCb({ reportId: 'r1' })
    await flushPromises()
    expect(wrapper.text()).toContain('报告已过期或不存在')
    expect(wrapper.text()).not.toContain('当日报告尚未生成')
  })

  it('risks 为空数组 → 不渲染风险段（M4 修正）', async () => {
    agentApiMock.getChatAnalysisReport.mockResolvedValue({
      ...mockReport,
      content: { display_report: { ...mockReport.content.display_report, risks: [] } },
    })
    const wrapper = mount(ChatReportDetail)
    onLoadCb({ reportId: 'r1' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('风险提示')
    expect(wrapper.text()).toContain('市场整体震荡上行')
  })

  it('接口请求失败 → 错误态显示重试入口，点击重试成功恢复渲染', async () => {
    agentApiMock.getChatAnalysisReport
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(mockReport)
    const wrapper = mount(ChatReportDetail)
    onLoadCb({ reportId: 'r1' })
    await flushPromises()
    // 错误态：不渲染报告，显示重试按钮
    expect(wrapper.text()).toContain('加载失败')
    expect(wrapper.text()).not.toContain('市场整体震荡上行')
    const retryBtn = wrapper.find('.btn-stub')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    await flushPromises()
    // 重试成功 → 渲染报告
    expect(agentApiMock.getChatAnalysisReport).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('市场整体震荡上行')
  })
})
