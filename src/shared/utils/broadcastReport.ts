import type {
  BroadcastDialogueLine,
  BroadcastSourceBrief,
  BroadcastV1,
  BriefType,
} from '@/shared/api/modules/agent'

export type { BroadcastDialogueLine, BroadcastSourceBrief, BroadcastV1 }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isSourceBrief(value: unknown, expectedType: BriefType, expectedDate: string): value is BroadcastSourceBrief {
  if (!value || typeof value !== 'object') return false
  const source = value as Record<string, unknown>
  return isNonEmptyString(source.id)
    && source.report_type === `brief_${expectedType}`
    && source.report_date === expectedDate
    && isNonEmptyString(source.as_of)
}

function isDialogue(value: unknown): value is BroadcastDialogueLine {
  if (!value || typeof value !== 'object') return false
  const line = value as Record<string, unknown>
  return (line.role === 'host' || line.role === 'analyst') && isNonEmptyString(line.content)
}

function isAudioPath(value: unknown, expectedType: BriefType, expectedDate: string): value is string | null {
  return value === null || value === `/api/agent/audio/broadcast-${expectedType}-${expectedDate}.mp3`
}

/** 仅消费绑定同日、同类型 Brief 的结构化 Broadcast v1。 */
export function parseBroadcastReport(
  content: unknown,
  expectedType: BriefType,
  expectedDate: string,
): BroadcastV1 | null {
  if (!isCalendarDate(expectedDate) || !content || typeof content !== 'object') return null
  const broadcast = content as Record<string, unknown>
  if (broadcast.schema_version !== 'broadcast.v1'
    || broadcast.brief_type !== expectedType
    || !isSourceBrief(broadcast.source_brief, expectedType, expectedDate)
    || typeof broadcast.degraded !== 'boolean'
    || !isStringList(broadcast.missing_sources)
    || (broadcast.degraded === true && broadcast.missing_sources.length === 0)
    || (broadcast.degraded === false && broadcast.missing_sources.length > 0)
    || !Array.isArray(broadcast.dialogue)
    || broadcast.dialogue.length === 0
    || !broadcast.dialogue.every(isDialogue)
    || !isAudioPath(broadcast.audio_path, expectedType, expectedDate)) {
    return null
  }

  return {
    schema_version: 'broadcast.v1',
    brief_type: expectedType,
    source_brief: broadcast.source_brief,
    degraded: broadcast.degraded,
    missing_sources: broadcast.missing_sources,
    dialogue: broadcast.dialogue,
    audio_path: broadcast.audio_path,
  }
}
