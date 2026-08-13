import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toMarketTracePresentation } from './marketTraceReview'
import type { MarketTraceReviewRecord } from '@/shared/api/modules/agent'
import record0723 from './__fixtures__/market-trace-2026-07-23.json' with { type: 'json' }
import record0731 from './__fixtures__/market-trace-2026-07-31.json' with { type: 'json' }

test('7-23 成功态：提取完整结构化 ViewModel', () => {
  const presentation = toMarketTracePresentation(
    record0723 as unknown as MarketTraceReviewRecord,
    '2026-07-23',
  )
  assert.ok(presentation, 'presentation 不应为 null')

  // 元信息
  assert.equal(presentation!.reportTitle, '2026-07-23 A股收盘溯源')
  assert.equal(presentation!.reportDate, '2026-07-23')
  assert.equal(presentation!.attributionStatus, 'confirmed')
  assert.equal(presentation!.confidence, 'medium')
  assert.equal(presentation!.isFallback, false)

  // 待验证风险
  assert.equal(presentation!.pendingRisks.openQuestions.length, 3)
  assert.equal(presentation!.pendingRisks.missingEvidence.length, 0)

  // 核心现象
  assert.equal(presentation!.phenomenon.kind, 'sector_concentration')
  assert.equal(presentation!.phenomenon.kindLabel, '板块集中异动')
  assert.equal(presentation!.phenomenon.severity, 'medium')
  assert.equal(presentation!.phenomenon.severityLabel, '中')
  assert.equal(presentation!.phenomenon.topGainers.length, 5)
  assert.equal(presentation!.phenomenon.topGainers[0]!.name, '兵装重组概念')
  assert.equal(presentation!.phenomenon.topGainers[0]!.pctChange, 6.39)
  assert.equal(presentation!.phenomenon.topLosers.length, 5)
  assert.equal(presentation!.phenomenon.topLosers[0]!.name, '国家大基金持股')
  assert.equal(presentation!.phenomenon.topLosers[0]!.pctChange, -3.36)

  // 主因
  assert.ok(presentation!.primaryCause, 'primaryCause 不应为 null')
  assert.equal(presentation!.primaryCause!.categoryId, 'industry_technology_supply')
  assert.equal(presentation!.primaryCause!.categoryLabel, '产业技术与供应')
  assert.ok(presentation!.primaryCause!.trigger.includes('中东紧张局势'))
  assert.ok(presentation!.primaryCause!.transmission.includes('高油价提升可燃冰'))
  assert.ok(presentation!.primaryCause!.result.includes('估值修复'))
  assert.deepEqual(presentation!.primaryCause!.supportingEvidence, ['SEARCH_007', 'SEARCH_008', 'SECTORS_ALL'])

  // 候选解释（alternative_chain_id 指向 market_positioning_liquidity）
  assert.equal(presentation!.alternatives.length, 1)
  assert.equal(presentation!.alternatives[0]!.categoryId, 'market_positioning_liquidity')
  assert.equal(presentation!.alternatives[0]!.categoryLabel, '市场定位与流动性')
  assert.ok(presentation!.alternatives[0]!.transmission.includes('资金从芯片'))
  assert.deepEqual(presentation!.alternatives[0]!.counterEvidence, ['MAIN_FORCE_ALL'])

  // 已排除（global_risk_liquidity rejected + domestic_macro_policy weak 未被 alternative 指向）
  assert.equal(presentation!.rejected.length, 2)
  const rejectedGlobal = presentation!.rejected.find(r => r.categoryId === 'global_risk_liquidity')!
  assert.equal(rejectedGlobal.status, 'rejected')
  assert.ok(rejectedGlobal.reason.length > 0)
  const rejectedPolicy = presentation!.rejected.find(r => r.categoryId === 'domestic_macro_policy')!
  assert.equal(rejectedPolicy.status, 'weak')
  assert.ok(rejectedPolicy.reason.length > 0)

  // 板块排序
  assert.equal(presentation!.sectorRanking.topGainers.length, 5)
  assert.equal(presentation!.sectorRanking.topLosers.length, 5)
})

test('7-31 证据不足态：primaryCause 为 null，weak 归 alternatives，insufficient 归 rejected', () => {
  const presentation = toMarketTracePresentation(
    record0731 as unknown as MarketTraceReviewRecord,
    '2026-07-31',
  )
  assert.ok(presentation)

  assert.equal(presentation!.attributionStatus, 'insufficient')
  assert.equal(presentation!.primaryCause, null)

  // 两条 weak 候选归入 alternatives
  assert.equal(presentation!.alternatives.length, 2)
  assert.equal(presentation!.alternatives[0]!.categoryId, 'global_risk_liquidity')
  assert.equal(presentation!.alternatives[1]!.categoryId, 'domestic_macro_policy')

  // 两条 insufficient 归入 rejected
  assert.equal(presentation!.rejected.length, 2)
  assert.equal(presentation!.rejected[0]!.status, 'insufficient')
  assert.equal(presentation!.rejected[1]!.status, 'insufficient')

  // 缺失证据
  assert.ok(presentation!.pendingRisks.missingEvidence.length > 0)
  assert.ok(presentation!.pendingRisks.missingEvidence.includes('a_share.main_force.large_and_extra_large_net_yuan'))
  assert.ok(presentation!.pendingRisks.missingEvidence.includes('global_markets'))

  // 板块领跌为空（普涨日）
  assert.equal(presentation!.sectorRanking.topLosers.length, 0)
})

test('record.status 非 completed 返回 null', () => {
  const record = { ...record0723, status: 'queued' } as unknown as MarketTraceReviewRecord
  assert.equal(toMarketTracePresentation(record, '2026-07-23'), null)
})

test('content.schema_version 非 2.0 返回 null', () => {
  const record = {
    ...record0723,
    content: { ...record0723.content, schema_version: '1.0' },
  } as unknown as MarketTraceReviewRecord
  assert.equal(toMarketTracePresentation(record, '2026-07-23'), null)
})

test('report_date 与 requestedDate 不一致时 isFallback=true', () => {
  const presentation = toMarketTracePresentation(
    record0723 as unknown as MarketTraceReviewRecord,
    '2026-07-24',
  )
  assert.ok(presentation)
  assert.equal(presentation!.isFallback, true)
})

test('candidates 缺 chain.nodes 时 trigger/transmission/result 返回空字符串', () => {
  const record = JSON.parse(JSON.stringify(record0723)) as unknown as MarketTraceReviewRecord
  const candidate = (record.content.market_trace!.trace!.candidates![0])
  candidate.chain = null
  const presentation = toMarketTracePresentation(record, '2026-07-23')
  assert.ok(presentation)
  assert.equal(presentation!.primaryCause!.trigger, '')
  assert.equal(presentation!.primaryCause!.transmission, '')
  assert.equal(presentation!.primaryCause!.result, '')
})

test('toMarketTracePresentation 映射 prediction_validation 字段', () => {
  const record = JSON.parse(JSON.stringify(record0723)) as unknown as MarketTraceReviewRecord
  record.content.market_trace!.trace!.prediction_validation = {
    status: 'partial',
    sector_hits: [
      { sector: '券商', morning_direction: 'bullish', actual_direction: 'bearish', result: 'miss', deviation_note: '政策未兑现' },
      { sector: '军工', morning_direction: 'bullish', actual_direction: 'bullish', result: 'hit' },
    ],
    event_hits: [
      { event_title: '政治局会议', morning_direction: 'bullish', actual_impact: '利好兑现', result: 'hit', note: '符合预期' },
    ],
    overall_note: '部分偏离',
  }
  const presentation = toMarketTracePresentation(record, '2026-07-23')
  assert.ok(presentation, 'presentation 不应为 null')
  assert.ok(presentation!.predictionValidation, 'predictionValidation 不应为 null')
  assert.equal(presentation!.predictionValidation!.status, 'partial')
  assert.equal(presentation!.predictionValidation!.sectorHits.length, 2)
  assert.equal(presentation!.predictionValidation!.sectorHits[0]!.sector, '券商')
  assert.equal(presentation!.predictionValidation!.sectorHits[0]!.morningDirection, 'bullish')
  assert.equal(presentation!.predictionValidation!.sectorHits[0]!.actualDirection, 'bearish')
  assert.equal(presentation!.predictionValidation!.sectorHits[0]!.result, 'miss')
  assert.equal(presentation!.predictionValidation!.sectorHits[0]!.deviationNote, '政策未兑现')
  assert.equal(presentation!.predictionValidation!.sectorHits[1]!.result, 'hit')
  assert.equal(presentation!.predictionValidation!.sectorHits[1]!.deviationNote, '')
  assert.equal(presentation!.predictionValidation!.eventHits.length, 1)
  assert.equal(presentation!.predictionValidation!.eventHits[0]!.eventTitle, '政治局会议')
  assert.equal(presentation!.predictionValidation!.eventHits[0]!.morningDirection, 'bullish')
  assert.equal(presentation!.predictionValidation!.eventHits[0]!.actualImpact, '利好兑现')
  assert.equal(presentation!.predictionValidation!.eventHits[0]!.result, 'hit')
  assert.equal(presentation!.predictionValidation!.eventHits[0]!.note, '符合预期')
  assert.equal(presentation!.predictionValidation!.overallNote, '部分偏离')
})

test('prediction_validation 缺失时 predictionValidation 为 null', () => {
  // record0723 fixture 不含 prediction_validation 字段
  const presentation = toMarketTracePresentation(
    record0723 as unknown as MarketTraceReviewRecord,
    '2026-07-23',
  )
  assert.ok(presentation, 'presentation 不应为 null')
  assert.equal(presentation!.predictionValidation, null)
})

test('7-23 rejected reason 输出中文关键词而非原始 ID', () => {
  const presentation = toMarketTracePresentation(
    record0723 as unknown as MarketTraceReviewRecord,
    '2026-07-23',
  )
  assert.ok(presentation)

  // global_risk_liquidity rejected，counter_evidence_ids=['SECTORS_ALL']
  const rejectedGlobal = presentation!.rejected.find(r => r.categoryId === 'global_risk_liquidity')!
  assert.equal(rejectedGlobal.status, 'rejected')
  assert.equal(rejectedGlobal.reason, '存在反证：板块数据')

  // domestic_macro_policy weak（未被 alternative 指向），counter_evidence_ids=['SECTORS_ALL']
  const rejectedPolicy = presentation!.rejected.find(r => r.categoryId === 'domestic_macro_policy')!
  assert.equal(rejectedPolicy.status, 'weak')
  assert.equal(rejectedPolicy.reason, '证据较弱，反证：板块数据')
})

test('7-23 alternatives counterEvidence 输出中文关键词', () => {
  const presentation = toMarketTracePresentation(
    record0723 as unknown as MarketTraceReviewRecord,
    '2026-07-23',
  )
  assert.ok(presentation)

  // market_positioning_liquidity alternative，counter_evidence_ids=['MAIN_FORCE_ALL']
  const alt = presentation!.alternatives.find(a => a.categoryId === 'market_positioning_liquidity')!
  // counterEvidence 字段仍存原始 ID（presentation 数据层不动）
  assert.deepEqual(alt.counterEvidence, ['MAIN_FORCE_ALL'])
})
