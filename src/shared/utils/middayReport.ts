/**
 * 午间报（盘中报）报告严格解析器（方案 A 契约，2026-08-24）
 *
 * 后端链路：midday.py 生成双层报告（report_type="midday"）落库 →
 * midday_broadcast.py 12:15 生成 host+analyst 双人对话 →
 * app-api /internal/midday/generate-audio 合成 MP3 并把 audio_path 回填到
 * 同一份 midday 报告 content.audio_path（不产独立广播型报告）。
 * 前端经 GET /api/agent/report/midday/:date 读取。
 *
 * 仅消费绑定指定日期的双层报告（防跨日期数据混入）；audio_path 为可选字段，
 * 无音频时报告仍有效（前端只展示文字、隐藏音频条）。
 */

export interface MiddaySection {
  title: string
  conclusion: string
  /**
   * schema 2.1：午后前瞻的机会提示短词（4-5 个、每个 ≤8 字）；老数据无此字段。
   * 注意：该键存在但为空数组 = 新格式下 LLM 未给出明确机会（合法输出如 [" "] 归一后为空），
   * 渲染侧据此保留午后前瞻卡并隐藏机会栏（与 risks 双空才整块隐藏）。
   */
  opportunities?: string[]
}

export interface MiddayDisplayReport {
  summary: string
  sections: MiddaySection[]
  details: string
  risks: string[]
}

export interface MiddayReport {
  report_date: string
  content: {
    display_report: MiddayDisplayReport
    podcast_brief: string
    schema_version: string
    audio_path: string | null
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** LLM 输出防御：trim、去空、最多取前 5 个、单项 ≤8 字截断（schema 2.1 opportunities）。 */
function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const result: string[] = []
  for (const item of value) {
    if (result.length >= 5) break
    const text = typeof item === 'string' ? item.trim() : ''
    if (!text) continue
    result.push(text.slice(0, 8))
  }
  return result
}

/**
 * 归一化多分段摘要 sections：保留含非空 conclusion，或带 opportunities 键（含空数组）的项。
 * 键存在性（hasOwnProperty）而非数组长度判定：新格式「午后前瞻」即使无明确机会（opportunities: [] /
 * [" "] 归空）也带键 → 视为午后前瞻对位数据保留；老数据无该键 → 仍需 conclusion 非空才保留（行为不回退）。
 */
function normalizeSections(value: unknown): MiddaySection[] {
  if (!Array.isArray(value)) return []
  const result: MiddaySection[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const body = item as Record<string, unknown>
    const conclusion = typeof body.conclusion === 'string' ? body.conclusion.trim() : ''
    // 新格式键存在（可空）即保留该分段；老数据无键时维持「conclusion 非空才保留」旧语义
    const hasOppKey = Object.prototype.hasOwnProperty.call(body, 'opportunities')
    if (!conclusion && !hasOppKey) continue
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : ''
    result.push({
      title,
      conclusion,
      // 有键即始终写出 opportunities（可为空数组），保证渲染侧能区分「键存在但空」与「老数据无键」
      ...(hasOppKey ? { opportunities: normalizeKeywords(body.opportunities) } : {}),
    })
  }
  return result
}

/** 清理 markdown 符号，提取纯文本要点行（去标题/列表/粗体/代码标记）。 */
function cleanMarkdownLine(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, '') // 去标题符号
    .replace(/^[-*+]\s*/, '') // 去无序列表符号
    .replace(/^\d+[.、]\s*/, '') // 去有序列表符号
    .replace(/\*\*(.+?)\*\*/g, '$1') // 去粗体
    .replace(/`(.+?)`/g, '$1') // 去行内代码
    .trim()
}

/**
 * 从 details markdown 提取「第N部分：标题」分段摘要。
 * 后端 display_report 只返回 details（如「## 第1部分：上午盘面回顾\n- 要点...」），
 * 不返回结构化 sections 字段；前端在此解析兜底，保证盘中要点始终可展示。
 * 标题取「第N部分：」后的主题（如「上午盘面回顾」）；结论为该部分全部要点合并。
 */
function parseSectionsFromDetails(details: string): MiddaySection[] {
  if (!details) return []
  const lines = details.split('\n')
  const sections: MiddaySection[] = []
  let currentTitle = ''
  const currentLines: string[] = []
  // 部分标题：## 第1部分：上午盘面回顾（容忍 1-4 级标题与全/半角冒号）
  const partHeadingRe = /^#{1,4}\s*第\s*\d+\s*部分[：:]\s*(.+)$/
  const flush = () => {
    if (!currentTitle) return
    const conclusion = currentLines
      .map(cleanMarkdownLine)
      .filter((l) => l.length > 0)
      .join('；')
    if (conclusion) sections.push({ title: currentTitle, conclusion })
    currentLines.length = 0
  }
  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const matched = trimmed.match(partHeadingRe)
    if (matched) {
      flush()
      currentTitle = matched[1].trim()
      continue
    }
    if (!currentTitle) continue
    // 仅收集要点行（- / * / 1. 列表项），子标题（###/####）不混入结论
    if (/^[-*+]\s+/.test(trimmed) || /^\d+[.、]\s+/.test(trimmed)) {
      currentLines.push(trimmed)
    }
  }
  flush()
  return sections
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** 音频路径仅接受绑定当日午报的格式（防跨日期混播）；undefined/null 视为"未生成音频"。 */
function isMiddayAudioPath(value: unknown, expectedDate: string): value is string | null {
  return value === undefined || value === null
    || value === `/api/agent/audio/midday-${expectedDate}.mp3`
}

/** 仅消费绑定指定日期、双层结构的 midday 报告；无音频（audio_path 缺失/null）仍返回报告用于文字展示。 */
export function parseMiddayReport(content: unknown, expectedDate: string): MiddayReport | null {
  if (!isCalendarDate(expectedDate) || !content || typeof content !== 'object') return null
  // request 拦截器在 data 为 null 时返回整个信封 { code, data: null }，视作无报告
  if ('code' in content) return null
  const report = content as Record<string, unknown>
  if (report.report_date !== expectedDate) return null
  const inner = report.content
  if (!inner || typeof inner !== 'object') return null
  const contentBody = inner as Record<string, unknown>
  const display = contentBody.display_report
  if (!display || typeof display !== 'object') return null
  const displayBody = display as Record<string, unknown>
  const summary = typeof displayBody.summary === 'string' ? displayBody.summary : ''
  const details = typeof displayBody.details === 'string' ? displayBody.details : ''
  if (!summary.trim() && !details.trim()) return null
  const audioPath = contentBody.audio_path
  if (!isMiddayAudioPath(audioPath, expectedDate)) return null
  // 后端可能不返回 sections 字段（只给 details）→ 从 details 的「第N部分」结构解析兜底
  const sections = normalizeSections(displayBody.sections)
  return {
    report_date: report.report_date as string,
    content: {
      display_report: {
        summary,
        sections: sections.length ? sections : parseSectionsFromDetails(details),
        details,
        risks: isStringList(displayBody.risks) ? displayBody.risks : [],
      },
      podcast_brief: isNonEmptyString(contentBody.podcast_brief) ? contentBody.podcast_brief : '',
      schema_version: typeof contentBody.schema_version === 'string' ? contentBody.schema_version : '',
      audio_path: isNonEmptyString(audioPath) ? audioPath : null,
    },
  }
}
