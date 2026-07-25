/**
 * 事件传导模块 - 临时数据补充服务
 *
 * 【临时方案】用于联调阶段，让 Agent 负责人可以查看完整事件列表效果。
 *
 * 背景问题：
 * - 列表接口 GET /api/agent/event/list 不返回 chain 数据
 * - 导致无法在前端生成 Top5 受影响行业
 *
 * 临时方案：
 * - 在列表加载后，遍历事件调用详情接口
 * - 从详情接口获取已转换的 affectedIndustries
 * - 创建新的事件对象（不修改原对象）
 * - 返回全新的数组
 *
 * 未来正式方案：
 * - 后端列表接口直接返回 affectedIndustries 字段
 * - 删除本文件中的所有临时逻辑
 *
 * 性能控制：
 * - 只处理当前页面展示的数据
 * - 不修改分页逻辑
 * - 不影响已有 loading 状态
 * - 异常处理：详情接口失败时返回原对象
 */

import type { EventItem } from '../types'
import { getEventDetail } from './eventApi'

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

// ==================== 原有补充数据逻辑 ====================

/**
 * 为事件列表补充 Top5 受影响行业数据
 *
 * 【重要】此函数返回新数组，不修改原数组
 * 确保 Vue 响应式系统能够检测到对象引用的变化
 *
 * 流程：
 * 1. 遍历事件列表
 * 2. 调用详情接口获取已转换的 affectedIndustries
 * 3. 创建新的事件对象（包含 affectedIndustries）
 * 4. 返回全新的数组
 *
 * @param events - 事件列表（当前页）
 * @returns Promise<EventItem[]> - 全新的数组，每个对象也是新的引用
 */
export async function enrichAffectedIndustries(events: EventItem[]): Promise<EventItem[]> {
  // 异常处理：空数组直接返回
  if (!events || events.length === 0) {
    return []
  }

  // 并发请求所有事件的详情（但控制并发数量）
  const batchSize = 5 // 每批并发 5 个请求，避免浏览器并发限制
  const batches = chunk(events, batchSize)

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

  return enrichedEvents
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