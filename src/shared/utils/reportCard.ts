/**
 * reportCard.ts — 统一 ReportCard[] 卡片模型 + 晨报/复盘分段器
 *
 * 设计动机：原 briefing-detail 页面对晨报和复盘都调用 splitReviewReport（复盘分段器），
 * 晨报正文按"步骤N/附录X"规则切分时结构不匹配，导致内容被静默丢弃。
 *
 * 本模块抽取公共 Markdown 工具与 ReportCard[] 卡片模型：
 * - splitMorningReport：晨报分段器，按 ## 标题匹配 5 张晨报卡片
 * - splitReviewToCards：复盘分段器（复用 splitReviewReport），保持复盘业务顺序
 * - splitReportToCards：按 type 分发到对应分段器
 *
 * 未匹配的有效正文统一以"补充分析"卡片展示，不允许静默丢弃。
 */

import { markdownToHtml } from './markdown'
import { splitReviewReport } from './reportSplitter'

// ── ReportCard 模型 ──

export interface ReportCard {
  /** 卡片唯一标识，用于 v-for key */
  key: string
  /** 卡片标题 */
  title: string
  /** 卡片内容 HTML（已从 Markdown 转换） */
  html: string
  /** 卡片是否可见（空内容时为 false） */
  visible: boolean
}

// ── 晨报分段器 ──

/**
 * 晨报卡片定义：标题 + 关键词匹配规则。
 * 关键词用于匹配 Markdown ## 标题，决定该段正文归属哪张卡片。
 */
const MORNING_CARD_DEFS: readonly { key: string; title: string; keywords: string[] }[] = [
  { key: 'overnight', title: '隔夜外盘', keywords: ['隔夜', '外盘'] },
  { key: 'macro', title: '国内宏观', keywords: ['国内宏观', '宏观要闻'] },
  { key: 'sentiment', title: '市场情绪', keywords: ['市场情绪'] },
  { key: 'focusSectors', title: '焦点板块', keywords: ['焦点板块', '板块预测'] },
  { key: 'strategy', title: '策略建议', keywords: ['策略', '今日关注'] },
] as const

/** 匹配晨报 ## 标题到卡片定义，无匹配返回 null */
function matchMorningCard(header: string): { key: string; title: string } | null {
  for (const def of MORNING_CARD_DEFS) {
    if (def.keywords.some((kw) => header.includes(kw))) {
      return { key: def.key, title: def.title }
    }
  }
  return null
}

/**
 * 将 Markdown 按 ## 二级标题切分为 [header, body] 段落。
 * 标题行前的引导文本（如 # 一级标题）单独作为第一个无标题段落返回。
 */
function splitByH2(md: string): { header: string; body: string }[] {
  const lines = md.split('\n')
  const sections: { header: string; body: string }[] = []
  let currentHeader = ''
  let currentBody: string[] = []
  let preamble: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // 遇到新的 ## 标题，保存前一段
      if (currentHeader || currentBody.length) {
        sections.push({ header: currentHeader, body: currentBody.join('\n') })
      } else if (preamble.length) {
        // 标题前的引导文本
        sections.push({ header: '', body: preamble.join('\n') })
      }
      currentHeader = line.slice(3).trim()
      currentBody = []
      preamble = []
    } else if (currentHeader) {
      currentBody.push(line)
    } else {
      preamble.push(line)
    }
  }

  // 最后一段
  if (currentHeader || currentBody.length) {
    sections.push({ header: currentHeader, body: currentBody.join('\n') })
  } else if (preamble.length) {
    sections.push({ header: '', body: preamble.join('\n') })
  }

  return sections
}

/**
 * 晨报分段器：按 ## 标题匹配 5 张晨报卡片 + 补充分析。
 *
 * 卡片：隔夜外盘、国内宏观、市场情绪、焦点板块、策略建议。
 * 未匹配的有效正文以"补充分析"展示，不允许静默丢弃。
 */
export function splitMorningReport(md: string): ReportCard[] {
  if (!md || !md.trim()) return []

  const sections = splitByH2(md)
  const cardMap = new Map<string, ReportCard>()
  const extraParts: string[] = []

  for (const section of sections) {
    const trimmedBody = section.body.trim()
    if (!trimmedBody && !section.header) continue

    // 引导文本（# 一级标题或无标题内容）→ 补充分析
    if (!section.header) {
      // 跳过纯一级标题行
      const meaningful = trimmedBody
        .split('\n')
        .filter((l) => !l.startsWith('# ') && l.trim())
        .join('\n')
      if (meaningful) extraParts.push(meaningful)
      continue
    }

    const matched = matchMorningCard(section.header)
    if (matched) {
      // 匹配到晨报卡片：保留标题行 + 正文一起转 HTML
      const fullSection = `## ${section.header}\n${trimmedBody}`
      const existing = cardMap.get(matched.key)
      if (existing) {
        existing.html += markdownToHtml(fullSection)
      } else {
        cardMap.set(matched.key, {
          key: matched.key,
          title: matched.title,
          html: markdownToHtml(fullSection),
          visible: true,
        })
      }
    } else {
      // 未匹配 → 补充分析
      const fullSection = `## ${section.header}\n${trimmedBody}`
      extraParts.push(fullSection)
    }
  }

  // 按定义顺序输出卡片
  const cards: ReportCard[] = []
  for (const def of MORNING_CARD_DEFS) {
    const card = cardMap.get(def.key)
    if (card) {
      cards.push(card)
    }
  }

  // 补充分析
  if (extraParts.length) {
    cards.push({
      key: 'extra',
      title: '补充分析',
      html: markdownToHtml(extraParts.join('\n\n')),
      visible: true,
    })
  }

  return cards
}

// ── 复盘分段器（ReportCard[] 版）──

/** 复盘卡片业务顺序定义 */
const REVIEW_CARD_ORDER: { key: string; title: string; field: string }[] = [
  { key: 'speedLook', title: '速览', field: 'speedLook' },
  { key: 'coreConclusion', title: '核心结论', field: 'coreConclusion' },
  { key: 'detailAnalysis', title: '详细分析', field: 'detailAnalysis' },
  { key: 'exclusionNote', title: '排除说明', field: 'exclusionNote' },
  { key: 'anomalySignal', title: '异常信号', field: 'anomalySignal' },
  { key: 'eventTracking', title: '事件追踪', field: 'eventTracking' },
] as const

/**
 * 复盘分段器（ReportCard[] 版）：复用 splitReviewReport 获取 ReportBlocks，
 * 按复盘业务顺序转为 ReportCard[]。
 *
 * 未被 splitReviewReport 捕获的有效正文以"补充分析"展示。
 */
export function splitReviewToCards(md: string): ReportCard[] {
  if (!md || !md.trim()) return []

  const blocks = splitReviewReport(md)
  const cards: ReportCard[] = []

  for (const def of REVIEW_CARD_ORDER) {
    const html = (blocks as unknown as Record<string, string>)[def.field] || ''
    if (html.trim()) {
      cards.push({
        key: def.key,
        title: def.title,
        html,
        visible: true,
      })
    }
  }

  // 检查是否有未被 splitReviewReport 捕获的有效正文
  // splitReviewReport 基于"步骤N/附录X"结构，此处复检原始 md 中是否有遗漏
  const capturedText = cards.map((c) => c.html).join('')
  const rawStripped = md.replace(/^#+\s.*$/gm, '').replace(/\s/g, '')
  const capturedStripped = capturedText.replace(/<[^>]+>/g, '').replace(/\s/g, '')
  // 如果原始文本明显长于已捕获文本，说明有内容被丢弃 → 补充分析
  if (rawStripped.length > capturedStripped.length + 20) {
    // 提取未被捕获的内容：找出原始 md 中不在任何已知卡片中的段落
    const extraContent = extractUncapturedReviewContent(md)
    if (extraContent) {
      cards.push({
        key: 'extra',
        title: '补充分析',
        html: markdownToHtml(extraContent),
        visible: true,
      })
    }
  }

  return cards
}

/**
 * 提取复盘报告中未被 splitReviewReport 捕获的内容。
 * 主要捕获标题前的引导文本和任何不匹配"步骤N/附录X"结构的段落。
 */
function extractUncapturedReviewContent(md: string): string {
  const lines = md.split('\n')
  const parts: string[] = []
  let beforeFirstSection = true

  for (const line of lines) {
    if (line.startsWith('## 步骤')) {
      beforeFirstSection = false
    }
    if (beforeFirstSection) {
      // 步骤1 之前的内容：跳过纯标题，保留有意义的文本
      if (line.trim() && !line.startsWith('# ') && !line.startsWith('---')) {
        parts.push(line)
      }
    }
  }

  return parts.join('\n').trim()
}

// ── 分发器 ──

/**
 * 按 type 分发到对应分段器，返回 ReportCard[]。
 *
 * @param md 报告正文 Markdown
 * @param type 'morning' 晨报 | 'review' 复盘
 */
export function splitReportToCards(
  md: string,
  type: 'morning' | 'review',
): ReportCard[] {
  if (type === 'morning') {
    return splitMorningReport(md)
  }
  return splitReviewToCards(md)
}
