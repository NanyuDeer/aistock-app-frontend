export type BriefingType = 'morning' | 'review'

export interface BriefingReport {
  summary: string
  details: string
  stocks: string[]
  sectors: string[]
  risks: string[]
  podcast_brief: string
  schema_version: string
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function parseBriefingReport(content: unknown, type: BriefingType): BriefingReport | null {
  if (!content || typeof content !== 'object') return null
  const record = content as Record<string, unknown>
  const display = record.display_report
  if (display && typeof display === 'object') {
    const value = display as Record<string, unknown>
    return {
      summary: typeof value.summary === 'string' ? value.summary : '',
      details: typeof value.details === 'string' ? value.details : '',
      stocks: stringList(value.stocks), sectors: stringList(value.sectors),
      risks: stringList(value.risks),
      podcast_brief: typeof record.podcast_brief === 'string' ? record.podcast_brief : '',
      schema_version: typeof record.schema_version === 'string' ? record.schema_version : '2.0',
    }
  }
  const text = typeof record.text === 'string' ? record.text : ''
  if (!text) return null
  return {
    summary: type === 'review' ? extractReviewSummary(text) : '',
    details: text, stocks: [], sectors: type === 'review' ? extractReviewSectors(text) : [],
    risks: [], podcast_brief: '', schema_version: '1.0',
  }
}

const STEP_FOUR_HEADER_RE = /^##\s*步骤\s*4[^\n]*\n?/m
const STEP_FIVE_HEADER_RE = /^##\s*步骤\s*5[^\n]*$/m
const APPENDIX_B_HEADER_RE = /^#{2,3}\s*附录\s*B[^\n]*\n?/m
const NEXT_APPENDIX_HEADER_RE = /^#{2,3}\s*附录\s*[A-Z][^\n]*$/m

function firstEffectiveLine(markdown: string): string {
  for (const line of markdown.split('\n')) {
    const value = line.trim().replace(/^[-#>\s]+/, '').replace(/\*\*/g, '')
    if (value && !value.startsWith('|')) return value
  }
  return ''
}

function extractReviewSummary(markdown: string): string {
  const header = STEP_FOUR_HEADER_RE.exec(markdown)
  if (!header || header.index === undefined) return ''
  const body = markdown.slice(header.index + header[0].length)
    .split(STEP_FIVE_HEADER_RE, 1)[0]
  return firstEffectiveLine(body)
}

function extractReviewSectors(markdown: string): string[] {
  const header = APPENDIX_B_HEADER_RE.exec(markdown)
  if (!header || header.index === undefined) return []
  const body = markdown.slice(header.index + header[0].length)
    .split(NEXT_APPENDIX_HEADER_RE, 1)[0]
  const sectors = body.split('\n').flatMap((line) => {
    if (!line.trim().startsWith('|')) return []
    const value = line.trim().replace(/^\||\|$/g, '').split('|')[0].trim()
    return value && value !== '板块名称' && !/^[-:\s]+$/.test(value) ? [value] : []
  })
  return [...new Set(sectors)]
}
