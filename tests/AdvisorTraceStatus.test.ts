import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AdvisorTraceStatus from '@/pages-sub-app/chat/AdvisorTraceStatus.vue'

describe('AdvisorTraceStatus', () => {
  it('仅在结构化 trace 声明 stock_trace 缺失时展示降级状态', () => {
    const wrapper = mount(AdvisorTraceStatus, {
      props: {
        trace: {
          schema_version: 'advisor_trace.v1',
          subquestions: [{ intent: 'stock', reports: [], sources: [], as_of: null, missing_sources: ['stock_trace'], degraded: true }],
          missing_sources: ['stock_trace'],
          degraded: true,
        },
      },
    })

    expect(wrapper.text()).toContain('个股可追溯数据暂不可用')
  })

  it.each([null, {
    schema_version: 'advisor_trace.v1',
    subquestions: [{ intent: 'morning', reports: [], sources: [], as_of: '2026-07-25', missing_sources: [], degraded: false }],
    missing_sources: [],
    degraded: false,
  }])('无 trace 或不含 stock_trace 时不显示提示', (trace) => {
    const wrapper = mount(AdvisorTraceStatus, { props: { trace } })

    expect(wrapper.text()).not.toContain('个股可追溯数据暂不可用')
  })
})
