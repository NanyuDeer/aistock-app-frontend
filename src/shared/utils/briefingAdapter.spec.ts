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

test('事件传导洞见的展示摘要不超过 100 字，避免早点听卡片被长文撑开', () => {
  const conclusion = '地缘冲突升级可能推高能源价格并扰动全球风险偏好，市场需要关注原油、航运、军工与避险资产的短期波动，同时评估政策协调与流动性变化对权益市场估值的影响。'.repeat(2)
  const items = parseBriefingItemsFromBrief({
    schema_version: 'brief.v1',
    brief_type: 'morning',
    as_of: '2026-07-31T00:00:00+08:00',
    degraded: false,
    missing_sources: [],
    items: [{
      title: '中东局势升级的市场传导',
      conclusion,
      evidence: [{ report_type: 'event_conduction', id: '88', data_source: 'agent', created_at: '2026-07-31T00:00:00+08:00' }],
      as_of: '2026-07-31T00:00:00+08:00',
      confidence: 'medium',
      uncertainty: '事件后续进展存在不确定性。',
    }],
  })

  assert.equal(items[0].source, 'event')
  assert.equal(items[0].conclusion.length, 100)
  assert.equal(items[0].conclusion.endsWith('…'), true)
})

test('事件传导用结论中的具体事件作为标题，而非重复的通用标题', () => {
  const items = parseBriefingItemsFromBrief({
    schema_version: 'brief.v1',
    brief_type: 'morning',
    as_of: '2026-07-31T00:00:00+08:00',
    degraded: false,
    missing_sources: [],
    items: [{
      title: '事件传导分析',
      conclusion: '各位投资者，今日聚焦中东地缘局势突变：美军对伊朗发动直接军事打击，油气与军工板块短期受关注。',
      evidence: [{ report_type: 'event_conduction', id: '89', data_source: 'agent', created_at: '2026-07-31T00:00:00+08:00' }],
      as_of: '2026-07-31T00:00:00+08:00',
      confidence: 'medium',
      uncertainty: '事件后续进展存在不确定性。',
    }],
  })

  assert.equal(items[0].title, '中东地缘局势突变')
})
