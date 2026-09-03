import { describe, it, expect } from 'vitest'
import { parseMiddayReport } from './middayReport'

const DATE = '2026-09-03'

function buildContent(sections: unknown[], risks: unknown[] = []) {
  return {
    report_date: DATE,
    content: {
      display_report: {
        summary: 'AI 算力扩散带动成长修复',
        sections,
        details: '',
        risks,
      },
      podcast_brief: '',
      schema_version: '2.1',
      audio_path: null,
    },
  }
}

describe('parseMiddayReport schema 2.1：午后前瞻 opportunities', () => {
  it('保留仅含 opportunities（无 conclusion）的午后前瞻分段，并透出短词', () => {
    const content = buildContent([
      { title: '上午盘面回顾', conclusion: '回顾段落' },
      { title: '午后前瞻', opportunities: ['AI算力', '低空经济', '人形机器人', '券商'] },
      { title: '资金与情绪', conclusion: '情绪段落' },
    ])
    const parsed = parseMiddayReport(content, DATE)
    expect(parsed).not.toBeNull()
    const sections = parsed!.content.display_report.sections
    expect(sections).toHaveLength(3)
    const afternoon = sections.find((sec) => sec.title === '午后前瞻')!
    expect(afternoon.opportunities).toEqual(['AI算力', '低空经济', '人形机器人', '券商'])
    expect(afternoon.conclusion).toBe('')
  })

  it('opportunities 防御归一：trim/去空/最多 5 个/每项 ≤8 字', () => {
    const content = buildContent([
      {
        title: '午后前瞻',
        opportunities: ['  AI算力 ', '机器人板块超预期走强强化', '', '  ', 'A', 'B', 'C', 'D'],
      },
    ])
    const parsed = parseMiddayReport(content, DATE)!
    const afternoon = parsed.content.display_report.sections.find((sec) => sec.title === '午后前瞻')!
    expect(afternoon.opportunities).toEqual([
      'AI算力',
      '机器人板块超预期',
      'A',
      'B',
      'C',
    ])
  })

  it('新格式 opportunities 键存在但为空数组（LLM 无明确机会）时：午后前瞻分段仍保留且透出空数组', () => {
    const content = buildContent(
      [
        { title: '上午盘面回顾', conclusion: '回顾段落' },
        { title: '午后前瞻', opportunities: [] },
      ],
      ['高位股回调'],
    )
    const parsed = parseMiddayReport(content, DATE)!
    const sections = parsed.content.display_report.sections
    expect(sections).toHaveLength(2)
    const afternoon = sections.find((sec) => sec.title === '午后前瞻')!
    expect(afternoon.conclusion).toBe('')
    expect(afternoon.opportunities).toEqual([])
  })

  it('老数据（无 opportunities，schema 2.0 段落流）兼容：conclusion 保留、无 opportunities 字段', () => {
    const content = buildContent([
      { title: '上午盘面回顾', conclusion: '回顾段落' },
      { title: '午后前瞻', conclusion: '午后需要重点观察的方向，30-50字段落' },
    ])
    const parsed = parseMiddayReport(content, DATE)!
    const sections = parsed.content.display_report.sections
    expect(sections).toHaveLength(2)
    expect(sections[1].conclusion).toBe('午后需要重点观察的方向，30-50字段落')
    expect(sections[1].opportunities).toBeUndefined()
  })

  it('risks 不做内容截断：老数据长句原样保留', () => {
    const content = buildContent([], ['高位题材股短期涨幅过大面临回调压力，注意风险'])
    const parsed = parseMiddayReport(content, DATE)!
    expect(parsed.content.display_report.risks).toEqual([
      '高位题材股短期涨幅过大面临回调压力，注意风险',
    ])
  })
})
