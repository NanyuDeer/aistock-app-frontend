/**
 * 语音容错输入侧（Phase 4-2 Task 2，v1）
 *
 * 平台分流（调研结论见 task-2-brief.md）：
 * - H5：Web Speech API（SpeechRecognition/webkitSpeechRecognition），仅 Chrome/Edge(Chromium)
 *   支持；Firefox/Safari 降级「语音输入仅支持 Chrome 浏览器」（不阻塞文本输入）。
 *   必须在用户手势回调内同步调用 start()（页面 tap 处理器直接调用 startSpeechRecognition）。
 * - MP-WEIXIN：微信同声传译插件（WechatSI，AppID wx069ba97219f66d99），
 *   plugin.getRecordRecognitionManager() → start({lang:'zh_CN'}) / stop()，onStop 取 res.result。
 *   插件未配置（manifest/后台）时 requirePlugin 不可用 → 降级错误态，不崩溃。
 *   ⚠️ 本任务不修改 manifest.json 插件声明（部署待办，见报告）。
 * - APP-PLUS：v1 无内置 ASR，降级「当前版本暂不支持语音输入」（后续后端 ASR/原生模块接入）。
 *
 * 结构说明：
 * - 公共 API 为薄壳（uni 条件编译 #ifdef 平台分发）；
 * - 纯逻辑核心 h5Recognize/mpRecognize/appRecognize 使用依赖注入（工厂参数），
 *   供单测替换平台全局（speechInput.spec.ts），禁止在生产代码中使用 any。
 * - 状态机：idle → recording →（recognizing）→ idle（成功）| error（失败）。
 *   页面用自己的 isListening ref 做 UI 镜像，模块状态作为契约（可被后续页面直接消费）。
 *
 * 不含 TTS。不触碰 WS/useChatStream（Task 3/4 范围）。
 */
import { shallowRef } from 'vue'

export type SpeechRecognitionState = 'idle' | 'recording' | 'recognizing' | 'error'

export type SpeechRecognitionResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

/** 模块级识别状态（核心函数驱动；页面可读作录制/识别中指示） */
export const speechRecognitionState = shallowRef<SpeechRecognitionState>('idle')

const H5_UNSUPPORTED_HINT = '语音输入仅支持 Chrome 浏览器'
const MP_UNAVAILABLE_HINT = '语音输入暂不可用'
const APP_UNSUPPORTED_HINT = '当前版本暂不支持语音输入'
const EMPTY_TRANSCRIPT_HINT = '未识别到语音'

/** 进行中的识别会话的停止回调（stopSpeechRecognition 触发；onend/onerror/onStop 后清空） */
let activeStop: (() => void) | null = null

function setState(next: SpeechRecognitionState): void {
  speechRecognitionState.value = next
}

// ===== H5：Web Speech API 核心（依赖注入） =====

export interface H5SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

export interface H5SpeechRecognitionErrorEvent {
  error: string
}

/** Web Speech API 识别实例的最小接口（Chrome/Edge 实现形态，避免依赖 lib.dom 类型） */
export interface H5SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: H5SpeechRecognitionResultEvent) => void) | null
  onerror: ((event: H5SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

export interface H5SpeechDeps {
  /** 平台识别实例（H5 壳层注入 new (window.SpeechRecognition||webkit)()），不支持时返回 null */
  getSpeechRecognition(): H5SpeechRecognitionLike | null
}

/** H5 单次识别（@internal 测试钩子：依赖注入；公共入口见 startSpeechRecognition） */
export function h5Recognize(deps: H5SpeechDeps): Promise<SpeechRecognitionResult> {
  const recognition = deps.getSpeechRecognition()
  if (!recognition) {
    setState('error')
    return Promise.resolve({ ok: false, error: H5_UNSUPPORTED_HINT })
  }
  setState('recording')
  return new Promise((resolve) => {
    let transcript = ''
    recognition.lang = 'zh-CN'
    // 单次识别：最终文本由 onresult 一次性给出，onend 后结算
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event) => {
      // interimResults=false 时首个结果即最终文本
      const first = event.results[0]
      if (first && first[0]) transcript = first[0].transcript
      setState('recognizing')
    }
    recognition.onerror = (event) => {
      // no-speech（静音/未开口）降级为「未识别到语音」，其余透出平台错误信息
      activeStop = null
      const error = event.error === 'no-speech' ? EMPTY_TRANSCRIPT_HINT : `语音识别失败（${event.error}）`
      setState('error')
      resolve({ ok: false, error })
    }
    recognition.onend = () => {
      activeStop = null
      const text = transcript.trim()
      if (!text) {
        setState('error')
        resolve({ ok: false, error: EMPTY_TRANSCRIPT_HINT })
        return
      }
      setState('idle')
      resolve({ ok: true, text })
    }
    activeStop = () => recognition.stop()
    try {
      // 必须在用户手势同步阶段调用（页面 tap 回调 → startSpeechRecognition → 此处同步执行）
      recognition.start()
    } catch {
      activeStop = null
      setState('error')
      resolve({ ok: false, error: H5_UNSUPPORTED_HINT })
    }
  })
}

// ===== MP-WEIXIN：WechatSI 插件核心（依赖注入） =====

/** 微信同声传译识别管理器的最小接口（plugin.getRecordRecognitionManager() 返回值形态） */
export interface MpSpeechRecognitionManagerLike {
  start(options: { lang: string }): void
  stop(): void
  onStop: ((res: { result?: string }) => void) | null
  onError: ((res: { msg?: string }) => void) | null
}

export interface MpSpeechDeps {
  /** 插件识别管理器工厂（MP 壳层注入 requirePlugin('WechatSI').getRecordRecognitionManager()），不可用时返回 null */
  getRecognitionManager(): MpSpeechRecognitionManagerLike | null
}

/** MP 单次识别（@internal 测试钩子：依赖注入；公共入口见 startSpeechRecognition） */
export function mpRecognize(deps: MpSpeechDeps): Promise<SpeechRecognitionResult> {
  const manager = deps.getRecognitionManager()
  if (!manager) {
    setState('error')
    return Promise.resolve({ ok: false, error: MP_UNAVAILABLE_HINT })
  }
  setState('recording')
  return new Promise((resolve) => {
    manager.onStop = (res) => {
      activeStop = null
      const text = (res.result ?? '').trim()
      if (!text) {
        setState('error')
        resolve({ ok: false, error: EMPTY_TRANSCRIPT_HINT })
        return
      }
      setState('idle')
      resolve({ ok: true, text })
    }
    manager.onError = (res) => {
      activeStop = null
      setState('error')
      resolve({ ok: false, error: `语音识别失败${res.msg ? `（${res.msg}）` : ''}` })
    }
    // 小程序需用户再次点击结束：stop() → 触发 onStop 结算
    activeStop = () => {
      setState('recognizing')
      manager.stop()
    }
    try {
      // start() 可能同步抛错（录音冲突/权限边缘）：与 H5 分支一致的 try/catch 防护，
      // 保证 Promise 永不 reject（判别联合契约），页面 await 不会得到 unhandled rejection
      manager.start({ lang: 'zh_CN' })
    } catch {
      activeStop = null
      setState('error')
      resolve({ ok: false, error: MP_UNAVAILABLE_HINT })
    }
  })
}

// ===== APP-PLUS：v1 降级（无内置 ASR） =====

/** APP v1 降级（@internal 测试钩子；公共入口见 startSpeechRecognition） */
export function appRecognize(): Promise<SpeechRecognitionResult> {
  setState('error')
  return Promise.resolve({ ok: false, error: APP_UNSUPPORTED_HINT })
}

// ===== 平台壳层（uni 条件编译分发） =====

/** 当前平台是否支持语音输入（页面据此决定是否显示麦克风按钮） */
export function isSpeechInputSupported(): boolean {
  // #ifdef H5
  return getH5Ctor() !== null
  // #endif
  // #ifdef MP-WEIXIN
  return getMpManager() !== null
  // #endif
  // #ifdef APP-PLUS
  return false
  // #endif
  return false
}

/** 开始语音识别：成功返回文本（回填输入框，可编辑），失败返回错误信息（不阻塞文本输入） */
export function startSpeechRecognition(): Promise<SpeechRecognitionResult> {
  // #ifdef H5
  return h5Recognize({ getSpeechRecognition: getH5Instance })
  // #endif
  // #ifdef MP-WEIXIN
  return mpRecognize({ getRecognitionManager: getMpManager })
  // #endif
  // #ifdef APP-PLUS
  return appRecognize()
  // #endif
  return Promise.resolve({ ok: false, error: APP_UNSUPPORTED_HINT })
}

/** 结束当前识别（H5 提前结束取结果 / 小程序 stop() 结算；无进行中会话为 no-op） */
export function stopSpeechRecognition(): void {
  activeStop?.()
}

// ===== 平台能力获取（仅被条件编译壳层引用） =====

function getH5Ctor(): (new () => H5SpeechRecognitionLike) | null {
  // #ifdef H5
  const w = window as unknown as {
    SpeechRecognition?: new () => H5SpeechRecognitionLike
    webkitSpeechRecognition?: new () => H5SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
  // #endif
  return null
}

/** 每次识别新建实例（Web Speech API 实例单次使用） */
function getH5Instance(): H5SpeechRecognitionLike | null {
  const Ctor = getH5Ctor()
  return Ctor ? new Ctor() : null
}

function getMpManager(): MpSpeechRecognitionManagerLike | null {
  // #ifdef MP-WEIXIN
  try {
    // requirePlugin 是 MP 运行时全局（WechatSI 插件）；用 globalThis 防御式获取，
    // 避免引入全局类型声明；插件未在 manifest/后台配置时调用会抛错 → 降级 null
    const g = (typeof globalThis !== 'undefined' ? globalThis : {}) as unknown as {
      requirePlugin?: (id: string) => unknown
    }
    const req = g.requirePlugin
    if (typeof req !== 'function') return null
    const plugin = req('WechatSI') as { getRecordRecognitionManager?: () => MpSpeechRecognitionManagerLike }
    return plugin.getRecordRecognitionManager?.() ?? null
  } catch {
    return null
  }
  // #endif
  return null
}
