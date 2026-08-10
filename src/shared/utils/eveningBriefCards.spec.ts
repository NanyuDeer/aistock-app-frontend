import { describe, it, expect } from 'vitest'
import {
  detectMarketAnomaly,
  extractBreadth,
  extractAttributionSummary,
  buildEveningCardViewModel,
} from './eveningBriefCards'
import type { BriefV1, MarketTraceReviewRecord } from '@/shared/api/modules/agent'

function makeBrief(overrides: Partial<BriefV1> = {}): BriefV1 {
  return {
    schema_version: 'brief.v1',
    brief_type: 'evening',
    as_of: '2026-08-06',
    items: [
      {
        title: '归因结论',
        conclusion: '今日市场主因是科技股回调',
        evidence: [{
          report_type: 'review',
          id: 'test-id',
          data_source: 'review',
          created_at: '2026-08-06T15:30:00+08:00',
        }],
        as_of: '2026-08-06',
        confidence: 'high',
        uncertainty: [],
      },
    ],
    degraded: false,
    missing_sources: [],
    ...overrides,
  }
}

function makeReview(overrides: Partial<MarketTraceReviewRecord> = {}): MarketTraceReviewRecord {
  return {
    report_type: 'review',
    report_date: '2026-08-06',
    status: 'completed',
    data_source: 'market_trace',
    created_at: '2026-08-06T16:00:00+08:00',
    content: {
      schema_version: '2.0',
      display_report: { summary: '测试摘要', details: '测试详情' },
      market_trace: {
        snapshot: {
          a_share: {
            indexes: [{ name: '上证指数', pct_change: 0.72 }],
            breadth: { advance_count: 3200, decline_count: 1800, flat_count: 150 },
            sectors: {
              top_gainers: [{ name: '半导体', pct_change: 3.2 }],
              top_losers: [{ name: '白酒', pct_change: -2.1 }],
            },
          },
        },
        trace: {
          candidates: [],
          attribution_status: 'confirmed',
          confidence: 'high',
          primary_chain_id: null,
          alternative_chain_id: null,
          // 旧报告可能缺失；默认 null 保持既有用例回退到 brief 归因结论
          attribution_summary: null,
        },
      },
    },
    ...overrides,
  }
}

describe('detectMarketAnomaly', () => {
  it('归因结论含「主因是」→ 有异象 confirmed', () => {
    const brief = makeBrief()
    const result = detectMarketAnomaly(brief, makeReview())
    expect(result).toEqual({ hasAnomaly: true, reason: 'confirmed' })
  })

  it('归因结论含「可能受」→ 有异象 hypothesis', () => {
    const brief = makeBrief({
      items: [{
        title: '归因结论',
        conclusion: '今日市场可能受外围影响',
        evidence: [],
        as_of: '2026-08-06',
        confidence: 'medium',
        uncertainty: [],
      }],
    })
    const result = detectMarketAnomaly(brief, makeReview())
    expect(result).toEqual({ hasAnomaly: true, reason: 'hypothesis' })
  })

  it('归因结论含「证据不足」→ 无异象 no_anomaly_text', () => {
    const brief = makeBrief({
      items: [{
        title: '归因结论',
        conclusion: '今日证据不足，未确认主因',
        evidence: [],
        as_of: '2026-08-06',
        confidence: 'low',
        uncertainty: [],
      }],
    })
    const result = detectMarketAnomaly(brief, makeReview())
    expect(result).toEqual({ hasAnomaly: false, reason: 'no_anomaly_text' })
  })

  it('归因结论含「未确认主因」→ 无异象 no_anomaly_text', () => {
    const brief = makeBrief({
      items: [{
        title: '归因结论',
        conclusion: '未确认主因',
        evidence: [],
        as_of: '2026-08-06',
        confidence: 'low',
        uncertainty: [],
      }],
    })
    const result = detectMarketAnomaly(brief, makeReview())
    expect(result).toEqual({ hasAnomaly: false, reason: 'no_anomaly_text' })
  })

  it('brief 降级 → 无异象 degraded_brief', () => {
    const brief = makeBrief({ degraded: true, missing_sources: ['review'] })
    const result = detectMarketAnomaly(brief, makeReview())
    expect(result).toEqual({ hasAnomaly: false, reason: 'degraded_brief' })
  })

  it('review 未完成 → 无异象 review_unavailable', () => {
    const brief = makeBrief()
    const result = detectMarketAnomaly(brief, makeReview({ status: 'processing' }))
    expect(result).toEqual({ hasAnomaly: false, reason: 'review_unavailable' })
  })

  it('文本兜底（匹配不到关键词）→ 保守判定有异象 fallback_anomaly', () => {
    const brief = makeBrief({
      items: [{
        title: '归因结论',
        conclusion: '其他文本，不含关键词',
        evidence: [],
        as_of: '2026-08-06',
        confidence: 'medium',
        uncertainty: [],
      }],
    })
    const result = detectMarketAnomaly(brief, makeReview())
    expect(result).toEqual({ hasAnomaly: true, reason: 'fallback_anomaly' })
  })

  it('brief 为 null → 无异象 degraded_brief', () => {
    const result = detectMarketAnomaly(null, makeReview())
    expect(result).toEqual({ hasAnomaly: false, reason: 'degraded_brief' })
  })

  it('brief 中无「归因结论」item → 文本兜底 fallback_anomaly', () => {
    const brief = makeBrief({
      items: [{
        title: '其他标题',
        conclusion: '内容',
        evidence: [],
        as_of: '2026-08-06',
        confidence: 'medium',
        uncertainty: [],
      }],
    })
    const result = detectMarketAnomaly(brief, makeReview())
    expect(result).toEqual({ hasAnomaly: true, reason: 'fallback_anomaly' })
  })
})

describe('extractBreadth', () => {
  it('正常提取 breadth', () => {
    const result = extractBreadth(makeReview())
    expect(result).toEqual({
      advanceCount: 3200,
      declineCount: 1800,
      flatCount: 150,
    })
  })

  it('breadth 字段缺失 → 返回 null', () => {
    const review = makeReview()
    review.content.market_trace!.snapshot!.a_share!.breadth = undefined
    expect(extractBreadth(review)).toBeNull()
  })

  it('a_share 缺失 → 返回 null', () => {
    const review = makeReview()
    review.content.market_trace!.snapshot!.a_share = undefined
    expect(extractBreadth(review)).toBeNull()
  })

  it('review 为 null → 返回 null', () => {
    expect(extractBreadth(null)).toBeNull()
  })

  it('breadth 部分字段缺失 → 缺失字段为 null', () => {
    const review = makeReview()
    review.content.market_trace!.snapshot!.a_share!.breadth = { advance_count: 100 }
    expect(extractBreadth(review)).toEqual({
      advanceCount: 100,
      declineCount: null,
      flatCount: null,
    })
  })
})

describe('buildEveningCardViewModel', () => {
  it('正常构建 ViewModel', () => {
    const vm = buildEveningCardViewModel(makeBrief(), makeReview(), '2026-08-06')
    expect(vm.anomaly.hasAnomaly).toBe(true)
    expect(vm.anomaly.reason).toBe('confirmed')
    expect(vm.attributionConclusion).toBe('今日市场主因是科技股回调')
    expect(vm.presentation).not.toBeNull()
    expect(vm.presentation?.sectorRanking.topGainers.length).toBe(1)
    expect(vm.breadth).toEqual({
      advanceCount: 3200,
      declineCount: 1800,
      flatCount: 150,
    })
  })

  it('brief 为 null → conclusion 为空，presentation 仍可构建', () => {
    const vm = buildEveningCardViewModel(null, makeReview(), '2026-08-06')
    expect(vm.attributionConclusion).toBe('')
    expect(vm.anomaly.hasAnomaly).toBe(false)
    expect(vm.presentation).not.toBeNull()
  })

  it('review 为 null → presentation 为 null，conclusion 仍可提取', () => {
    const vm = buildEveningCardViewModel(makeBrief(), null, '2026-08-06')
    expect(vm.attributionConclusion).toBe('今日市场主因是科技股回调')
    // review 为 null 不触发 review_unavailable（仅在 review 非 null 且 status !== completed 时触发）；
    // brief 未降级，文本判定正常进行 → conclusion 含「主因是」→ confirmed
    expect(vm.anomaly.hasAnomaly).toBe(true)
    expect(vm.anomaly.reason).toBe('confirmed')
    expect(vm.presentation).toBeNull()
    expect(vm.breadth).toBeNull()
  })

  it('review 含 attribution_summary → 结论文本优先使用短摘要（非 brief 拼接长文本）', () => {
    const review = makeReview()
    review.content!.market_trace!.trace!.attribution_summary = 'AI算力与创新药业绩驱动板块领涨'
    const vm = buildEveningCardViewModel(makeBrief(), review, '2026-08-06')
    expect(vm.attributionConclusion).toBe('AI算力与创新药业绩驱动板块领涨')
  })

  it('review 缺失 attribution_summary → 结论文本回退到 brief 归因结论', () => {
    const review = makeReview() // attribution_summary 默认 null
    const vm = buildEveningCardViewModel(makeBrief(), review, '2026-08-06')
    expect(vm.attributionConclusion).toBe('今日市场主因是科技股回调')
  })
})

describe('extractAttributionSummary', () => {
  it('review 含有效 attribution_summary → 返回去除首尾空白后的文本', () => {
    const review = makeReview()
    review.content!.market_trace!.trace!.attribution_summary = '  货币政策边际转松驱动大盘反弹  '
    expect(extractAttributionSummary(review)).toBe('货币政策边际转松驱动大盘反弹')
  })

  it('attribution_summary 为 null → 返回空串', () => {
    expect(extractAttributionSummary(makeReview())).toBe('')
  })

  it('attribution_summary 仅空白 → 返回空串', () => {
    const review = makeReview()
    review.content!.market_trace!.trace!.attribution_summary = '   '
    expect(extractAttributionSummary(review)).toBe('')
  })

  it('review 为 null → 返回空串', () => {
    expect(extractAttributionSummary(null)).toBe('')
  })
})
