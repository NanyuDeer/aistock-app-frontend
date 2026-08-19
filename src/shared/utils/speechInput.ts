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
import { API_BASE_URL } from './constants'

export type SpeechRecognitionState = 'idle' | 'recording' | 'recognizing' | 'error'

export type SpeechRecognitionResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

/** HTML5+ `plus.io` 最小接口（App 端读录音临时文件用）——绕开 `uni.getFileSystemManager().readFile`
 * 的 `nativeFileManager` 引擎缺陷 + 标准 `FileReader` 在 App 端不存在的问题
 * （见 docs/2026-08-18-app-voice-asr-troubleshooting.md）。
 * 仅声明用到的 resolveLocalFileSystemURL → entry.file → plus.io.FileReader.readAsDataURL。 */
interface PlusIoFileReaderLike {
  onload: (() => void) | null
  onerror: ((event: unknown) => void) | null
  readonly result?: unknown
  readAsDataURL(file: Blob): void
}
interface PlusIoLike {
  FileReader?: new () => PlusIoFileReaderLike
  resolveLocalFileSystemURL(
    url: string,
    success: (entry: { file(success: (file: Blob) => void, fail?: (error: unknown) => void): void }) => void,
    fail: (error: unknown) => void,
  ): void
}

/** 将 DataURL（`data:...;base64,<data>`）解码为 ArrayBuffer。
 * App 端 `plus.io.FileReader` 只支持 readAsDataURL（返回 base64），不支持 readAsArrayBuffer，
 * 故剥前缀后用 atob 转二进制；纯函数供单测。 */
export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const idx = dataUrl.indexOf(',')
  if (idx < 0) throw new Error('非法 DataURL')
  const bin = atob(dataUrl.slice(idx + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

/** 模块级识别状态（核心函数驱动；页面可读作录制/识别中指示） */
export const speechRecognitionState = shallowRef<SpeechRecognitionState>('idle')

const H5_UNSUPPORTED_HINT = '语音输入仅支持 Chrome 浏览器'
const MP_UNAVAILABLE_HINT = '语音输入暂不可用'
const APP_UNSUPPORTED_HINT = '当前版本暂不支持语音输入'
export const EMPTY_TRANSCRIPT_HINT = '未识别到语音'
const APP_RECORD_FAIL_HINT = '录音失败，请重试'
const APP_UPLOAD_FAIL_HINT = '语音识别服务异常'

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

// ===== APP-PLUS：后端 ASR 真实链路（批次 3a） =====

/** uni-app App 端录音管理器的最小接口（uni.getRecorderManager() 返回值形态） */
export interface AppRecorderManagerLike {
  /** format 有效值 aac/mp3/wav/PCM/amr（App）；sampleRate 有效值 8000/16000/44100（amr 用 8000，AMR-NB 窄带） */
  start(options: { format: string; sampleRate?: number }): void
  stop(): void
  onStart: (() => void) | null
  onStop: ((res: { tempFilePath: string }) => void) | null
  onError: ((res: { errMsg?: string }) => void) | null
}

/** APP 识别依赖（依赖注入，供单测替换平台全局；生产由 appRecognize 壳层注入） */
export interface AppSpeechDeps {
  /** 录音管理器工厂（不可用时返回 null） */
  getRecorderManager(): AppRecorderManagerLike | null
  /** 读取录音临时文件为 ArrayBuffer */
  readFileAsArrayBuffer(tempFilePath: string): Promise<ArrayBuffer>
  /** 上传音频到 app-api（JWT 携带于内部），返回判别联合 */
  uploadAudio(arrayBuffer: ArrayBuffer): Promise<SpeechRecognitionResult>
}

/** APP 单次识别（@internal 测试钩子：依赖注入；公共入口见 startSpeechRecognition） */
export function appRecognize(deps: AppSpeechDeps): Promise<SpeechRecognitionResult> {
  let manager: AppRecorderManagerLike | null
  try {
    // G2 防护：真机模块缺失/权限异常时 getRecorderManager 可能同步抛错或返回 null，
    // 同步异常必须转错误态而非炸穿调用方（handleMicTap L577 同步段在 try 外）
    manager = deps.getRecorderManager()
  } catch {
    setState('error')
    return Promise.resolve({ ok: false, error: APP_UPLOAD_FAIL_HINT })
  }
  if (!manager) {
    setState('error')
    return Promise.resolve({ ok: false, error: APP_UPLOAD_FAIL_HINT })
  }
  setState('recording')
  return new Promise((resolve) => {
    manager.onStart = () => {
      // 录音中（UI 镜像由页面 isListening 控制；此处仅维护模块状态）
    }
    manager.onStop = async (res) => {
      activeStop = null
      setState('recognizing')
      try {
        const arrayBuffer = await deps.readFileAsArrayBuffer(res.tempFilePath)
        const result = await deps.uploadAudio(arrayBuffer)
        if (result.ok && !result.text.trim()) {
          setState('error')
          resolve({ ok: false, error: EMPTY_TRANSCRIPT_HINT })
          return
        }
        setState(result.ok ? 'idle' : 'error')
        resolve(result)
      } catch (err) {
        setState('error')
        const reason = err instanceof Error ? err.message : (err ? String(err) : '')
        // 诊断（2026-08-18）：readFile/上传异常统一透出（uploadAudio 已自身捕获不 reject，
        // 故此 catch 实际是 readFile 读临时文件失败；wav 时代即「假 .wav】readFile 失败根因，amr 后仍需排查）
        console.error('[asr] App 录音文件读取失败:', err)
        resolve({ ok: false, error: reason ? `读取录音文件失败：${reason}` : APP_RECORD_FAIL_HINT })
      }
    }
    manager.onError = (res) => {
      activeStop = null
      setState('error')
      resolve({ ok: false, error: res?.errMsg ? `录音失败（${res.errMsg}）` : APP_RECORD_FAIL_HINT })
    }
    // App 端交互：点按开始，再点结束（stop() → onStop 结算）
    activeStop = () => manager.stop()
    try {
      // 录音格式 amr + 8kHz（与后端火山 ASR audio.format='amr', rate=8000 一致）：
      // - 弃用 mp3：部分 Android ROM 缺 libmp3lame 编码器，start({format:'mp3'}) 真机直接抛错（真机实测"录音失败"）
      // - 弃用 wav：uni-app App 端底层是 HTML5+ plus.audio.getRecorder，Android 不真正支持 wav，
      //   生成「假 .wav 实为 amr」的无效文件，onStop 后 readFile 读临时文件失败 → "录音失败，请重试"（真机复现根因）
      // - 选 amr：Android/iOS HTML5+ 原生支持（AMR-NB 窄带固定 8k），无需额外编码器，火山 V2 ASR 原生支持 format='amr'
      manager.start({ format: 'amr', sampleRate: 8000 })
    } catch (err) {
      activeStop = null
      setState('error')
      const reason = err instanceof Error ? err.message : (err ? String(err) : '')
      // 诊断（2026-08-18）：真机「录音失败」跨设备复现，透出真实原因以区分 start 失败 vs readFile 失败
      console.error('[asr] App 录音启动失败:', err)
      resolve({ ok: false, error: reason ? `录音启动失败：${reason}` : APP_RECORD_FAIL_HINT })
    }
  })
}

/** 桥接 uni RecorderManager 方法式回调（onStop(cb)）→ 属性式契约（AppRecorderManagerLike） */
function bridgeRecorder(recorder: UniNamespace.RecorderManager): AppRecorderManagerLike {
  let onStart: (() => void) | null = null
  let onStop: ((res: { tempFilePath: string }) => void) | null = null
  let onError: ((res: { errMsg?: string }) => void) | null = null
  recorder.onStart(() => onStart?.())
  recorder.onStop((res) => onStop?.(res as { tempFilePath: string }))
  recorder.onError((res) => onError?.(res as { errMsg?: string }))
  return {
    start: (options) => recorder.start(options),
    stop: () => recorder.stop(),
    get onStart() { return onStart },
    set onStart(fn) { onStart = fn },
    get onStop() { return onStop },
    set onStop(fn) { onStop = fn },
    get onError() { return onError },
    set onError(fn) { onError = fn },
  }
}

/** APP 平台壳层：真实依赖注入（uni 全局；生产路径） */
function getAppDeps(): AppSpeechDeps | null {
  // #ifdef APP-PLUS
  try {
    // G2 防护：真机缺 Record 模块/录音权限时 uni.getRecorderManager() 可能抛错或返回 null，
    // 壳层必须兜底为 null（走 startAppRecognition 的错误态），不得同步炸穿 handleMicTap
    const recorder = uni.getRecorderManager()
    return {
      getRecorderManager: () => bridgeRecorder(recorder),
      readFileAsArrayBuffer: (tempFilePath) =>
        new Promise<ArrayBuffer>((resolve, reject) => {
          // App 端读录音临时文件：必须用 HTML5+ `plus.io` 原生读取——
          // ① `uni.getFileSystemManager().readFile` 触发 `nativeFileManager` 引擎缺陷（已证伪补模块无效）；
          // ② App 端无标准 Web `FileReader`（真机报 `FileReader is not defined`）。
          // 故用 `plus.io.FileReader.readAsDataURL`（唯一支持，返回 base64 DataURL）→ 剥前缀 → ArrayBuffer。
          // 见 docs/2026-08-18-app-voice-asr-troubleshooting.md
          //
          // 诊断（2026-08-19）：真机在「录音结束」页面报 `WebSocket is not defined`。原因很可能是
          // `new plus.io.FileReader()` / `readAsDataURL()` 这类**同步调用**跑在 plus 回调内，不在 Promise
          // 自动捕获范围，真机内核在此处裸读缺失的 `WebSocket` 全局 → ReferenceError 未捕获直抛页面。
          // 故每个子步骤单独 try/catch + 阶段前缀透出，定位具体炸点；亦防同步错误逃逸到页面。
          const wrap = (stage: string) => (err: unknown) => {
            const msg = err instanceof Error ? err.message : err ? String(err) : '未知错误'
            reject(new Error(`读取录音文件失败（${stage}）：${msg}`))
          }
          let io: PlusIoLike | undefined
          try {
            io = (plus as unknown as { io?: PlusIoLike }).io
          } catch (err) {
            wrap('定位 plus.io')(err)
            return
          }
          if (!io) {
            reject(new Error('读取录音文件失败（plus.io 不可用）'))
            return
          }
          const FileReaderCtor = io.FileReader
          if (!FileReaderCtor) {
            reject(new Error('读取录音文件失败（plus.io.FileReader 不可用）'))
            return
          }
          try {
            io.resolveLocalFileSystemURL(
              tempFilePath,
              (entry) => {
                try {
                  entry.file(
                    (file) => {
                      let reader: PlusIoFileReaderLike
                      try {
                        reader = new FileReaderCtor()
                      } catch (err) {
                        wrap('新建 FileReader')(err)
                        return
                      }
                      reader.onerror = wrap('FileReader.onerror')
                      reader.onload = () => {
                        try {
                          const raw = typeof reader.result === 'string' ? reader.result : ''
                          if (!raw) {
                            reject(new Error('读取录音文件失败（FileReader 结果为空）'))
                            return
                          }
                          resolve(dataUrlToArrayBuffer(raw))
                        } catch (err) {
                          wrap('base64 转 ArrayBuffer')(err)
                        }
                      }
                      try {
                        reader.readAsDataURL(file)
                      } catch (err) {
                        wrap('readAsDataURL')(err)
                      }
                    },
                    wrap('entry.file'),
                  )
                } catch (err) {
                  wrap('解析文件入口')(err)
                }
              },
              wrap('resolveLocalFileSystemURL'),
            )
          } catch (err) {
            wrap('resolveLocalFileSystemURL 同步')(err)
          }
        }),
      uploadAudio: async (arrayBuffer) => {
        // 二进制 body（非 multipart）：uni.request 直接发 ArrayBuffer + audio/amr（与录音格式 amr 一致）
        const token = uni.getStorageSync('token') as string | undefined
        try {
          const res = await new Promise<UniNamespace.RequestSuccessCallbackResult>((resolve, reject) => {
            uni.request({
              url: `${API_BASE_URL}/agent/asr`,
              method: 'POST',
              data: arrayBuffer,
              header: {
                'Content-Type': 'audio/amr',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              success: resolve,
              fail: reject,
            })
          })
          const body = (res.data ?? {}) as { code?: number; message?: string; text?: string }
          if (res.statusCode === 200 && typeof body?.text === 'string') {
            return { ok: true, text: body.text }
          }
          if (res.statusCode === 401) {
            return { ok: false, error: '请先登录' }
          }
          return { ok: false, error: body?.message || APP_UPLOAD_FAIL_HINT }
        } catch {
          return { ok: false, error: APP_UPLOAD_FAIL_HINT }
        }
      },
    }
  } catch {
    return null
  }
  // #endif
  return null
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
  return true
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
  return startAppRecognition(getAppDeps())
  // #endif
  return Promise.resolve({ ok: false, error: APP_UNSUPPORTED_HINT })
}

/**
 * APP 分支入口（独立函数保证收窄发生在可达代码内——#ifdef 平台 return 使
 * startSpeechRecognition 内 APP-PLUS 分支在 vue-tsc 视角不可达，CFG 不做收窄）
 */
function startAppRecognition(deps: AppSpeechDeps | null): Promise<SpeechRecognitionResult> {
  if (!deps) {
    return Promise.resolve({ ok: false, error: APP_UPLOAD_FAIL_HINT })
  }
  return appRecognize(deps)
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
