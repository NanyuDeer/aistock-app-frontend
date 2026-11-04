import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./RhythmCard.vue', import.meta.url), 'utf8')

test('节奏状态卡渲染契约：免责横幅/主档位/空态区分/事件区', () => {
  assert.match(source, /不构成任何投资建议/)
  assert.match(source, /position_band/)
  assert.match(source, /data_missing/)
  assert.match(source, /event_source_missing/)
  assert.match(source, /rc-slot|slotLabel/)
})

test('设计稿（v4 修订）：主档位卡只留仓位主视觉 + target/basis/refresh 元信息', () => {
  // 2026-11-04 职责重定义：主视觉＝仓位档位，节奏改由仓位动作表达
  assert.match(source, /rc-pos-main/)
  assert.match(source, /rc-meta/)
  assert.match(source, /targetDate/)
  assert.match(source, /basisDate/)
  assert.match(source, /refreshSlot/)
})

test('设计稿：事件日历分区保留（情绪周期分区已整块移除）', () => {
  assert.match(source, /rc-sec-title/)
  assert.match(source, /未来事件日历/)
  assert.match(source, /rc-evtag/)
  // 情绪周期 chip / 阶段词 / 实验性判定不再上卡（spec §2.2 level 废弃上屏）
  assert.doesNotMatch(source, /<text class="rc-sec-title">情绪周期<\/text>/)
  assert.doesNotMatch(source, /rc-chip/)
  assert.doesNotMatch(source, /实验性判定/)
  assert.doesNotMatch(source, /PHASE_META/)
})

test('I1（验收 3）：event_high_hint 渲染（after_close 基准卡与增量分支同源字段，空串不渲染）', () => {
  assert.match(source, /event_high_hint/)
  assert.match(source, /v-if="card\.event_high_hint"/)
  assert.match(source, /rc-hint/)
})

test('P1：next_event_anchor 锚点条渲染（无锚点整块不渲染）', () => {
  assert.match(source, /next_event_anchor/)
  assert.match(source, /v-if="card\.next_event_anchor"/)
  assert.match(source, /下一事件/)
  assert.match(source, /rc-anchor/)
})

test('事件锚点块标题改为「下一事件」并含强度标签', () => {
  assert.ok(source.includes('下一事件'))
  assert.ok(!source.includes('下一重大事件'))
  assert.ok(source.includes('重大'))
})

test('去重瘦身：rc-branch 区块 / rc-phase-ev 证据行已移除；v3 R-J rc-pos 占位行回归', () => {
  assert.match(source, /仓位建议暂缺/)
  assert.doesNotMatch(source, /rc-branch/)
  assert.doesNotMatch(source, /rc-phase-ev/)
})

test('事件日历空态文案不再断言"今日无事件"（需求 2：标题改"未来事件日历"、去 5 交易日）', () => {
  assert.ok(!source.includes('今日无事件（正常交易日）'))
  assert.ok(source.includes('未来事件日历'))
  assert.ok(!source.includes('未来 5 交易日事件日历'))
  assert.ok(source.includes('暂无已登记事件'))
  assert.ok(source.includes('该维度数据源未接入'))
})

test('v3 极简：事件区分组渲染 groupEventWindow（未来 3 事件 + 更远折叠入口）', () => {
  assert.match(source, /groupEventWindow\(/)
  assert.match(source, /eventGroups/)
  assert.match(source, /更远事件（共 \{\{ eventGroups\.far\.length \}\} 条）/)
  assert.match(source, /farExpanded/)
})

test('v3 极简：near/far 按日期切分与 event_window_near_end_date 消费已删除', () => {
  assert.doesNotMatch(source, /event_window_near_end_date/)
  assert.doesNotMatch(source, /nearEvents/)
  assert.doesNotMatch(source, /farEvents/)
})

test('v3 极简：锚点卡保留 + 空态三态（源未接入/无事件）不变', () => {
  assert.match(source, /rc-anchor/)
  assert.match(source, /该维度数据源未接入/)
  assert.match(source, /暂无已登记事件/)
})

test('v3 色彩三色（R-I）：importance medium 去橙（情绪周期 chip 已随分区移除）', () => {
  // imp-med 去橙（原 #b45309 / $warning），改中性灰；imp-high 保留 $up 红（A 股语义）
  const impMed = source.match(/\.rc-evimp\.imp-med \{[^}]*\}/)?.[0] ?? ''
  assert.ok(impMed, '应存在 .rc-evimp.imp-med 样式')
  assert.ok(!impMed.includes('#b45309') && !impMed.includes('$warning'))
  assert.match(source, /\.rc-evimp\.imp-high \{[^}]*\$up/)
})

test('v3 空态有字（R-J）：主档位卡恒渲染，仓位缺失显示占位；不再上屏 score 数字', () => {
  // rc-main 无整体 v-if 门控（恒渲染，缺失不留空白）
  assert.ok(!/"rc-main"\s*v-if/.test(source))
  assert.match(source, /仓位建议暂缺/)
  // 2026-11-03 语义收口：score 是档位序号×20 的查表值，单独上屏会被误读为温度分
  assert.ok(!/rc-score/.test(source), '不应再渲染 score 数字')
  assert.match(source, /rc-pos-main/)
})

test('T3 主视觉＝仓位档位：色块/短码取 position_index（颜色＝建议仓位）', () => {
  assert.match(source, /rc-tier/)
  assert.match(source, /positionColor\(card\.position_index\)/)
  assert.match(source, /positionShort\(card\.position_index\)/)
  // 索引 0（空仓）是合法档位：短码为空串时才用占位符，不得用真值判断整块
  assert.ok(!/v-if="card\.position_index"/.test(source), '0 档不得被真值判断吞掉')
})

test('T3 新增「无主线即空仓」说明位（文案固定，L1 档位旁可见）', () => {
  assert.ok(source.includes('无清晰主线时档位强制为空仓'), '必须有可见的无主线说明位')
  assert.match(source, /rc-rule/)
})

test('T3 移除情绪温度区块与档位残留：temperature_series / level / 五档刻度不再上屏', () => {
  // 温度字段仍在契约里（后端继续产出），但本卡不得渲染
  assert.doesNotMatch(source, /card\.temperature_series/)
  assert.doesNotMatch(source, /rc-temp/)
  assert.doesNotMatch(source, /TEMP_BANDS/)
  // 档位（level）零消费：短码/颜色/文案均不得读取 level
  assert.doesNotMatch(source, /card\.level/)
  assert.doesNotMatch(source, /levelShort|levelLabel|LEVEL_LABEL/)
  assert.doesNotMatch(source, /rc-scale|rc-labels|BAND_LABELS/)
})
