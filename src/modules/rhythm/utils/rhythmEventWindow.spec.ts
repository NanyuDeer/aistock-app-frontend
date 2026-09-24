import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupEventWindow, type EventWindowRow } from './rhythmEventWindow'

function ev(date: string, title: string, importance: 'high' | 'medium' | 'low' = 'medium'): EventWindowRow {
  return { date, type: 'macro', title, importance }
}

test('过滤过去事件 + date 升序取前 3（同日稳定保持原序）', () => {
  const events = [
    ev('2026-10-16', 'IM 交割日'),
    ev('2026-09-20', '过去事件'),
    ev('2026-09-24', 'CPI 公布'),
    ev('2026-09-23', '盘后公告'),
    ev('2026-09-25', '国常会'),
    ev('2026-09-28', '解禁高峰'),
  ]
  const g = groupEventWindow(events, '2026-09-23')
  assert.deepEqual(g.next.map((e) => e.title), ['盘后公告', 'CPI 公布', '国常会'])
  assert.deepEqual(g.far.map((e) => e.title), ['解禁高峰', 'IM 交割日'])
})

test('锚点去重：同 event_date+title 跳过（保证三件事=3 个不同事件，spec R-G）', () => {
  const events = [
    ev('2026-09-23', 'CPI 公布', 'high'),
    ev('2026-09-24', '国常会'),
    ev('2026-09-25', '解禁高峰'),
    ev('2026-09-28', '财报'),
  ]
  const g = groupEventWindow(events, '2026-09-23', { event_date: '2026-09-23', title: 'CPI 公布' })
  assert.deepEqual(g.next.map((e) => e.title), ['国常会', '解禁高峰', '财报'])
  assert.equal(g.far.length, 0)
})

test('锚点不在窗口内 → 不过滤任何条目', () => {
  const events = [ev('2026-09-24', 'CPI 公布')]
  const g = groupEventWindow(events, '2026-09-23', { event_date: '2026-10-16', title: 'IM 交割日' })
  assert.equal(g.next.length, 1)
})

test('next 空但 far 非空 → far 保留（模板直接渲染更远入口，不出空列表死区）', () => {
  const events = [ev('2026-09-24', 'CPI 公布')]
  const g = groupEventWindow(events, '2026-09-23', null, 0)
  assert.equal(g.next.length, 0)
  assert.equal(g.far.length, 1)
})

test('空窗口/空入参 → 双空数组（走组件空态三态）', () => {
  assert.deepEqual(groupEventWindow([], '2026-09-23'), { next: [], far: [] })
  assert.deepEqual(groupEventWindow(null, '2026-09-23'), { next: [], far: [] })
  assert.deepEqual(groupEventWindow(undefined, '2026-09-23'), { next: [], far: [] })
})

test('不足 3 条 → 如实展示剩余（不补位）', () => {
  const g = groupEventWindow([ev('2026-09-23', '仅有一件')], '2026-09-23')
  assert.equal(g.next.length, 1)
  assert.equal(g.far.length, 0)
})
