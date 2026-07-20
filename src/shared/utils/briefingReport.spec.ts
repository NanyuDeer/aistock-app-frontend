import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBriefingReport } from './briefingReport'

const LEGACY_REVIEW = `# 收盘复盘
## 步骤4：输出核心结论
市场风险偏好改善，科技板块领涨。
## 步骤5：标准化行情事实附录
### 附录B：板块表现矩阵
| 板块名称 | 涨跌幅 |
| --- | --- |
| 半导体 | 2.1% |
| AI算力 | 1.4% |`

test('解析 schema 2.0 的晚报板块字段', () => {
  const report = parseBriefingReport({
    display_report: { summary: '结论', details: '正文', stocks: [], sectors: ['半导体'], risks: [] },
    podcast_brief: '', schema_version: '2.0',
  }, 'review')
  assert.deepEqual(report?.sectors, ['半导体'])
  assert.equal(report?.summary, '结论')
})

test('从 schema 1.0 复盘正文提取摘要与附录B板块', () => {
  const report = parseBriefingReport({ text: LEGACY_REVIEW }, 'review')
  assert.equal(report?.summary, '市场风险偏好改善，科技板块领涨。')
  assert.deepEqual(report?.sectors, ['半导体', 'AI算力'])
  assert.equal(report?.details, LEGACY_REVIEW)
})

test('畸形内容返回 null', () => {
  assert.equal(parseBriefingReport({ text: 1 }, 'review'), null)
})
