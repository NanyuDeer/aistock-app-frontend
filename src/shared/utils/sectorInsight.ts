/**
 * 板块研判（sector-insight 聚合）辅助工具：候选匹配 + 本地日期。
 */
import type { SectorInsightCandidate, SectorInsightPrediction } from '@/shared/api/modules/agent'
import { expandConditionalBranches } from '@/shared/utils/conditionalForecast'

/** 条件化预判块（ConditionalForecastBlock）的输入形态（与 InsightCard.structured 结构性一致） */
export interface SectorStructuredForecast {
  horizons?: Array<{
    horizon: 'short' | 'mid' | 'long'
    remaining?: string
    direction?: 'bullish' | 'bearish' | 'neutral'
    confidence?: 'high' | 'medium' | 'low'
  }>
  conditions?: Array<{
    horizon: 'short' | 'mid' | 'long'
    direction?: 'bullish' | 'bearish' | 'neutral'
    condition: string
    scenario: string
    /** 简洁展示关键词（新数据携带） */
    keywords?: string[]
    met?: boolean | null
  }>
  dueLabel?: string
  verification?: 'pending' | 'hit' | 'miss' | null
}

/**
 * 板块预测 → 通用条件化预判块结构化数据。
 * 供板块洞见卡（SectorInsightCard）与板块四环列表（sector-loop）复用，避免两处映射漂移。
 */
export function sectorPredictionToStructured(p: SectorInsightPrediction | null | undefined): SectorStructuredForecast | null {
  if (!p || !p.present) return null
  return {
    horizons:
      p.horizons?.map((h) => ({
        horizon: h.horizon,
        remaining: h.remaining,
        direction: h.direction,
        confidence: h.confidence
      })) ?? [],
    conditions:
      (p.conditions ?? []).flatMap(expandConditionalBranches).map((c) => ({
        horizon: c.horizon,
        direction: c.direction,
        condition: c.condition,
        scenario: c.scenario,
        keywords: c.keywords ?? [],
        met: c.met ?? undefined
      })) ?? [],
    dueLabel: p.dueLabel ?? undefined,
    verification: p.verification ?? null
  }
}

/** 剥离交易所后缀（如 881101.TI → 881101） */
function stripExchangeSuffix(code: string): string {
  return code.replace(/\.TI$/i, '')
}

/**
 * 在板块洞见候选列表中匹配当前板块：
 * - code 命中优先：opts.code 为 6 位裸码时，比较 c.ts_code 去掉 .TI 后缀后 === code，
 *   或 c.ts_code === code + '.TI'（传入带后缀 code 同样兼容）；
 * - code 未命中/未提供 → 按 name 全等或双向包含命中；
 * - 均未命中返回 null。
 */
export function findSectorCandidate(
  list: SectorInsightCandidate[],
  opts: { name?: string; code?: string }
): SectorInsightCandidate | null {
  if (!list?.length) return null
  const { name, code } = opts

  if (code) {
    const bare = stripExchangeSuffix(code)
    const byCode = list.find(c =>
      stripExchangeSuffix(c.ts_code) === bare || c.ts_code === `${bare}.TI`
    )
    if (byCode) return byCode
  }

  if (!name) return null
  return list.find(c =>
    c.name === name || (name.includes(c.name) || c.name.includes(name))
  ) ?? null
}

/** 本地今日日期字符串（YYYY-MM-DD，设备本地时区，非 UTC） */
export function todayDateStr(): string {
  const d = new Date()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mo}-${dd}`
}
