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

export interface MiddayDisplayReport {
  summary: string
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
  return {
    report_date: report.report_date as string,
    content: {
      display_report: {
        summary,
        details,
        risks: isStringList(displayBody.risks) ? displayBody.risks : [],
      },
      podcast_brief: isNonEmptyString(contentBody.podcast_brief) ? contentBody.podcast_brief : '',
      schema_version: typeof contentBody.schema_version === 'string' ? contentBody.schema_version : '',
      audio_path: isNonEmptyString(audioPath) ? audioPath : null,
    },
  }
}
