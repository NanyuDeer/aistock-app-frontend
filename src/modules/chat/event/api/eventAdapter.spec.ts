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
