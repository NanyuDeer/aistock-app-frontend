import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAlertSSE } from './useAlertSSE'

/** 捕获最近一次创建的 fake EventSource 实例 */
let lastSource: FakeEventSource | null = null

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(public url: string) { FakeEventSource.instances.push(this); lastSource = this }
  close() { this.closed = true }
  emit(payload: unknown) { this.onmessage?.({ data: JSON.stringify(payload) }) }
}

vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: {
    getAlertBriefingUrl: () => '/api/agent/briefing/alert?symbol=600519',
    getAlertReport: vi.fn(async () => null),
  },
}))

beforeEach(() => {
  FakeEventSource.instances = []
  lastSource = null
  vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('useAlertSSE 新帧', () => {
  it('reasoning 帧按 node 聚合为同一个步骤，文本累加', () => {
    const { start, reasoningSteps } = useAlertSSE()
    start('600519')
    lastSource!.emit({ type: 'reasoning', node: 'alert_scan', chunk: '我在核对' })
    lastSource!.emit({ type: 'reasoning', node: 'alert_scan', chunk: '资讯与盘口' })
    expect(reasoningSteps.value).toHaveLength(1)
    expect(reasoningSteps.value[0].node).toBe('alert_scan')
    expect(reasoningSteps.value[0].text).toBe('我在核对资讯与盘口')
    expect(reasoningSteps.value[0].status).toBe('streaming')
  })

  it('两个阶段产生两个步骤', () => {
    const { start, reasoningSteps } = useAlertSSE()
    start('600519')
    lastSource!.emit({ type: 'reasoning', node: 'alert_scan', chunk: 'A' })
    lastSource!.emit({ type: 'reasoning', node: 'alert_master', chunk: 'B' })
    expect(reasoningSteps.value.map(s => s.node)).toEqual(['alert_scan', 'alert_master'])
  })

  it('preview 帧写入 preview 状态', () => {
    const { start, preview } = useAlertSSE()
    start('600519')
    lastSource!.emit({
      type: 'preview',
      display_report: { summary: '异动结论', impact: '利好', keywords: ['涨价'] },
    })
    expect(preview.value?.summary).toBe('异动结论')
    expect(preview.value?.keywords).toEqual(['涨价'])
  })

  it('done 时把步骤收尾为 done 并补 endAt', () => {
    const { start, reasoningSteps } = useAlertSSE()
    start('600519')
    lastSource!.emit({ type: 'reasoning', node: 'alert_scan', chunk: 'A' })
    lastSource!.emit({ type: 'done' })
    expect(reasoningSteps.value[0].status).toBe('done')
    expect(reasoningSteps.value[0].endAt).toBeTypeOf('number')
  })

  it('error 时把步骤标记 failed', () => {
    const { start, reasoningSteps } = useAlertSSE()
    start('600519')
    lastSource!.emit({ type: 'reasoning', node: 'alert_scan', chunk: 'A' })
    lastSource!.emit({ type: 'error', message: '炸了' })
    expect(reasoningSteps.value[0].status).toBe('failed')
  })

  it('start() 重置 reasoningSteps 与 preview', () => {
    const { start, reasoningSteps, preview } = useAlertSSE()
    start('600519')
    lastSource!.emit({ type: 'reasoning', node: 'alert_scan', chunk: 'A' })
    lastSource!.emit({ type: 'preview', display_report: { summary: 'S' } })
    start('600519')
    expect(reasoningSteps.value).toEqual([])
    expect(preview.value).toBeNull()
  })
})