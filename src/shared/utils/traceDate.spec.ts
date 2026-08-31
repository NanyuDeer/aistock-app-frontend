// src/shared/utils/traceDate.spec.ts
import { describe, it, expect } from 'vitest'
import { traceDateCandidates } from './traceDate'

describe('traceDateCandidates', () => {
  it('今天为第一个候选', () => {
    expect(traceDateCandidates('2026-08-18')[0]).toBe('2026-08-18')
  })

  it('默认回退 3 天（含今天共 4 个）', () => {
    expect(traceDateCandidates('2026-08-18')).toEqual([
      '2026-08-18', '2026-08-17', '2026-08-16', '2026-08-15',
    ])
  })

  it('可指定回退天数', () => {
    expect(traceDateCandidates('2026-08-18', 1)).toEqual(['2026-08-18', '2026-08-17'])
  })

  it('回退 0 天只返回今天', () => {
    expect(traceDateCandidates('2026-08-18', 0)).toEqual(['2026-08-18'])
  })

  it('跨月/跨年边界正确', () => {
    expect(traceDateCandidates('2026-03-01', 1)).toEqual(['2026-03-01', '2026-02-28'])
    expect(traceDateCandidates('2026-01-01', 1)).toEqual(['2026-01-01', '2025-12-31'])
  })
})