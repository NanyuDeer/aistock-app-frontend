/**
 * 事件传导模块 - API 封装
 *
 * 已接入真实后端 Agent 接口。
 * 通过 eventAdapter 处理数据映射和降级逻辑。
 */

import type { EventListResponse, EventListParams, EventDetailResponse, EventGraph, NewsArticle } from '../types'
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
 * 注意：功能暂未实现，后端需要新增接口。
 *
 * @param eventId - 事件ID
 */
export async function followEvent(eventId: string): Promise<void> {
  // TODO: 需要后端新增关注接口
  console.warn('[eventApi] followEvent 功能暂未实现:', eventId)
}

/**
 * 取消关注事件
 *
 * 注意：功能暂未实现，后端需要新增接口。
 *
 * @param eventId - 事件ID
 */
export async function unfollowEvent(eventId: string): Promise<void> {
  // TODO: 需要后端新增取消关注接口
  console.warn('[eventApi] unfollowEvent 功能暂未实现:', eventId)
}

/**
 * 设置事件盯盘
 *
 * 注意：功能暂未实现，后端需要新增接口。
 *
 * @param eventId - 事件ID
 */
export async function watchEvent(eventId: string): Promise<void> {
  // TODO: 需要后端新增盯盘接口
  console.warn('[eventApi] watchEvent 功能暂未实现:', eventId)
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
