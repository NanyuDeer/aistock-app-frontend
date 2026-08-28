import assert from 'node:assert/strict'
import { test } from 'node:test'
import { labelEvidenceId, labelEvidenceList, isReadableEvidenceLabel } from './evidenceLabels'

test('labelEvidenceId: 精确匹配 global_markets → 全球市场', () => {
  assert.equal(labelEvidenceId('global_markets'), '全球市场')
})

test('labelEvidenceId: 前缀匹配 NEWS_ → 新闻', () => {
  assert.equal(labelEvidenceId('NEWS_001'), '新闻')
})

test('labelEvidenceId: 前缀匹配 SEARCH_ → 搜索证据', () => {
  assert.equal(labelEvidenceId('SEARCH_007'), '搜索证据')
})

test('labelEvidenceId: 前缀匹配 INDEX_ → 指数行情', () => {
  assert.equal(labelEvidenceId('INDEX_DAILY'), '指数行情')
})

test('labelEvidenceId: 前缀匹配 SECTORS_ → 板块数据', () => {
  assert.equal(labelEvidenceId('SECTORS_ALL'), '板块数据')
})

test('labelEvidenceId: 前缀匹配 MAIN_FORCE_ → 主力资金', () => {
  assert.equal(labelEvidenceId('MAIN_FORCE_ALL'), '主力资金')
})

test('labelEvidenceId: 前缀匹配 a_share.main_force. → 主力资金', () => {
  assert.equal(labelEvidenceId('a_share.main_force.large_and_extra_large_net_yuan'), '主力资金')
})

test('labelEvidenceId: 前缀匹配 a_share.sectors. → 板块数据', () => {
  assert.equal(labelEvidenceId('a_share.sectors.top_gainers'), '板块数据')
})

test('labelEvidenceId: 前缀匹配 a_share.indexes. → 指数表现', () => {
  assert.equal(labelEvidenceId('a_share.indexes.000001'), '指数表现')
})

test('labelEvidenceId: 兜底截断最后一段（带点路径）', () => {
  assert.equal(labelEvidenceId('some.unknown.path'), 'path')
})

test('labelEvidenceId: 兜底原样返回（无点 ID）', () => {
  assert.equal(labelEvidenceId('raw_id'), 'raw_id')
})

test('labelEvidenceId: 空字符串返回空', () => {
  assert.equal(labelEvidenceId(''), '')
})

test('labelEvidenceList: 同前缀去重', () => {
  assert.deepEqual(labelEvidenceList(['NEWS_001', 'NEWS_002']), ['新闻'])
})

test('labelEvidenceList: 保持首次出现顺序', () => {
  assert.deepEqual(labelEvidenceList(['NEWS_001', 'INDEX_DAILY', 'NEWS_002']), ['新闻', '指数行情'])
})

test('labelEvidenceList: 过滤空字符串', () => {
  assert.deepEqual(labelEvidenceList(['NEWS_001', '', 'INDEX_DAILY']), ['新闻', '指数行情'])
})

test('labelEvidenceList: 跨风格去重（大写下划线 + 小写点路径同关键词）', () => {
  assert.deepEqual(labelEvidenceList(['MAIN_FORCE_ALL', 'a_share.main_force.net_yuan']), ['主力资金'])
})

test('labelEvidenceList: 空数组返回空数组', () => {
  assert.deepEqual(labelEvidenceList([]), [])
})

test('isReadableEvidenceLabel: 汉字标签可读', () => {
  assert.equal(isReadableEvidenceLabel('新闻'), true)
})

test('isReadableEvidenceLabel: 纯英文/数字标签不可读', () => {
  assert.equal(isReadableEvidenceLabel('close'), false)
  assert.equal(isReadableEvidenceLabel('pct_change'), false)
  assert.equal(isReadableEvidenceLabel(''), false)
})

test('labelEvidenceList: 过滤兜底截断的非汉字标签', () => {
  const ids = ['NEWS_001', 'a_share.indexes.000001', 'unknown.path.close', 'MAIN_FORCE_ALL']
  assert.deepEqual(labelEvidenceList(ids), ['新闻', '指数表现', '主力资金'])
})
