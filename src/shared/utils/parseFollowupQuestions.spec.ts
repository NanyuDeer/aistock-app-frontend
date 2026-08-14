import { describe, it, expect } from 'vitest'
import { parseFollowupQuestions } from './parseFollowupQuestions'

describe('parseFollowupQuestions 引导追问解析（改进 20）', () => {
  it('命中：正文 + 「你可以问我：」顿号分隔条目 → 剔除引导行并返回追问列表', () => {
    const content = [
      '## 核心结论',
      '贵州茅台今日表现稳健。',
      '',
      '你可以问我：今日大盘怎么样、贵州茅台现在怎么样',
    ].join('\n')
    const r = parseFollowupQuestions(content)
    expect(r).not.toBeNull()
    expect(r!.questions).toEqual(['今日大盘怎么样', '贵州茅台现在怎么样'])
    expect(r!.body).toContain('核心结论')
    expect(r!.body).not.toContain('你可以问我')
  })

  it('命中：序号分隔（1. 2.）条目', () => {
    const content = '你可以问我：\n1. 今日大盘怎么样\n2. 板块资金流向如何'
    const r = parseFollowupQuestions(content)
    expect(r).not.toBeNull()
    expect(r!.questions).toEqual(['今日大盘怎么样', '板块资金流向如何'])
  })

  it('命中：斜杠分隔条目', () => {
    const content = '你可以问我：今日大盘怎么样 / 板块资金流向如何'
    const r = parseFollowupQuestions(content)
    expect(r).not.toBeNull()
    expect(r!.questions).toEqual(['今日大盘怎么样', '板块资金流向如何'])
  })

  it('命中：「您可以问我」变体', () => {
    const content = '您可以问我：今日大盘怎么样、市盈率是什么'
    const r = parseFollowupQuestions(content)
    expect(r).not.toBeNull()
    expect(r!.questions).toEqual(['今日大盘怎么样', '市盈率是什么'])
  })

  it('未命中：无引导前缀 → null（回退纯文本）', () => {
    expect(parseFollowupQuestions('今日大盘怎么样')).toBeNull()
    expect(parseFollowupQuestions('')).toBeNull()
  })

  it('保守：引导词出现在句中（非独立行首）→ 不解析', () => {
    const content = '刚才你说你可以问我要不要关注白酒板块'
    expect(parseFollowupQuestions(content)).toBeNull()
  })

  it('保守：仅有引导前缀无条目 → 不解析', () => {
    expect(parseFollowupQuestions('你可以问我')).toBeNull()
    expect(parseFollowupQuestions('你可以问我：')).toBeNull()
  })

  it('保守：条目超长（>40 字）→ 整体回退纯文本（不渲染错按钮）', () => {
    const longItem = '请帮我分析一下最近一周以来白酒板块里面所有个股的综合表现情况并给出具体建议'
    const content = `你可以问我：${longItem}`
    expect(parseFollowupQuestions(content)).toBeNull()
  })

  it('保守：条目数 > 6 → 整体回退纯文本', () => {
    const items = ['a'.repeat(3), 'b'.repeat(3), 'c'.repeat(3), 'd'.repeat(3), 'e'.repeat(3), 'f'.repeat(3), 'g'.repeat(3)]
    const content = `你可以问我：${items.join('、')}`
    expect(parseFollowupQuestions(content)).toBeNull()
  })
})
