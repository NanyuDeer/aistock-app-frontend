/**
 * 异动提醒 SSE 流读取 composable
 *
 * 对接 Python 后端 GET /agent/briefing/alert?symbol=xxx&cycle=short
 * 使用浏览器原生 EventSource API
 */
import { ref } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'

export interface AlertSSEEvent {
  type: string
  content?: string
  label?: string
  message?: string
}

export interface ToolStep {
  label: string
  startTime: number
  endTime?: number
}

export function useAlertSSE() {
  const content = ref('')
  const toolSteps = ref<ToolStep[]>([])
  const loading = ref(false)
  const error = ref('')
  const done = ref(false)

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
      case 'text':
        if (evt.content) content.value += evt.content
        break
      case 'done':
        done.value = true
        loading.value = false
        eventSource?.close()
        break
      case 'error':
        error.value = evt.message || '分析出错，请稍后重试'
        loading.value = false
        eventSource?.close()
        break
    }
  }

  function start(symbol: string, cycle: string = ''): void {
    content.value = ''
    toolSteps.value = []
    error.value = ''
    done.value = false
    loading.value = true

    const url = agentApi.getAlertBriefingUrl(symbol, cycle)
    eventSource = new EventSource(url)

    timeoutTimer = setTimeout(() => {
      if (!done.value && loading.value) {
        error.value = '请求超时，请稍后重试'
        loading.value = false
        eventSource?.close()
      }
    }, 30_000)

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

  return { content, toolSteps, loading, error, done, start, stop }
}
