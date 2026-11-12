/**
 * 事件关注 - 本地快照存储
 *
 * 背景：服务端暂无关注能力（无关注表 / 无关注接口）。在不改后端的前提下，
 * 关注列表以前端本地快照实现：关注时把事件**展示所需的字段整体存入本地**，
 * 关注页直接读快照渲染，无需逐条回源拉详情（详情报告有 7 天 TTL，会过期）。
 *
 * 存储结构：[{ event: FollowedEventSnapshot, followedAt: number }]
 * - 按 followedAt 倒序（最新关注在最前）
 * - 同一 eventId 只保留一条（重复关注会刷新快照与时间）
 * - 上限 MAX_FOLLOWED_EVENTS 条，超出淘汰最早关注
 *
 * 已知边界（设计取舍，非缺陷，接入后端后自然消失）：
 * - 关注数据只在本机：换设备 / 清缓存 / 重装 App 会丢失
 * - 无推送：关注只做聚合展示
 * - 老事件详情报告可能已被后端清理，点卡片会落到详情页的错误态
 */

import { ref } from 'vue'
import type { AffectedIndustry, EventItem, EventType } from './types'
import { EVENT_TYPES } from './constants'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'

/**
 * 关注变更版本号（响应式）
 *
 * 本地存储本身不是响应式的：卡片按钮若只依赖父组件传下来的 `event.isFollowed`，
 * 「点关注后按钮不变」取决于父组件是否把新数组元素传给子组件——
 * App / 小程序端 v-for 子组件的 prop 更新并不可靠，曾出现「点了关注但按钮仍显示关注」。
 * 这里把每次写入自增一个版本号：卡片通过 `watch(followRevision)` 订阅并同步真值
 * （见 EventItemCard），其他调用方读取本 ref 即可建立响应式依赖。
 */
export const followRevision = ref(0)

/** 本地存储键（集中定义在 STORAGE_KEYS） */
export const EVENT_FOLLOW_STORAGE_KEY: string = STORAGE_KEYS.EVENT_FOLLOWED_ENTRIES

/** 关注列表上限：本地快照体积可控，超出淘汰最早关注 */
export const MAX_FOLLOWED_EVENTS = 100

/**
 * 关注快照：只保留卡片展示必需字段。
 * 特意**不保存** impactVitality 等时效性标注——存活度会随交易日变化，
 * 存快照会渲染出过期结论；关注页只展示不随时间腐坏的静态信息。
 */
export interface FollowedEventSnapshot {
  eventId: string
  title: string
  eventType: EventType
  source: string
  sourceInfo?: { name: string; url?: string }
  publishTime: string
  importance?: number
  affectedIndustries: AffectedIndustry[]
  aiSummary: string
}

/** 单条关注记录 */
export interface FollowedEntry {
  /** 事件展示快照 */
  event: FollowedEventSnapshot
  /** 关注时间戳（毫秒） */
  followedAt: number
}

/** 从任意本地数据归一化出快照；无法识别返回 null（脏数据直接丢弃） */
function normalizeSnapshot(raw: unknown): FollowedEventSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  const eventId = typeof value.eventId === 'string' ? value.eventId : ''
  if (!eventId) return null

  const eventType = EVENT_TYPES.includes(value.eventType as EventType)
    ? (value.eventType as EventType)
    : '产业政策'

  const rawInfo = value.sourceInfo as Record<string, unknown> | undefined
  const sourceInfo =
    rawInfo && typeof rawInfo.name === 'string'
      ? { name: rawInfo.name, ...(typeof rawInfo.url === 'string' ? { url: rawInfo.url } : {}) }
      : undefined

  const affectedIndustries = Array.isArray(value.affectedIndustries)
    ? (value.affectedIndustries as unknown[]).filter(
        (item): item is AffectedIndustry =>
          !!item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string',
      )
    : []

  return {
    eventId,
    title: typeof value.title === 'string' ? value.title : '',
    eventType,
    source: typeof value.source === 'string' ? value.source : '',
    sourceInfo,
    publishTime: typeof value.publishTime === 'string' ? value.publishTime : '',
    importance:
      typeof value.importance === 'number' && Number.isFinite(value.importance)
        ? value.importance
        : undefined,
    affectedIndustries,
    aiSummary: typeof value.aiSummary === 'string' ? value.aiSummary : '',
  }
}

/** 读取并归一化全部关注记录（按 followedAt 倒序；脏数据丢弃） */
function readEntries(): FollowedEntry[] {
  const raw = storage.get<unknown>(EVENT_FOLLOW_STORAGE_KEY)
  if (!Array.isArray(raw)) return []

  const entries: FollowedEntry[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const event = normalizeSnapshot((item as { event?: unknown }).event)
    if (!event || seen.has(event.eventId)) continue
    seen.add(event.eventId)

    const followedAtRaw = (item as { followedAt?: unknown }).followedAt
    const followedAt =
      typeof followedAtRaw === 'number' && Number.isFinite(followedAtRaw) ? followedAtRaw : 0
    entries.push({ event, followedAt })
  }

  return entries.sort((a, b) => b.followedAt - a.followedAt)
}

/** 写入本地（始终裁剪到上限，避免本地快照无限增长），并通知关注态订阅者 */
function writeEntries(entries: FollowedEntry[]): void {
  storage.set(EVENT_FOLLOW_STORAGE_KEY, entries.slice(0, MAX_FOLLOWED_EVENTS))
  followRevision.value += 1
}

/** EventItem → 快照（逐字段挑选，避免把时效性字段带进存储） */
function toSnapshot(event: EventItem): FollowedEventSnapshot {
  return {
    eventId: event.eventId,
    title: event.title,
    eventType: event.eventType,
    source: event.source,
    sourceInfo: event.sourceInfo ? { ...event.sourceInfo } : undefined,
    publishTime: event.publishTime,
    importance: event.importance,
    affectedIndustries: event.affectedIndustries.map((item) => ({ ...item })),
    aiSummary: event.aiSummary,
  }
}

/** 关注列表（供关注页渲染） */
export function listFollowedEntries(): FollowedEntry[] {
  return readEntries()
}

/** 关注条数（供入口角标） */
export function followedCount(): number {
  return readEntries().length
}

/** 是否已关注 */
export function isEventFollowed(eventId: string): boolean {
  // 读一次版本号：让调用方（卡片的 watch、测试中的 computed）建立响应式依赖，
  // 任何关注/取关写入后都能自动重算。
  void followRevision.value
  return readEntries().some((entry) => entry.event.eventId === eventId)
}

/** 关注事件（幂等：重复关注只刷新快照并置顶） */
export function followEvent(event: EventItem): void {
  const snapshot = toSnapshot(event)
  const rest = readEntries().filter((entry) => entry.event.eventId !== snapshot.eventId)
  // 取 max(Date.now(), 现有最新 +1)：同一毫秒内连续关注也能保持严格倒序
  const latest = rest.length > 0 ? rest[0].followedAt : 0
  const followedAt = Math.max(Date.now(), latest + 1)

  writeEntries([{ event: snapshot, followedAt }, ...rest])
}

/** 取消关注 */
export function unfollowEvent(eventId: string): void {
  writeEntries(readEntries().filter((entry) => entry.event.eventId !== eventId))
}

/**
 * 切换关注状态（以本地真实状态为准，避免调用方传入过期的 isFollowed）
 * @returns 切换后的关注状态
 */
export function toggleEventFollow(event: EventItem): boolean {
  if (isEventFollowed(event.eventId)) {
    unfollowEvent(event.eventId)
    return false
  }
  followEvent(event)
  return true
}

/** 快照 → 卡片数据（关注页的卡片恒为已关注） */
export function toEventItem(entry: FollowedEntry): EventItem {
  return {
    ...entry.event,
    isFollowed: true,
  }
}
