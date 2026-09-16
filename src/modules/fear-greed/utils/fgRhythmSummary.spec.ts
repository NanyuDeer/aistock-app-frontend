import { describe, it, expect } from 'vitest'
import { formatRhythmSummary, getRhythmUrl } from './fgRhythmSummary'
import type { RhythmCalendarDay } from '@/shared/api/modules/agent'
import { RHYTHM_GREY } from '@/shared/utils/rhythmColors'

function day(partial: Partial<RhythmCalendarDay> & { date: string }): RhythmCalendarDay {
  return { refresh_slot: 'after_close', level: null, score: null, basis_date: null, position_band: null, ...partial }
}

describe('formatRhythmSummary', () => {
  it('无数据行 → null（纯导航卡）', () => {
    expect(formatRhythmSummary([])).toBeNull()
  })
  it('首行有档位：取首行，数据截至 basis_date，urlDate 为该行 date', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14', level: 'active', basis_date: '2026-09-14', position_band: { text: '建议仓位：七成~八成' } })])
    expect(s).not.toBeNull()
    expect(s!.level).toBe('active')
    expect(s!.levelShort).toBe('活')
    expect(s!.levelColor).toBe('#f59e0b')
    expect(s!.bandText).toBe('七成~八成')
    expect(s!.dateLabel).toBe('数据截至 09-14')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('仓位前缀剥离：兼容真实生产者（全角冒号）/半角冒号/空格，且无前缀文本原样返回', () => {
    const at = (text: string) => formatRhythmSummary([day({ date: '2026-09-14', level: 'active', basis_date: '2026-09-14', position_band: { text } })])!.bandText
    expect(at('建议仓位：七成~八成')).toBe('七成~八成')   // 真实生产者格式（rhythm_engine.py:223）
    expect(at('建议仓位:七成~八成')).toBe('七成~八成')
    expect(at('建议仓位 5 成')).toBe('5 成')
    expect(at('五成~六成')).toBe('五成~六成')
  })
  it('首行无档位、第二行有：沿用最近有效档位，urlDate 取该行 date', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-09-14', basis_date: '2026-09-14' }),
      day({ date: '2026-09-11', level: 'normal', basis_date: '2026-09-11', position_band: { text: '建议仓位：五成~六成' } }),
    ])
    expect(s!.level).toBe('normal')
    expect(s!.dateLabel).toBe('沿用最近有效档位 09-11')
    expect(s!.urlDate).toBe('2026-09-11')
    expect(s!.bandText).toBe('五成~六成')
  })
  it('沿用行 basis_date≠date 时：标签取 basis_date、urlDate 取该行 date（落详情页 target_date）', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-09-14', basis_date: '2026-09-14' }),
      day({ date: '2026-09-12', level: 'low', basis_date: '2026-09-11' }),
    ])
    expect(s!.dateLabel).toBe('沿用最近有效档位 09-11')
    expect(s!.urlDate).toBe('2026-09-12')
  })
  it('两行均无档位：暂无档位，urlDate 用首行 date', () => {
    const s = formatRhythmSummary([
      day({ date: '2026-09-14', basis_date: '2026-09-12' }),
      day({ date: '2026-09-11', basis_date: '2026-09-11' }),
    ])
    expect(s!.level).toBeNull()
    expect(s!.dateLabel).toBe('暂无档位')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('basis_date 缺失时 dateLabel 回退行 date（urlDate 恒为该行 date）', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14', level: 'ice' })])
    expect(s!.dateLabel).toBe('数据截至 09-14')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('仅一行且无档位：暂无档位且 urlDate 为该行 date', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14' })])
    expect(s!.level).toBeNull()
    expect(s!.dateLabel).toBe('暂无档位')
    expect(s!.urlDate).toBe('2026-09-14')
  })
  it('未知档位（后端新增第六档 / 脏数据）：灰格 + 首字母，如实展示不伪造', () => {
    const s = formatRhythmSummary([day({ date: '2026-09-14', level: 'fomo', basis_date: '2026-09-14' })])
    expect(s!.level).toBe('fomo')
    expect(s!.levelColor).toBe(RHYTHM_GREY)
    expect(s!.levelShort).toBe('f')
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
