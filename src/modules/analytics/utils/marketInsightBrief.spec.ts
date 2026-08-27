import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toMarketInsightBrief, toMarketInsightDetail } from './marketInsightBrief'
import type { MarketTracePresentation } from './marketTraceReview'
import { labelEvidenceList } from './evidenceLabels'

function makePresentation(overrides: Partial<MarketTracePresentation> = {}): MarketTracePresentation {
  return {
    reportTitle: '2026-08-27 A股收盘溯源',
    reportDate: '2026-08-27',
    generatedAt: '',
    snapshotId: '',
    attributionStatus: 'confirmed',
    confidence: 'high',
    isFallback: false,
    pendingRisks: { openQuestions: [], missingEvidence: [] },
    phenomenon: {
      kind: 'broad_rally', kindLabel: '普涨', summary: 'A股放量普涨，沪指涨1.2%',
      severity: 'high', severityLabel: '高', factIds: [],
      indexPerformance: [], topGainers: [], topLosers: [],
    },
    primaryCause: {
      categoryId: 'c1', categoryLabel: '产业技术供应',
      conclusion: '半导体国产替代提速推动板块普涨', trigger: '触发', transmission: '传导', result: '结果',
      supportingEvidence: [],
    },
    alternatives: [], rejected: [],
    sectorRanking: { topGainers: [], topLosers: [] },
    predictionValidation: null,
    prediction: { status: 'confirmed', horizons: [], evolutionSteps: [], evolutionNarrative: '', risks: [], attributionSummary: '短线情绪延续，中线关注政策落地' },
    markdownDetails: '详情',
    ...overrides,
  }
}

test('toMarketInsightBrief: 正常提炼三段文案', () => {
  const brief = toMarketInsightBrief(makePresentation())
  assert.ok(brief)
  assert.equal(brief!.title, 'A股放量普涨，沪指涨1.2%')
  assert.equal(brief!.trace, '产业技术供应：半导体国产替代提速推动板块普涨')
  assert.equal(brief!.forecast, '短线情绪延续，中线关注政策落地')
  assert.equal(brief!.confidence, '高')
  assert.equal(brief!.time, '08.27')
})

test('toMarketInsightBrief: title 空时回退 kindLabel', () => {
  const brief = toMarketInsightBrief(makePresentation({ phenomenon: { ...makePresentation().phenomenon, summary: '' } }))
  assert.equal(brief!.title, '普涨')
})

test('toMarketInsightBrief: 无主因时 trace 兜底', () => {
  const brief = toMarketInsightBrief(makePresentation({ primaryCause: null }))
  assert.equal(brief!.trace, '证据不足，主因待验证')
})

test('toMarketInsightBrief: 无预判时 forecast 兜底', () => {
  const brief = toMarketInsightBrief(makePresentation({ prediction: null }))
  assert.equal(brief!.forecast, '暂无预判')
})

test('toMarketInsightBrief: 超长文案截断', () => {
  const brief = toMarketInsightBrief(makePresentation({
    phenomenon: { ...makePresentation().phenomenon, summary: '这是一段超过三十个字符的非常长的现象描述用来验证截断逻辑是否正确生效' },
  }))
  assert.ok(brief!.title.length <= 31) // 30 字 + 省略号
  assert.match(brief!.title, /…$/)
})

test('toMarketInsightBrief: null 输入返回 null', () => {
  assert.equal(toMarketInsightBrief(null), null)
  assert.equal(toMarketInsightBrief(undefined), null)
})

test('toMarketInsightDetail: 三块详情字段映射', () => {
  const detail = toMarketInsightDetail(makePresentation())
  assert.ok(detail)
  assert.equal(detail!.phenomenon.summary, 'A股放量普涨，沪指涨1.2%')
  assert.equal(detail!.phenomenon.severityLabel, '高')
  assert.equal(detail!.trace!.categoryLabel, '产业技术供应')
  assert.equal(detail!.trace!.conclusion, '半导体国产替代提速推动板块普涨')
  assert.equal(detail!.trace!.trigger, '触发')
  assert.equal(detail!.trace!.transmission, '传导')
  assert.equal(detail!.trace!.result, '结果')
  assert.deepEqual(detail!.trace!.evidenceLabels, labelEvidenceList([]))
  assert.equal(detail!.forecast!.attributionSummary, '短线情绪延续，中线关注政策落地')
})

test('toMarketInsightDetail: 无主因时 trace 为 null，无预判时 forecast 为 null', () => {
  const detail = toMarketInsightDetail(makePresentation({ primaryCause: null, prediction: null }))
  assert.equal(detail!.trace, null)
  assert.equal(detail!.forecast, null)
})

test('toMarketInsightDetail: null 输入返回 null', () => {
  assert.equal(toMarketInsightDetail(null), null)
})