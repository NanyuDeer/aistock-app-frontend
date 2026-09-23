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

test('v3 极简：pickVersion 今日取 created_at 最新；历史日 after_close 优先、缺失降级最新', () => {
  // 从源码提取纯函数体执行（同既有 pickSlotByClock 断言模式：签名含 TS 类型注解，
  // new Function 无法执行 TS，故只提取签名 { 之后到闭合 } 的函数体；参数经 new Function 形参注入）
  const body = pageSource.match(
    /function pickVersion\(\n\s*versions: RhythmMasterVersion\[\],\n\s*targetDate: string,\n\s*today: string,\n\s*\): RhythmMasterVersion \| undefined \{\n([\s\S]*?)\n\}/,
  )?.[1] ?? ''
  assert.ok(body, '应存在 pickVersion 纯函数（今日最新 / 历史收盘基准；签名与实现形状如下——参数 versions/targetDate/today）')
  const pickVersion = new Function(
    'versions', 'targetDate', 'today',
    `${body}\nreturn pickVersion(versions, targetDate, today)`,
  ) as (versions: Array<{ refresh_slot: string; created_at?: string }>, targetDate: string, today: string) => { refresh_slot: string } | undefined
  const versions = [
    { refresh_slot: 'morning', created_at: '2026-09-23T01:00:00Z' },
    { refresh_slot: 'midday', created_at: '2026-09-23T04:30:00Z' },
    { refresh_slot: 'after_close', created_at: '2026-09-22T00:05:00Z' },
  ]
  // 今日（09-23）：created_at 最新 = midday（04:30Z）
  assert.equal(pickVersion(versions, '2026-09-23', '2026-09-23')?.refresh_slot, 'midday')
  // 历史日（09-22）：after_close 优先（即便 created_at 更旧）
  assert.equal(pickVersion(versions, '2026-09-22', '2026-09-23')?.refresh_slot, 'after_close')
  // 历史日缺 after_close：降级 created_at 最新
  const noClose = versions.filter((v) => v.refresh_slot !== 'after_close')
  assert.equal(pickVersion(noClose, '2026-09-22', '2026-09-23')?.refresh_slot, 'midday')
  // created_at 缺省视为最旧
  const missing = [{ refresh_slot: 'morning' }, { refresh_slot: 'after_close', created_at: '2026-09-22T00:05:00Z' }]
  assert.equal(pickVersion(missing, '2026-09-23', '2026-09-23')?.refresh_slot, 'after_close')
  // 空版本 → undefined
  assert.equal(pickVersion([], '2026-09-23', '2026-09-23'), undefined)
})

test('v3 极简：三时点 pill 与时钟自动选中已删除（无 slot 切换交互残留）', () => {
  assert.doesNotMatch(pageSource, /pickSlotByClock/)
  assert.doesNotMatch(pageSource, /selectSlotByClock/)
  assert.doesNotMatch(pageSource, /switchSlot/)
  assert.doesNotMatch(pageSource, /SLOT_ORDER/)
  assert.doesNotMatch(pageSource, /activeSlot/)
})

test('v3 极简：requestedDate 分离 + 未来日/无报告提示三态（spec §4.3）', () => {
  assert.match(pageSource, /requestedDate/)
  assert.match(pageSource, /节奏尚未生成，当前展示/)
  assert.match(pageSource, /非交易日\/当日无报告，沿用前值/)
  assert.match(pageSource, /requestedDate\.value = date/)
})

test('v3 极简：pageTitle 统一「节奏（date）」（删明日/今日 slot 语义错位）', () => {
  assert.doesNotMatch(pageSource, /明日节奏/)
  assert.doesNotMatch(pageSource, /今日节奏/)
  assert.match(pageSource, /节奏（\$\{targetDate\.value\}）/)
})
