/**
 * speechInput 语音容错输入侧单测（Phase 4-2 Task 2）
 *
 * 测试对象是「依赖注入核心」h5Recognize / mpRecognize / appRecognize：
 * uni 条件编译壳层（startSpeechRecognition / isSpeechInputSupported）只做平台分发，
 * 单测中直接替换注入工厂（fake 识别实例 / fake 插件管理器），不依赖平台全局。
 *
 * 不用 vi.mock：用纯手工 fake（记录调用 + 手动触发事件回调），同一文件在
 * node:test 下也能安全加载（vitest describe/it 在 node:test 运行时为空操作）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import assert from 'node:assert/strict'
import {
  h5Recognize,
  mpRecognize,
  appRecognize,
  stopSpeechRecognition,
  speechRecognitionState,
  dataUrlToArrayBuffer,
  parseAsrUploadResult,
  EMPTY_TRANSCRIPT_HINT,
  type H5SpeechDeps,
  type H5SpeechRecognitionLike,
  type MpSpeechDeps,
  type MpSpeechRecognitionManagerLike,
  type AppSpeechDeps,
  type SpeechRecognitionResult,
} from './speechInput'

/** H5 Web Speech API fake：记录 start/stop 调用，事件回调由测试手动触发 */
class FakeRecognition implements H5SpeechRecognitionLike {
  lang = ''
  interimResults = false
  continuous = false
  onresult: H5SpeechRecognitionLike['onresult'] = null
  onerror: H5SpeechRecognitionLike['onerror'] = null
  onend: H5SpeechRecognitionLike['onend'] = null
  started = false
  stopped = false
  start(): void {
    this.started = true
  }
  stop(): void {
    this.stopped = true
  }
}

/** 微信同声传译识别管理器 fake：记录 start/stop，onStop/onError 手动触发 */
class FakeMpManager implements MpSpeechRecognitionManagerLike {
  onStop: MpSpeechRecognitionManagerLike['onStop'] = null
  onError: MpSpeechRecognitionManagerLike['onError'] = null
  startedLang = ''
  stopped = false
  /** 为 true 时 start() 同步抛错（模拟录音冲突/权限边缘） */
  startThrows = false
  start(options: { lang: string }): void {
    if (this.startThrows) throw new Error('recording conflict')
    this.startedLang = options.lang
  }
  stop(): void {
    this.stopped = true
  }
}

function h5DepsWith(inst: FakeRecognition): H5SpeechDeps {
  return { getSpeechRecognition: () => inst }
}

function mpDepsWith(mgr: FakeMpManager): MpSpeechDeps {
  return { getRecognitionManager: () => mgr }
}

describe('speechInput 状态机基线', () => {
  beforeEach(() => {
    speechRecognitionState.value = 'idle'
  })

  it('H5 成功：同步 start + onresult + onend → 返回文本，状态 idle', async () => {
    const inst = new FakeRecognition()
    const p = h5Recognize(h5DepsWith(inst))

    // 必须在用户手势同步阶段调用 start（壳层在 tap 回调中调用本函数）
    expect(inst.started).toBe(true)
    expect(inst.lang).toBe('zh-CN')
    expect(inst.interimResults).toBe(false)
    expect(inst.continuous).toBe(false)
    expect(speechRecognitionState.value).toBe('recording')

    inst.onresult?.({ results: [[{ transcript: ' 贵州茅台今天怎么样 ' }]] })
    inst.onend?.()
    await expect(p).resolves.toEqual({ ok: true, text: '贵州茅台今天怎么样' })
    expect(speechRecognitionState.value).toBe('idle')
  })

  it('H5 不支持（Firefox/Safari）：返回「仅支持 Chrome」错误态，不阻塞', async () => {
    const p = h5Recognize({ getSpeechRecognition: () => null })
    await expect(p).resolves.toEqual({ ok: false, error: '语音输入仅支持 Chrome 浏览器' })
    expect(speechRecognitionState.value).toBe('error')
  })

  it('H5 onerror(no-speech)：降级「未识别到语音」错误态', async () => {
    const inst = new FakeRecognition()
    const p = h5Recognize(h5DepsWith(inst))
    inst.onerror?.({ error: 'no-speech' })
    await expect(p).resolves.toEqual({ ok: false, error: '未识别到语音' })
    expect(speechRecognitionState.value).toBe('error')
  })

  it('H5 onerror(其他)：透出平台错误信息', async () => {
    const inst = new FakeRecognition()
    const p = h5Recognize(h5DepsWith(inst))
    inst.onerror?.({ error: 'not-allowed' })
    await expect(p).resolves.toEqual({ ok: false, error: '语音识别失败（not-allowed）' })
  })

  it('H5 空文本：onend 无 onresult → 「未识别到语音」错误态', async () => {
    const inst = new FakeRecognition()
    const p = h5Recognize(h5DepsWith(inst))
    inst.onend?.()
    await expect(p).resolves.toEqual({ ok: false, error: '未识别到语音' })
    expect(speechRecognitionState.value).toBe('error')
  })

  it('H5 stopSpeechRecognition：提前结束并回填已识别文本', async () => {
    const inst = new FakeRecognition()
    const p = h5Recognize(h5DepsWith(inst))
    stopSpeechRecognition()
    expect(inst.stopped).toBe(true)
    inst.onresult?.({ results: [[{ transcript: '茅台' }]] })
    inst.onend?.()
    await expect(p).resolves.toEqual({ ok: true, text: '茅台' })
  })

  it('MP 成功：start(zh_CN) + onStop(result) → 返回文本，状态 idle', async () => {
    const mgr = new FakeMpManager()
    const p = mpRecognize(mpDepsWith(mgr))
    expect(mgr.startedLang).toBe('zh_CN')
    expect(speechRecognitionState.value).toBe('recording')
    mgr.onStop?.({ result: ' 今天大盘怎么样 ' })
    await expect(p).resolves.toEqual({ ok: true, text: '今天大盘怎么样' })
    expect(speechRecognitionState.value).toBe('idle')
  })

  it('MP 插件不可用：返回「语音输入暂不可用」错误态', async () => {
    const p = mpRecognize({ getRecognitionManager: () => null })
    await expect(p).resolves.toEqual({ ok: false, error: '语音输入暂不可用' })
    expect(speechRecognitionState.value).toBe('error')
  })

  it('MP tap 切换：stopSpeechRecognition → recognizing + manager.stop() + onStop 结算', async () => {
    const mgr = new FakeMpManager()
    const p = mpRecognize(mpDepsWith(mgr))
    expect(mgr.stopped).toBe(false)
    stopSpeechRecognition()
    expect(mgr.stopped).toBe(true)
    expect(speechRecognitionState.value).toBe('recognizing')
    mgr.onStop?.({ result: '茅台' })
    await expect(p).resolves.toEqual({ ok: true, text: '茅台' })
    expect(speechRecognitionState.value).toBe('idle')
  })

  it('MP onError：返回错误态', async () => {
    const mgr = new FakeMpManager()
    const p = mpRecognize(mpDepsWith(mgr))
    mgr.onError?.({ msg: 'user deny' })
    await expect(p).resolves.toEqual({ ok: false, error: '语音识别失败（user deny）' })
  })

  it('MP start 同步抛错（录音冲突/权限边缘）：Promise 不 reject，返回错误态', async () => {
    const mgr = new FakeMpManager()
    mgr.startThrows = true
    const p = mpRecognize(mpDepsWith(mgr))
    // 判别联合契约：同步异常也必须 resolve 错误态，绝不 reject（页面 await 不会 unhandled rejection）
    await expect(p).resolves.toEqual({ ok: false, error: '语音输入暂不可用' })
    expect(speechRecognitionState.value).toBe('error')
    // 同步失败后 activeStop 已清空：stopSpeechRecognition 为 no-op，不触发 manager.stop
    stopSpeechRecognition()
    expect(mgr.stopped).toBe(false)
  })

  it('MP 空文本：onStop 无 result → 「未识别到语音」错误态', async () => {
    const mgr = new FakeMpManager()
    const p = mpRecognize(mpDepsWith(mgr))
    mgr.onStop?.({})
    await expect(p).resolves.toEqual({ ok: false, error: '未识别到语音' })
    expect(speechRecognitionState.value).toBe('error')
  })

  it('APP 录音管理器不可用：返回「语音识别服务异常」错误态', async () => {
    const p = appRecognize({
      getRecorderManager: () => null,
      uploadAudioFile: async () => ({ ok: true, text: 'x' }),
    })
    await expect(p).resolves.toEqual({ ok: false, error: '语音识别服务异常' })
    expect(speechRecognitionState.value).toBe('error')
  })

  it('APP getRecorderManager 工厂同步抛错（壳层无防护 → 真机模块缺失时同步炸穿）：Promise 不 reject，返回错误态', async () => {
    // G2 根因：壳层 getAppDeps/bridgeRecorder 无异常防护，uni.getRecorderManager() 抛错
    // 或返回 null 使 bridgeRecorder 抛 TypeError 时，appRecognize 内 deps.getRecorderManager()
    // 同步炸穿 → handleMicTap L577（try 外）isListening 卡 true。判别联合契约要求此处不 reject。
    let pending: Promise<SpeechRecognitionResult> | undefined
    expect(() => {
      pending = appRecognize({
        getRecorderManager: () => {
          throw new TypeError("Cannot read properties of null (reading 'onStart')")
        },
        uploadAudioFile: async () => ({ ok: true, text: 'x' }),
      })
    }).not.toThrow()
    await expect(pending!).resolves.toEqual({ ok: false, error: '语音识别服务异常' })
    expect(speechRecognitionState.value).toBe('error')
  })
})

// ===== APP 分支（批次 3a：后端 ASR 真实链路） =====

/** 可编程录音管理器 mock（uni.getRecorderManager() 返回值形态） */
const mockRecorder: {
  start(options: { format: string; sampleRate?: number }): void
  stop(): void
  onStart: (() => void) | null
  onStop: ((res: { tempFilePath: string }) => void) | null
  onError: ((res: { errMsg?: string }) => void) | null
  emitStart(): void
  emitStop(tempFilePath: string): void
  emitError(errMsg: string): void
} = {
  start(_options: { format: string; sampleRate?: number }) {},
  stop() {},
  onStart: null,
  onStop: null,
  onError: null,
  emitStart() { this.onStart?.() },
  emitStop(tempFilePath: string) { this.onStop?.({ tempFilePath }) },
  emitError(errMsg: string) { this.onError?.({ errMsg }) },
}

describe('appRecognize', () => {
  it('录音成功 → 上传 → 回填文本', async () => {
    const deps: AppSpeechDeps = {
      getRecorderManager: () => mockRecorder,
      uploadAudioFile: async () => ({ ok: true, text: '贵州茅台' }),
    }
    // 启动录音
    const pending = appRecognize(deps)
    mockRecorder.emitStart()
    // 用户结束录音 → onStop 给临时路径
    mockRecorder.emitStop('/tmp/rec.amr')
    const result = await pending
    assert.deepEqual(result, { ok: true, text: '贵州茅台' })
    assert.equal(speechRecognitionState.value, 'idle')
  })

  it('录音以 pcm + 16kHz 启动（与后端火山 V3 ASR format/rate 对齐；V3 不支持 amr、rate 必须 16000）', () => {
    let startOptions: { format: string; sampleRate?: number } | null = null
    const recorder = {
      start(options: { format: string; sampleRate?: number }) { startOptions = options },
      stop() {},
      onStart: null as (() => void) | null,
      onStop: null as ((res: { tempFilePath: string }) => void) | null,
      onError: null as ((res: { errMsg?: string }) => void) | null,
    }
    appRecognize({
      getRecorderManager: () => recorder,
      uploadAudioFile: async () => ({ ok: true, text: 'x' }),
    })
    assert.deepEqual(startOptions, { format: 'pcm', sampleRate: 16000 })
  })

  it('录音失败 → error 分支', async () => {
    const deps: AppSpeechDeps = {
      getRecorderManager: () => mockRecorder,
      uploadAudioFile: async () => ({ ok: true, text: 'x' }),
    }
    const pending = appRecognize(deps)
    mockRecorder.emitError('no permission')
    const result = await pending
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.error, /录音失败/)
  })

  it('上传 503 → 错误信息透出', async () => {
    const deps: AppSpeechDeps = {
      getRecorderManager: () => mockRecorder,
      uploadAudioFile: async () => ({ ok: false, error: '语音识别暂不可用' }),
    }
    const pending = appRecognize(deps)
    mockRecorder.emitStart()
    mockRecorder.emitStop('/tmp/rec.wav')
    const result = await pending
    assert.deepEqual(result, { ok: false, error: '语音识别暂不可用' })
  })

  it('空文本 → 未识别到语音', async () => {
    const deps: AppSpeechDeps = {
      getRecorderManager: () => mockRecorder,
      uploadAudioFile: async () => ({ ok: true, text: '' }),
    }
    const pending = appRecognize(deps)
    mockRecorder.emitStart()
    mockRecorder.emitStop('/tmp/rec.wav')
    const result = await pending
    assert.deepEqual(result, { ok: false, error: EMPTY_TRANSCRIPT_HINT })
  })

  it('start 同步抛错（编码器/引擎异常）→ 透出具体错误信息（诊断）', async () => {
    // 根因排查（2026-08-18）：真机「录音失败，请重试」跨设备复现，但代码把 start 的
    // 真实异常吞成固定文案。此用例要求把具体错误透出到 error，供真机区分 (a) start vs (c) readFile。
    const recorder = {
      start(_options: { format: string; sampleRate?: number }) {
        throw new Error('pcm encoder not supported')
      },
      stop() {},
      onStart: null as (() => void) | null,
      onStop: null as ((res: { tempFilePath: string }) => void) | null,
      onError: null as ((res: { errMsg?: string }) => void) | null,
    }
    const pending = appRecognize({
      getRecorderManager: () => recorder,
      uploadAudioFile: async () => ({ ok: true, text: 'x' }),
    })
    expect(speechRecognitionState.value).toBe('error')
    const result = await pending
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.error, /pcm encoder not supported/)
  })

  it('上传阶段异常（uploadAudioFile reject，兜底 catch）→ 透出具体错误信息（诊断）', async () => {
    const pending = appRecognize({
      getRecorderManager: () => mockRecorder,
      uploadAudioFile: async () => {
        throw new Error('ENOENT: no such file')
      },
    })
    mockRecorder.emitStart()
    mockRecorder.emitStop('/tmp/rec.amr')
    const result = await pending
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.error, /ENOENT|录音上传/)
  })
})

// ===== parseAsrUploadResult（uni.uploadFile 的 ASR 响应解析） =====

describe('parseAsrUploadResult', () => {
  it('对象响应 200 + text → ok', () => {
    expect(parseAsrUploadResult({ code: 200, message: 'success', text: '贵州茅台' }, 200)).toEqual({ ok: true, text: '贵州茅台' })
  })

  it('字符串 JSON 响应 502（App 真机 res.data 为字符串）+ message → 透出真实错误', () => {
    // 2026-08-19 真机根因：App 端 uni.uploadFile success 的 res.data 是字符串而非对象，
    // 直接当对象读 body?.message 得到 undefined → 吞成笼统文案「语音识别服务异常」。
    // 本用例要求 JSON.parse 后透出后端真实 message（如"语音识别超时，请重试"）。
    expect(parseAsrUploadResult('{"code":502,"message":"语音识别超时，请重试"}', 502)).toEqual({ ok: false, error: '语音识别超时，请重试' })
  })

  it('字符串 JSON 401 → 请先登录', () => {
    expect(parseAsrUploadResult('{"code":401,"message":"未登录"}', 401)).toEqual({ ok: false, error: '请先登录' })
  })

  it('非法 JSON 字符串 → 语音识别服务异常', () => {
    expect(parseAsrUploadResult('not-json', 200)).toEqual({ ok: false, error: '语音识别服务异常' })
  })

  it('空数据 → 语音识别服务异常', () => {
    expect(parseAsrUploadResult(null, 200)).toEqual({ ok: false, error: '语音识别服务异常' })
  })
})

// ===== dataUrlToArrayBuffer（App 端 plus.io.FileReader.readAsDataURL → ArrayBuffer 关键转换） =====

describe('dataUrlToArrayBuffer', () => {
  it('标准 DataURL：剥前缀还原原始字节', () => {
    // 'amr\x00\x01ABC' 的 base64
    const bytes = new Uint8Array([0x61, 0x6d, 0x72, 0x00, 0x01, 0x41, 0x42, 0x43])
    const b64 = btoa(String.fromCharCode(...bytes))
    const ab = dataUrlToArrayBuffer(`data:audio/amr;base64,${b64}`)
    assert.deepEqual(Array.from(new Uint8Array(ab)), Array.from(bytes))
  })

  it('非法 DataURL（无逗号前缀）→ 抛错', () => {
    assert.throws(() => dataUrlToArrayBuffer('not-a-dataurl'), /非法 DataURL/)
  })

  it('空数据 → 返回空 ArrayBuffer', () => {
    const ab = dataUrlToArrayBuffer('data:audio/amr;base64,')
    assert.equal(ab.byteLength, 0)
  })
})
