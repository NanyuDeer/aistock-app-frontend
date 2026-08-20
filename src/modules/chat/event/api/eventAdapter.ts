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
  MarketSentiment,  // 用于 direction → sentiment 转换
} from '../types'
import { EVENT_TYPES } from '../constants'

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
    source_name?: string
    event_type?: string
    publishTime: string
    summary: string
    conclusion: string
    globalImportanceRank?: number | null
    globalImportanceDirection?: string | null
    globalImportanceLevel?: string | null
    /** 前端展示专用：行业影响摘要（后端直出，旧数据缺失） */
    chain_summary?: Array<{
      industry: string
      direction: string
      impactStrength: number
      reason?: string
    }>
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
  /** 顶层前端展示专用行业摘要（后端直出，旧数据缺失） */
  chain_summary?: Array<{
    industry: string
    direction: string
    impactStrength: number
    reason?: string
  }>
  content: {
    eventId: string
    title: string
    source: string
    source_name?: string
    event_type?: string
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

/** 已知媒体域名 → 中文显示名映射 */
const MEDIA_NAME_BY_DOMAIN: Readonly<Record<string, string>> = {
  'theguardian.com': '英国《卫报》',
}

/**
 * 从后端 source 字段构建 sourceInfo（来源展示信息）。
 *
 * 后端 event_meta.source 由 event_conduction 从 major_events.url 传入：
 * - 若为 URL，用标准 URL API 解析 hostname（小写并去掉 www. 前缀），
 *   命中 MEDIA_NAME_BY_DOMAIN 则显示中文媒体名，否则显示规范化域名；url 保留原始链接。
 * - 若非 URL，直接作为 name。
 */
function buildSourceInfo(source: string): { name: string; url?: string } | undefined {
  if (!source) return undefined
  if (!/^https?:\/\//i.test(source)) return { name: source }
  // 使用正则替代 new URL()，兼容 App/小程序环境（无 URL 全局对象）
  const match = source.match(/^https?:\/\/([^/?#]+)/i)
  if (match) {
    const domain = match[1].toLowerCase().replace(/^www\./, '')
    return { name: MEDIA_NAME_BY_DOMAIN[domain] ?? domain, url: source }
  }
  return { name: source }
}

/**
 * 构建来源展示信息（source_name 优先）。
 *
 * 新数据：后端返回真实 source_name（如"搜狐"）→ 直接展示，并保留原始链接供点击；
 * 旧数据：source_name 为空 → 回退到旧的 URL/domain 解析逻辑。
 */
function buildSourceInfoWithName(
  sourceName: string | undefined,
  source: string,
): { name: string; url?: string } | undefined {
  if (sourceName) {
    const info: { name: string; url?: string } = { name: sourceName }
    if (/^https?:\/\//i.test(source)) info.url = source
    return info
  }
  return buildSourceInfo(source)
}

/** 事件类型白名单兜底：非法/缺失值回退到默认类型，保证旧数据正常展示。 */
function normalizeEventType(raw: string | undefined): EventType {
  return EVENT_TYPES.includes(raw as EventType) ? (raw as EventType) : '产业政策'
}

/**
 * 从 impactStrength 列表计算事件重要程度星级（1~5）。
 *
 * 规则：取最大 impactStrength（0~1）映射为 5 星制——round(max × 5)，clamp 到 1~5。
 * 依据：后端 Global Importance 预筛 candidate_importance_score 同样取 max(impact_strength)
 *       衡量事件重要性（aistock-agent-py global_importance_evaluation.py）。
 * 无有效强度（空 / 非正数 / 非数值）→ undefined：前端隐藏星级，不显示假评分。
 */
function computeImportanceFromStrengths(strengths: Array<number | undefined>): number | undefined {
  const valid = strengths.filter((n): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n > 0
  )
  if (valid.length === 0) return undefined
  const max = Math.max(...valid)
  return Math.min(5, Math.max(1, Math.round(max * 5)))
}

/** 从 chain_summary（列表/详情接口直出字段）计算事件重要程度星级。 */
function computeImportance(
  summary?: Array<{ industry: string; direction: string; impactStrength: number; reason?: string }>,
): number | undefined {
  if (!Array.isArray(summary) || summary.length === 0) return undefined
  return computeImportanceFromStrengths(summary.map((s) => s?.impactStrength))
}

/**
 * 单个事件适配
 * 将后端事件字段转换为前端 EventItem
 *
 * 字段映射：
 * - 直接映射：eventId, title, source, publishTime
 * - 字段名映射：summary → aiSummary
 * - sourceInfo：从 source 构建（真实来源 URL）
 * - 降级字段：eventType, importance, affectedIndustries, isFollowed
 */
function adaptEventItem(backendEvent: BackendEventListData['events'][0]): EventItem {
  return {
    // 直接映射字段
    eventId: backendEvent.eventId,
    title: backendEvent.title,
    source: backendEvent.source,
    sourceName: backendEvent.source_name,
    publishTime: backendEvent.publishTime,

    // 来源信息：优先 source_name，缺失时回退 URL/domain 解析
    sourceInfo: buildSourceInfoWithName(backendEvent.source_name, backendEvent.source),

    // 字段名映射
    aiSummary: backendEvent.summary,

    // 事件类型：真实值（白名单校验），缺失/非法回退默认
    eventType: normalizeEventType(backendEvent.event_type),
    // 重要程度星级：由 chain_summary 最大 impactStrength 映射（0~1 → 1~5 星）；无 chain 时 undefined → 前端隐藏
    importance: computeImportance(backendEvent.chain_summary),
    // 第三阶段：优先消费后端直出的 chain_summary（旧数据缺失时回退 []）
    affectedIndustries: extractAffectedIndustriesFromSummary(backendEvent.chain_summary),
    chain_summary: backendEvent.chain_summary,
    isFollowed: false,      // 功能暂不实现

    // 透传字段
    globalImportanceRank: backendEvent.globalImportanceRank,
    globalImportanceDirection: backendEvent.globalImportanceDirection,
    globalImportanceLevel: backendEvent.globalImportanceLevel,
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
  // 第三阶段：优先消费顶层 chain_summary（详情接口已直出），旧数据缺失回退 chain 解析
  const chainSummary = backend.chain_summary
  const affectedIndustries = chainSummary && chainSummary.length > 0
    ? extractAffectedIndustriesFromSummary(chainSummary)
    : extractAffectedIndustries(analysis.event_transmission)

  return {
    // 事件ID
    eventId: content.eventId,

    // 事件基本信息
    event: {
      eventId: content.eventId,
      title: content.title,
      source: content.source,
      sourceName: content.source_name,
      sourceInfo: buildSourceInfoWithName(content.source_name, content.source),
      publishTime: content.publishTime,

      // 事件类型：真实值（白名单校验），缺失/非法回退默认
      eventType: normalizeEventType(content.event_type),
      // 重要程度星级：优先 chain_summary，旧数据回退 event_transmission.chain 计算；均无 → undefined 隐藏
      importance: computeImportance(chainSummary)
        ?? computeImportanceFromStrengths((analysis.event_transmission?.chain ?? []).map((n) => n.impactStrength)),
      affectedIndustries,
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
 * 从 chain_summary 提取 affectedIndustries（列表接口直出路径）。
 *
 * chain_summary 结构（后端已降序 + Top5）：
 *  [ { industry, direction, impactStrength, reason } ]
 *
 * 转换为前端 AffectedIndustry：
 *  - industry → name
 *  - impactStrength (0-1) → impactLevel (1-5): Math.round(impactStrength * 5)
 *  - direction → sentiment
 *  - impactStrength * 15 → impactPercentage（估算值）
 *  - reason → reason
 */
function extractAffectedIndustriesFromSummary(
  summary?: Array<{
    industry: string
    direction: string
    impactStrength: number
    reason?: string
  }>,
): AffectedIndustry[] {
  if (!Array.isArray(summary) || summary.length === 0) return []

  return summary
    .filter((item) => item && typeof item.industry === 'string' && item.industry.trim() !== '')
    .map((item): AffectedIndustry => ({
      name: item.industry,
      impactLevel: Math.round(item.impactStrength * 5),
      sentiment: (item.direction === 'bullish' || item.direction === 'bearish')
        ? item.direction as MarketSentiment
        : 'neutral',
      impactStrength: item.impactStrength,
      impactPercentage: item.impactStrength * 15,  // 估算值
      reason: item.reason || '',
    }))
    .sort((a, b) => b.impactStrength - a.impactStrength)
    .slice(0, 5)
}

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
    // 第三阶段：chain 为空时返回带 status 标记的空图，前端展示降级文案而非空白图
    return { nodes: [], connections: [], status: 'empty' }
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