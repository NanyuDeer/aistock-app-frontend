/**
 * 事件传导模块 - API 封装
 *
 * 当前阶段全部调用 mock 数据。
 * 接入后端 Agent 时只需修改此文件中的函数实现，
 * 保持函数签名不变即可无缝切换。
 */

import type { EventListResponse, EventListParams, EventDetailResponse, EventGraph, NewsArticle } from '../types'
import { mockEventList, mockEventDetail, mockEventGraph, mockNewsArticle } from '../mock-data'

// 模拟网络延迟（ms）
const MOCK_DELAY_MIN = 200
const MOCK_DELAY_MAX = 500

/** 模拟网络延迟 */
async function delay(): Promise<void> {
  const ms = MOCK_DELAY_MIN + Math.random() * (MOCK_DELAY_MAX - MOCK_DELAY_MIN)
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 获取事件列表（分页）
 *
 * @param params.page - 页码
 * @param params.pageSize - 每页条数，默认4
 * @param params.type - 分类筛选
 * @param params.followedOnly - 仅已关注
 */
export async function getEventList(params: EventListParams = {}): Promise<EventListResponse> {
  await delay()
  return mockEventList(params)
}

/**
 * 获取事件详情（含传导链路、图谱、AI分析）
 *
 * @param eventId - 事件ID
 */
export async function getEventDetail(eventId: string): Promise<EventDetailResponse> {
  await delay()
  const detail = mockEventDetail(eventId)
  if (!detail) {
    throw new Error(`事件 ${eventId} 不存在`)
  }
  return detail
}

/**
 * 获取事件产业链图谱
 *
 * @param eventId - 事件ID
 */
export async function getEventGraph(eventId: string): Promise<EventGraph> {
  await delay()
  const graph = mockEventGraph(eventId)
  if (!graph) {
    throw new Error(`事件 ${eventId} 图谱数据不存在`)
  }
  return graph
}

/**
 * 关注事件
 *
 * @param eventId - 事件ID
 */
export async function followEvent(eventId: string): Promise<void> {
  await delay()
  // TODO: 接入后端 API
  // await request.post(`/agent/event/${eventId}/follow`)
  console.log('[eventApi] followEvent:', eventId)
}

/**
 * 取消关注事件
 *
 * @param eventId - 事件ID
 */
export async function unfollowEvent(eventId: string): Promise<void> {
  await delay()
  // TODO: 接入后端 API
  // await request.post(`/agent/event/${eventId}/unfollow`)
  console.log('[eventApi] unfollowEvent:', eventId)
}

/**
 * 设置事件盯盘
 *
 * @param eventId - 事件ID
 */
export async function watchEvent(eventId: string): Promise<void> {
  await delay()
  // TODO: 接入后端 API
  // await request.post(`/agent/event/${eventId}/watch`)
  console.log('[eventApi] watchEvent:', eventId)
}

/**
 * 获取新闻原文
 *
 * @param newsId - 新闻ID
 */
export async function getNewsArticle(newsId: string): Promise<NewsArticle> {
  await delay()
  const article = mockNewsArticle(newsId)
  if (!article) {
    throw new Error(`新闻 ${newsId} 不存在`)
  }
  return article
}
