import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBroadcastReport } from './broadcastReport'

const MORNING_BROADCAST = {
  schema_version: 'broadcast.v1',
  brief_type: 'morning',
  source_brief: {
    id: 'brief-1',
    report_type: 'brief_morning',
    report_date: '2026-07-25',
    as_of: '2026-07-25T08:30:00+08:00',
  },
  degraded: false,
  missing_sources: [],
  dialogue: [
    { role: 'host', content: '早上好。' },
    { role: 'analyst', content: '这是已校验的市场结论。' },
  ],
  audio_path: '/api/agent/audio/broadcast-morning-2026-07-25.mp3',
}

test('仅接受绑定同类型 Brief 的 Broadcast v1', () => {
  const report = parseBroadcastReport(MORNING_BROADCAST, 'morning', '2026-07-25')

  assert.equal(report?.source_brief.report_type, 'brief_morning')
  assert.equal(report?.dialogue[1]?.role, 'analyst')
})

test('接受后端返回的数字 source_brief.id，保留播报音频路径', () => {
  const report = parseBroadcastReport({
    ...MORNING_BROADCAST,
    source_brief: { ...MORNING_BROADCAST.source_brief, id: 66 },
  }, 'morning', '2026-07-25')

  assert.equal(report?.source_brief.id, 66)
  assert.equal(report?.audio_path, '/api/agent/audio/broadcast-morning-2026-07-25.mp3')
})

test('拒绝旧 text Broadcast、错误 source Brief 和非法 dialogue', () => {
  assert.equal(parseBroadcastReport({ content: { text: '旧播报', audio_path: '/api/agent/audio/a.mp3' } }, 'morning', '2026-07-25'), null)
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    source_brief: { ...MORNING_BROADCAST.source_brief, report_type: 'brief_evening' },
  }, 'morning', '2026-07-25'), null)
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    dialogue: [{ role: 'guest', content: '不合法角色' }],
  }, 'morning', '2026-07-25'), null)
})

test('拒绝非降级 Broadcast 的缺失来源', () => {
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    missing_sources: ['iterate'],
  }, 'morning', '2026-07-25'), null)
})

test('拒绝 source Brief 日期不符', () => {
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    source_brief: { ...MORNING_BROADCAST.source_brief, report_date: '2026-07-24' },
  }, 'morning', '2026-07-25'), null)
})

test('拒绝受限目录外或非 MP3 的音频路径', () => {
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    audio_path: '/api/agent/audio/../secret.mp3',
  }, 'morning', '2026-07-25'), null)
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    audio_path: '/api/agent/audio/broadcast-morning.wav',
  }, 'morning', '2026-07-25'), null)
})

test('拒绝不属于当前类型或日期的 Broadcast 音频', () => {
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    audio_path: '/api/agent/audio/broadcast-morning-2026-07-24.mp3',
  }, 'morning', '2026-07-25'), null)
  assert.equal(parseBroadcastReport({
    ...MORNING_BROADCAST,
    audio_path: '/api/agent/audio/broadcast-evening-2026-07-25.mp3',
  }, 'morning', '2026-07-25'), null)
})

test('拒绝非法或路径式 expectedDate，即使 source 与音频路径回显该值', () => {
  for (const date of ['2026-07-24-invalid', '../2026-07-24']) {
    assert.equal(parseBroadcastReport({
      ...MORNING_BROADCAST,
      source_brief: { ...MORNING_BROADCAST.source_brief, report_date: date },
      audio_path: `/api/agent/audio/broadcast-morning-${date}.mp3`,
    }, 'morning', date), null)
  }
})
