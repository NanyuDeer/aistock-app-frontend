/**
 * 早晚报数据适配器（降级方案）
 *
 * 将现有 morning/review 报告（BriefingReport + ReportCard[]）降级解析为 BriefingItem[]。
 * 后端早晚报整合接口（/agent/briefing/summary）就绪后，此适配器可移除，
 * 直接使用后端返回的 BriefingSummary。
 *
 * 映射规则：
 * - 第一张卡片 → 头条（isHeadline，隔夜美股/地缘影响）
 * - 复盘的 anomalySignal 卡片 → 异动公告（isAlert，自选股异动）
 * - 其余卡片 → Agent 洞见列表
 * - BriefingReport.sectors/stocks → 关联标签
 */
import { splitReportToCards, type ReportCard } from './reportCard'
import { parseBriefingReport } from './briefingReport'
import type { BriefingReport, BriefingType, BriefV1 } from './briefingReport'
import type {
  BriefingItem,
  BriefingSource,
  BriefingTag,
  Sentiment,
} from '@/shared/api/modules/briefing'

/** 报告分析类型：晨报 or 复盘（与 splitReportToCards 一致，区别于 Brief v1 的 BriefType） */
export type ReportType = 'morning' | 'review'

/** ReportType → BriefingType 映射：review 复盘对应 evening 晚报 */
function toBriefType(type: ReportType): BriefingType {
  return type === 'review' ? 'evening' : 'morning'
}

/** 从 HTML 字符串提取纯文本 */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/** 从纯文本截取前 N 句作为结论 */
function extractConclusion(text: string, maxSentences = 3): string {
  const sentences = text
    .split(/[。\n！？!?]/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#') && !s.startsWith('|'))
  const result = sentences.slice(0, maxSentences).join('。')
  return result ? result + '。' : ''
}

/** 早点听中的事件传导只展示短摘要，避免单条长文挤占整页阅读空间。 */
function displayConclusion(source: BriefingSource, conclusion: string): string {
  if (source !== 'event' || conclusion.length <= 100) return conclusion
  return `${conclusion.slice(0, 99)}…`
}

/** 事件 Agent 的旧标题通常是“事件传导分析”，优先从结论中取真正的事件主题。 */
function displayTitle(source: BriefingSource, title: string, conclusion: string): string {
  if (source !== 'event' || title !== '事件传导分析') return title

  const focused = conclusion.match(/(?:今日聚焦|聚焦)([^：，。；]{4,30})/)
  if (focused?.[1]) return focused[1].trim()

  const firstSentence = conclusion
    .replace(/^各位投资者[，,:：]*/, '')
    .split(/[。；]/)[0]
    .trim()
  if (!firstSentence) return title
  return firstSentence.length > 20 ? `${firstSentence.slice(0, 19)}…` : firstSentence
}

/** 晨报卡片 key → BriefingSource 映射 */
const MORNING_SOURCE_MAP: Record<string, BriefingSource> = {
  overnight: 'morning',
  macro: 'morning',
  sentiment: 'morning',
  focusSectors: 'morning',
  strategy: 'morning',
  extra: 'morning',
}

/** 复盘卡片 key → BriefingSource 映射 */
const REVIEW_SOURCE_MAP: Record<string, BriefingSource> = {
  speedLook: 'review',
  coreConclusion: 'review',
  detailAnalysis: 'review',
  exclusionNote: 'review',
  anomalySignal: 'alert',
  eventTracking: 'event',
  extra: 'review',
}

/** 从 BriefingReport 提取关联标签 */
function extractTags(report: BriefingReport | null): BriefingTag[] {
  if (!report) return []
  const tags: BriefingTag[] = []
  for (const stock of report.stocks.slice(0, 3)) {
    tags.push({ text: stock, type: 'stock' })
  }
  for (const sector of report.sectors.slice(0, 3)) {
    tags.push({ text: sector, type: 'sector' })
  }
  return tags
}

/** 根据卡片内容粗略判断利空利好（降级方案，默认 mixed） */
function detectSentiment(text: string, cardKey: string): Sentiment {
  // 异常信号默认偏空
  if (cardKey === 'anomalySignal') return 'mixed'
  // 简单关键词匹配
  if (/利好|上涨|增长|超预期|强势|上涨/.test(text)) return 'bull'
  if (/利空|下跌|下滑|低于预期|风险|承压/.test(text)) return 'bear'
  return 'mixed'
}

/**
 * 将 ReportCard[] + BriefingReport 映射为 BriefingItem[]
 *
 * - 第一张卡片标记为头条（isHeadline）
 * - 复盘的 anomalySignal 标记为异动公告（isAlert）
 * - 其余卡片为 Agent 洞见
 */
function cardsToItems(
  cards: ReportCard[],
  type: ReportType,
  report: BriefingReport | null,
): BriefingItem[] {
  const sourceMap = type === 'morning' ? MORNING_SOURCE_MAP : REVIEW_SOURCE_MAP
  const sharedTags = extractTags(report)

  return cards.map((card, idx) => {
    const text = htmlToText(card.html)
    const source = sourceMap[card.key] || 'morning'
    const isHeadline = idx === 0
    const isAlert = card.key === 'anomalySignal'

    // 头条和异动公告使用报告级关联标签，洞见卡片暂不提取标签
    const relatedTags = isHeadline || isAlert ? sharedTags : []

    return {
      id: `${type}-${card.key}-${idx}`,
      source,
      sentiment: detectSentiment(text, card.key),
      title: displayTitle(source, card.title || extractConclusion(text, 1).replace(/。$/, ''), text),
      conclusion: displayConclusion(source, extractConclusion(text)),
      relatedTags,
      isHeadline,
      isAlert,
    }
  })
}

/**
 * 降级解析：从 morning/review 报告解析为 BriefingItem[]
 *
 * @param report 已解析的 BriefingReport（含 details Markdown）
 * @param type 报告类型
 */
export function parseBriefingItemsFromReport(
  report: BriefingReport | null,
  type: ReportType,
): BriefingItem[] {
  if (!report || !report.details) return []
  const cards = splitReportToCards(report.details, type)
  return cardsToItems(cards, type, report)
}

/**
 * 将当前后端的结构化 Brief v1 映射为早点听卡片。
 *
 * Brief v1 不再携带旧报告的 Markdown 卡片和股票/赛道标签，因此直接保留
 * 标题、结论与顺序：第一条作为今日头条，其余条目展示为 Agent 洞见。
 */
export function parseBriefingItemsFromBrief(brief: BriefV1 | null): BriefingItem[] {
  if (!brief) return []

  return brief.items.map((item, index) => {
    const source = sourceFromBriefEvidence(item.evidence[0]?.report_type, brief.brief_type)
    return {
      id: `${brief.brief_type}-${index}`,
      source,
      sentiment: detectSentiment(`${item.title} ${item.conclusion}`, ''),
      title: displayTitle(source, item.title, item.conclusion),
      conclusion: displayConclusion(source, item.conclusion),
      relatedTags: [],
      isHeadline: index === 0,
      isAlert: false,
    }
  })
}

function sourceFromBriefEvidence(reportType: unknown, briefType: BriefingType): BriefingSource {
  switch (reportType) {
    case 'morning':
    case 'wind_leader':
    case 'hot_burst':
    case 'review':
      return reportType
    case 'trend_score':
      return 'trend'
    case 'event_conduction':
      return 'event'
    default:
      return briefType === 'evening' ? 'review' : 'morning'
  }
}

/**
 * 从原始 API 响应解析为 BriefingItem[]（封装 parseBriefingReport + splitReportToCards）
 *
 * @param content 原始 API 响应的 content 字段
 * @param type 报告类型
 */
export function parseBriefingItemsFromContent(
  content: unknown,
  type: ReportType,
): BriefingItem[] {
  const report = parseBriefingReport(content, toBriefType(type))
  return parseBriefingItemsFromReport(report, type)
}
