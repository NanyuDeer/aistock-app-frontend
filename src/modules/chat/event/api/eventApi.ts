/**
 * 事件传导模块 - API 封装
 *
 * 已接入真实后端 Agent 接口。
 * 通过 eventAdapter 处理数据映射和降级逻辑。
 */

import type { EventListResponse, EventListParams, EventDetailResponse, EventGraph, NewsArticle, EventTimelineQuery, EventTimelineResponse } from '../types'
import type { BackendEventListData, BackendEventDetailData } from './eventAdapter'
import { adaptEventList, adaptEventDetail } from './eventAdapter'
import request from '@/shared/api/request'

/**
 * 获取事件列表（分页）
 *
 * @param params.page - 页码
 * @param params.pageSize - 每页条数，默认10
 */
export async function getEventList(params: EventListParams = {}): Promise<EventListResponse> {
  const response = await request.get<BackendEventListData>('/agent/event/list', {
    params: {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      // 方案A（2026-08-14）：事件类型由服务端筛选 + 分页；"全部"不传 eventType
      ...(params.eventType ? { eventType: params.eventType } : {}),
    },
  })

  return adaptEventList(response)
}

/**
 * 获取事件详情（含传导链路、图谱、AI分析）
 *
 * @param eventId - 事件ID
 */
export async function getEventDetail(eventId: string): Promise<EventDetailResponse> {
  const response = await request.get<BackendEventDetailData>(`/agent/event/${eventId}`)

  return adaptEventDetail(response)
}

/**
 * 获取事件产业链图谱
 *
 * 注意：图谱数据已包含在详情接口中，通过 eventAdapter 生成。
 * 此函数保留供后续独立调用使用。
 *
 * @param eventId - 事件ID
 */
export async function getEventGraph(eventId: string): Promise<EventGraph> {
  // 图谱数据已包含在详情接口中，通过 eventAdapter 生成
  // 此函数保留供后续独立调用使用
  const response = await request.get<BackendEventDetailData>(`/agent/event/${eventId}`)
  const adapted = adaptEventDetail(response)
  return adapted.graph
}

/**
 * 关注事件
 *
 * 后端关注接口尚未提供。**显式抛错**而非静默 resolve——原实现静默成功会让
 * 调用方（useEventFollow → 列表/传导页）乐观地把按钮置为「已关注」，
 * 造成「看起来能用、实际未落库」的假象。
 *
 * @param eventId - 事件ID
 */
export async function followEvent(eventId: string): Promise<void> {
  console.warn('[eventApi] followEvent 后端接口未实现:', eventId)
  throw new Error('关注功能暂未上线')
}

/**
 * 取消关注事件
 *
 * 同上：后端未实现，显式失败避免 UI 假成功。
 *
 * @param eventId - 事件ID
 */
export async function unfollowEvent(eventId: string): Promise<void> {
  console.warn('[eventApi] unfollowEvent 后端接口未实现:', eventId)
  throw new Error('关注功能暂未上线')
}

/**
 * 设置事件盯盘
 *
 * 同上：后端未实现，显式失败避免 UI 假成功。
 *
 * @param eventId - 事件ID
 */
export async function watchEvent(eventId: string): Promise<void> {
  console.warn('[eventApi] watchEvent 后端接口未实现:', eventId)
  throw new Error('盯盘功能暂未上线')
}

/**
 * 获取新闻原文
 *
 * 注意：功能暂未实现，需要后端提供新闻详情接口。
 *
 * @param newsId - 新闻ID
 */
export async function getNewsArticle(newsId: string): Promise<NewsArticle> {
  // TODO: 需要后端新增新闻详情接口
  throw new Error(`新闻功能暂未实现: ${newsId}`)
}

/**
 * 获取重大事件时间线（GET /api/agent/event/timeline）
 *
 * 公开接口，无需 token。
 * 后端 data 层直接为 { items, total, page, pageSize, hasMore }。
 * 只透传有值的参数，防御性归一写在 api 层。
 *
 * @param params - 查询参数（全部可选）
 */
export async function getEventTimeline(params: EventTimelineQuery = {}): Promise<EventTimelineResponse> {
  const response = await request.get<EventTimelineResponse>('/agent/event/timeline', {
    params: {
      ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params.dateTo ? { dateTo: params.dateTo } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.order ? { order: params.order } : {}),
      page: params.page || 1,
      pageSize: Math.min(params.pageSize || 20, 100),
    },
  })

  // 防御性归一：后端可能返回 null/undefined items
  if (!Array.isArray(response.items)) {
    return { ...response, items: [] }
  }

  return response
}
