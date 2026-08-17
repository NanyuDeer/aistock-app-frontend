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

import type { EventItem, FocusEventViewModel } from '../types'
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
 * 获取 Global Importance 双榜单事件
 *
 * 基于 event/list 返回的 globalImportanceRank 筛选焦点事件。
 *
 * 数据流（第三阶段）：
 *   Step 1: 调用 getEventList() 获取事件列表（已包含 globalImportanceRank + chain_summary）
 *   Step 2: 筛选 rank=1（当前焦点）和 rank=2（持续影响）的事件
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

    // Step 2: 筛选 rank=1 和 rank=2 的事件
    const focusEvents = events.filter(e =>
      e.globalImportanceRank === 1 || e.globalImportanceRank === 2
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

      const giLevel = event.globalImportanceLevel
      const importance: 'major' | 'normal' =
        giLevel === 'critical' || giLevel === 'important' ? 'major' : 'normal'

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