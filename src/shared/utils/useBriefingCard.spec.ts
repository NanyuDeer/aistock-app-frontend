import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import path from 'node:path'
import { createServer } from 'vite'

const source = readFileSync(new URL('./useBriefingCard.ts', import.meta.url), 'utf8')

test('Brief 卡片使用上海时段和上海日期', () => {
  assert.match(source, /import \{ shanghaiDateString, shanghaiDateTimeParts \} from '\.\/tradingTime'/)
  assert.match(source, /const \{ hour, minute \} = shanghaiDateTimeParts\(date\)/)
  assert.match(source, /fixedDate \?\? shanghaiDateString\(\)/)
})

test('Brief 卡片在上海 15:29/15:30 边界切换类型', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
  })

  try {
    const module = await server.ssrLoadModule('/src/shared/utils/useBriefingCard.ts')
    assert.equal(module.briefingTypeAtShanghaiTime(new Date('2026-07-24T07:29:00Z')), 'morning')
    assert.equal(module.briefingTypeAtShanghaiTime(new Date('2026-07-24T07:30:00Z')), 'evening')
  } finally {
    await server.close()
  }
})
