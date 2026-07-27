/**
 * 市场复盘问答 composable - HTTP 非流式
 *
 * 功能：
 *   - 通过 Node 代理调用 Python /api/agent/market-trace-qa/message
 *   - 会话历史保留在前端本地（不使用 chatStore）
 *   - 返回 trace 证据元数据，用于展示证据区域
 *   - 成功分支做运行时标准化：任何不可用 trace 都变成完整 degraded trace
 *   - 错误时添加降级 AI 消息（trace.degraded = true）
 */
import { ref, type Ref } from 'vue'
import { agentApi, type ChatMessage, type MarketTraceQaTrace } from '@/shared/api/modules/agent'
import { shanghaiDateString } from '@/shared/utils/tradingTime'

export type { MarketTraceQaTrace }

/**
 * 运行时标准化 trace：确保返回的 trace 对象字段完整。
 *
 * 处理 HTTP 200 但 trace 缺失、null 或字段残缺的情况：
 * - trace 为 null/undefined/非对象 → 完整 degraded trace
 * - trace 缺少 artifact_id 或 as_of → 标记 degraded
 * - 字段类型不匹配 → 填充安全默认值
 *
 * 这确保证据区域永远不会被静默隐藏，用户始终能看到明确的降级原因。
 */
export function normalizeTrace(raw: unknown): MarketTraceQaTrace {
  // trace 为 null/undefined/非对象 → 完整降级 trace
  if (!raw || typeof raw !== 'object') {
    return {
      artifact_id: '',
      sources: [],
      as_of: '',
      confidence: 'low',
      uncertainty: [],
      degraded: true,
      degraded_reason: '服务端未返回 trace 元数据',
    }
  }

  const trace = raw as Partial<MarketTraceQaTrace>

  // 逐字段安全提取，类型不匹配时使用默认值
  const artifactId = typeof trace.artifact_id === 'string' ? trace.artifact_id : ''
  const sources = Array.isArray(trace.sources) ? trace.sources : []
  const asOf = typeof trace.as_of === 'string' ? trace.as_of : ''
  const confidence: MarketTraceQaTrace['confidence'] =
    trace.confidence === 'high' || trace.confidence === 'medium' || trace.confidence === 'low'
      ? trace.confidence
      : 'low'
  const uncertainty = Array.isArray(trace.uncertainty) ? trace.uncertainty : []
  const degradedReason =
    typeof trace.degraded_reason === 'string' ? trace.degraded_reason : null

  // 来源数组可以合法为空，但工件标识和截至时间是证据可验证性的必需元数据。
  const missingRequiredMetadata = !artifactId || !asOf
  const degraded = trace.degraded === true || missingRequiredMetadata

  // 降级时必须有明确原因
  const finalDegradedReason = degraded
    ? (degradedReason || (missingRequiredMetadata
        ? 'trace 缺少工件标识或截至时间，证据不可用'
        : '数据降级'))
    : null

  return {
    artifact_id: artifactId,
    sources,
    as_of: asOf,
    confidence,
    uncertainty,
    degraded,
    degraded_reason: finalDegradedReason,
  }
}

function isCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function resolveReportDate(value: string | undefined): string {
  return isCalendarDate(value) ? value : shanghaiDateString()
}

export function useMarketTraceQa(initialReportDate?: string) {
  const messages: Ref<ChatMessage[]> = ref([])
  const loading = ref(false)
  const sessionId = ref('')
  const reportDate = ref(resolveReportDate(initialReportDate))

  async function send(content: string) {
    // Add user message
    messages.value.push({
      role: 'user',
      content,
      timestamp: Date.now(),
    })

    loading.value = true

    if (!sessionId.value) {
      sessionId.value = `mtqa_${Date.now()}`
    }

    try {
      const res = await agentApi.sendMarketTraceQaMessage(content, reportDate.value, sessionId.value)
      sessionId.value = res.session_id
      messages.value.push({
        role: 'assistant',
        content: res.content,
        // 运行时标准化：HTTP 200 但 trace 缺失/残缺时也生成完整 degraded trace
        trace: normalizeTrace(res.trace),
        timestamp: Date.now(),
      })
    } catch (e: unknown) {
      const errMsg = (e as Record<string, unknown>)?.errMsg || (e as Error)?.message || '请求失败'
      messages.value.push({
        role: 'assistant',
        content: `请求失败：${errMsg}`,
        trace: {
          artifact_id: '',
          sources: [],
          as_of: '',
          confidence: 'low',
          uncertainty: [],
          degraded: true,
          degraded_reason: '网络请求失败',
        },
        timestamp: Date.now(),
      })
    } finally {
      loading.value = false
    }
  }

  function clearHistory() {
    messages.value = []
    sessionId.value = ''
  }

  function setReportDate(value: string | undefined) {
    reportDate.value = resolveReportDate(value)
  }

  return { messages, loading, sessionId, reportDate, send, clearHistory, setReportDate }
}
