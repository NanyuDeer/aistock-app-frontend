import { describe, expect, it } from 'vitest'

import {
  toMarketTraceViewModel,
  type MarketTraceReviewRecord,
} from '@/modules/analytics/utils/marketTraceReview'

const completeRecord: MarketTraceReviewRecord = {
  report_type: 'review',
  report_date: '2026-07-31',
  status: 'completed',
  data_source: 'review_agent',
  created_at: '2026-07-31T19:25:07.173Z',
  content: {
    schema_version: '2.0',
    snapshot_id: 'trace-20260731-001',
    display_report: {
      summary: '市场呈现结构性分化。',
      details: '## 主导现象\n科技板块活跃。',
      sectors: ['半导体', '通信设备'],
      risks: ['量能不足'],
    },
    market_trace: {
      snapshot: {
        captured_at: '2026-07-31T15:23:12+08:00',
      },
      trace: {
        confidence: 'low',
      },
    },
  },
}

describe('toMarketTraceViewModel', () => {
  it('将已完成的 schema 2.0 复盘报告映射为页面数据', () => {
    expect(toMarketTraceViewModel(completeRecord, '2026-07-31')).toEqual({
      reportDate: '2026-07-31',
      generatedAt: '2026-07-31T19:25:07.173Z',
      sourceLabel: '复盘 Agent',
      confidence: 'low',
      summary: '市场呈现结构性分化。',
      details: '## 主导现象\n科技板块活跃。',
      sectors: ['半导体', '通信设备'],
      risks: ['量能不足'],
      isFallback: false,
    })
  })

  it('以实际返回日期标识回退报告', () => {
    const fallbackRecord: MarketTraceReviewRecord = {
      ...completeRecord,
      report_date: '2026-07-30',
    }

    expect(toMarketTraceViewModel(fallbackRecord, '2026-07-31')?.isFallback).toBe(true)
  })

  it('拒绝缺少完整展示内容的报告，避免把半成品当作真实溯源展示', () => {
    const invalidRecord: MarketTraceReviewRecord = {
      ...completeRecord,
      content: {
        ...completeRecord.content,
        display_report: {
          summary: '只有摘要',
          details: '',
          sectors: [],
          risks: [],
        },
      },
    }

    expect(toMarketTraceViewModel(invalidRecord, '2026-07-31')).toBeNull()
  })

  it('过滤 JSONB 中不符合页面契约的数组项和可信度', () => {
    const driftedRecord = {
      ...completeRecord,
      content: {
        ...completeRecord.content,
        display_report: {
          ...completeRecord.content.display_report,
          sectors: ['半导体', { name: '无效板块' }, ''],
          risks: ['量能不足', 1],
        },
        market_trace: {
          ...completeRecord.content.market_trace,
          trace: { confidence: 'unknown' },
        },
      },
    } as unknown as MarketTraceReviewRecord

    expect(toMarketTraceViewModel(driftedRecord, '2026-07-31')).toMatchObject({
      confidence: null,
      sectors: ['半导体'],
      risks: ['量能不足'],
    })
  })
})
