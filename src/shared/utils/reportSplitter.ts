import { markdownToHtml } from './markdown'

/** 重组后的报告区块 */
export interface ReportBlocks {
  title: string
  disclaimer: string
  speedLook: string
  coreConclusion: string
  detailAnalysis: string
  exclusionNote: string
  anomalySignal: string
  eventTracking: string
}

const STEP_SPLITTER = /\n(?=## 步骤\d)/g
const APPENDIX_SPLITTER = /\n(?=### 附录[A-E])/g

/** 去除步骤/附录标题行，保留正文内容 */
function stripSectionHeader(text: string): string {
  return text
    .replace(/^## 步骤\d[^\n]*\n/gm, '')
    .replace(/^### 附录[A-E][^\n]*\n/gm, '')
    .replace(/^## 步骤5：标准化行情事实附录\s*\n/gm, '')
    .trim()
}

/** 内联清洗残余机器标记 */
function sanitize(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 提取某一类附录内容（如 附录D：异常信号），同时去标题 */
function extractAppendix(appendixes: string[], label: string): string {
  const idx = appendixes.findIndex(a => a.includes(label))
  if (idx < 0) return ''
  return stripSectionHeader(sanitize(appendixes[idx]))
}

/** 分割 + 重组 + HTML 化复盘报告 */
export function splitReviewReport(md: string): ReportBlocks {
  const cleaned = sanitize(md)

  const globalParts = cleaned.split(STEP_SPLITTER)
  const titleBlock = globalParts[0]
  const steps = globalParts.slice(1)

  const titleMatch = titleBlock.match(/^# (.+)$/m)
  const title = titleMatch ? titleMatch[1] : ''

  const disclaimerMatch = titleBlock.match(/^> \*\*[\s\S]*?(?=\n\n|$)/m)
  const disclaimer = disclaimerMatch ? disclaimerMatch[0] : ''

  let step1 = ''
  let step2 = ''
  let step3 = ''
  let step4 = ''
  let step5 = ''

  for (const s of steps) {
    if (s.startsWith('## 步骤1')) step1 = s
    else if (s.startsWith('## 步骤2')) step2 = s
    else if (s.startsWith('## 步骤3')) step3 = s
    else if (s.startsWith('## 步骤4')) step4 = s
    else if (s.startsWith('## 步骤5')) step5 = s
  }

  const appendixes = step5 ? step5.split(APPENDIX_SPLITTER) : []

  const appendixA = extractAppendix(appendixes, '附录A')
  const appendixB = extractAppendix(appendixes, '附录B')
  const appendixC = extractAppendix(appendixes, '附录C')
  const appendixD = extractAppendix(appendixes, '附录D')

  const exclusionNote = (() => {
    if (!step3) return ''
    const lines = step3.split('\n').filter(l => l.trim() && !l.startsWith('## ') && !l.startsWith('|'))
    return sanitize(lines.slice(2).join('\n'))
  })()

  return {
    title,
    disclaimer: sanitize(disclaimer),
    speedLook: toSectionHtml([appendixA, appendixB].filter(Boolean).join('\n\n')),
    coreConclusion: toSectionHtml(stripSectionHeader(step4)),
    detailAnalysis: toSectionHtml(stripSectionHeader([step1, step2].filter(Boolean).join('\n\n'))),
    exclusionNote: exclusionNote ? `<p class="section-exclusion">⚠️ <strong>排除噪音：</strong>${exclusionNote}</p>` : '',
    anomalySignal: toSectionHtml(appendixD),
    eventTracking: toSectionHtml(appendixC),
  }
}

/** 将 Markdown 片段转为 HTML（含 section wrapper） */
export function toSectionHtml(md: string): string {
  if (!md) return ''
  const html = markdownToHtml(md)
  return `<div class="report-section">${html}</div>`
}
