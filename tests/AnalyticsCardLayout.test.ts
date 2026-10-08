import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readPage = (name: string) => readFileSync(
  resolve(process.cwd(), 'src/modules/analytics/pages', name),
  'utf8',
)

describe('分析页卡片布局', () => {
  it('将预测卡片的股票列设为 70px，并按 5:4 分配预测数据列', () => {
    const page = readPage('forecast.vue')

    expect(page).toMatch(/\.stock-col\s*\{[\s\S]*?width:\s*140rpx;/)
    expect(page).toMatch(/\.forecast-col\s*\{[\s\S]*?flex:\s*5;/)
    expect(page).toMatch(/\.eps-col\s*\{[\s\S]*?flex:\s*4;/)
  })

  it('将报告评分渲染在顶部信息行右侧（评分与报告期同行），更新时间行只保留时间', () => {
    const page = readPage('reports.vue')
    const top = page.match(/<view class="report-top">([\s\S]*?)<\/view>\s*<!-- 底部/)
    const timeRow = page.match(/<view class="report-time-row">([\s\S]*?)<\/view>/)

    // 2026-08-17 提交 d226f3de「业绩报告页业绩排序模式」有意改版：评分从更新时间行上移到
    // 顶部信息行，占据原 report-tag 位置（同提交把 report-tag 换成 report-score，并同步把
    // 模板注释改为「顶部：股票名称 + 代码｜报告期｜评分」）。故按新布局断言具体位置：
    // 评分/报告期都在顶部行、更新时间行不含评分；评分靠 margin-left: auto 右对齐。
    expect(top?.[1]).toContain('report-score')
    expect(top?.[1]).toContain('report-period')
    expect(timeRow?.[1]).not.toContain('report-score')
    expect(page).toMatch(/\.report-score\s*\{[\s\S]*?margin-left:\s*auto;/)
    expect(page).toMatch(/\.report-time-row\s*\{[\s\S]*?justify-content:\s*space-between;/)
  })
})
