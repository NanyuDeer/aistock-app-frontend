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
