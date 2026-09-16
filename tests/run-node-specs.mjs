#!/usr/bin/env node
/**
 * `node:test` 采集器（收窄 `test:node` 的信号）。
 *
 * 背景：原先的 `node --test` 通配（src 下全部 spec）会把 `vitest.config.ts` 显式
 * 白名单里的 vitest 风格 spec 一并采集，而它们 `import ... from 'vitest'`，在 node:test
 * 下必然以 `Vitest cannot be imported in a CommonJS module using require()` 失败，
 * 制造大量同因假失败噪声（先例见 src/modules/fear-greed/utils/fgAdvice.spec.ts）。
 * Node v24.15.0 的 `--test` 不支持否定 glob（实测加 `!pattern` 无效），
 * 因此这里按 vitest 白名单反向排除，只跑真正的 node:test 风格 spec。
 *
 * 采集规则：src 下全部 *.spec.ts − `vitest.config.ts` 的 `test.include` 中 `src/` 条目。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(REPO, 'src')
const VITEST_CONFIG = join(REPO, 'vitest.config.ts')
/** 采集器跑通后的干净基线（tests/pass/fail）；与实测一致 = 无回归，不一致 = 基线漂移（exit 2）。
 *  2026-09-16：ConditionalForecastBlock 单档守卫 + activeHorizon watchEffect 已实现，既有 2 条失败转绿，残余失败清零。
 *  2026-09-16：结论模式落地新增 6 条（conditionalForecast.spec.ts 5 条 + CFB spec __seg 容器断言 1 条）。
 *  修改此常量须同时更新本注释说明的"已知残余失败"状态；若 README/项目记忆记录了该基线，需一并同步。 */
const EXPECTED_BASELINE = '243/243/0'

/** 递归枚举目录下全部 *.spec.ts（绝对路径） */
function walkSpecs(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...walkSpecs(full))
    else if (entry.endsWith('.spec.ts')) found.push(full)
  }
  return found
}

/** 解析 `vitest.config.ts` 的 `test.include`，返回其中以 `src/` 开头的 spec 条目（仓库相对路径） */
function readVitestIncludeSrcEntries() {
  const source = readFileSync(VITEST_CONFIG, 'utf8')
  const start = source.indexOf('include:')
  if (start < 0) throw new Error('vitest.config.ts 未找到 test.include')
  const open = source.indexOf('[', start)
  const close = source.indexOf(']', open)
  if (open < 0 || close < 0) throw new Error('vitest.config.ts 的 test.include 数组解析失败')
  const body = source.slice(open + 1, close)
  const literals = [...body.matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1])
  // 加固：只看「以 src/ 开头、以 .spec.ts 结尾、不含 *」的条目，
  // 避免误采注释里形似路径的引号串或未来引入的通配条目
  return literals.filter((p) => p.startsWith('src/') && p.endsWith('.spec.ts') && !p.includes('*'))
}

function fail(lines) {
  console.error('\n[node-specs] ✖ 自检失败：')
  for (const line of lines) console.error(`  - ${line}`)
  console.error('')
  process.exit(1)
}

const includeEntries = readVitestIncludeSrcEntries()

// 自检 A：白名单条目必须真实存在（暴露陈旧条目 → 否则 vitest 侧静默漏跑）
const missing = includeEntries.filter((p) => !existsSync(resolve(REPO, p)))
if (missing.length) {
  fail([
    'vitest.config.ts 的 test.include 含磁盘上不存在的陈旧条目：',
    ...missing.map((p) => `${p}（该文件不存在；请从 test.include 删除以免 vitest 静默漏跑）`),
  ])
}

// 自检 B：被排除的 spec 必须是 vitest 风格，否则说明「为清噪声而误排了真实 node:test spec」
const excludedAbs = new Set(includeEntries.map((p) => resolve(REPO, p)))
const misplaced = [...excludedAbs]
  .filter((abs) => !readFileSync(abs, 'utf8').includes("from 'vitest'"))
  .map((abs) => relative(REPO, abs))
if (misplaced.length) {
  fail([
    '以下 spec 被当作 vitest 风格排除，但文件内容不含 `from \'vitest\'`：',
    ...misplaced.map((p) => `${p}（可能是被误排的 node:test spec；请移出 test.include）`),
  ])
}

const toRun = walkSpecs(SRC)
  .filter((abs) => !excludedAbs.has(abs))
  .sort()

console.log(
  `[node-specs] 采集 ${toRun.length} 个 node:test spec（按 vitest 白名单排除 ${excludedAbs.size} 个 vitest 风格 spec）`,
)

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...toRun], {
  cwd: REPO,
  encoding: 'utf8',
})
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
const metric = (key) => {
  const m = output.match(new RegExp(`^ℹ ${key} (\\d+)`, 'm'))
  return m ? m[1] : '?'
}
console.log(
  `[node-specs] 采集 ${toRun.length}（排除 ${excludedAbs.size} 个 vitest 风格 spec）｜期望基线 ${EXPECTED_BASELINE}，实际 ${metric('tests')}/${metric('pass')}/${metric('fail')}`,
)

// 机器判定：基线漂移（含"残余失败数变化"）必须显式报错，不能只靠人眼比对文本。
// 注意退出码语义：1 = 子进程自身退出码（基线一致时透传，非漂移）；2 = 基线漂移。
const actualBaseline = `${metric('tests')}/${metric('pass')}/${metric('fail')}`
if (actualBaseline !== EXPECTED_BASELINE) {
  console.error(
    `\n[node-specs] ✖ 基线漂移：期望 ${EXPECTED_BASELINE}，实际 ${actualBaseline}。` +
      `\n  （fail 大于基线值 0 = 新增回归，请先定位；新增/删除 spec 导致计数变化须同步本常量与注释）\n`,
  )
  process.exit(2)
}

process.exit(result.status ?? 1)
