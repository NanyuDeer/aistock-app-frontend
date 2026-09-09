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
  assert.match(componentSource, /getRhythmMasterCalendar/)
  // 今日分析概览已从首页卡片移除
  assert.ok(!/今日分析概览/.test(componentSource))
})

test('节奏卡改近几日摘要：一次 getRhythmMasterCalendar 取多日，映射 position_band 仓位文案；不逐日 getRhythmMaster', () => {
  assert.match(componentSource, /agentApi\.getRhythmMasterCalendar\(HOME_RHYTHM_DAYS\)/)
  assert.match(componentSource, /band: d\.position_band\?\.text \?\? ''/)
  // 首页摘要只消费日历聚合接口（含 position_band），避免为多日结论发 N 次单日报告请求
  assert.doesNotMatch(componentSource, /agentApi\.getRhythmMaster\(/)
  assert.doesNotMatch(componentSource, /rhythmSummary/)
})

test('节奏卡近几日行可点入对应交易日详情（带 date 参数），且 stop 防触整卡跳转', () => {
  assert.match(componentSource, /@tap\.stop="goRhythmDate\(r\.date\)"/)
  assert.match(componentSource, /function goRhythmDate\(date: string\)/)
  assert.match(componentSource, /modules\/rhythm\/pages\/index\?date=\$\{date\}/)
  // 整卡点击仍保留（默认进最近交易日）
  assert.match(componentSource, /function goRhythm\(\)/)
})

test('节奏卡 loadRhythmHistory 失败/空数据兜底为空数组（不显示假数据），onShow 接入新取数函数', () => {
  assert.match(componentSource, /async function loadRhythmHistory\(\)/)
  assert.match(componentSource, /agentApi\.getRhythmMasterCalendar\(HOME_RHYTHM_DAYS\)/)
  assert.match(componentSource, /res\?\.days \?\? \[\]/)
  // 失败兜底写在 catch 内（空数组，不显示假数据）
  assert.match(componentSource, /catch \{\s*\n\s*rhythmRows\.value = \[\]/)
  // onShow 调用点同步更新（防手改函数却忘接入口）
  const onShowBlock = componentSource.match(/onShow\(\(\) => \{[\s\S]*?\n\s*\}\)/)?.[0] ?? ''
  assert.match(onShowBlock, /loadRhythmHistory\(\)/)
  assert.doesNotMatch(onShowBlock, /loadRhythm\(\)/)
})
