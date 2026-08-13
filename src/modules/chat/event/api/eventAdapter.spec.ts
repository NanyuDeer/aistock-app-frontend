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
