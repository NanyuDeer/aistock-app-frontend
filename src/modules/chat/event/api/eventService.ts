/**
 * 事件传导模块 - 数据补充服务
 *
 * 第三阶段改造后职责：
 * - getFocusEvents：直接消费列表接口直出的 chain_summary（adapter 已转换为 affectedIndustries），零详情请求
 * - enrichAffectedIndustries：降级为兼容函数，仅旧事件（无 affectedIndustries 且无 chain_summary）才请求详情接口补数
 *
 * 背景问题（历史）：
 * - 列表接口 GET /api/agent/event/list 不返回 chain 数据
 * - 导致无法在前端生成 Top5 受影响行业
 *
 * 历史临时方案：
 * - 在列表加载后，遍历事件调用详情接口
 * - 从详情接口获取已转换的 affectedIndustries
 * - 创建新的事件对象（不修改原对象）
 * - 返回全新的数组
 *
 * 性能控制：
 * - 新数据流：零 N+1 请求
 * - 旧数据回退：仅处理无数据的事件，不修改分页逻辑
 * - 异常处理：详情接口失败时返回原对象
 */

import type { EventItem, EventTimelineItem, FocusEventViewModel, TimelineRow } from '../types'
import { isPureMarketEvent } from '../constants'
import { getEventList, getEventDetail } from './eventApi'

// ==================== AI 今日精选相关类型 ====================

/** AI 今日精选事件 */
export interface AiHeadlineEvent {
  /** 事件ID */
  eventId: string
  /** 新闻ID */
  newsId: string
  /** 事件标题 */
  title: string
  /** 重要性 */
  importance: 'major' | 'normal'
  /** 影响行业 */
  industries: string[]
}

/** AI 今日精选数据 */
export interface AiHeadlineEvents {
  positive?: AiHeadlineEvent
  negative?: AiHeadlineEvent
}

// ==================== AI 今日精选 Mock 函数 ====================

/**
 * 获取 AI 今日精选事件（Mock）
 *
 * 未来替换：调用后端 Agent API 获取真实数据
 *
 * @returns AI 今日精选数据（最大机会 + 最大风险）
 */
export function getAiHeadlineEvents(): Promise<AiHeadlineEvents> {
  return Promise.resolve({
    positive: {
      eventId: 'event-ai-computing-power',
      newsId: 'news-ai-computing-power',
      title: 'AI服务器需求持续增长，算力基础设施扩容确定性强',
      importance: 'major',
      industries: ['算力', '芯片', '软件']
    },
    negative: {
      eventId: 'event-real-estate',
      newsId: 'news-real-estate',
      title: '地产调控政策持续收紧，销售数据环比下滑',
      importance: 'major',
      industries: ['房地产', '建材', '家居']
    }
  })
}

// ==================== Global Importance 双榜单 ====================

/**
 * 计算受影响行业主导方向（impactStrength 加权 + 1.5 倍阈值，与后端 chain_dominant_direction 一致）。
 *
 * - bullish 权重 ≥ bearish × 1.5 → bullish
 * - bearish 权重 ≥ bullish × 1.5 → bearish
 * - 否则 → neutral
 */
function getIndustryDominantDirection(
  industries: Array<{ sentiment?: string; impactStrength?: number }>
): 'bullish' | 'bearish' | 'neutral' {
  let bullishW = 0
  let bearishW = 0
  for (const ind of industries) {
    const strength = typeof ind.impactStrength === 'number' ? ind.impactStrength : 0
    if (ind.sentiment === 'bullish') bullishW += strength
    else if (ind.sentiment === 'bearish') bearishW += strength
  }
  if (bullishW >= bearishW * 1.5) return 'bullish'
  if (bearishW >= bullishW * 1.5) return 'bearish'
  return 'neutral'
}

/**
 * GI 方向与受影响行业主导方向是否明显冲突（前端历史数据防御，仅兜底）。
 *
 * 规则：
 * - GI 非 bullish/bearish、或行业数据缺失、或行业主导为 neutral（方向不明）→ 不判定冲突（fail-open，不误杀）
 * - 仅当 GI 方向与行业主导方向**明显相反**（如 GI=bearish 但行业明显 bullish 主导）→ 判定冲突
 *
 * 注意：前端只做兜底，不重新实现 GI 排序；方向一致性主要由后端 GI 最终校验保证。
 */
function isFocusDirectionConflict(event: EventItem): boolean {
  const giDir = event.globalImportanceDirection
  if (giDir !== 'bullish' && giDir !== 'bearish') return false
  const industries = event.affectedIndustries ?? []
  if (industries.length === 0) return false
  const dominant = getIndustryDominantDirection(industries)
  if (dominant === 'neutral') return false
  return dominant !== giDir
}

/**
 * 获取 Global Importance 双榜单事件
 *
 * 基于 event/list 返回的 globalImportanceRank 筛选焦点事件。
 *
 * 数据流（第三阶段）：
 *   Step 1: 调用 getEventList() 获取事件列表（已包含 globalImportanceRank + chain_summary）
 *   Step 2: 筛选 rank=1（当前焦点）和 rank=2（持续影响）的事件，并剔除
 *           GI 方向与行业主导方向明显冲突的历史脏数据
 *   Step 3: 直接消费 adapter 已转换的 affectedIndustries（列表接口直出，不再请求详情）
 *
 * 异常处理：
 *   - 接口失败 → 返回 []，不影响原有事件列表
 *   - 无 GI 数据 → 返回 []
 *
 * @returns FocusEventViewModel[]
 */
export async function getFocusEvents(): Promise<FocusEventViewModel[]> {
  try {
    // Step 1: 获取事件列表（已包含 globalImportanceRank）
    const response = await getEventList({ page: 1, pageSize: 100 })
    const events = response.events ?? []

    if (events.length === 0) {
      return []
    }

    // Step 2: 筛选 rank=1 和 rank=2 的事件，并做方向一致性兜底（剔除明显冲突脏数据）
    const focusEvents = events.filter(e =>
      (e.globalImportanceRank === 1 || e.globalImportanceRank === 2)
      && !isFocusDirectionConflict(e)
    )

    if (focusEvents.length === 0) {
      return []
    }

    // Step 3: 直接消费 adapter 已转换的 affectedIndustries
    // 第三阶段：列表接口已直出 chain_summary，adapter 已生成 affectedIndustries，不再请求详情接口
    const enrichedResults = focusEvents.map((event) => ({
      event,
      industries: event.affectedIndustries ?? [],
    }))

    // Step 4: 转换为 FocusEventViewModel 格式
    return enrichedResults.map(({ event, industries }) => {
      const giDir = event.globalImportanceDirection
      const direction: 'positive' | 'negative' | 'mixed' =
        giDir === 'bullish' ? 'positive' :
        giDir === 'bearish' ? 'negative' :
        'mixed'

      // GI 焦点事件（rank=1/2）即当日最大机会/最大风险，所在区域标题恒为「重大事件」，
      // 统一按 major 展示；不再依赖 importance_level——notable 事件同样可能当选当日焦点，
      // 否则卡片标题会丢「重大」前缀（2026-09-24 修复：rank=1 bullish 事件 level=notable 时只剩「机会」）。
      const importance: 'major' = 'major'

      return {
        type: event.globalImportanceRank === 1
          ? 'current_focus' as const
          : 'ongoing_significant' as const,
        eventId: event.eventId,
        title: event.title,
        summary: event.aiSummary || '',
        direction,
        importance,
        selectionReason: '基于 Global Importance 排序结果',
        industries: industries.map((i) => i.name),
        // 保留完整行业对象（含涨跌方向），供顶部卡片箭头/颜色展示
        affectedIndustries: industries,
        // 转发来源信息（含原文 URL），供顶部卡片标题跳转原文
        sourceInfo: event.sourceInfo,
      }
    })
  } catch (err) {
    console.error('[eventService] getFocusEvents 失败', err)
    return []
  }
}

// ==================== 原有补充数据逻辑 ====================

/**
 * 为事件列表补充 Top5 受影响行业数据（第三阶段降级为兼容函数）
 *
 * 【重要】此函数返回新数组，不修改原数组
 * 确保 Vue 响应式系统能够检测到对象引用的变化
 *
 * 降级策略（第三阶段，列表接口已直出 chain_summary）：
 * 1. 事件已有 affectedIndustries → 直接返回（新数据流，零请求）
 * 2. chain_summary 存在的事件 → 直接返回（adapter 已转换为 affectedIndustries，零请求）
 * 3. 仅旧事件（两者都没有）→ 才允许请求详情接口补数（向后兼容旧数据）
 *
 * 目的：新数据不再产生 N+1 请求。
 *
 * @param events - 事件列表（当前页）
 * @returns Promise<EventItem[]> - 全新的数组，每个对象也是新的引用
 */
export async function enrichAffectedIndustries(events: EventItem[]): Promise<EventItem[]> {
  // 异常处理：空数组直接返回
  if (!events || events.length === 0) {
    return []
  }

  // 第三阶段：已有 affectedIndustries 或 chain_summary 的事件直接返回，不再请求详情
  // 只有旧事件（两者都没有）才进入 N+1 补数逻辑
  const legacyEvents = events.filter((event) =>
    (!event.affectedIndustries || event.affectedIndustries.length === 0) && !event.chain_summary
  )

  if (legacyEvents.length === 0) {
    return events
  }

  // 并发请求旧事件的详情（但控制并发数量）
  const batchSize = 5 // 每批并发 5 个请求，避免浏览器并发限制
  const batches = chunk(legacyEvents, batchSize)

  // 存储结果（新数组）
  const enrichedEvents: EventItem[] = []

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(async (event) => {
        try {
          // 调用详情接口获取已转换的数据
          const detail = await getEventDetail(event.eventId)

          // 【关键】使用已转换的 affectedIndustries
          // detail.event.affectedIndustries 已由 adaptEventDetail 生成
          if (detail.event?.affectedIndustries?.length > 0) {
            // 创建新的事件对象，包含 affectedIndustries
            return {
              ...event,
              affectedIndustries: detail.event.affectedIndustries,
            }
          }

          // 如果没有 affectedIndustries，返回原对象
          return event
        } catch (err) {
          // 异常处理：详情接口失败时返回原对象
          console.warn(
            `[eventService] 获取事件详情失败，返回原对象: ${event.eventId}`,
            err
          )
          return event
        }
      })
    )

    // 收集批次结果
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        enrichedEvents.push(result.value)
      }
    })
  }

  // 合并：新数据事件（零请求）+ 旧数据补数结果（按原顺序）
  const legacyIds = new Set(legacyEvents.map((e) => e.eventId))
  const fastPathEvents = events.filter((e) => !legacyIds.has(e.eventId))
  return [...fastPathEvents, ...enrichedEvents]
}

/**
 * 数组分块工具函数
 *
 * @param array - 原数组
 * @param size - 每块大小
 * @returns 二维数组
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// ==================== 时间线历史段（事件传导源） ====================

/**
 * 本地 Date → YYYY-MM-DD（缺省"今天"用，供历史源过滤 `date <= 今天`）。
 * 注意：进入本服务的只有事件传导事件，无后端上海时区日期，
 * 历史段上界"今天"用本地日期足够（历史段是过去事件，时区偏差可接受）。
 */
function localTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * publishTime → 日期分组键 YYYY-MM-DD。
 * 后端可能给 ISO 带时区（"2026-09-29T15:06:07.939323+08:00"）或纯日期（"2026-09-29"），
 * 统一取字符串前 10 位即可健壮兼容两种格式。
 */
function publishDateOf(publishTime: string): string {
  const s = (publishTime ?? '').trim()
  // 长度不足 10（异常数据）原样返回，避免 slice 后变成非法短串
  return s.length >= 10 ? s.slice(0, 10) : s
}

/** 取最核心行业（chain_summary[0].industry + direction 归一）；缺失 → null（页面不渲染胶囊） */
function sectorOf(item: EventItem): { name: string; direction: 'bullish' | 'bearish' | 'neutral' } | null {
  const first = item.chain_summary?.[0]
  if (!first || !first.industry?.trim()) return null
  // direction 归一：仅 bullish/bearish 采用，其余（mixed/缺失/非法）视为 neutral，与 adapter 口径一致
  const direction: 'bullish' | 'bearish' | 'neutral' =
    first.direction === 'bullish' || first.direction === 'bearish' ? first.direction : 'neutral'
  return { name: first.industry, direction }
}

/**
 * 从事件传导列表项构建历史段时间线行（纯函数，供 getTimelineHistoryRows 复用与单测）。
 *
 * 准入：**同时满足** ① importance >= 4（星级 1~5，由 chain 最大 impactStrength 映射，adapter 已算好，前端不重写）,
 *              ② 非纯行情（isPureMarketEvent(title)===false，现象词命中且无原因词则剔除）。
 * importance 缺失或 <4 → 剔除；纯行情 → 剔除；date > today → 剔除。
 *
 * 字段口径：
 * - date = publishTime 前 10 位（后端 publishTime 为带 +08:00 的上海时间字符串，**前端禁止自行时区换算**）
 * - eventStartTime = publishTime（页面按它做同日组内排序）
 * - summary 恒空串（历史行不渲染摘要行）
 * - sectorName/sectorDirection = chain_summary[0]（#1 核心行业）
 * - isGi = globalImportanceRank 有值
 * - isFuture = false
 *
 * @param items - 事件传导列表项（已按 eventId 去重）
 * @param today - 历史段右边界 YYYY-MM-DD（date ≤ today 才收录）
 */
export function buildTimelineHistoryRows(items: EventItem[], today: string): TimelineRow[] {
  const rows: TimelineRow[] = []

  for (const item of items) {
    if (!item || !item.eventId) continue

    // ① 重要性 ≥4（undefined / <4 剔除）
    const importance = item.importance
    if (typeof importance !== 'number' || importance < 4) continue

    // ② 非纯行情（现象词命中且无原因词 → 剔除；讲清原因必须放行）
    if (isPureMarketEvent(item.title)) continue

    const date = publishDateOf(item.publishTime)
    // publishTime 缺失/异常（长度 <10）→ 跳过，避免在时间轴顶部形成空日期分组
    // （formatDateDisplay('')/短串会得到空标题；这类坏数据不应产生一行）
    if (date.length < 10) continue
    // 历史段上界：date ≤ 今天
    if (date > today) continue

    const sector = sectorOf(item)
    rows.push({
      eventId: item.eventId,
      date,
      eventStartTime: item.publishTime,
      title: item.title,
      // 历史行恒无摘要（用户明确不要"XX行业受益"这类 conclusion）
      summary: '',
      sectorName: sector?.name ?? null,
      sectorDirection: sector?.direction ?? null,
      // 进了当日 GI 双榜单（rank 非空）→ 历史行标题加粗
      isGi: item.globalImportanceRank != null,
      // 星级保留（1~5）：importance===5（最高星）→ 时间线「重大」徽标
      importance: typeof item.importance === 'number' ? item.importance : null,
      isFuture: false,
    })
  }

  return rows
}

/**
 * 翻页拉取事件传导历史源行：星级 ≥4 且非纯行情，date ∈ [earliestDate, 今天]。
 *
 * 排序口径：后端 /api/agent/event/list 实为 `ORDER BY created_at DESC`（去重 `DISTINCT ON (user_id) ... created_at DESC`），
 * 与前端 publishTime 只是【近似】——upsert 会刷新 created_at，旧事件可能前移，故不能假设列表严格按 publishTime 降序。
 *
 * 停止条件（任一满足即停止）：
 * 1. 本页最新（max）publishTime 前 10 位 < earliestDate —— 整页已出窗；
 *    必须用 max 而非 min：若用 min，错序的旧事件会把整页误判为"已出窗"而提前 break，静默漏掉窗内事件
 * 2. hasMore === false
 * 3. 达到 maxPages（防御上限）
 *
 * 说明：报告 7 天 TTL，通常 2 页（每页 100 条）足够，maxPages=5 只是防御上限。
 *
 * 异常处理：getEventList 抛错 → 返回 []（历史段失败不能让整个时间轴白屏）。
 *
 * @param opts.earliestDate - 历史段左边界 YYYY-MM-DD（页面传过去 30 天，即今天-30）
 * @param opts.maxPages - 最多翻页数（防御）
 * @param opts.pageSize - 每页条数（列表接口上限 100）
 * @param opts.today - 历史段右边界（缺省本地今天，测试可注入保证确定性）
 */
export async function getTimelineHistoryRows(opts: {
  earliestDate: string
  maxPages?: number
  pageSize?: number
  today?: string
}): Promise<TimelineRow[]> {
  const earliestDate = opts.earliestDate
  const maxPages = opts.maxPages ?? 5
  const pageSize = opts.pageSize ?? 100
  const todayStr = opts.today ?? localTodayStr()

  // 先按 eventId 去重收集原始事件（列表源可能跨页重复再过滤）
  const seen = new Set<string>()
  const deduped: EventItem[] = []

  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await getEventList({ page, pageSize })
      const events = res.events ?? []

      // 本页最新日期（判停）：后端以 created_at DESC 排序，与 publishTime 仅近似，
      // 故只能用「本页最新日仍早于下界 → 整页已出窗」判停；绝不能用最旧（错序会提前 break、静默漏行）
      let pageNewest: string | null = null
      for (const ev of events) {
        const d = publishDateOf(ev.publishTime)
        if (pageNewest === null || d > pageNewest) pageNewest = d
        // 收集仍在下界内的项（星级/纯行情等准入由下方纯函数再过滤）
        if (d < earliestDate) continue
        // 上界防御（超过今天不收录，交由纯函数分支但这里提前跳过）
        if (d > todayStr) continue
        if (!seen.has(ev.eventId)) {
          seen.add(ev.eventId)
          deduped.push(ev)
        }
      }

      // 停判：整页已出窗（本页最新日仍早于下界）或显式 hasMore=false
      if (pageNewest === null || pageNewest < earliestDate) break
      if (res.hasMore === false) break
    }
  } catch (err) {
    // 历史源失败仅告警并返回空，避免整条时间轴因历史段白屏
    console.warn('[eventService] 时间线历史段拉取失败，返回空', err)
    return []
  }

  return buildTimelineHistoryRows(deduped, todayStr)
}

/**
 * 实体源行（未来段）：EventTimelineItem → TimelineRow（isFuture=true）。
 * 实体源（GET /timeline）无 GI 排名与行业方向信息，故 isGi=false、sectorDirection=null
 * （sectorName 仍取 `impactSectors[0]`，保持未来行"有行业名"的原有展示）；
 * 摘要保留（未来行展示摘要），标题加粗只在传导历史段生效。
 */
export function getEntityRows(items: EventTimelineItem[]): TimelineRow[] {
  return items.map((it) => ({
    eventId: it.eventId,
    date: it.date,
    eventStartTime: it.eventStartTime,
    title: it.title,
    // 未来行保留原摘要（页面按非空才渲染）
    summary: it.summary || '',
    // 未来行胶囊：实体源只给板块名（KG 预计算 impact_sectors 名字列），无传导 chain、无方向
    sectorName: it.impactSectors?.[0] ?? null,
    // 未来事件无方向数据：实体源只给行业名，不区分 bullish/bearish，
    // 故恒 null → 页面按「无方向」fallback 到中性灰（用户口径"红涨绿跌"只对历史段生效）
    sectorDirection: null,
    isGi: false,
    // 未来行无传导报告 → 无星级（恒 null，不触发「重大」徽标）
    importance: null,
    isFuture: true,
  }))
}
