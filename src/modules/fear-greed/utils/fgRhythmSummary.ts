/**
 * 恐贪页「波段操作节奏」入口卡摘要格式化（纯函数，无 IO）。
 * 输入 getRhythmMasterCalendar(2) 的 days（降序，最近在前）；输出单行摘要或 null（无数据行 → 纯导航卡）。
 */
import type { RhythmCalendarDay } from '@/shared/api/modules/agent'
import { RHYTHM_LEVEL_COLORS, RHYTHM_LEVEL_SHORT, RHYTHM_GREY } from '@/shared/utils/rhythmColors'

export interface RhythmSummary {
  /** 档位 key；null = 暂无档位（如实展示，不伪造） */
  level: string | null
  levelShort: string
  levelColor: string
  /** position_band.text 去「建议仓位」前缀；空串 = 无仓位语义 */
  bandText: string
  /** 「数据截至 MM-DD」/「沿用最近有效档位 MM-DD」（均 basis_date 优先回退行 date）/「暂无档位」 */
  dateLabel: string
  /** 跳转 ?date= 值：恒取该行 date（详情页以 report_date/target_date 为键）；无有效行 → null（跳转不带参） */
  urlDate: string | null
}

const MM = (d: string) => d.slice(5)
const COLORS = RHYTHM_LEVEL_COLORS as Record<string, string>

export function formatRhythmSummary(days: RhythmCalendarDay[]): RhythmSummary | null {
  if (!days.length) return null
  const primary = days[0]
  const secondary = days[1]
  const row = primary?.level ? primary : (secondary?.level ? secondary : null)
  const fallbackRow = primary ?? null

  if (!row) {
    return {
      level: null,
      levelShort: '',
      levelColor: RHYTHM_GREY,
      bandText: '',
      dateLabel: '暂无档位',
      urlDate: fallbackRow ? fallbackRow.date : null,
    }
  }

  const usingFallback = row === secondary
  const level = row.level as string
  return {
    level: row.level,
    levelShort: RHYTHM_LEVEL_SHORT[level] ?? level.slice(0, 1),
    levelColor: COLORS[level] ?? RHYTHM_GREY,
    bandText: (row.position_band?.text?.trim() ?? '').replace(/^建议仓位\s*/, ''),
    // 跳转恒取该行 date（= 详情页 report_date/target_date 键，落同一张卡）；dateLabel 仍用证据日 basis_date
    dateLabel: usingFallback ? `沿用最近有效档位 ${MM(row.basis_date ?? row.date)}` : `数据截至 ${MM(row.basis_date ?? row.date)}`,
    urlDate: row.date,
  }
}

/** 节奏大师详情页跳转 URL：恒带 ?date=，缺失才不带参（不依赖详情页 fallback 链） */
export function getRhythmUrl(basisDate: string | null): string {
  const base = '/modules/rhythm/pages/index'
  return basisDate ? `${base}?date=${basisDate}` : base
}
