/**
 * 完整洞察报告流式读取（2026-09-25 替代原 PDF 下载；2026-09-26 blocks 化 + 双通道）。
 *
 * 两条通道（同一份代码编多端，按**运行时能力**择一，不用条件编译——`#ifdef` 在 vitest 下不裁剪，
 * 会让两条分支同时执行、无法测）：
 * - `fetch`   ：H5。`fetch + ReadableStream` 能带 `Authorization` 头（`EventSource` 不能），
 *               且能直接读 HTTP 状态码；但部分 App WebView 的 fetch 不支持 body 流。
 * - `chunked` ：App 端 / 小程序。`uni.request({ enableChunked: true })` + `onChunkReceived`
 *               逐块回调（项目记忆：WebView 可能不支持 `ReadableStream`，故 App 端不能指望 fetch）。
 *               `uni.request` 可设 header，因此同样没有 `EventSource` 的鉴权限制。
 *
 * 通道取舍与回退：优先 `fetch`；探测到没有 `ReadableStream`/`fetch` 直接走 `chunked`；
 * 若 `fetch` 拿到响应却没有可读流（WebView 常见），再回退 `chunked` 重试一次。
 *
 * 协议：成功时 app-api 逐条写 `data: {"type":"start|section|done|error", ...}\n\n`；
 * `section` 帧携带 `blocks`（判别联合，见 ReportBlock）。两条通道都把字节喂给同一个
 * `createReportStreamDecoder`（UTF-8 跨块、半帧缓存、分帧在此统一处理）。
 */
import { ref } from 'vue'
import { API_BASE_URL } from '@/shared/utils/constants'

/** 键值对（事件事实）；`tone` 供涨跌着色 */
export interface ReportKvItem {
  label: string
  value: string
  tone?: 'up' | 'down' | null
}

/** 六阶段因果链节点；`*Key` 为机器 key，供中性弱化判定（不对中文标签做字符串匹配） */
export interface ReportChainStage {
  stage: string
  stageKey: string
  claim: string
  epistemic: string
  epistemicKey: string
  status: string
  statusKey: string
  evidenceIds: string[]
  evidenceCount: number
}

/** 报告内容块（判别联合，`type` 区分；与 app-api `InsightReportService.ts` 契约逐字段一致） */
export type ReportBlock =
  | { type: 'kv'; items: ReportKvItem[] }
  | { type: 'verdict'; text: string; badges: Array<{ label: string; value: string }> }
  | { type: 'candidates'; items: Array<{ layer: string; status: string; statusKey: string; verdict: string; evidenceIds: string[] }> }
  | { type: 'chain'; stages: ReportChainStage[] }
  | {
      type: 'evidence'
      items: Array<{ sourceId: string; provider: string; kind: string; occurredAt: string; level: string; title: string; excerpt: string }>
    }
  | { type: 'list'; items: string[] }

/** 报告章节；`blocks` 为空数组表示该节无数据（渲染"暂缺"） */
export interface ReportSection {
  heading: string
  blocks: ReportBlock[]
}

/** 报告流地址（不走 request 拦截器；鉴权头由本 composable 注入） */
export function buildInsightReportStreamUrl(eventId: string): string {
  const base = API_BASE_URL.replace(/\/$/, '')
  return `${base}/cn/favorites/movements/${encodeURIComponent(eventId)}/report/stream`
}

/** 整体超时（含等待首帧） */
const REQUEST_TIMEOUT_MS = 60_000

/** 报告流通道 */
export type ReportStreamChannel = 'fetch' | 'chunked'

/**
 * 通道选择（运行时能力探测）：
 * 有 `fetch` + `ReadableStream` → `fetch`（H5，及支持 body 流的新版基座）；
 * 否则 → `chunked`（App 端 WebView 常无 `ReadableStream`；小程序无 `fetch`）。
 */
export function pickReportStreamChannel(): ReportStreamChannel {
  return typeof fetch === 'function' && typeof ReadableStream === 'function'
    ? 'fetch'
    : 'chunked'
}

/** `data: {...}\n\n` 分帧解码器（两条通道共用） */
export interface ReportStreamDecoder {
  /** 已收到 done / error 帧（调用方应停止读取） */
  readonly finished: boolean
  /** 累计原始文本（非 200 时用于解析 JSON 的 message） */
  readonly rawText: string
  /** 喂入一段字节或文本；返回 true 表示流已结束 */
  feed(chunk: ArrayBuffer | Uint8Array | string): boolean
}

/**
 * 创建分帧解码器。**跨块 UTF-8 与半帧都在这处理**，两条通道因此不必各自实现：
 * - `TextDecoder({ stream: true })`：多字节字符被切在块边界时不会解码成乱码；
 * - `buffer`：缓存未收完整的帧，等下一块拼齐再解析；
 * - 单帧 JSON 非法只跳过该帧，不中断整体阅读。
 */
export function createReportStreamDecoder(
  handle: (evt: Record<string, unknown>) => boolean,
): ReportStreamDecoder {
  const textDecoder = new TextDecoder()
  let buffer = ''
  let raw = ''
  let finished = false

  function feed(chunk: ArrayBuffer | Uint8Array | string): boolean {
    if (finished) return true
    let text: string
    if (typeof chunk === 'string') {
      text = chunk
    } else {
      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
      text = textDecoder.decode(bytes, { stream: true })
    }
    buffer += text
    raw += text

    let sep = buffer.indexOf('\n\n')
    while (sep >= 0) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const dataLine = frame.split('\n').find((line) => line.startsWith('data: '))
      if (dataLine) {
        try {
          finished = handle(JSON.parse(dataLine.slice(6)) as Record<string, unknown>)
        } catch { /* 单帧解析失败忽略，不中断整体阅读 */ }
      }
      if (finished) break
      sep = buffer.indexOf('\n\n')
    }
    return finished
  }

  return {
    get finished() { return finished },
    get rawText() { return raw },
    feed,
  }
}

/** 当前基座拿不到可读流/分块能力 → 触发另一条通道或直接提示 */
class ReportStreamUnsupportedError extends Error {}

/** uni.request 分块传输所需的最小类型（`enableChunked` / `onChunkReceived` 未在 RequestOptions 中完整声明） */
interface ChunkedRequestTask {
  abort: () => void
  onChunkReceived?: (cb: (res: { data: ArrayBuffer | Uint8Array }) => void) => void
}

/** 通道 A：fetch + ReadableStream。返回 HTTP 状态码；无可读流时抛 ReportStreamUnsupportedError。 */
async function readReportViaFetch(
  url: string,
  token: string,
  decoder: ReportStreamDecoder,
  setCancel: (cancel: () => void) => void,
): Promise<number> {
  const controller = new AbortController()
  setCancel(() => { controller.abort() })
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: controller.signal,
  })
  if (!res.body) throw new ReportStreamUnsupportedError('当前环境不支持流式读取')
  const reader = res.body.getReader()
  while (!decoder.finished) {
    const chunk = await reader.read()
    if (chunk.done) break
    decoder.feed(chunk.value)
  }
  return res.status
}

/**
 * 通道 B：`uni.request` 分块传输（App 端 / 小程序）。返回 HTTP 状态码。
 * 前置校验失败时服务端回的是普通 JSON（非 SSE），会被 decoder 累计进 `rawText` 供调用方取 message。
 */
export function readReportViaChunked(
  url: string,
  token: string,
  decoder: ReportStreamDecoder,
  setCancel: (cancel: () => void) => void,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const options = {
      url,
      method: 'GET',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      // App 端 / 小程序：服务端分块下发，逐块经 onChunkReceived 回调（H5 不支持该选项，也不走本通道）
      enableChunked: true,
      success: (res: { statusCode: number }): void => { resolve(res.statusCode) },
      fail: (err: unknown): void => { reject(err) },
    }
    const task = uni.request(options as unknown as UniApp.RequestOptions) as unknown as ChunkedRequestTask
    setCancel(() => { task.abort() })
    if (typeof task.onChunkReceived !== 'function') {
      // 老基座没有分块能力（enableChunked 被忽略）→ 明确报"不支持"，不静默等到超时
      task.abort()
      reject(new ReportStreamUnsupportedError('当前环境不支持流式读取'))
      return
    }
    task.onChunkReceived((res) => { decoder.feed(res.data) })
  })
}

/** 从原始文本里取后端 JSON 的 message（非 200 时的错误提示） */
function parseStreamMessage(raw: string): string | null {
  try {
    const payload = JSON.parse(raw) as { message?: string } | null
    return payload?.message ?? null
  } catch {
    return null
  }
}

/** 主动 stop()/超时导致的取消（不应覆盖已有提示）。fetch 抛 AbortError，uni.request 回 errMsg 含 abort */
function isAbortError(err: unknown): boolean {
  const detail = err as { name?: string; errMsg?: string } | null
  return detail?.name === 'AbortError' || String(detail?.errMsg ?? '').toLowerCase().includes('abort')
}

export function useInsightReportSSE() {
  const header = ref('')
  const sections = ref<ReportSection[]>([])
  const loading = ref(false)
  const done = ref(false)
  const error = ref('')

  /** 当前在途请求的取消函数（由所选通道注册：fetch → AbortController.abort；chunked → requestTask.abort） */
  let cancelStream: (() => void) | null = null
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null
  /** stop() 后到达的响应不应再改写界面状态（否则用户点了"停止"却看到错误提示） */
  let active = false

  function clearTimer(): void {
    if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
  }

  /** 处理单条 data 事件；返回 true 表示流已结束（done / error） */
  function handleEvent(evt: Record<string, unknown>): boolean {
    switch (evt.type) {
      case 'start':
        header.value = String(evt.header ?? '')
        break
      case 'section':
        sections.value = [...sections.value, {
          heading: String(evt.heading ?? ''),
          // 边界归一化：上游缺 blocks 时给空数组，交由渲染层显示"暂缺"
          blocks: Array.isArray(evt.blocks) ? (evt.blocks as ReportBlock[]) : [],
        }]
        break
      case 'done':
        done.value = true
        return true
      case 'error':
        error.value = String(evt.message ?? '报告生成失败，请重试')
        return true
    }
    return false
  }

  async function start(eventId: string): Promise<void> {
    stop()
    active = true
    header.value = ''
    sections.value = []
    error.value = ''
    done.value = false
    loading.value = true

    timeoutTimer = setTimeout(() => {
      error.value = '请求超时，请稍后重试'
      cancelStream?.()
    }, REQUEST_TIMEOUT_MS)

    const url = buildInsightReportStreamUrl(eventId)
    const token = String(uni.getStorageSync('token') || '')
    const decoder = createReportStreamDecoder(handleEvent)
    const registerCancel = (cancel: () => void): void => { cancelStream = cancel }

    try {
      let status: number
      if (pickReportStreamChannel() === 'fetch') {
        try {
          status = await readReportViaFetch(url, token, decoder, registerCancel)
        } catch (err) {
          if (!(err instanceof ReportStreamUnsupportedError)) throw err
          // 响应到达但拿不到可读流（部分 App WebView 的 fetch）→ 回退 uni.request 分块通道重试一次
          status = await readReportViaChunked(url, token, decoder, registerCancel)
        }
      } else {
        status = await readReportViaChunked(url, token, decoder, registerCancel)
      }

      // 已 stop()：迟到的响应不再改写界面（否则用户点了"停止"却看到错误提示）
      if (!active) return

      if (status !== 200) {
        // 前置校验失败：真实状态码 + JSON（message 已可直接展示）
        error.value = parseStreamMessage(decoder.rawText) ?? '报告生成失败，请重试'
        return
      }
      // 后端未发 done 事件即收流时也算完成，避免界面永久停在"生成中"
      if (!decoder.finished) done.value = true
    } catch (err) {
      // 主动 stop()/超时导致的 abort 不覆盖已有提示
      if (isAbortError(err)) return
      if (active && !error.value) {
        error.value = err instanceof ReportStreamUnsupportedError
          ? err.message
          : '连接失败，请检查网络后重试'
      }
    } finally {
      clearTimer()
      cancelStream = null
      loading.value = false
    }
  }

  function stop(): void {
    active = false
    clearTimer()
    cancelStream?.()
    cancelStream = null
    loading.value = false
  }

  return { header, sections, loading, done, error, start, stop }
}
