import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const componentSource = readFileSync(new URL('./MorningContent.vue', import.meta.url), 'utf8')

test('首页对降级 Brief 显示明确的证据不完整标识', () => {
  assert.match(componentSource, /v-if="report\?\.degraded" class="briefing-degraded"/)
  assert.match(componentSource, /证据不完整/)
})

test('大盘无归因时，summaryTags 改用市场异象关键词而非降级文案', () => {
  // 识别大盘归因降级文案（证据不足 / 未确认主因）
  assert.match(componentSource, /isDowngradedAttribution/)
  assert.match(componentSource, /证据不足\|未确认主因/)
  // 头条为"归因结论"且降级时，改取市场异象关键词（优先"收盘复盘"现象摘要）
  assert.match(componentSource, /head\?\.title === '归因结论' && isDowngradedAttribution/)
  assert.match(componentSource, /for \(const title of \['收盘复盘', '市场快照'\]\)/)
  assert.match(componentSource, /it\?\.title === title/)
})

test('首页展示真实缺失来源，且零条 Brief 不显示为关键线索', () => {
  assert.match(componentSource, /report\?\.missing_sources\.join\('、'\)/)
  assert.match(componentSource, /v-if="briefingClueCount > 0"/)
})

test('首页卡片替换为节奏大师（今日分析概览移至交易入口占位）', () => {
  assert.match(componentSource, /节奏大师/)
  assert.match(componentSource, /modules\/rhythm\/pages\/index/)
  assert.match(componentSource, /getRhythmMaster/)
  // 今日分析概览已从首页卡片移除
  assert.ok(!/今日分析概览/.test(componentSource))
})

test('loadRhythm 解包行为：拦截器已解包 {code,data} 信封，直接取 .versions（mock getRhythmMaster 返回 {date, versions}）', () => {
  // 从源码提取解包行并模拟执行：响应拦截器（request.ts）code===0 时 return data，
  // 故 getRhythmMaster 解析值即 {date, versions}，无 .data 字段；?.data?.versions 写法会导致 versions 恒为 undefined
  const unwrapLine = componentSource.match(/const versions = \(res as \{.*\}\)\.versions \?\? \[\]/)?.[0]
  assert.ok(unwrapLine, 'loadRhythm 应存在直接解包 .versions ?? [] 的表达式（而非 ?.data?.versions）')
  const js = unwrapLine.replace(/\(res as \{[^]*?\}\)/, '(res)')
  const unwrap = new Function('res', `${js}\nreturn versions`) as (res: unknown) => unknown[]
  const versions = [{ refresh_slot: 'after_close' }, { refresh_slot: 'morning' }]
  // mock agentApi.getRhythmMaster 返回 {date, versions:[...]} → versions 被填充
  assert.deepEqual(unwrap({ date: '2026-08-28', versions }), versions)
  // versions 缺失/空 → 兜底 []
  assert.deepEqual(unwrap({ date: '2026-08-28' }), [])
  assert.deepEqual(unwrap({ date: '2026-08-28', versions: [] }), [])
})
