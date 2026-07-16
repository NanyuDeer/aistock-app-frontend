/**
 * 事件传导模块 - 数据适配层
 *
 * 职责：
 * 1. 将后端 Agent 接口返回的数据结构转换为前端组件使用的类型
 * 2. 处理字段名映射（event_understanding → eventUnderstanding）
 * 3. 处理数据路径转换（content.analysis_reports.* → 顶层字段）
 * 4. 为缺失字段提供降级默认值
 *
 * 设计原则：
 * - 不修改 Agent 输出结构
 * - 不修改后端接口
 * - 不修改前端组件
 * - AI投资机会继续使用 event_investment 字段
 */

import type {
  // 前端使用类型
  EventItem,
  EventListResponse,
  EventDetailResponse,
  EventGraph,
  AffectedIndustry,
  GraphNode,
  GraphConnection,
  GraphPosition,
  GraphNodeType,
  EventType,  // 用于 historyEvents 类型断言
} from '../types'

// ==================== 后端响应类型定义 ====================

/**
 * 注意：request.ts 响应拦截器已自动提取 data 字段：
 *   后端返回 { code: 0, data: { ... } }
 *   → 拦截器返回 { ... }（data 的内容）
 * 因此以下类型定义的是拦截器提取后的数据结构，不再包含外层 code/data 包裹。
 */

/** 列表接口响应（拦截器提取后） */
export interface BackendEventListData {
  events: Array<{
    eventId: string
    title: string
    source: string
    publishTime: string
    summary: string
    conclusion: string
  }>
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/** 详情接口响应（拦截器提取后） */
export interface BackendEventDetailData {
  id: number
  report_type: string
  report_date: string
  user_id: string
  content: {
    eventId: string
    title: string
    source: string
    publishTime: string
    event: string
    analysis_reports: {
      event_understanding?: {
        summary: string
        coreChanges: Array<{
          variable: string
          before: string
          after: string
        }>
      }
      event_transmission?: {
        eventId: string
        mechanism: string
        variables: Array<{
          name: string
          direction: 'bullish' | 'bearish' | 'neutral'
          strength: number
          explanation: string
        }>
        coreIndustry: {
          name: string
          impact: string
          reason: string
        }
        chain: Array<{
          industry: string
          relation: string
          level: number
          direction: 'bullish' | 'bearish' | 'neutral'
          impactStrength: number
          reason: string
        }>
      }
      event_history?: Array<{
        historyId: string
        year: string
        title: string
        eventType: string
        sentiment: 'bullish' | 'bearish' | 'neutral'
        industryChange: string
        changePercentage: number
      }>
      event_investment?: {
        id: string
        conclusion: string
        keyPoints: string[]
        focusIndustries: Array<{
          name: string
          direction: 'positive' | 'negative'
          reason: string
        }>
        opportunities: string[]
        risks: string[]
        rating: 'positive' | 'neutral' | 'negative'
      }
      event_podcast_brief?: string
    }
  }
  data_source: string
  status: string
  generation_time_ms: number
  model_version: string
  created_at: string
}

// ==================== 列表接口适配 ====================

/**
 * 列表接口适配器
 * 将后端 BackendEventListResponse 转换为前端 EventListResponse
 *
 * 字段映射：
 * - summary → aiSummary（字段名映射）
 * - eventType、importance、affectedIndustries、isFollowed → 降级默认值
 */
export function adaptEventList(backend: BackendEventListData): EventListResponse {
  return {
    events: backend.events.map(adaptEventItem),
    total: backend.total,
    page: backend.page,
    pageSize: backend.pageSize,
    hasMore: backend.hasMore,
  }
}

/**
 * 单个事件适配
 * 将后端事件字段转换为前端 EventItem
 *
 * 字段映射：
 * - 直接映射：eventId, title, source, publishTime
 * - 字段名映射：summary → aiSummary
 * - 降级字段：eventType, importance, affectedIndustries, isFollowed
 */
function adaptEventItem(backendEvent: BackendEventListData['events'][0]): EventItem {
  return {
    // 直接映射字段
    eventId: backendEvent.eventId,
    title: backendEvent.title,
    source: backendEvent.source,
    publishTime: backendEvent.publishTime,

    // 字段名映射
    aiSummary: backendEvent.summary,

    // 降级字段（后端暂不返回）
    // 注意：使用默认值可能误导用户，后续应与后端协商新增字段
    eventType: '产业政策' as EventType,  // 降级默认值，无法真实反映事件类型
    importance: 3,          // 降级默认值，无法真实反映事件重要性
    affectedIndustries: [], // 列表接口无 chain，无法生成
    isFollowed: false,      // 功能暂不实现
  }
}

// ==================== 详情接口适配 ====================

/**
 * 详情接口适配器
 * 将后端 BackendEventDetailResponse 转换为前端 EventDetailResponse
 *
 * 字段映射：
 * - event_understanding → eventUnderstanding
 * - event_transmission → transmissionAnalysis
 * - event_history → historyEvents
 * - event_investment → investmentSummary
 *
 * 特殊处理：
 * - 从 chain[] 生成 affectedIndustries
 * - 从 chain[] 生成 graph
 */
export function adaptEventDetail(backend: BackendEventDetailData): EventDetailResponse {
  const content = backend.content
  const analysis = content.analysis_reports

  return {
    // 事件ID
    eventId: content.eventId,

    // 事件基本信息
    event: {
      eventId: content.eventId,
      title: content.title,
      source: content.source,
      publishTime: content.publishTime,

      // 降级字段（后端暂不返回）
      // 注意：使用默认值可能误导用户，后续应与后端协商新增字段
      eventType: '产业政策' as EventType,  // 降级默认值，无法真实反映事件类型
      importance: 3,          // 降级默认值，无法真实反映事件重要性
      affectedIndustries: extractAffectedIndustries(analysis.event_transmission),
      aiSummary: analysis.event_understanding?.summary || '',
      isFollowed: false,      // 功能暂不实现
    },

    // AI 分析模块（直接映射）
    eventUnderstanding: analysis.event_understanding,
    transmissionAnalysis: analysis.event_transmission,
    historyEvents: (analysis.event_history || []).map(h => {
      // 类型转换：后端 string → 前端 EventType
      // 注意：假设后端返回的 eventType 符合前端 EventType 枚举
      // 如果不符合，运行时会显示原始字符串，不会导致页面崩溃
      return {
        ...h,
        eventType: h.eventType as EventType,
      }
    }),
    investmentSummary: analysis.event_investment,

    // 生成字段
    graph: generateGraphFromChain(analysis.event_transmission?.chain || []),
  }
}

// ==================== 复杂字段生成函数 ====================

/**
 * 从 transmissionAnalysis.chain[] 提取 affectedIndustries
 *
 * 转换规则：
 * - industry → name
 * - impactStrength (0-1) → impactLevel (1-5): Math.round(impactStrength * 5)
 * - direction → sentiment
 * - impactStrength → impactStrength
 * - impactStrength * 15 → impactPercentage（估算值）
 * - reason → reason
 *
 * 排序：按 impactStrength 降序
 * 取前：Top 5
 */
function extractAffectedIndustries(transmission: BackendEventDetailData['content']['analysis_reports']['event_transmission']): AffectedIndustry[] {
  if (!transmission?.chain) return []

  return transmission.chain
    .map((node): AffectedIndustry => ({
      name: node.industry,
      impactLevel: Math.round(node.impactStrength * 5),
      sentiment: node.direction,
      impactStrength: node.impactStrength,
      impactPercentage: node.impactStrength * 15,  // 估算值
      reason: node.reason,
    }))
    .sort((a, b) => b.impactStrength - a.impactStrength)
    .slice(0, 5)
}

/**
 * 从 transmissionAnalysis.chain[] 生成 EventGraph
 *
 * 生成规则：
 * 1. 创建事件节点（type: 'event'）
 * 2. 遍历 chain 创建行业节点（根据 relation 判断 type）
 * 3. 创建连线（事件 → 核心 → 上游/下游）
 *
 * 节点类型判断：
 * - relation 包含 '核心' → type: 'core'
 * - relation 包含 '上游' → type: 'upstream'
 * - relation 包含 '下游' → type: 'downstream'
 *
 * 限制说明：
 * 1. 当前仅支持单个核心行业，多个核心时只使用第一个
 * 2. relation 为空字符串时，默认当作核心节点处理
 * 3. 简化布局算法，不支持复杂的多级上下游关系
 */

/** 产业链传导节点类型（用于图谱生成） */
type TransmissionChainNodeType = {
  industry: string
  relation: string
  level: number
  direction: 'bullish' | 'bearish' | 'neutral'
  impactStrength: number
  reason: string
}

function generateGraphFromChain(chain: TransmissionChainNodeType[]): EventGraph {
  if (!chain || chain.length === 0) {
    return { nodes: [], connections: [] }
  }

  const nodes: GraphNode[] = []
  const connections: GraphConnection[] = []

  // 1. 创建事件节点
  nodes.push({
    nodeId: 'node_event',
    name: '事件',
    type: 'event',
    position: { x: 200, y: 20 },
  })

  // 2. 创建行业节点
  chain.forEach((node: TransmissionChainNodeType, index: number) => {
    // 判断节点类型
    let type: GraphNodeType = 'core'  // 默认为核心节点
    if (node.relation?.includes('上游')) {
      type = 'upstream'
    } else if (node.relation?.includes('下游')) {
      type = 'downstream'
    } else if (node.relation?.includes('核心')) {
      type = 'core'
    }
    // 注意：relation 为空或其他值时，默认当作核心节点

    nodes.push({
      nodeId: `node_${index}`,
      name: node.industry,
      type,
      position: calculateNodePosition(node.level, type, index),
    })
  })

  // 3. 创建连线
  // 找到核心节点索引（优先使用明确标记为"核心"的节点）
  let coreIndex = chain.findIndex((n: TransmissionChainNodeType) => n.relation?.includes('核心'))

  // 如果没有明确的核心节点，使用第一个节点作为核心
  if (coreIndex < 0 && chain.length > 0) {
    coreIndex = 0
  }

  chain.forEach((node: TransmissionChainNodeType, index: number) => {
    // 明确标记为"核心"的节点，连接到事件
    if (node.relation?.includes('核心')) {
      // 核心 → 事件
      connections.push({
        fromNodeId: 'node_event',
        toNodeId: `node_${index}`,
        strength: node.impactStrength,
      })
    } else if (node.relation?.includes('上游')) {
      // 上游 → 核心
      if (coreIndex >= 0) {
        connections.push({
          fromNodeId: `node_${index}`,
          toNodeId: `node_${coreIndex}`,
          strength: node.impactStrength,
        })
      }
    } else if (node.relation?.includes('下游')) {
      // 核心 → 下游
      if (coreIndex >= 0) {
        connections.push({
          fromNodeId: `node_${coreIndex}`,
          toNodeId: `node_${index}`,
          strength: node.impactStrength,
        })
      }
    }
  })

  return { nodes, connections }
}

/**
 * 计算节点坐标（简化版布局）
 *
 * 布局规则：
 * - x 坐标：上游 50, 核心 200, 下游 350
 * - y 坐标：根据索引递增（100 + index * 70）
 */
function calculateNodePosition(_level: number, type: GraphNodeType, index: number): GraphPosition {
  const x = type === 'upstream' ? 50 : type === 'downstream' ? 350 : 200
  const y = 100 + index * 70
  return { x, y }
}