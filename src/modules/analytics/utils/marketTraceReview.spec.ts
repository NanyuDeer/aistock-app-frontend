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

test('prediction 提取：有预测时生成 PredictionPresentation', () => {
  const record = JSON.parse(JSON.stringify(record0723)) as unknown as MarketTraceReviewRecord
  record.content.market_trace!.trace!.prediction = {
    schema_version: '1.0',
    prediction_status: 'confirmed',
    horizons: [
      { horizon: 'short', remaining_estimate: '1-3 日', phase: 'decaying', direction: 'bearish', target: '上证指数', metric_projection: '短期弱震荡', confidence: 'high' },
      { horizon: 'mid', remaining_estimate: '2-4 周', phase: 'peaking', direction: 'bearish', target: '上证指数', metric_projection: '指数区间下移', confidence: 'medium' },
    ],
    evolution_narrative: '短线已兑现大半，中线延续，长线回归',
    risks: [{ factor: '政策对冲', invalidation: '超预期政策落地则失效' }],
    evidence_ids: ['SEARCH_007'],
    attribution_summary: '利空影响短线衰减、中线延续',
  }
  const presentation = toMarketTracePresentation(record, '2026-07-23')
  assert.ok(presentation, 'presentation 不应为 null')
  assert.ok(presentation!.prediction, 'prediction 不应为 null')
  assert.equal(presentation!.prediction!.status, 'confirmed')
  assert.equal(presentation!.prediction!.horizons.length, 2)
  assert.equal(presentation!.prediction!.horizons[0]!.horizon, 'short')
  assert.equal(presentation!.prediction!.horizons[0]!.remainingEstimate, '1-3 日')
  assert.equal(presentation!.prediction!.horizons[0]!.phase, 'decaying')
  assert.equal(presentation!.prediction!.horizons[0]!.metricProjection, '短期弱震荡')
  assert.equal(presentation!.prediction!.horizons[1]!.metricProjection, '指数区间下移')
  assert.equal(presentation!.prediction!.evolutionNarrative, '短线已兑现大半，中线延续，长线回归')
  assert.equal(presentation!.prediction!.risks.length, 1)
  assert.equal(presentation!.prediction!.risks[0]!.factor, '政策对冲')
  assert.equal(presentation!.prediction!.risks[0]!.invalidation, '超预期政策落地则失效')
  assert.equal(presentation!.prediction!.attributionSummary, '利空影响短线衰减、中线延续')
})

test('prediction 提取：evolution_steps 结构化输出时映射为 evolutionSteps', () => {
  const record = JSON.parse(JSON.stringify(record0723)) as unknown as MarketTraceReviewRecord
  record.content.market_trace!.trace!.prediction = {
    schema_version: '1.0',
    prediction_status: 'confirmed',
    horizons: [
      { horizon: 'short', remaining_estimate: '1-3 日', phase: 'decaying', direction: 'bearish', target: '上证指数', metric_projection: '短期弱震荡', confidence: 'high' },
    ],
    evolution_narrative: '短线情绪宣泄后，市场转向关注财政补贴',
    evolution_steps: [
      { label: '短线', text: '情绪宣泄后弱势震荡' },
      { label: '中线', text: '市场转向关注财政补贴实际到账' },
    ],
    risks: [],
    evidence_ids: ['SEARCH_007'],
  }
  const presentation = toMarketTracePresentation(record, '2026-07-23')
  assert.ok(presentation, 'presentation 不应为 null')
  assert.ok(presentation!.prediction, 'prediction 不应为 null')
  assert.equal(presentation!.prediction!.evolutionSteps.length, 2)
  assert.equal(presentation!.prediction!.evolutionSteps[0]!.label, '短线')
  assert.equal(presentation!.prediction!.evolutionSteps[0]!.text, '情绪宣泄后弱势震荡')
  assert.equal(presentation!.prediction!.evolutionSteps[1]!.label, '中线')
  assert.equal(presentation!.prediction!.evolutionSteps[1]!.text, '市场转向关注财政补贴实际到账')
  assert.equal(presentation!.prediction!.evolutionNarrative, '短线情绪宣泄后，市场转向关注财政补贴')
})

test('prediction 提取：旧记录无 evolution_steps 时 evolutionSteps 为空数组', () => {
  const record = JSON.parse(JSON.stringify(record0723)) as unknown as MarketTraceReviewRecord
  record.content.market_trace!.trace!.prediction = {
    schema_version: '1.0',
    prediction_status: 'confirmed',
    horizons: [
      { horizon: 'short', remaining_estimate: '1-3 日', phase: 'decaying', direction: 'bearish', target: '上证指数', metric_projection: '短期弱震荡', confidence: 'high' },
    ],
    evolution_narrative: '短线已兑现大半，中线延续，长线回归',
    risks: [],
    evidence_ids: ['SEARCH_007'],
  }
  const presentation = toMarketTracePresentation(record, '2026-07-23')
  assert.ok(presentation, 'presentation 不应为 null')
  assert.deepEqual(presentation!.prediction!.evolutionSteps, [])
  assert.equal(presentation!.prediction!.evolutionNarrative, '短线已兑现大半，中线延续，长线回归')
})

test('prediction 提取：无预测字段时为 null（兼容旧报告）', () => {
  // record0731 fixture 不含 prediction 字段
  const presentation = toMarketTracePresentation(
    record0731 as unknown as MarketTraceReviewRecord,
    '2026-07-31',
  )
  assert.ok(presentation, 'presentation 不应为 null')
  assert.equal(presentation!.prediction, null)
})

test('prediction 提取：非法 shape（horizons 为空）时为 null', () => {
  const record = JSON.parse(JSON.stringify(record0723)) as unknown as MarketTraceReviewRecord
  record.content.market_trace!.trace!.prediction = {
    prediction_status: 'confirmed',
    horizons: [],
  }
  const presentation = toMarketTracePresentation(record, '2026-07-23')
  assert.ok(presentation, 'presentation 不应为 null')
  assert.equal(presentation!.prediction, null)
})
