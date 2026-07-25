/**
 * reportCard.ts 单元测试 — 晨报/复盘 ReportCard[] 分段器
 *
 * 运行方式：npx tsx --test src/shared/utils/reportCard.spec.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  type ReportCard,
  splitMorningReport,
  splitReviewToCards,
  splitReportToCards,
} from './reportCard'

// ── 晨报分段器 ──

const MORNING_MD = `# 2026-07-17 晨报

## 第1步：隔夜外盘回顾
纳斯达克大涨2%，道指小跌0.3%。

## 第2步：国内宏观要闻
6月出口数据超预期增长。

## 第3步：板块与市场情绪
昨日领涨：半导体；领跌：房地产。
市场情绪指标：北向资金净流入。

## 今日焦点板块预测
**AI/半导体** - 关注方向 - 核心逻辑

## 第4步：今日关注与策略建议
短期建议防御为主。

## 第5步：重磅市场事件推送识别
- title: 纳斯达克大涨2%`

describe('splitMorningReport', () => {
  it('应产出 5 张晨报卡片 + 补充分析', () => {
    const cards = splitMorningReport(MORNING_MD)
    const titles = cards.map((c) => c.title)
    assert.ok(titles.includes('隔夜外盘'), `缺少隔夜外盘: ${titles.join(', ')}`)
    assert.ok(titles.includes('国内宏观'), `缺少国内宏观: ${titles.join(', ')}`)
    assert.ok(titles.includes('市场情绪'), `缺少市场情绪: ${titles.join(', ')}`)
    assert.ok(titles.includes('焦点板块'), `缺少焦点板块: ${titles.join(', ')}`)
    assert.ok(titles.includes('策略建议'), `缺少策略建议: ${titles.join(', ')}`)
    assert.ok(titles.includes('补充分析'), `缺少补充分析: ${titles.join(', ')}`)
  })

  it('每张卡片 html 非空且 visible=true', () => {
    const cards = splitMorningReport(MORNING_MD).filter((c) => c.visible)
    for (const card of cards) {
      assert.ok(card.html.length > 0, `卡片 ${card.title} html 为空`)
    }
  })

  it('未匹配的有效正文不丢弃（第5步 → 补充分析）', () => {
    const cards = splitMorningReport(MORNING_MD)
    const extra = cards.find((c) => c.title === '补充分析')
    assert.ok(extra, '补充分析卡片不存在')
    assert.ok(extra!.visible, '补充分析应 visible')
    assert.ok(
      extra!.html.includes('纳斯达克大涨2%'),
      '第5步内容应出现在补充分析中',
    )
  })

  it('空字符串返回空数组', () => {
    const cards = splitMorningReport('')
    assert.equal(cards.length, 0)
  })

  it('无匹配标题的正文全部进入补充分析', () => {
    const md = '## 随机标题\n一些不匹配任何卡片的内容。'
    const cards = splitMorningReport(md)
    const extra = cards.find((c) => c.title === '补充分析')
    assert.ok(extra, '应有补充分析')
    assert.ok(extra!.html.includes('随机标题'))
  })
})

// ── 复盘分段器（ReportCard[] 版）──

const REVIEW_MD = `# 2026-07-17 复盘报告

## 步骤1
详细分析内容A。

## 步骤2
详细分析内容B。

## 步骤3
排除说明标题
排除说明描述
| 指标 | 值 |
|------|-----|
| 数据1 | 100 |
实际排除内容行1
实际排除内容行2

## 步骤4
核心结论内容。

## 步骤5
### 附录A
速览内容。
### 附录B
更多速览。
### 附录C
事件追踪内容。
### 附录D
异常信号内容。
### 附录E
其他。`

describe('splitReviewToCards', () => {
  it('应产出复盘业务顺序卡片', () => {
    const cards = splitReviewToCards(REVIEW_MD).filter((c) => c.visible)
    const titles = cards.map((c) => c.title)
    // 复盘业务顺序：速览 → 核心结论 → 详细分析 → 排除说明 → 异常信号 → 事件追踪
    assert.ok(titles.includes('速览'))
    assert.ok(titles.includes('核心结论'))
    assert.ok(titles.includes('详细分析'))
    assert.ok(titles.includes('排除说明'))
    assert.ok(titles.includes('异常信号'))
    assert.ok(titles.includes('事件追踪'))
  })

  it('复盘卡片保持业务顺序', () => {
    const cards = splitReviewToCards(REVIEW_MD).filter((c) => c.visible)
    const titles = cards.map((c) => c.title)
    const speedIdx = titles.indexOf('速览')
    const coreIdx = titles.indexOf('核心结论')
    const detailIdx = titles.indexOf('详细分析')
    assert.ok(speedIdx < coreIdx, '速览应在核心结论前')
    assert.ok(coreIdx < detailIdx, '核心结论应在详细分析前')
  })

  it('复盘附录E只供机器解析，不生成详情卡片', () => {
    const cards = splitReviewToCards(REVIEW_MD)
    assert.equal(cards.some((card) => card.html.includes('其他。')), false)
  })
})

// ── 分发器 ──

describe('splitReportToCards', () => {
  it('type=morning 调用晨报分段器', () => {
    const cards = splitReportToCards(MORNING_MD, 'morning')
    const titles = cards.map((c) => c.title)
    assert.ok(titles.includes('隔夜外盘'))
  })

  it('type=review 调用复盘分段器', () => {
    const cards = splitReportToCards(REVIEW_MD, 'review')
    const titles = cards.map((c) => c.title)
    assert.ok(titles.includes('速览'))
  })
})
