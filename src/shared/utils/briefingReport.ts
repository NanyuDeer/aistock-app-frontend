import type { BriefEvidence, BriefItem, BriefType, BriefV1 } from '@/shared/api/modules/agent'

export type { BriefEvidence, BriefItem, BriefType, BriefV1 }
export type BriefingType = BriefType

export interface BriefingReport extends BriefV1 {
  summary: string
  details: string
  stocks: string[]
  sectors: string[]
  risks: string[]
  podcast_brief: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isEvidence(value: unknown): value is BriefEvidence {
  if (!value || typeof value !== 'object') return false
  const evidence = value as Record<string, unknown>
  return ['report_type', 'id', 'data_source', 'created_at'].every(
    (key) => isNonEmptyString(evidence[key]),
  )
}

function isItem(value: unknown): value is BriefItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return isNonEmptyString(item.title)
    && isNonEmptyString(item.conclusion)
    && isNonEmptyString(item.as_of)
    && isNonEmptyString(item.confidence)
    && (isNonEmptyString(item.uncertainty)
      || (isStringList(item.uncertainty) && item.uncertainty.length > 0))
    && Array.isArray(item.evidence)
    && item.evidence.length > 0
    && item.evidence.every(isEvidence)
}

/** 仅将结构化 Brief v1 视作当前早晚报事实层。 */
export function parseBriefingReport(content: unknown, expectedType: BriefingType): BriefingReport | null {
  if (!content || typeof content !== 'object') return null
  const brief = content as Record<string, unknown>
  if (brief.schema_version !== 'brief.v1'
    || (brief.brief_type !== 'morning' && brief.brief_type !== 'evening')
    || brief.brief_type !== expectedType
    || !isNonEmptyString(brief.as_of)
    || typeof brief.degraded !== 'boolean'
    || !isStringList(brief.missing_sources)
    || !Array.isArray(brief.items)
    || brief.items.length > 5
    || (brief.degraded === false && brief.items.length < 3)
    || (brief.degraded === true && brief.missing_sources.length === 0)
    || !brief.items.every(isItem)) {
    return null
  }

  const items = brief.items
  return {
    schema_version: 'brief.v1',
    brief_type: brief.brief_type,
    as_of: brief.as_of,
    items,
    degraded: brief.degraded,
    missing_sources: brief.missing_sources,
    summary: items[0]?.conclusion ?? '',
    details: items.map((item) => `## ${item.title}\n${item.conclusion}`).join('\n\n'),
    stocks: [],
    sectors: [],
    risks: [],
    podcast_brief: '',
  }
}
