import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('loadVersions 解包行为：拦截器已解包 {code,data} 信封，直接取 .versions（mock getRhythmMaster 返回 {date, versions}）', () => {
  // 从源码提取解包行并模拟执行：响应拦截器（request.ts）code===0 时 return data，
  // 故 getRhythmMaster 解析值即 {date, versions}，无 .data 字段。
  const unwrapLine = pageSource.match(/const list = \(res as \{[^}]*\}\)\.versions \?\? \[\]/)?.[0]
  assert.ok(unwrapLine, 'loadVersions 应存在直接解包 .versions ?? [] 的表达式（而非 ?.data?.versions）')
  const js = unwrapLine.replace(/\s+as\s+\{[^}]*\}/, '')
  const unwrap = new Function('res', `${js}\nreturn list`) as (res: unknown) => unknown[]

  const versions = [{ refresh_slot: 'after_close' }, { refresh_slot: 'morning' }]
  // mock agentApi.getRhythmMaster 返回 {date, versions:[...]} → versions 被填充
  assert.deepEqual(unwrap({ date: '2026-08-28', versions }), versions)
  // versions 缺失/空 → 兜底 []
  assert.deepEqual(unwrap({ date: '2026-08-28' }), [])
  assert.deepEqual(unwrap({ date: '2026-08-28', versions: [] }), [])
})

test('loadVersions 不应再经 ?.data 取 versions（防回退到错误解包）', () => {
  const loadVersions = pageSource.match(/async function loadVersions[\s\S]*?\n\}/)?.[0] ?? ''
  assert.doesNotMatch(loadVersions, /\.data\?\.versions/)
  assert.doesNotMatch(loadVersions, /\?\.data\b/)
})

test('回退取前值改用 getPreviousTradingDay（严格早于 d，避免 getRecentTradingDays 含当天导致 prev===d 回退失效）', () => {
  const loadVersions = pageSource.match(/async function loadVersions[\s\S]*?\n\}/)?.[0] ?? ''
  // loadVersions 回退分支走 previousTradingDay(d)，不再用 fallbackDate()（getRecentTradingDays 含当天）
  assert.match(loadVersions, /const prev = await previousTradingDay\(d\)/)
  assert.doesNotMatch(loadVersions, /const prev = await fallbackDate\(\)/)
  // previousTradingDay 包装函数内部调用 agentApi.getPreviousTradingDay（严格早于指定日期）
  const prevDay = pageSource.match(/async function previousTradingDay\(date: string\): Promise<string \| undefined>[\s\S]*?\n\}/)?.[0] ?? ''
  assert.match(prevDay, /agentApi\.getPreviousTradingDay\(date\)/)
})

test('未指定日期时 fallbackDate 仍取最近交易日（含当天若为交易日）', () => {
  const fallback = pageSource.match(/async function fallbackDate\(\): Promise<string \| undefined>[\s\S]*?\n\}/)?.[0] ?? ''
  assert.match(fallback, /getRecentTradingDays\(todayStr\(\), 1\)/)
  assert.match(fallback, /t\?\.\[0\]/)
})

test('未使用的 RhythmMasterReport import 已删除', () => {
  assert.doesNotMatch(pageSource, /RhythmMasterReport/)
})
