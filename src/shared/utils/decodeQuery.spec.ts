import { describe, expect, it } from 'vitest'
import { safeDecodeQuery } from './decodeQuery'

const QUESTION = '帮我分析一下贵州茅台(600519)的最新行情和投资建议'

describe('safeDecodeQuery', () => {
  it('明文问句原样返回', () => {
    expect(safeDecodeQuery(QUESTION)).toBe(QUESTION)
  })

  it('单层编码解码回明文', () => {
    expect(safeDecodeQuery(encodeURIComponent(QUESTION))).toBe(QUESTION)
  })

  it('双重编码也能解回明文（App 端中转页再编码一层）', () => {
    expect(safeDecodeQuery(encodeURIComponent(encodeURIComponent(QUESTION)))).toBe(QUESTION)
  })

  it('空值返回空串，不抛错', () => {
    expect(safeDecodeQuery(undefined)).toBe('')
    expect(safeDecodeQuery(null)).toBe('')
    expect(safeDecodeQuery('')).toBe('')
  })

  it('问句自带百分号（5%）时保留原值，不因 URIError 丢问题', () => {
    expect(safeDecodeQuery('今天跌了5%要紧吗')).toBe('今天跌了5%要紧吗')
  })

  it('非法转义序列不抛错，返回可解到的上一层', () => {
    expect(safeDecodeQuery('%E5%ZZ')).toBe('%E5%ZZ')
  })
})
