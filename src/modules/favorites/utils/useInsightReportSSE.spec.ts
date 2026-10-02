/**
 * useInsightReportSSE 单测：帧解码 / 通道选择 / 两条通道（fetch 流 + uni.request 分块）/ 错误分支 / 中止。
 *
 * 两条通道：
 * - H5（有 fetch + ReadableStream）→ fetch + ReadableStream，用 ReadableStream 构造响应桩；
 * - App 端 / 小程序（无 ReadableStream）→ `uni.request({ enableChunked })` + `onChunkReceived`，
 *   用 uni.request 桩捕获 success/fail 与分块回调。**该通道在 H5 上跑不到，故由本文件的单测锁定。**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useInsightReportSSE,
  buildInsightReportStreamUrl,
  createReportStreamDecoder,
  pickReportStreamChannel,
  readReportViaChunked,
} from './useInsightReportSSE'

vi.mock('@/shared/utils/constants', () => ({ API_BASE_URL: '/api' }))

/** 成功响应桩：按给定 SSE chunk 序列产出 */
function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return { status: 200, body } as unknown as Response
}

/** 前置失败响应桩：真实状态码 + JSON 正文（非 200 也带 body，走 decoder.rawText 取 message） */
function jsonResponse(status: number, payload: unknown): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(payload)))
      controller.close()
    },
  })
  return { status, body, json: async () => payload } as unknown as Response
}

describe('buildInsightReportStreamUrl', () => {
  it('拼接流式端点并 encodeURIComponent 事件 ID', () => {
    expect(buildInsightReportStreamUrl('mv:1:up')).toBe(
      '/api/cn/favorites/movements/mv%3A1%3Aup/report/stream',
    )
  })
})

describe('useInsightReportSSE', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', { getStorageSync: vi.fn(() => 'tk') })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('成功流：header + 章节逐条追加 + done，并注入鉴权头', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([
      'data: {"type":"start","header":"金富科技（003018） · 2026-09-13","total":2}\n\n',
      'data: {"type":"section","index":0,"heading":"事件事实","blocks":[{"type":"kv","items":[{"label":"方向","value":"上涨","tone":"up"}]}]}\n\n',
      'data: {"type":"section","index":1,"heading":"主因结论","blocks":[{"type":"verdict","text":"x","badges":[]}]}\n\n',
      'data: {"type":"done","message":"success"}\n\n',
    ]))
    vi.stubGlobal('fetch', fetchMock)

    const s = useInsightReportSSE()
    await s.start('mv:1')

    expect(s.header.value).toBe('金富科技（003018） · 2026-09-13')
    expect(s.sections.value.map((x) => x.heading)).toEqual(['事件事实', '主因结论'])
    expect(s.sections.value[0].blocks).toEqual([
      { type: 'kv', items: [{ label: '方向', value: '上涨', tone: 'up' }] },
    ])
    expect(s.done.value).toBe(true)
    expect(s.error.value).toBe('')
    expect(s.loading.value).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cn/favorites/movements/mv%3A1/report/stream',
      expect.objectContaining({ headers: { Authorization: 'Bearer tk' } }),
    )
  })

  it('六阶段因果链 block 原样透传（stages 顺序即因果顺序）', async () => {
    const stages = [
      { stage: '结构根因', stageKey: 'structural_root', claim: '筹码转移',
        epistemic: '假设', epistemicKey: 'hypothesis', status: '未确立',
        statusKey: 'not_established', evidenceIds: [], evidenceCount: 0 },
      { stage: '触发', stageKey: 'trigger', claim: '拉升 7.69%',
        epistemic: '事实', epistemicKey: 'fact', status: '已确立',
        statusKey: 'established', evidenceIds: ['e1'], evidenceCount: 1 },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([
      `data: {"type":"section","index":0,"heading":"六阶段因果链","blocks":[{"type":"chain","stages":${JSON.stringify(stages)}}]}\n\n`,
      'data: {"type":"done"}\n\n',
    ])))
    const s = useInsightReportSSE()
    await s.start('mv:1')
    const block = s.sections.value[0].blocks[0] as { type: string; stages: unknown[] }
    expect(block.type).toBe('chain')
    expect(block.stages).toEqual(stages)
  })

  it('章节缺 blocks（上游异常）→ 归一化为空数组，不抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([
      'data: {"type":"section","index":0,"heading":"事件事实"}\n\n',
      'data: {"type":"done"}\n\n',
    ])))
    const s = useInsightReportSSE()
    await s.start('mv:1')
    expect(s.sections.value[0].blocks).toEqual([])
  })

  it('跨 chunk 分帧：同一帧被切成两半仍能解析', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([
      'data: {"type":"start","header":"H","total":1}\n\ndata: {"type":"sec',
      'tion","index":0,"heading":"事件事实","blocks":[{"type":"list","items":["a"]}]}\n\ndata: {"type":"done"}\n\n',
    ])))
    const s = useInsightReportSSE()
    await s.start('mv:1')
    expect(s.header.value).toBe('H')
    expect(s.sections.value).toHaveLength(1)
    expect(s.sections.value[0].blocks).toEqual([{ type: 'list', items: ['a'] }])
    expect(s.done.value).toBe(true)
  })

  it('非 200（前置校验失败）→ 采用 JSON message 作为错误提示', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(409, { code: 409, message: '该异动暂无完整归因' }),
    ))
    const s = useInsightReportSSE()
    await s.start('mv:1')
    expect(s.error.value).toBe('该异动暂无完整归因')
    expect(s.loading.value).toBe(false)
    expect(s.sections.value).toHaveLength(0)
  })

  it('流中 error 帧 → 停止读取并暴露 message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([
      'data: {"type":"start","header":"H","total":9}\n\n',
      'data: {"type":"error","code":502,"message":"报告生成失败，请重试"}\n\n',
    ])))
    const s = useInsightReportSSE()
    await s.start('mv:1')
    expect(s.error.value).toBe('报告生成失败，请重试')
    expect(s.done.value).toBe(false)
  })

  it('fetch 抛错 → 网络错误提示', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    const s = useInsightReportSSE()
    await s.start('mv:1')
    expect(s.error.value).toBe('连接失败，请检查网络后重试')
    expect(s.loading.value).toBe(false)
  })

  it('stop() 中止流：保留已到达内容、不置错误', async () => {
    const encoder = new TextEncoder()
    // 桩需响应 abort：真实 fetch 被 abort 时 body 流会出错，reader.read() 才会 reject
    vi.stubGlobal('fetch', vi.fn((_url: string, init: { signal: AbortSignal }) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"start","header":"H","total":9}\n\n'))
          // 故意不 close：模拟长连接，等 stop() 触发 abort
          init.signal.addEventListener('abort', () => {
            controller.error(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          })
        },
      })
      return Promise.resolve({ status: 200, body } as unknown as Response)
    }))

    const s = useInsightReportSSE()
    const pending = s.start('mv:1')
    await new Promise((resolve) => { setTimeout(resolve, 10) })
    expect(s.header.value).toBe('H')

    s.stop()
    await pending
    expect(s.loading.value).toBe(false)
    expect(s.error.value).toBe('')
    expect(s.header.value).toBe('H')
  })
})

describe('createReportStreamDecoder（H5 与 App 端共用）', () => {
  it('多字节 UTF-8 被切在块边界也不破损（TextDecoder stream 解码）', () => {
    const seen: Array<Record<string, unknown>> = []
    const decoder = createReportStreamDecoder((evt) => {
      seen.push(evt)
      return evt.type === 'done'
    })
    const frames = [
      'data: {"type":"section","index":0,"heading":"六阶段因果链","blocks":[]}\n\n',
      'data: {"type":"done"}\n\n',
    ].join('')
    const bytes = new TextEncoder().encode(frames)
    // 切点落在中文字符内部（"六阶段…" 是多字节），逐字节喂入验证不出现乱码
    for (let i = 0; i < bytes.length; i += 1) decoder.feed(bytes.slice(i, i + 1))

    expect(decoder.finished).toBe(true)
    expect(seen[0].heading).toBe('六阶段因果链')
    expect(seen[1].type).toBe('done')
  })

  it('半帧缓存：同一帧被切成两半仍能解析', () => {
    const seen: Array<Record<string, unknown>> = []
    const decoder = createReportStreamDecoder((evt) => {
      seen.push(evt)
      return evt.type === 'done'
    })
    decoder.feed('data: {"type":"sec')
    expect(seen).toHaveLength(0)
    decoder.feed('tion","index":0,"heading":"事件事实","blocks":[]}\n\n')
    expect(seen[0].heading).toBe('事件事实')
  })

  it('rawText 累计原始文本（非 200 时用于解析 JSON message）', () => {
    const decoder = createReportStreamDecoder(() => false)
    const payload = '{"code":409,"message":"该异动暂无完整归因"}'
    decoder.feed(new TextEncoder().encode(payload))
    expect(decoder.rawText).toBe(payload)
  })

  it('收到 done 后 finished=true，后续字节不再解析', () => {
    const seen: Array<Record<string, unknown>> = []
    const decoder = createReportStreamDecoder((evt) => {
      seen.push(evt)
      return evt.type === 'done'
    })
    decoder.feed('data: {"type":"done"}\n\n')
    expect(decoder.finished).toBe(true)
    decoder.feed('data: {"type":"section","index":1,"heading":"不该出现","blocks":[]}\n\n')
    expect(seen).toHaveLength(1)
  })

  it('单帧 JSON 非法不影响后续帧（静默跳过）', () => {
    const seen: Array<Record<string, unknown>> = []
    const decoder = createReportStreamDecoder((evt) => {
      seen.push(evt)
      return evt.type === 'done'
    })
    decoder.feed('data: {坏帧}\n\n')
    decoder.feed('data: {"type":"done"}\n\n')
    expect(seen).toEqual([{ type: 'done' }])
  })
})

describe('pickReportStreamChannel（运行时能力探测）', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('有 fetch + ReadableStream → fetch 通道（H5）', () => {
    expect(pickReportStreamChannel()).toBe('fetch')
  })

  it('缺 ReadableStream → chunked 通道（App 端 WebView）', () => {
    vi.stubGlobal('ReadableStream', undefined)
    expect(pickReportStreamChannel()).toBe('chunked')
  })

  it('缺 fetch → chunked 通道（小程序）', () => {
    vi.stubGlobal('fetch', undefined)
    expect(pickReportStreamChannel()).toBe('chunked')
  })
})

/** uni.request 分块桩：捕获 options 与分块回调，按给定片段下发后回调 success */
function chunkedUniMock(frames: string[], statusCode = 200) {
  const enc = new TextEncoder()
  const calls: Array<Record<string, unknown>> = []
  let chunkHandler: ((res: { data: ArrayBuffer | Uint8Array }) => void) | null = null
  const abort = vi.fn()
  const request = vi.fn((options: Record<string, unknown>) => {
    calls.push(options)
    queueMicrotask(() => {
      for (const frame of frames) chunkHandler?.({ data: enc.encode(frame) })
      ;(options.success as (res: { statusCode: number }) => void)?.({ statusCode })
    })
    return {
      abort,
      onChunkReceived: (cb: (res: { data: ArrayBuffer | Uint8Array }) => void) => { chunkHandler = cb },
    }
  })
  return { request, calls, abort }
}

describe('readReportViaChunked（App 端 uni.request 分块通道）', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('启用 enableChunked + 带鉴权头，逐块喂入 decoder，返回状态码', async () => {
    const { request, calls } = chunkedUniMock([
      'data: {"type":"start","header":"H","total":1}\n\n',
      'data: {"type":"section","index":0,"heading":"事件事实","blocks":[]}\n\n',
      'data: {"type":"done"}\n\n',
    ])
    vi.stubGlobal('uni', { request })

    const seen: Array<Record<string, unknown>> = []
    const decoder = createReportStreamDecoder((evt) => {
      seen.push(evt)
      return evt.type === 'done'
    })
    const status = await readReportViaChunked('/api/x', 'tk', decoder, () => { /* noop */ })

    expect(status).toBe(200)
    expect(calls[0].enableChunked).toBe(true)
    expect(calls[0].header).toEqual({ Authorization: 'Bearer tk' })
    expect(seen.map((e) => e.type)).toEqual(['start', 'section', 'done'])
  })

  it('setCancel 注册的取消函数会 abort 请求（供 stop()/超时使用）', async () => {
    const { request, abort } = chunkedUniMock([])
    vi.stubGlobal('uni', { request })
    const cancels: Array<() => void> = []
    await readReportViaChunked('/api/x', 'tk', createReportStreamDecoder(() => false), (c) => { cancels.push(c) })
    expect(cancels).toHaveLength(1)
    cancels[0]()
    expect(abort).toHaveBeenCalledTimes(1)
  })

  it('基座无 onChunkReceived（分块能力缺失）→ 抛"不支持流式读取"', async () => {
    vi.stubGlobal('uni', { request: vi.fn(() => ({ abort: vi.fn() })) })
    await expect(
      readReportViaChunked('/api/x', 'tk', createReportStreamDecoder(() => false), () => { /* noop */ }),
    ).rejects.toThrow('当前环境不支持流式读取')
  })
})

describe('通道回退（fetch 拿到响应却无可读流）', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('有 ReadableStream 但 fetch 响应无 body → 回退 uni.request 分块通道并成功', async () => {
    // 环境有 ReadableStream（因此选 fetch 通道），但响应没有 body（部分 App WebView 的真实表现）
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, body: null } as unknown as Response))
    const mock = chunkedUniMock([
      'data: {"type":"start","header":"H","total":1}\n\n',
      'data: {"type":"done"}\n\n',
    ])
    vi.stubGlobal('uni', { getStorageSync: vi.fn(() => 'tk'), request: mock.request })

    const s = useInsightReportSSE()
    await s.start('mv:1')

    expect(mock.calls).toHaveLength(1)
    expect(mock.calls[0].enableChunked).toBe(true)
    expect(s.header.value).toBe('H')
    expect(s.done.value).toBe(true)
    expect(s.error.value).toBe('')
  })
})

describe('useInsightReportSSE 走 App 端（chunked）通道', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  /** App 端模拟：无 ReadableStream + uni.request 支持分块 */
  function stubAppPlatform(frames: string[], statusCode = 200) {
    vi.stubGlobal('ReadableStream', undefined)
    const mock = chunkedUniMock(frames, statusCode)
    vi.stubGlobal('uni', { getStorageSync: vi.fn(() => 'tk'), request: mock.request })
    return mock
  }

  it('逐块解析出 header / 章节 / done，并置 loading=false', async () => {
    const stages = [{ stage: '结构根因', stageKey: 'structural_root', claim: '筹码转移',
      epistemic: '假设', epistemicKey: 'hypothesis', status: '未确立',
      statusKey: 'not_established', evidenceIds: [], evidenceCount: 0 }]
    const mock = stubAppPlatform([
      'data: {"type":"start","header":"金富科技（003018） · 2026-09-04","total":1}\n\n',
      `data: {"type":"section","index":0,"heading":"六阶段因果链","blocks":[{"type":"chain","stages":${JSON.stringify(stages)}}]}\n\n`,
      'data: {"type":"done"}\n\n',
    ])

    const s = useInsightReportSSE()
    await s.start('mv:1')

    expect(mock.calls[0].enableChunked).toBe(true)
    expect(s.header.value).toBe('金富科技（003018） · 2026-09-04')
    expect(s.sections.value).toHaveLength(1)
    expect(s.sections.value[0].heading).toBe('六阶段因果链')
    const block = s.sections.value[0].blocks[0] as { stages: unknown[] }
    expect(block.stages).toHaveLength(1)
    expect(s.done.value).toBe(true)
    expect(s.error.value).toBe('')
    expect(s.loading.value).toBe(false)
  })

  it('非 200（前置校验失败）→ 用原始 JSON message 作为错误提示', async () => {
    stubAppPlatform(['{"code":409,"message":"该异动暂无完整归因"}'], 409)
    const s = useInsightReportSSE()
    await s.start('mv:1')
    expect(s.error.value).toBe('该异动暂无完整归因')
    expect(s.done.value).toBe(false)
    expect(s.loading.value).toBe(false)
  })

  it('fail（非 abort）→ 网络错误提示', async () => {
    vi.stubGlobal('ReadableStream', undefined)
    const fails: Array<(err: unknown) => void> = []
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn(() => 'tk'),
      request: vi.fn((options: Record<string, unknown>) => {
        fails.push(options.fail as (err: unknown) => void)
        queueMicrotask(() => fails[0]?.({ errMsg: 'request:fail timeout' }))
        return { abort: vi.fn(), onChunkReceived: vi.fn() }
      }),
    })
    const s = useInsightReportSSE()
    await s.start('mv:1')
    expect(s.error.value).toBe('连接失败，请检查网络后重试')
    expect(s.loading.value).toBe(false)
  })

  it('stop() → 调用 requestTask.abort()，保留已到达内容且不被迟到的响应改写', async () => {
    vi.stubGlobal('ReadableStream', undefined)
    const abort = vi.fn()
    const successes: Array<(res: { statusCode: number }) => void> = []
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn(() => 'tk'),
      request: vi.fn((options: Record<string, unknown>) => {
        successes.push(options.success as (res: { statusCode: number }) => void)
        return {
          abort,
          onChunkReceived: vi.fn(),
        }
      }),
    })
    const s = useInsightReportSSE()
    const pending = s.start('mv:1')
    await new Promise((resolve) => { setTimeout(resolve, 10) })
    s.stop()
    expect(abort).toHaveBeenCalledTimes(1)
    // abort 后在途请求仍可能以非 200 收场 → 不得在用户已"停止"后再弹出错误
    successes[0]?.({ statusCode: 409 })
    await pending
    expect(s.error.value).toBe('')
    expect(s.done.value).toBe(false)
    expect(s.loading.value).toBe(false)
  })
})
