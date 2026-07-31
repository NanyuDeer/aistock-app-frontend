import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBriefingItemsFromBrief } from './briefingAdapter'

test('将已校验的 Brief v1 映射为早点听展示条目', () => {
  const items = parseBriefingItemsFromBrief({
    schema_version: 'brief.v1',
    brief_type: 'morning',
    as_of: '2026-07-31T00:00:00+08:00',
    degraded: false,
    missing_sources: [],
    items: [
      {
        title: '科技板块情绪回暖',
        conclusion: '外围市场上涨，科技板块有望修复。',
        evidence: [],
        as_of: '2026-07-31T00:00:00+08:00',
        confidence: 'medium',
        uncertainty: '仍需关注成交量。',
      },
    ],
  })

  assert.deepEqual(items, [
    {
      id: 'morning-0',
      source: 'morning',
      sentiment: 'bull',
      title: '科技板块情绪回暖',
      conclusion: '外围市场上涨，科技板块有望修复。',
      relatedTags: [],
      isHeadline: true,
      isAlert: false,
    },
  ])
})

test('保留每条 Brief 的真实 Agent 来源，而非统一标为晨报', () => {
  const items = parseBriefingItemsFromBrief({
    schema_version: 'brief.v1',
    brief_type: 'morning',
    as_of: '2026-07-31T00:00:00+08:00',
    degraded: false,
    missing_sources: [],
    items: [
      {
        title: '趋势股评分结论',
        conclusion: '趋势股仍在上行通道。',
        evidence: [{ report_type: 'trend_score', id: '14', data_source: 'agent', created_at: '2026-07-31T00:00:00+08:00' }],
        as_of: '2026-07-31T00:00:00+08:00',
        confidence: 'medium',
        uncertainty: '市场波动。',
      },
    ],
  })

  assert.equal(items[0].source, 'trend')
})
