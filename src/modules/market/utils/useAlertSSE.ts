/**
 * 异动提醒 SSE 流读取 composable
 *
 * 对接 Python 后端 GET /agent/briefing/alert?symbol=xxx&cycle=short
 * 使用浏览器原生 EventSource API
 *
 * 事件流：
 * - tool_start / tool_end：子 Agent 执行进度
 * - reasoning：AI 思考过程分片（node 恒为阶段名，按 node 聚合）
 * - preview：速览帧（先于 result 到达）
 * - llm_start：Master 开始生成
 * - result：携带解析后的 display_report + podcast_brief（结构化，不再吐原始 JSON token）
 * - done / error
 */
import { ref } from 'vue'
import { agentApi, type AlertReportRecord, type ReasoningStep } from '@/shared/api/modules/agent'

export interface AlertDisplayReport {
  summary?: string
  impact?: string
  keywords?: string[]
  details?: string
  stocks?: string[]
  risks?: string[]
}

export interface AlertSSEEvent {
  type: string
  content?: string
  label?: string
  message?: string
  /** reasoning 帧：节点名（alert_scan / alert_master）与文本分片 */
  node?: string
  chunk?: string
  display_report?: AlertDisplayReport
  podcast_brief?: string
  raw?: string
}

export interface ToolStep {
  label: string
  startTime: number
  endTime?: number
}

export interface AlertResult {
  displayReport: AlertDisplayReport
  podcastBrief: string
  raw: string
}

export function useAlertSSE() {
  const content = ref('')
  const toolSteps = ref<ToolStep[]>([])
  const loading = ref(false)
  const error = ref('')
  const done = ref(false)
  /** result 事件携带的结构化结果（done 前由后端解析后发送） */
  const result = ref<AlertResult | null>(null)
  /** AI 思考过程（按 node 聚合，与 chat 的 ReasoningStep 结构一致） */
  const reasoningSteps = ref<ReasoningStep[]>([])
  /** 速览帧（先于 result 到达，用于首屏提前渲染） */
  const preview = ref<AlertDisplayReport | null>(null)

  let eventSource: EventSource | null = null
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null

  function handleEvent(evt: AlertSSEEvent): void {
    switch (evt.type) {
      case 'tool_start': {
        const label = evt.label || '工具调用中'
        toolSteps.value = [...toolSteps.value, { label, startTime: Date.now() }]
        break
      }
      case 'tool_end': {
        const steps = [...toolSteps.value]
        const last = steps[steps.length - 1]
        if (last) { last.endTime = Date.now(); toolSteps.value = steps }
        break
      }
      case 'llm_start':
        break
      case 'reasoning': {
        const node = evt.node || ''
        const chunk = evt.chunk || ''
        if (!node || !chunk) break
        const steps = [...reasoningSteps.value]
        const idx = steps.findIndex(s => s.node === node)
        if (idx >= 0) {
          steps[idx] = { ...steps[idx], text: steps[idx].text + chunk, status: 'streaming' }
        } else {
          steps.push({ node, text: chunk, status: 'streaming', startAt: Date.now() })
        }
        reasoningSteps.value = steps
        break
      }
      case 'preview':
        preview.value = evt.display_report || null
        break
      case 'text':
        // 兜底：如果后端仍发 text 事件（如旧版兼容），累加到 content
        if (evt.content) content.value += evt.content
        break
      case 'result': {
        // 结构化结果：后端解析 display_report + podcast_brief 后发送
        result.value = {
          displayReport: evt.display_report || {},
          podcastBrief: evt.podcast_brief || '',
          raw: evt.raw || '',
        }
        break
      }
      case 'done':
        done.value = true
        loading.value = false
        reasoningSteps.value = reasoningSteps.value.map(s =>
          s.status === 'streaming' ? { ...s, status: 'done', endAt: Date.now() } : s)
        eventSource?.close()
        break
      case 'error':
        error.value = evt.message || '分析出错，请稍后重试'
        loading.value = false
        reasoningSteps.value = reasoningSteps.value.map(s =>
          s.status === 'streaming' ? { ...s, status: 'failed', endAt: Date.now() } : s)
        eventSource?.close()
        break
    }
  }

  function start(symbol: string, cycle: string = ''): void {
    content.value = ''
    toolSteps.value = []
    error.value = ''
    done.value = false
    result.value = null
    reasoningSteps.value = []
    preview.value = null
    loading.value = true

    const url = agentApi.getAlertBriefingUrl(symbol, cycle)
    eventSource = new EventSource(url)

    timeoutTimer = setTimeout(() => {
      if (!done.value && loading.value) {
        error.value = '请求超时，请稍后重试'
        loading.value = false
        eventSource?.close()
      }
    }, 120_000)

    eventSource.onmessage = (event: MessageEvent) => {
      if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
      try {
        const data: AlertSSEEvent = JSON.parse(event.data)
        handleEvent(data)
      } catch { /* JSON 解析失败忽略 */ }
    }

    eventSource.onerror = () => {
      if (done.value) return
      error.value = error.value || '连接失败，请检查网络后重试'
      loading.value = false
      eventSource?.close()
    }
  }

  function stop(): void {
    if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
    eventSource?.close()
    eventSource = null
    loading.value = false
  }

  /**
   * 从 DB 缓存加载 alert 报告（命中则直接展示，未命中返回 false 触发 SSE）
   * 缓存策略：当日有效，同股票同日不重复分析
   */
  async function loadFromCache(symbol: string, date: string): Promise<boolean> {
    try {
      const record = await agentApi.getAlertReport(symbol, date)
      if (record && record.content) {
        const c = record.content
        result.value = {
          displayReport: c.display_report || {},
          podcastBrief: c.podcast_brief || '',
          raw: '',
        }
        done.value = true
        loading.value = false
        return true
      }
    } catch {
      // 缓存查询失败静默处理，继续走 SSE
    }
    return false
  }

  return { content, toolSteps, reasoningSteps, preview, loading, error, done, result, start, stop, loadFromCache }
}
