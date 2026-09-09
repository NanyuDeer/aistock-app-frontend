import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync(new URL('./agent-report.vue', import.meta.url), 'utf8')

test('loadAllReports rhythm_master 特判解包行为：拦截器已解包信封，直接取 .versions（?.data 写法会 fail）', () => {
  // 从源码提取 rhythm_master 特判的解包行并模拟执行：响应拦截器（request.ts）code===0 时 return data，
  // 故 getRhythmMaster 解析值即 {date, versions}，无 .data 字段；?.data?.versions 写法会导致 versions 恒为 undefined
  const unwrapLine = pageSource.match(/const versions = \(res as \{.*\}\)\.versions \?\? \[\]/)?.[0]
  assert.ok(unwrapLine, 'rhythm_master 特判应存在直接解包 .versions ?? [] 的表达式（而非 ?.data?.versions）')
  const js = unwrapLine.replace(/\(res as \{[^]*?\}\)/, '(res)')
  const unwrap = new Function('res', `${js}\nreturn versions`) as (res: unknown) => unknown[]
  const versions = [{ content: { rhythm_card: { level: '强势' } } }]
  // mock agentApi.getRhythmMaster 返回 {date, versions:[...]} → versions 被填充
  assert.deepEqual(unwrap({ date: '2026-08-28', versions }), versions)
  // versions 缺失/空 → 兜底 []
  assert.deepEqual(unwrap({ date: '2026-08-28' }), [])
  assert.deepEqual(unwrap({ date: '2026-08-28', versions: [] }), [])
})
