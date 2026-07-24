import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBriefingReport } from './briefingReport'

const EVENING_BRIEF = {
  schema_version: 'brief.v1',
  brief_type: 'evening',
  as_of: '2026-07-24T15:30:00+08:00',
  degraded: true,
  missing_sources: ['iterate'],
  items: [{
    title: '收盘结论',
    conclusion: '市场震荡',
    evidence: [{
      report_type: 'review',
      id: 'report-1',
      data_source: 'analysis_reports',
      created_at: '2026-07-24T15:20:00+08:00',
    }],
    as_of: '2026-07-24T15:20:00+08:00',
    confidence: 'unknown',
    uncertainty: '迭代报告尚未生成',
  }],
}

test('仅接受包含真实证据的 Brief v1，并保留降级与缺失来源', () => {
  const brief = parseBriefingReport(EVENING_BRIEF, 'evening')

  assert.equal(brief?.brief_type, 'evening')
  assert.equal(brief?.degraded, true)
  assert.deepEqual(brief?.missing_sources, ['iterate'])
  assert.equal(brief?.items[0]?.evidence[0]?.id, 'report-1')
})

test('拒绝类型不匹配或未结构化的旧报告，避免把原始报告当作 Brief', () => {
  assert.equal(parseBriefingReport(EVENING_BRIEF, 'morning'), null)
  assert.equal(parseBriefingReport({ text: '旧复盘正文' }, 'evening'), null)
})

test('拒绝缺少真实证据字段的 Brief item', () => {
  const malformed = {
    ...EVENING_BRIEF,
    items: [{ ...EVENING_BRIEF.items[0], evidence: [{ report_type: 'review' }] }],
  }
  assert.equal(parseBriefingReport(malformed, 'evening'), null)
})

test('拒绝没有证据的 Brief item', () => {
  const malformed = {
    ...EVENING_BRIEF,
    items: [{ ...EVENING_BRIEF.items[0], evidence: [] }],
  }
  assert.equal(parseBriefingReport(malformed, 'evening'), null)
})

test('拒绝少于三条的正常 Brief', () => {
  const malformed = {
    ...EVENING_BRIEF,
    degraded: false,
    missing_sources: [],
  }
  assert.equal(parseBriefingReport(malformed, 'evening'), null)
})

test('降级 Brief 必须声明缺失来源', () => {
  const malformed = {
    ...EVENING_BRIEF,
    missing_sources: [],
  }
  assert.equal(parseBriefingReport(malformed, 'evening'), null)
})

test('拒绝超过五条的 Brief', () => {
  const malformed = {
    ...EVENING_BRIEF,
    items: Array(6).fill(EVENING_BRIEF.items[0]),
  }
  assert.equal(parseBriefingReport(malformed, 'evening'), null)
})

test('拒绝空的截至时间、结论或证据标识', () => {
  assert.equal(parseBriefingReport({ ...EVENING_BRIEF, as_of: '' }, 'evening'), null)
  assert.equal(parseBriefingReport({
    ...EVENING_BRIEF,
    items: [{ ...EVENING_BRIEF.items[0], conclusion: '' }],
  }, 'evening'), null)
  assert.equal(parseBriefingReport({
    ...EVENING_BRIEF,
    items: [{
      ...EVENING_BRIEF.items[0],
      evidence: [{ ...EVENING_BRIEF.items[0].evidence[0], id: '' }],
    }],
  }, 'evening'), null)
})
