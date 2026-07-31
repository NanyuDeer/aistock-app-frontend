import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import path from 'node:path'

/**
 * parseBriefingReport 降级路径回归测试
 *
 * 确保 brief.v1 的 degraded=true 路径可被前端正确解析，
 * 当 morning 数据源异常时 brief_morning 仍能显示部分内容而非"今日播报尚未生成"。
 *
 * 校验规则（briefingReport.ts:67-69）：
 * - degraded=true 必须有 missing_sources
 * - degraded=false 不能有 missing_sources
 * - degraded=false 必须 items>=3
 * - degraded=true 允许 items<3（含 items=1）
 */

const VALID_EVIDENCE = {
  report_type: 'morning',
  id: 'rec_41',
  data_source: 'morning_agent',
  created_at: '2026-07-29T08:50:00Z',
}

const VALID_ITEM = {
  title: '机构调研活跃',
  conclusion: '近期机构调研频次上升，关注科技板块。',
  as_of: '2026-07-29',
  confidence: 'medium',
  uncertainty: ['数据延迟'],
  evidence: [VALID_EVIDENCE],
}

test('degraded=true 且 items=1 且 missing_sources 非空 → 解析成功', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
  })
  try {
    const module = await server.ssrLoadModule('/src/shared/utils/briefingReport.ts')
    const content = {
      schema_version: 'brief.v1',
      brief_type: 'morning',
      as_of: '2026-07-29',
      items: [VALID_ITEM],
      degraded: true,
      missing_sources: ['morning', 'wind_leader'],
    }
    const result = module.parseBriefingReport(content, 'morning')
    assert.ok(result, 'degraded brief with 1 item should parse successfully')
    assert.equal(result.degraded, true)
    assert.deepEqual(result.missing_sources, ['morning', 'wind_leader'])
    assert.equal(result.items.length, 1)
  } finally {
    await server.close()
  }
})

test('degraded=false 且 items>=3 且 missing_sources 为空 → 解析成功', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
  })
  try {
    const module = await server.ssrLoadModule('/src/shared/utils/briefingReport.ts')
    const items = [
      { ...VALID_ITEM, title: '头条1' },
      { ...VALID_ITEM, title: '洞见2' },
      { ...VALID_ITEM, title: '洞见3' },
    ]
    const content = {
      schema_version: 'brief.v1',
      brief_type: 'morning',
      as_of: '2026-07-29',
      items,
      degraded: false,
      missing_sources: [],
    }
    const result = module.parseBriefingReport(content, 'morning')
    assert.ok(result, 'normal brief with 3+ items should parse successfully')
    assert.equal(result.degraded, false)
    assert.equal(result.items.length, 3)
  } finally {
    await server.close()
  }
})

test('degraded=true 但 missing_sources 为空 → 解析失败（返回 null）', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
  })
  try {
    const module = await server.ssrLoadModule('/src/shared/utils/briefingReport.ts')
    const content = {
      schema_version: 'brief.v1',
      brief_type: 'morning',
      as_of: '2026-07-29',
      items: [VALID_ITEM],
      degraded: true,
      missing_sources: [],
    }
    const result = module.parseBriefingReport(content, 'morning')
    assert.equal(result, null, 'degraded=true with empty missing_sources must be rejected')
  } finally {
    await server.close()
  }
})

test('brief_type 不匹配 expectedType → 解析失败', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
  })
  try {
    const module = await server.ssrLoadModule('/src/shared/utils/briefingReport.ts')
    const content = {
      schema_version: 'brief.v1',
      brief_type: 'evening',
      as_of: '2026-07-29',
      items: [VALID_ITEM],
      degraded: true,
      missing_sources: ['review'],
    }
    const result = module.parseBriefingReport(content, 'morning')
    assert.equal(result, null, 'brief_type mismatch must be rejected')
  } finally {
    await server.close()
  }
})
