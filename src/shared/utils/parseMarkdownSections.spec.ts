import { describe, it, expect } from 'vitest'
import { parseMarkdownSections } from './parseMarkdownSections'

describe('parseMarkdownSections', () => {
  it('空字符串返回空数组', () => {
    expect(parseMarkdownSections('')).toEqual([])
    expect(parseMarkdownSections('   ')).toEqual([])
  })

  it('无标题纯文本返回单个 other 段（title 为空）', () => {
    const result = parseMarkdownSections('这是一段纯文本回复，没有标题。')
    expect(result).toHaveLength(1)
    expect(result[0].variant).toBe('other')
    expect(result[0].title).toBe('')
    expect(result[0].body).toBe('这是一段纯文本回复，没有标题。')
  })

  it('一级标题不切分（仅二级三级标题触发切分）', () => {
    const md = '# 大标题\n\n一些正文'
    const result = parseMarkdownSections(md)
    expect(result).toHaveLength(1)
    expect(result[0].variant).toBe('other')
    expect(result[0].title).toBe('')
  })

  it('严格匹配 4 类标题', () => {
    const md = [
      '## 核心结论',
      '结论正文',
      '## 行情要点',
      '要点正文',
      '## 数据说明',
      '说明正文',
      '## 风险提示',
      '风险正文',
    ].join('\n')
    const result = parseMarkdownSections(md)
    expect(result).toHaveLength(4)
    expect(result[0].variant).toBe('conclusion')
    expect(result[0].title).toBe('核心结论')
    expect(result[0].body).toBe('结论正文')
    expect(result[1].variant).toBe('points')
    expect(result[1].title).toBe('行情要点')
    expect(result[2].variant).toBe('notes')
    expect(result[2].title).toBe('数据说明')
    expect(result[3].variant).toBe('risk')
    expect(result[3].title).toBe('风险提示')
  })

  it('模糊兜底匹配变体标题', () => {
    const md = '### 总结\n总结正文\n## 个股表现\n表现正文\n## 备注\n备注正文'
    const result = parseMarkdownSections(md)
    expect(result).toHaveLength(3)
    expect(result[0].variant).toBe('conclusion')
    expect(result[0].title).toBe('总结')
    expect(result[1].variant).toBe('points')
    expect(result[1].title).toBe('个股表现')
    expect(result[2].variant).toBe('notes')
    expect(result[2].title).toBe('备注')
  })

  it('未知标题归为 other', () => {
    const md = '## 其他信息\n一些信息'
    const result = parseMarkdownSections(md)
    expect(result).toHaveLength(1)
    expect(result[0].variant).toBe('other')
    expect(result[0].title).toBe('其他信息')
  })

  it('标题前有前言文本', () => {
    const md = '这是前言。\n\n## 核心结论\n结论正文'
    const result = parseMarkdownSections(md)
    expect(result).toHaveLength(2)
    expect(result[0].variant).toBe('other')
    expect(result[0].title).toBe('')
    expect(result[0].body).toContain('这是前言')
    expect(result[1].variant).toBe('conclusion')
    expect(result[1].title).toBe('核心结论')
  })

  it('空正文段过滤', () => {
    const md = '## 核心结论\n\n## 行情要点\n有内容'
    const result = parseMarkdownSections(md)
    expect(result).toHaveLength(1)
    expect(result[0].variant).toBe('points')
  })

  it('大小写不敏感严格匹配', () => {
    const md = '## 核心结论\n正文'
    const result = parseMarkdownSections(md)
    expect(result[0].variant).toBe('conclusion')
  })

  it('三级标题同样切分', () => {
    const md = '### 核心结论\n正文'
    const result = parseMarkdownSections(md)
    expect(result).toHaveLength(1)
    expect(result[0].variant).toBe('conclusion')
    expect(result[0].title).toBe('核心结论')
  })
})
