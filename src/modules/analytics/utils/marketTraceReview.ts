import type {
  MarketTraceConfidence,
  MarketTraceReviewRecord,
} from '@/shared/api/modules/agent'

export type { MarketTraceReviewRecord }

/** 候选解释状态：从 markdown 中解析的语义状态 */
export type CandidateStatus = 'supported' | 'weak' | 'rejected' | 'insufficient'

/** 单条候选解释 */
export interface CandidateExplanation {
  name: string
  status: CandidateStatus
  conclusion: string
  supportingEvidence: string[]
  counterEvidence: string[]
}

/** 证据索引条目 */
export interface EvidenceEntry {
  id: string
  source: string
  name: string
  date: string
  url: string
}

/** 从 details markdown 解析出的结构化区块 */
export interface ParsedTraceSections {
  title: string
  snapshotId: string
  phenomenon: {
    type: string
    summary: string
    severity: string
    factIds: string[]
  }
  attribution: string
  candidates: CandidateExplanation[]
  missingEvidence: string[]
  evidenceIndex: EvidenceEntry[]
  unresolvedQuestions: string[]
}

export interface MarketTraceViewModel {
  reportDate: string
  generatedAt: string
  sourceLabel: string
  confidence: MarketTraceConfidence | null
  summary: string
  details: string
  sectors: string[]
  risks: string[]
  isFallback: boolean
  /** 新增：details 解析后的结构化区块（解析失败时为 null，前端回退到纯 markdown） */
  parsed: ParsedTraceSections | null
}

const SOURCE_LABELS: Record<string, string> = {
  review_agent: '复盘 Agent',
  review_agent_quick: '快速复盘',
  review_agent_full: '完整复盘',
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function marketTraceConfidence(value: unknown): MarketTraceConfidence | null {
  return value === 'high' || value === 'medium' || value === 'low' ? value : null
}

/**
 * 解析 details markdown 为结构化区块。
 * 解析失败时返回 null，前端可回退到 markdownToHtml 渲染。
 *
 * 支持的 markdown 结构：
 *   # 标题
 *   快照编号：xxx
 *   ## 确认的市场现象  (含 - 类型/- 摘要/- 严重度/- 事实 ID)
 *   ## 归因结论
 *   ## 候选解释与反证 (含 ### name(status))
 *   ## 缺失证据
 *   ## 证据索引 (含 [ID] source｜name｜date｜url)
 *   ## 未解问题
 */
export function parseTraceDetails(md: string): ParsedTraceSections | null {
  if (!md || typeof md !== 'string') return null
  try {
    const titleMatch = md.match(/^# (.+)$/m)
    const title = titleMatch ? titleMatch[1].trim() : ''

    const snapshotMatch = md.match(/快照编号[：:]\s*(.+)/)
    const snapshotId = snapshotMatch ? snapshotMatch[1].trim() : ''

    // 按 ## 分块（首个 ## 之前是标题区，丢弃）
    const sectionBlocks = md.split(/^## /m).slice(1)
    const sectionMap = new Map<string, string>()
    for (const block of sectionBlocks) {
      const nlIdx = block.indexOf('\n')
      const heading = nlIdx >= 0 ? block.slice(0, nlIdx).trim() : block.trim()
      const body = nlIdx >= 0 ? block.slice(nlIdx + 1).trim() : ''
      sectionMap.set(heading, body)
    }

    const getSection = (keyword: string): string => {
      for (const [key, val] of sectionMap) {
        if (key.includes(keyword)) return val
      }
      return ''
    }

    // 现象块：解析 - 类型/- 摘要/- 严重度/- 事实 ID
    const phenomBody = getSection('确认的市场现象')
    const phenomenon = parsePhenomenon(phenomBody)

    // 归因结论块：取第一条 - 列表项作为主结论
    const attributionBody = getSection('归因结论')
    const attribution = parseAttribution(attributionBody)

    // 候选解释块：按 ### 分子项
    const candidateBody = getSection('候选解释')
    const candidates = parseCandidates(candidateBody)

    // 缺失证据块：每行一个
    const missingBody = getSection('缺失证据')
    const missingEvidence = parseBulletList(missingBody)

    // 证据索引块：[ID] source｜name｜date｜url
    const evidenceBody = getSection('证据索引')
    const evidenceIndex = parseEvidenceIndex(evidenceBody)

    // 未解问题块：每行一个
    const unresolvedBody = getSection('未解问题')
    const unresolvedQuestions = parseBulletList(unresolvedBody)

    return {
      title,
      snapshotId,
      phenomenon,
      attribution,
      candidates,
      missingEvidence,
      evidenceIndex,
      unresolvedQuestions,
    }
  } catch {
    return null
  }
}

function parsePhenomenon(body: string): ParsedTraceSections['phenomenon'] {
  const result = { type: '', summary: '', severity: '', factIds: [] as string[] }
  if (!body) return result
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    const m = line.match(/^[-·]\s*(.+?)：\s*(.+)$/)
    if (!m) continue
    const key = m[1].trim()
    const val = m[2].trim()
    if (key === '类型') result.type = val
    else if (key === '摘要') result.summary = val
    else if (key === '严重度') result.severity = val
    else if (key.includes('事实')) {
      result.factIds = val.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean)
    }
  }
  return result
}

function parseAttribution(body: string): string {
  if (!body) return ''
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  // 取第一个列表项作为主结论
  for (const line of lines) {
    const m = line.match(/^[-·]\s*(.+)$/)
    if (m) return m[1].trim()
  }
  return lines[0] || ''
}

function parseCandidates(body: string): CandidateExplanation[] {
  if (!body) return []
  // 按 ### 分块
  const blocks = body.split(/^### /m).slice(1)
  const result: CandidateExplanation[] = []
  for (const block of blocks) {
    const nlIdx = block.indexOf('\n')
    if (nlIdx < 0) continue
    const heading = block.slice(0, nlIdx).trim()
    const content = block.slice(nlIdx + 1).trim()

    // heading 格式：global_risk_liquidity（insufficient）或 name (status)
    const headingMatch = heading.match(/^(.+?)[（(]\s*([a-z_]+)\s*[）)]\s*$/)
    const name = headingMatch ? headingMatch[1].trim() : heading
    const status = (headingMatch ? headingMatch[2] : 'insufficient') as CandidateStatus
    const validStatus: CandidateStatus[] = ['supported', 'weak', 'rejected', 'insufficient']
    const safeStatus = validStatus.includes(status) ? status : 'insufficient'

    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
    let conclusion = ''
    const supportingEvidence: string[] = []
    const counterEvidence: string[] = []
    for (const line of lines) {
      const m = line.match(/^[-·]\s*(.+?)：\s*(.+)$/)
      if (!m) continue
      const key = m[1].trim()
      const val = m[2].trim()
      if (key === '结论') conclusion = val
      else if (key.includes('支持证据')) supportingEvidence.push(...val.split(/[,，、\s]+/).filter(Boolean))
      else if (key.includes('反证')) counterEvidence.push(...val.split(/[,，、\s]+/).filter(Boolean))
    }
    result.push({ name, status: safeStatus, conclusion, supportingEvidence, counterEvidence })
  }
  return result
}

function parseBulletList(body: string): string[] {
  if (!body) return []
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-·]\s*/, '').trim())
    .filter(Boolean)
}

function parseEvidenceIndex(body: string): EvidenceEntry[] {
  if (!body) return []
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  const result: EvidenceEntry[] = []
  for (const line of lines) {
    const m = line.match(/^[-·]\s*\[([^\]]+)\]\s*(.+)$/)
    if (!m) continue
    const id = m[1].trim()
    const rest = m[2].trim()
    // rest 格式：source｜name｜date｜url
    const parts = rest.split(/[｜|]/).map((p) => p.trim())
    result.push({
      id,
      source: parts[0] || '',
      name: parts[1] || '',
      date: parts[2] || '',
      url: parts[3] || '',
    })
  }
  return result
}

export function toMarketTraceViewModel(
  record: MarketTraceReviewRecord,
  requestedDate: string,
): MarketTraceViewModel | null {
  const display = record.content.display_report
  const summary = trimmedString(display?.summary)
  const details = trimmedString(display?.details)

  if (!display || record.status !== 'completed' || record.content.schema_version !== '2.0' || !summary || !details) {
    return null
  }

  return {
    reportDate: record.report_date,
    generatedAt: record.created_at || record.content.market_trace?.snapshot?.captured_at || '',
    sourceLabel: SOURCE_LABELS[record.data_source || ''] || '复盘报告',
    confidence: marketTraceConfidence(record.content.market_trace?.trace?.confidence),
    summary,
    details,
    sectors: stringList(display.sectors),
    risks: stringList(display.risks),
    isFallback: record.report_date !== requestedDate,
    parsed: parseTraceDetails(details),
  }
}

/** 候选状态中文标签 */
export function candidateStatusLabel(status: CandidateStatus): string {
  const labels: Record<CandidateStatus, string> = {
    supported: '已支持',
    weak: '弱支持',
    rejected: '已排除',
    insufficient: '证据不足',
  }
  return labels[status] || status
}

/** 严重度中文标签 */
export function severityLabel(severity: string): string {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
    critical: '极高',
  }
  return labels[severity] || severity
}
