/**
 * 事件传导模块 - 统一类型定义
 *
 * 所有数据结构集中定义，组件、composable、API 统一引用。
 * 保证后续 Agent 接口返回结构可以直接复用。
 */

// ==================== 基础枚举 ====================

/** 事件类型 */
export type EventType =
  | '产业政策'
  | '地缘政治'
  | '技术突破'
  | '市场动态'
  | '监管变化'
  | '公司公告'

/** 市场情绪方向 */
export type MarketSentiment = 'bullish' | 'bearish' | 'neutral'

/** 图谱节点类型 */
export type GraphNodeType = 'event' | 'core' | 'upstream' | 'downstream'

/** 驱动/热搜分类 */
export type EventCategory = 'driving' | 'hot'

// ==================== 事件列表 ====================

/** 受影响的行业（列表页与详情页通用） */
export interface AffectedIndustry {
  /** 行业名称 */
  name: string
  /** 影响等级 1-5 */
  impactLevel: number
  /** 市场情绪 */
  sentiment: MarketSentiment
  /** 影响强度 0-1（详情页传导链强度柱用） */
  impactStrength: number
  /** 影响幅度百分比（如 +8.5 或 -3.2） */
  impactPercentage: number
  /** AI 推理原因 */
  reason: string
}

/** 事件列表项 */
export interface EventItem {
  /** 事件唯一标识 */
  eventId: string
  /** 事件标题 */
  title: string
  /** 发布时间 yyyy-MM-dd HH:mm */
  publishTime: string
  /** 来源 */
  source: string
  /** 来源信息（用于展示） */
  sourceInfo?: {
    name: string
    url?: string
  }
  /** 关联新闻ID */
  newsId?: string
  /** 内容预览（可选） */
  contentPreview?: string
  /** 事件类型 */
  eventType: EventType
  /** 重要性评分 1-5 */
  importance: number
  /** 受影响的行业列表 */
  affectedIndustries: AffectedIndustry[]
  /** AI 摘要（≤40字） */
  aiSummary: string
  /** 是否已关注 */
  isFollowed: boolean
}

/** 事件列表 API 响应 */
export interface EventListResponse {
  /** 事件列表 */
  events: EventItem[]
  /** 总条数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页条数 */
  pageSize: number
  /** 是否有更多数据 */
  hasMore: boolean
}

// ==================== 产业链图谱 ====================

/** 图谱节点位置 */
export interface GraphPosition {
  x: number
  y: number
}

/** 图谱节点 */
export interface GraphNode {
  /** 节点唯一标识 */
  nodeId: string
  /** 节点名称 */
  name: string
  /** 节点类型 */
  type: GraphNodeType
  /** 节点坐标 */
  position: GraphPosition
}

/** 图谱连线 */
export interface GraphConnection {
  /** 起始节点ID */
  fromNodeId: string
  /** 目标节点ID */
  toNodeId: string
  /** 传导强度 0-1 */
  strength: number
}

/** 产业链图谱数据 */
export interface EventGraph {
  /** 节点列表 */
  nodes: GraphNode[]
  /** 连线列表 */
  connections: GraphConnection[]
}

// ==================== AI 影响传导分析 ====================

/** 传导变量 */
export interface TransmissionVariable {
  name: string
  direction: 'bullish' | 'bearish' | 'neutral'
  strength: number
  explanation: string
}

/** 核心行业 */
export interface CoreIndustry {
  name: string
  impact: string
  reason: string
}

/** 产业链传导环节 */
export interface TransmissionChainNode {
  industry: string
  relation: string
  level: number
  direction: 'bullish' | 'bearish' | 'neutral'
  impactStrength: number
  reason: string
}

/** AI 影响传导分析 */
export interface TransmissionAnalysis {
  eventId: string
  mechanism: string
  variables: TransmissionVariable[]
  coreIndustry: CoreIndustry
  chain: TransmissionChainNode[]
}

// ==================== 历史事件 ====================

/** 历史相似事件 */
export interface HistoryEvent {
  /** 历史事件ID */
  historyId: string
  /** 年份 */
  year: string
  /** 事件标题 */
  title: string
  /** 事件类型 */
  eventType: EventType
  /** 市场情绪方向 */
  sentiment: MarketSentiment
  /** 影响行业变化 */
  industryChange: string
  /** 行业指数变化百分比 */
  changePercentage: number
}

// ==================== 事件理解 ====================

/** 核心变化 */
export interface CoreChange {
  variable: string
  before: string
  after: string
}

/** AI 事件理解 */
export interface EventUnderstanding {
  summary: string
  coreChanges: CoreChange[]
}

// ==================== 投资总结 ====================

export interface FocusIndustry {
  name: string
  direction: 'positive' | 'negative'
  reason: string
}

export interface InvestmentSummary {
  id: string
  conclusion: string
  keyPoints: string[]
  focusIndustries: FocusIndustry[]
  opportunities: string[]
  risks: string[]
  rating: 'positive' | 'neutral' | 'negative'
}

// ==================== 事件详情 ====================

/** 事件详情 API 响应 */
export interface EventDetailResponse {
  /** 事件ID */
  eventId: string
  /** 事件基本信息 */
  event: EventItem
  /** 产业链图谱 */
  graph: EventGraph
  /** 历史相似事件 */
  historyEvents: HistoryEvent[]
  /** AI 影响传导分析 */
  transmissionAnalysis?: TransmissionAnalysis
  /** AI 事件理解 */
  eventUnderstanding?: EventUnderstanding
  /** AI 投资总结 */
  investmentSummary?: InvestmentSummary
}

// ==================== API 请求参数 ====================

/** 事件列表请求参数 */
export interface EventListParams {
  /** 页码，从 1 开始 */
  page?: number
  /** 每页条数，默认 10 */
  pageSize?: number
  /** 分类筛选 */
  type?: EventCategory
  /** 事件类型筛选 */
  eventType?: EventType
  /** 只显示已关注 */
  followedOnly?: boolean
}

// ==================== 新闻原文 ====================

/** 新闻原文 */
export interface NewsArticle {
  /** 新闻ID */
  id: string
  /** 新闻标题 */
  title: string
  /** 新闻来源 */
  source: string
  /** 发布时间 */
  publishTime: string
  /** 新闻正文（≥500字） */
  content: string
  /** 关联事件ID */
  relatedEventId: string
}

// ==================== Agent 未来输出结构（预留） ====================

/** AI分析步骤（Agent流式输出格式） */
export interface AgentAnalysisStep {
  /** 步骤类型 */
  type: 'impact' | 'transmission' | 'industry' | 'factor' | 'history'
  /** 步骤标题 */
  title: string
  /** 步骤数据（当前阶段使用 EventDetailResponse 各字段，未来由 Agent 输出） */
  data: Record<string, unknown>
}

/** AI Agent 完整分析报告 */
export interface AgentAnalysisReport {
  /** 分析步骤列表 */
  analysisSteps: AgentAnalysisStep[]
  /** AI 最终观点总结 */
  summary: {
    /** 综合判断 */
    viewpoint: string
    /** 关注方向 */
    focusDirection?: string
    /** 风险提示 */
    risk: string
  }
}
