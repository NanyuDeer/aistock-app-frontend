import type { RhythmEvent } from '@/shared/api/modules/agent'

/** 事件窗口最小行（与 rhythm_card.event_window 投影同构） */
export type EventWindowRow = Pick<RhythmEvent, 'date' | 'type' | 'title' | 'importance'>

/** 锚点去重键来源（next_event_anchor 投影子集） */
export interface EventWindowAnchor {
  event_date: string
  title: string
}

export interface EventWindowGroups {
  /** 未来最近 N 条（跳过锚点重复） */
  next: EventWindowRow[]
  /** 其余（更远折叠入口计数） */
  far: EventWindowRow[]
}

/**
 * 未来事件窗口分组（v3 极简，spec §4.1）：
 * - 过滤 date >= targetDate（实际展示目标日；空串不过滤，组件独立场景全量入组）
 * - date 升序（event_window 投影未声明排序，前端自行排；同日稳定保持原序）
 * - 跳过与锚点同 event_date+title 的条目（R-G：锚点卡独立保留，列表不重复）
 * - next = 前 limit 条；far = 其余
 */
export function groupEventWindow(
  events: EventWindowRow[] | null | undefined,
  targetDate: string,
  anchor?: EventWindowAnchor | null,
  limit = 3,
): EventWindowGroups {
  const rows = (events ?? []).filter((ev) => ev.date >= targetDate)
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const dedup = anchor
    ? rows.filter((ev) => !(ev.date === anchor.event_date && ev.title === anchor.title))
    : rows
  return { next: dedup.slice(0, limit), far: dedup.slice(limit) }
}
