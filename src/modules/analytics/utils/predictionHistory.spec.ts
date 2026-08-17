import assert from 'node:assert/strict'
import { test } from 'node:test'
import { horizonStage, overallStatus, computeStats } from './predictionHistory'
import type { PredictionRecord } from '@/shared/api/modules/prediction'

const TODAY = '2026-08-10'

const baseRecord = (overrides: Partial<PredictionRecord> = {}): PredictionRecord => ({
  id: 1,
  source_type: 'market_trace',
  source_id: 'review:2026-08-07',
  report_date: '2026-08-07',
  schema_version: '1.0',
  status: 'pending',
  created_at: '2026-08-07T12:00:00.000Z',
  prediction: {
    prediction_status: 'confirmed',
    attribution_summary: '摘要',
    horizons: [
      { horizon: 'short', remaining_estimate: '1-2周', phase: 'building', direction: 'bullish', target: '上证指数', metric_projection: 'x', confidence: 'high' },
      { horizon: 'mid', remaining_estimate: '3-4周', phase: 'peaking', direction: 'bullish', target: '上证指数', metric_projection: 'x', confidence: 'medium' },
      { horizon: 'long', remaining_estimate: '1-3月', phase: 'decaying', direction: 'neutral', target: '上证指数', metric_projection: 'x', confidence: 'low' },
    ],
  },
  due_dates: { short: '2026-08-09', mid: '2026-09-08', long: '2027-01-05' },
  verification: {},
  ...overrides,
})

test('horizonStage：已到期待验证（due ≤ today 且无 verification）', () => {
  const stage = horizonStage(baseRecord(), 'short', TODAY)
  assert.equal(stage.kind, 'due_pending')
})

test('horizonStage：未到期（due > today）', () => {
  const stage = horizonStage(baseRecord(), 'mid', TODAY)
  assert.equal(stage.kind, 'not_due')
})

test('horizonStage：已验证 hit', () => {
  const entry = { horizon: 'short', result: 'hit', actual: '+1.2%', reason: 'x', verified_at: '2026-08-15T08:00:00.000Z' } as const
  const stage = horizonStage(baseRecord({ verification: { short: entry } }), 'short', TODAY)
  assert.deepEqual(stage, { kind: 'verified', result: 'hit', entry })
})

test('overallStatus：有未验证档位 → pending', () => {
  assert.equal(overallStatus(baseRecord(), TODAY), 'pending')
})

test('overallStatus：三档全验证（含 insufficient）→ verified', () => {
  const record = baseRecord({
    verification: {
      short: { horizon: 'short', result: 'hit', actual: '+1.2%', reason: 'x', verified_at: '2026-08-15T08:00:00.000Z' },
      mid: { horizon: 'mid', result: 'miss', actual: '-0.5%', reason: 'x', verified_at: '2026-09-08T08:00:00.000Z' },
      long: { horizon: 'long', result: 'insufficient', actual: '', reason: 'x', verified_at: '2027-01-05T08:00:00.000Z' },
    },
  })
  assert.equal(overallStatus(record, TODAY), 'verified')
})

test('computeStats：命中率口径 hit/(hit+miss)，insufficient 不计', () => {
  const hit = baseRecord({ id: 1, verification: { short: { horizon: 'short', result: 'hit', actual: '+1.2%', reason: 'x', verified_at: '2026-08-15T08:00:00.000Z' } } })
  const miss = baseRecord({ id: 2, verification: { short: { horizon: 'short', result: 'miss', actual: '-0.5%', reason: 'x', verified_at: '2026-08-15T08:00:00.000Z' } } })
  const insufficient = baseRecord({ id: 3, verification: { short: { horizon: 'short', result: 'insufficient', actual: '', reason: 'x', verified_at: '2026-08-15T08:00:00.000Z' } } })
  const stats = computeStats([hit, miss, insufficient], TODAY)
  assert.equal(stats.total, 3)
  assert.equal(stats.hitRate, 0.5)
  assert.equal(stats.pendingCount, 3)
  assert.equal(stats.verifiedCount, 0)
  assert.equal(stats.skippedCount, 0)
})

test('computeStats：skipped 记录单独计数，不计 pending/verified', () => {
  const skipped = baseRecord({ id: 1, status: 'skipped' })
  const pending = baseRecord({ id: 2 })
  const verified = baseRecord({
    id: 3,
    verification: {
      short: { horizon: 'short', result: 'hit', actual: '+1.2%', reason: 'x', verified_at: '2026-08-15T08:00:00.000Z' },
      mid: { horizon: 'mid', result: 'hit', actual: '+0.8%', reason: 'x', verified_at: '2026-09-08T08:00:00.000Z' },
      long: { horizon: 'long', result: 'hit', actual: '+2.0%', reason: 'x', verified_at: '2027-01-05T08:00:00.000Z' },
    },
  })
  const stats = computeStats([skipped, pending, verified], TODAY)
  assert.equal(stats.total, 3)
  assert.equal(stats.skippedCount, 1)
  assert.equal(stats.pendingCount, 1)
  assert.equal(stats.verifiedCount, 1)
  assert.equal(stats.hitRate, 1)
})
