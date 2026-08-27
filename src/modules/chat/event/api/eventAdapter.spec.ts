import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adaptEventDetail, adaptEventList } from './eventAdapter'

test('列表将卫报 URL 映射为中文媒体名并保留链接', () => {
  const result = adaptEventList({
    events: [{ eventId: '1', title: '标题', source: 'https://www.theguardian.com/world/x', publishTime: '', summary: '', conclusion: '' }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  assert.deepEqual(result.events[0].sourceInfo, {
    name: '英国《卫报》', url: 'https://www.theguardian.com/world/x',
  })
})

test('未知 URL 显示规范化域名，非 URL 保持原值', () => {
  const unknown = adaptEventList({
    events: [{ eventId: '2', title: '标题', source: 'https://WWW.example.com/article', publishTime: '', summary: '', conclusion: '' }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  assert.equal(unknown.events[0].sourceInfo?.name, 'example.com')
  assert.equal(unknown.events[0].sourceInfo?.url, 'https://WWW.example.com/article')
})

test('详情复用相同的媒体名映射', () => {
  const detail = adaptEventDetail({
    id: 1, report_type: 'event_conduction', report_date: '2026-07-17', user_id: '',
    content: {
      eventId: '3', title: '标题', source: 'https://www.theguardian.com/world/x',
      publishTime: '', event: '', analysis_reports: {},
    },
    data_source: '', status: 'completed', generation_time_ms: 0,
    model_version: '', created_at: '',
  })
  assert.equal(detail.event.sourceInfo?.name, '英国《卫报》')
})

// ── source_name / event_type 全链路接入 ──

test('source_name 优先展示真实来源名，event_type 使用真实值', () => {
  const result = adaptEventList({
    events: [{
      eventId: '4', title: '标题', source: 'https://m.sohu.com/a/123',
      source_name: '搜狐', event_type: '市场动态',
      publishTime: '', summary: '', conclusion: '',
    }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  assert.deepEqual(result.events[0].sourceInfo, {
    name: '搜狐', url: 'https://m.sohu.com/a/123',
  })
  assert.equal(result.events[0].eventType, '市场动态')
})

test('source_name 为空时回退 URL/domain 解析', () => {
  const result = adaptEventList({
    events: [{
      eventId: '5', title: '标题', source: 'https://m.sohu.com/a/456',
      publishTime: '', summary: '', conclusion: '',
    }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  assert.equal(result.events[0].sourceInfo?.name, 'm.sohu.com')
  assert.equal(result.events[0].sourceInfo?.url, 'https://m.sohu.com/a/456')
})

test('event_type 非法值回退默认类型', () => {
  const result = adaptEventList({
    events: [{
      eventId: '6', title: '标题', source: '',
      source_name: '财联社', event_type: '非法类型X',
      publishTime: '', summary: '', conclusion: '',
    }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  assert.equal(result.events[0].eventType, '产业政策')
  assert.equal(result.events[0].sourceInfo?.name, '财联社')
})

test('旧数据无 source_name/event_type 时正常展示（兜底）', () => {
  const result = adaptEventList({
    events: [{
      eventId: '7', title: '标题', source: '',
      publishTime: '', summary: '', conclusion: '',
    }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  // source 为空 → sourceInfo undefined；eventType 兜底默认
  assert.equal(result.events[0].sourceInfo, undefined)
  assert.equal(result.events[0].eventType, '产业政策')
})

test('详情透传 source_name 与 event_type', () => {
  const detail = adaptEventDetail({
    id: 1, report_type: 'event_conduction', report_date: '2026-07-17', user_id: '',
    content: {
      eventId: '8', title: '标题', source: 'https://www.cls.cn/detail/1',
      source_name: '财联社', event_type: '监管变化',
      publishTime: '', event: '', analysis_reports: {},
    },
    data_source: '', status: 'completed', generation_time_ms: 0,
    model_version: '', created_at: '',
  })
  assert.equal(detail.event.sourceInfo?.name, '财联社')
  assert.equal(detail.event.sourceInfo?.url, 'https://www.cls.cn/detail/1')
  assert.equal(detail.event.eventType, '监管变化')
  assert.equal(detail.event.sourceName, '财联社')
})

// ── 重要程度星级：由 chain_summary 最大 impactStrength 映射（0~1 → 1~5 星） ──

test('重要程度星级：按 chain 最大 impactStrength 映射 1~5 星', () => {
  const cases: Array<[number, number]> = [
    [0.1, 1], [0.3, 2], [0.5, 3], [0.7, 4], [0.9, 5],
  ]
  for (const [strength, stars] of cases) {
    const result = adaptEventList({
      events: [{
        eventId: `s${strength}`, title: '标题', source: '', publishTime: '', summary: '', conclusion: '',
        chain_summary: [{ industry: 'A', direction: 'bullish', impactStrength: strength }],
      }],
      total: 1, page: 1, pageSize: 10, hasMore: false,
    })
    assert.equal(result.events[0].importance, stars, `impactStrength=${strength} 应为 ${stars} 星`)
  }
})

test('重要程度星级：取最大 impactStrength（非首条）', () => {
  const result = adaptEventList({
    events: [{
      eventId: 'max', title: '标题', source: '', publishTime: '', summary: '', conclusion: '',
      chain_summary: [
        { industry: 'A', direction: 'bullish', impactStrength: 0.3 },
        { industry: 'B', direction: 'bearish', impactStrength: 0.9 },
      ],
    }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  assert.equal(result.events[0].importance, 5)
})

test('重要程度星级：无 chain_summary → undefined（前端隐藏，不显示假评分）', () => {
  const result = adaptEventList({
    events: [{ eventId: 'nochain', title: '标题', source: '', publishTime: '', summary: '', conclusion: '' }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  assert.equal(result.events[0].importance, undefined)
})

test('重要程度星级：非法 impactStrength（0/负数/字符串/NaN）→ undefined', () => {
  const bad = (impactStrength: unknown) => adaptEventList({
    events: [{
      eventId: 'bad', title: '标题', source: '', publishTime: '', summary: '', conclusion: '',
      chain_summary: [{ industry: 'A', direction: 'bullish', impactStrength: impactStrength as number }],
    }],
    total: 1, page: 1, pageSize: 10, hasMore: false,
  })
  for (const v of [0, -0.5, '0.9' as unknown as number, Number.NaN]) {
    assert.equal(bad(v).events[0].importance, undefined, `impactStrength=${String(v)} 应无评分`)
  }
})

test('详情重要程度：优先 chain_summary，回退 event_transmission.chain，均无 → undefined', () => {
  const transmissionChain = [{
    industry: 'X', relation: '核心', level: 1,
    direction: 'bullish' as const, impactStrength: 0.4, reason: '',
  }]

  // 1) chain_summary 优先
  const withSummary = adaptEventDetail({
    id: 1, report_type: 'event_conduction', report_date: '2026-07-17', user_id: '',
    chain_summary: [{ industry: 'A', direction: 'bullish', impactStrength: 0.8 }],
    content: {
      eventId: 'd1', title: '标题', source: '', publishTime: '', event: '',
      analysis_reports: { event_transmission: { eventId: 'd1', mechanism: '', variables: [], coreIndustry: { name: 'X', impact: '', reason: '' }, chain: transmissionChain } },
    },
    data_source: '', status: 'completed', generation_time_ms: 0, model_version: '', created_at: '',
  })
  assert.equal(withSummary.event.importance, 4)

  // 2) 无 chain_summary → 回退 chain
  const fromChain = adaptEventDetail({
    id: 2, report_type: 'event_conduction', report_date: '2026-07-17', user_id: '',
    content: {
      eventId: 'd2', title: '标题', source: '', publishTime: '', event: '',
      analysis_reports: { event_transmission: { eventId: 'd2', mechanism: '', variables: [], coreIndustry: { name: 'X', impact: '', reason: '' }, chain: [{ ...transmissionChain[0], impactStrength: 0.9 }] } },
    },
    data_source: '', status: 'completed', generation_time_ms: 0, model_version: '', created_at: '',
  })
  assert.equal(fromChain.event.importance, 5)

  // 3) 均无 → undefined
  const none = adaptEventDetail({
    id: 3, report_type: 'event_conduction', report_date: '2026-07-17', user_id: '',
    content: { eventId: 'd3', title: '标题', source: '', publishTime: '', event: '', analysis_reports: {} },
    data_source: '', status: 'completed', generation_time_ms: 0, model_version: '', created_at: '',
  })
  assert.equal(none.event.importance, undefined)
})
