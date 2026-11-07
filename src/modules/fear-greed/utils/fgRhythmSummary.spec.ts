import { describe, it, expect } from 'vitest'
import { formatRhythmSummary, getRhythmUrl } from './fgRhythmSummary'
import type { RhythmCalendarDay } from '@/shared/api/modules/agent'
import { RHYTHM_GREY } from '@/shared/utils/rhythmColors'

function day(partial: Partial<RhythmCalendarDay> & { date: string }): RhythmCalendarDay {
  return { refresh_slot: 'after_close', level: null, score: null, position_index: null, basis_date: null, position_band: null, ...partial }
}

describe('formatRhythmSummary', () => {
  it('无数据行 → null（纯导航卡）', () => {
    expect(formatRhythmSummary([])).toBeNull()
  })
  it('首行有仓位档位：取首行，数据截至 basis_date，urlDate 为该行 date', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14', position_index: 3, basis_date: '2026-09-14', position_band: { text: '建议仓位：重仓（七~八成）' } })])
    expect(s).not.toBeNull()
    expect(s!.positionIndex).toBe(3)
    expect(s!.positionShort).toBe('重')
    expect(s!.positionColor).toBe('#f59e0b')
    expect(s!.bandText).toBe('重仓（七~八成）')
    expect(s!.dateLabel).toBe('数据截至 09-14')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('index 0（空仓）是合法档位：不得被真值判断吞掉（灰格回归）', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14', position_index: 0, basis_date: '2026-09-14', position_band: { text: '建议仓位：空仓观望' } })])
    expect(s!.positionIndex).toBe(0)
    expect(s!.positionShort).toBe('空')
    expect(s!.positionColor).toBe('#8a6fae')
    expect(s!.dateLabel).toBe('数据截至 09-14')
  })
  it('仓位前缀剥离：兼容真实生产者（全角冒号）/半角冒号/空格，且无前缀文本原样返回', () => {
    const at = (text: string) => formatRhythmSummary([day({ date: '2026-09-14', position_index: 3, basis_date: '2026-09-14', position_band: { text } })])!.bandText
    expect(at('建议仓位：重仓（七~八成）')).toBe('重仓（七~八成）')   // 真实生产者格式（rhythm_engine.py）
    expect(at('建议仓位:重仓（七~八成）')).toBe('重仓（七~八成）')
    expect(at('建议仓位 5 成')).toBe('5 成')
    expect(at('半仓（四~六成）')).toBe('半仓（四~六成）')
  })
  it('首行无档位、第二行有：沿用最近有效档位，urlDate 取该行 date', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-09-14', basis_date: '2026-09-14' }),
      day({ date: '2026-09-11', position_index: 2, basis_date: '2026-09-11', position_band: { text: '建议仓位：半仓（四~六成）' } }),
    ], '2026-09-14')
    expect(s!.positionIndex).toBe(2)
    expect(s!.dateLabel).toBe('沿用最近有效档位 09-11')
    expect(s!.urlDate).toBe('2026-09-11')
    expect(s!.bandText).toBe('半仓（四~六成）')
  })

  it('次行档位已过期 → 不回退，显示暂无档位（D4）', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-11-03', basis_date: '2026-11-02' }),
      day({ date: '2026-10-20', position_index: 1, basis_date: '2026-10-20', position_band: { text: '建议仓位：轻仓（≤三成）' } }),
    ], '2026-11-03')
    expect(s!.positionIndex).toBeNull()
    expect(s!.positionShort).toBe('')
    expect(s!.positionColor).toBe(RHYTHM_GREY)
    expect(s!.dateLabel).toBe('暂无档位')
  })

  it('次行档位仍在时效内（≤5 天）→ 照常回退（D4 不误伤）', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-11-03', basis_date: '2026-11-02' }),
      day({ date: '2026-11-02', position_index: 1, basis_date: '2026-10-31', position_band: { text: '建议仓位：轻仓（≤三成）' } }),
    ], '2026-11-03')
    expect(s!.positionIndex).toBe(1)
    expect(s!.dateLabel).toBe('沿用最近有效档位 10-31')
  })
  it('沿用行 basis_date≠date 时：标签取 basis_date、urlDate 取该行 date（落详情页 target_date）', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-09-14', basis_date: '2026-09-14' }),
      day({ date: '2026-09-12', position_index: 1, basis_date: '2026-09-11' }),
    ], '2026-09-14')
    expect(s!.dateLabel).toBe('沿用最近有效档位 09-11')
    expect(s!.urlDate).toBe('2026-09-12')
  })
  it('两行均无档位：暂无档位，urlDate 用首行 date', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-09-14', basis_date: '2026-09-12' }),
      day({ date: '2026-09-11', basis_date: '2026-09-11' }),
    ])
    expect(s!.positionIndex).toBeNull()
    expect(s!.dateLabel).toBe('暂无档位')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('basis_date 缺失时 dateLabel 回退行 date（urlDate 恒为该行 date）', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14', position_index: 0 })])
    expect(s!.dateLabel).toBe('数据截至 09-14')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('仅一行且无档位：暂无档位且 urlDate 为该行 date', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14' })])
    expect(s!.positionIndex).toBeNull()
    expect(s!.dateLabel).toBe('暂无档位')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('越界档位（脏数据 / 后端新增第六档）：灰格 + 空串短码，如实缺省不伪造', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14', position_index: 9, basis_date: '2026-09-14' })])
    expect(s!.positionIndex).toBe(9)
    expect(s!.positionColor).toBe(RHYTHM_GREY)
    expect(s!.positionShort).toBe('')
  })
  it('position_index 缺失但 level 有值（旧数据 / 降级）：必须灰格，禁止用 level 回退上色', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-09-14', level: 'active', position_index: null, basis_date: '2026-09-14', position_band: { text: '建议仓位：重仓（七~八成）' } }),
    ])
    expect(s!.positionIndex).toBeNull()
    expect(s!.positionShort).toBe('')
    expect(s!.positionColor).toBe(RHYTHM_GREY)
    expect(s!.dateLabel).toBe('暂无档位')
  })
})

describe('getRhythmUrl', () => {
  it('无 date → 不带参', () => {
    expect(getRhythmUrl(null)).toBe('/modules/rhythm/pages/index')
  })
  it('有 date → 拼接 ?date=', () => {
    expect(getRhythmUrl('2026-09-14')).toBe('/modules/rhythm/pages/index?date=2026-09-14')
  })
})
