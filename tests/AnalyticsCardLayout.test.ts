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

  it('将报告评分渲染在更新时间行的右侧，而不是顶部信息行', () => {
    const page = readPage('reports.vue')
    const top = page.match(/<view class="report-top">([\s\S]*?)<\/view>\s*<!-- 底部/)
    const timeRow = page.match(/<view class="report-time-row">([\s\S]*?)<\/view>/)

    expect(top?.[1]).not.toContain('report-score')
    expect(timeRow?.[1]).toContain('report-score')
    expect(page).toMatch(/\.report-time-row\s*\{[\s\S]*?justify-content:\s*space-between;/)
  })
})
