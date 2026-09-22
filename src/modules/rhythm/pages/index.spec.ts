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

test('F2：主请求 getRhythmMaster 包 try/catch（网络错误不 unhandled rejection，落 EmptyState）', () => {
  const loadVersions = pageSource.match(/async function loadVersions[\s\S]*?\n\}/)?.[0] ?? ''
  assert.match(loadVersions, /try \{/)
  assert.match(loadVersions, /res = await agentApi\.getRhythmMaster\(d\)/)
  assert.match(loadVersions, /} catch \{/)
})

test('需求 2：pickSlotByClock 按上海时刻自动选中时点（固定 UTC+8，不依赖设备时区）', () => {
  // 从源码提取纯函数体；将函数体内的 new Date() 替换为注入的 now()（stub 控制时刻），
  // shanghaiDateTimeParts 也注入 stub（避免 import .vue 的依赖链）
  const fn = pageSource.match(/function pickSlotByClock\(date\?: Date\): string \{\n([\s\S]*?)\n\}/)?.[1] ?? ''
  assert.ok(fn, '应存在 pickSlotByClock 函数（stub 依赖后可直接执行；<script setup> 内不可 export，故不匹配 export 前缀）')
  const body = fn.replace(/shanghaiDateTimeParts\(date \?\? new Date\(\)\)/, 'shanghaiDateTimeParts(now())')
  const shanghaiDateTimeParts = (d: Date) => {
    const sh = new Date(d.getTime() + 8 * 60 * 60 * 1000)
    return { hour: sh.getUTCHours(), minute: sh.getUTCMinutes(), month: 1, day: 1, weekday: 1, year: 2026 }
  }
  const pick = new Function('shanghaiDateTimeParts', 'now', `${body}\nreturn pickSlotByClock()`)
  const at = (iso: string) => pick(shanghaiDateTimeParts, () => new Date(iso))
  // 上海时间边界：08:29 → after_close；08:30 → morning；12:29 → morning；12:30 → midday
  // 16:04 → midday；16:05 → after_close（对齐 config 生成时刻 9:00/12:30/16:05）
  assert.equal(at('2026-09-21T00:29:00Z'), 'after_close')
  assert.equal(at('2026-09-21T00:30:00Z'), 'morning')
  assert.equal(at('2026-09-21T04:29:00Z'), 'morning')
  assert.equal(at('2026-09-21T04:30:00Z'), 'midday')
  assert.equal(at('2026-09-21T08:04:00Z'), 'midday')
  assert.equal(at('2026-09-21T08:05:00Z'), 'after_close')
  // 午夜后（上海 00:00，UTC 前一日 16:00）→ after_close（weekday 未判定，恒按时刻）
  assert.equal(at('2026-09-20T16:10:00Z'), 'after_close')
})

test('需求 2：loadVersions 成功后改走 selectSlotByClock（不再默认 list[0]=midday），含 onShow 重判定', () => {
  assert.match(pageSource, /selectSlotByClock\(\)\s*\/\/\s*需求/)
  assert.doesNotMatch(pageSource, /activeSlot\.value = list\[0\]\?\.refresh_slot/)
  assert.match(pageSource, /onShow\(/)
  assert.match(pageSource, /pickSlotByClock\(\)/)
})
