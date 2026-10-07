import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PriceMovementAnalysisContent from './PriceMovementAnalysisContent.vue'
import type { StockTraceEvent, StockTraceAnalysisResponse } from '@/shared/api/modules/stockTrace'

// SvgIcon 桩（避免依赖图标库）
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

function makeDetail(overrides: Partial<StockTraceEvent> = {}): StockTraceEvent {
  return {
    event_id: 'mv:688203:test',
    trigger_revision: 1,
    symbol: '688203',
    stock_name: '测试股',
    event_type: 'price',
    direction: 'up',
    triggered_at: '2026-09-04T06:00:00.000Z',
    latest_price: 10,
    previous_close: 9,
    change_pct: 11.1,
    threshold_pct: 7,
    severity: 'high',
    rule_version: 'price-v1',
    analysis_status: 'failed',
    primary_cause: null,
    is_limit_up: undefined,
    movement_view: null,
    ...overrides,
  }
}

function makeAnalysis(overrides: Partial<StockTraceAnalysisResponse> = {}): StockTraceAnalysisResponse {
  return {
    event_id: 'mv:688203:test',
    trigger_revision: 1,
    processing_status: 'failed',
    artifact: null,
    ...overrides,
  }
}

describe('PriceMovementAnalysisContent 归因失败可见', () => {
  it('processing_status = failed → 渲染「归因失败」，且不是空渲染', () => {
    const wrapper = mount(PriceMovementAnalysisContent, {
      props: { detail: makeDetail(), analysis: makeAnalysis() },
    })
    expect(wrapper.text()).toContain('归因失败')
    expect(wrapper.text().trim()).not.toBe('')
  })
})
