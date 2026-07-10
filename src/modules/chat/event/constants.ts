/**
 * 事件传导模块 - 常量定义
 */

import type { EventType, MarketSentiment, GraphNodeType } from './types'

// ==================== 事件类型 ====================

/** 事件类型列表 */
export const EVENT_TYPES: EventType[] = [
  '产业政策',
  '地缘政治',
  '技术突破',
  '市场动态',
  '监管变化',
  '公司公告',
]

/** 事件类型颜色映射 */
export const EVENT_TYPE_COLORS: Record<EventType, { bg: string; text: string }> = {
  '产业政策': { bg: '#DBEAFE', text: '#3B82F6' },
  '地缘政治': { bg: '#FEF2F2', text: '#EF4444' },
  '技术突破': { bg: '#ECFDF5', text: '#10B981' },
  '市场动态': { bg: '#FEF3C7', text: '#D97706' },
  '监管变化': { bg: '#F5F3FF', text: '#8B5CF6' },
  '公司公告': { bg: '#F1F5F9', text: '#64748B' },
}

// ==================== 重要性 ====================

/** 重要性颜色 */
export const IMPORTANCE_COLORS: Record<number, string> = {
  1: '#E2E8F0',
  2: '#94A3B8',
  3: '#F59E0B',
  4: '#F97316',
  5: '#EF4444',
}

/** 重要性文字 */
export const IMPORTANCE_LABELS: Record<number, string> = {
  1: '轻微',
  2: '一般',
  3: '较重要',
  4: '重大',
  5: '极其重大',
}

// ==================== 市场情绪 ====================

/** 市场情绪颜色 */
export const SENTIMENT_COLORS: Record<MarketSentiment, { text: string; bg: string }> = {
  bullish: { text: '#DC2626', bg: '#FEF2F2' },
  bearish: { text: '#16A34A', bg: '#F0FDF4' },
  neutral: { text: '#9CA3AF', bg: '#F1F5F9' },
}

/** 市场情绪文字 */
export const SENTIMENT_LABELS: Record<MarketSentiment, string> = {
  bullish: '利好',
  bearish: '利空',
  neutral: '中性',
}

// ==================== 图谱节点 ====================

/** 图谱节点颜色 */
export const GRAPH_NODE_COLORS: Record<GraphNodeType, { bg: string; text: string; border?: string; shadow?: string }> = {
  event: { bg: 'linear-gradient(135deg, #EF4444, #F97316)', text: '#FFFFFF', shadow: '0 4px 16px rgba(239,68,68,0.25)' },
  core: { bg: '#3B82F6', text: '#FFFFFF', shadow: '0 0 24px rgba(59,130,246,0.35)' },
  upstream: { bg: '#F5F3FF', text: '#8B5CF6', border: '#8B5CF6' },
  downstream: { bg: '#ECFDF5', text: '#10B981', border: '#10B981' },
}

// ==================== 传导强度 ====================

/** 传导强度阈值 */
export const STRENGTH_THRESHOLDS = {
  /** ≥0.6 为强传导 */
  strong: 0.6,
  /** ≥0.3 为中传导 */
  medium: 0.3,
} as const

/** 强度颜色 */
export const STRENGTH_COLORS: Record<string, string> = {
  strong: '#3B82F6',
  medium: '#94A3B8',
  weak: '#CBD5E1',
}

/** 根据传导系数获取强度标签 */
export function getStrengthLabel(strength: number): string {
  if (strength >= STRENGTH_THRESHOLDS.strong) return '强'
  if (strength >= STRENGTH_THRESHOLDS.medium) return '中'
  return '弱'
}

// ==================== 分页 ====================

/** 默认每页条数 */
export const DEFAULT_PAGE_SIZE = 4

/** 总 mock 事件数 */
export const MOCK_TOTAL_COUNT = 8
