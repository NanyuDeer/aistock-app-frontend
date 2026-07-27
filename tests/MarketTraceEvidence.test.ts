/**
 * MarketTraceEvidence 组件渲染测试 + normalizeTrace 单元测试
 *
 * 覆盖 trace 正规化、正常/空来源/降级状态及证据字段展示。
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MarketTraceEvidence from '@/pages-sub-app/chat/MarketTraceEvidence.vue'
import { normalizeTrace, useMarketTraceQa } from '@/shared/utils/useMarketTraceQa'
import { agentApi, type MarketTraceQaTrace } from '@/shared/api/modules/agent'

// ========== normalizeTrace 单元测试 ==========

describe('normalizeTrace', () => {
  it('正常 trace 保持不变', () => {
    const normal: MarketTraceQaTrace = {
      artifact_id: 'art-001',
      sources: [{ source_id: 's1', title: '财联社', kind: 'market_fact', provider: 'cls' }],
      as_of: '2026-07-24T15:00:00+08:00',
      confidence: 'high',
      uncertainty: ['量能不足'],
      degraded: false,
      degraded_reason: null,
    }
    const result = normalizeTrace(normal)
    expect(result.artifact_id).toBe('art-001')
    expect(result.sources).toHaveLength(1)
    expect(result.as_of).toBe('2026-07-24T15:00:00+08:00')
    expect(result.confidence).toBe('high')
    expect(result.uncertainty).toEqual(['量能不足'])
    expect(result.degraded).toBe(false)
    expect(result.degraded_reason).toBeNull()
  })

  it('null trace → 完整 degraded trace', () => {
    const result = normalizeTrace(null)
    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('服务端未返回 trace 元数据')
    expect(result.sources).toEqual([])
    expect(result.uncertainty).toEqual([])
    expect(result.confidence).toBe('low')
    expect(result.artifact_id).toBe('')
    expect(result.as_of).toBe('')
  })

  it('undefined trace → 完整 degraded trace', () => {
    const result = normalizeTrace(undefined)
    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('服务端未返回 trace 元数据')
  })

  it('残缺 trace（关键字段全空）→ 标记降级', () => {
    const result = normalizeTrace({
      artifact_id: '',
      sources: [],
      as_of: '',
      confidence: 'medium',
      uncertainty: [],
      degraded: false,
      degraded_reason: null,
    })
    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('trace 缺少工件标识或截至时间，证据不可用')
  })

  it('残缺 trace（字段类型错误）→ 安全默认值', () => {
    const result = normalizeTrace({
      artifact_id: 123,
      sources: 'not-an-array',
      as_of: null,
      confidence: 'invalid',
      uncertainty: undefined,
      degraded: 'yes',
      degraded_reason: 42,
    })
    expect(result.artifact_id).toBe('')
    expect(result.sources).toEqual([])
    expect(result.as_of).toBe('')
    expect(result.confidence).toBe('low')
    expect(result.uncertainty).toEqual([])
    expect(result.degraded).toBe(true)
  })

  it('有 artifact_id 但缺少 as_of → 标记降级', () => {
    const result = normalizeTrace({
      artifact_id: 'art-002',
      sources: [],
      as_of: '',
      confidence: 'medium',
      uncertainty: [],
      degraded: false,
      degraded_reason: null,
    })
    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('trace 缺少工件标识或截至时间，证据不可用')
    expect(result.artifact_id).toBe('art-002')
  })

  it('有 as_of 但缺少 artifact_id → 标记降级', () => {
    const result = normalizeTrace({
      artifact_id: '',
      sources: [],
      as_of: '2026-07-24T15:00:00+08:00',
      confidence: 'medium',
      uncertainty: [],
      degraded: false,
      degraded_reason: null,
    })
    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('trace 缺少工件标识或截至时间，证据不可用')
  })

  it('元数据完整但 sources 为空 → 不标记降级', () => {
    const result = normalizeTrace({
      artifact_id: 'art-004',
      sources: [],
      as_of: '2026-07-24T15:00:00+08:00',
      confidence: 'medium',
      uncertainty: [],
      degraded: false,
      degraded_reason: null,
    })
    expect(result.degraded).toBe(false)
    expect(result.degraded_reason).toBeNull()
  })

  it('服务端已标记 degraded → 保留并补充原因', () => {
    const result = normalizeTrace({
      artifact_id: 'art-003',
      sources: [],
      as_of: '2026-07-24',
      confidence: 'low',
      uncertainty: [],
      degraded: true,
      degraded_reason: null,
    })
    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('数据降级')
  })

  it('服务端 degraded_reason 优先于客户端元数据缺失原因', () => {
    const result = normalizeTrace({
      artifact_id: '',
      sources: [],
      as_of: '',
      confidence: 'low',
      uncertainty: [],
      degraded: true,
      degraded_reason: '上游工件校验失败',
    })
    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('上游工件校验失败')
  })
})

describe('useMarketTraceQa', () => {
  it('向 API 透传固定的复盘日期', async () => {
    const send = vi.spyOn(agentApi, 'sendMarketTraceQaMessage').mockResolvedValue({
      content: '复盘结论',
      session_id: 'mtqa-session-1',
      trace: {
        artifact_id: 'review-1',
        sources: [],
        as_of: '2026-07-24T15:00:00+08:00',
        confidence: 'medium',
        uncertainty: [],
        degraded: false,
        degraded_reason: null,
      },
    })
    const qa = useMarketTraceQa('2026-07-24')

    await qa.send('大盘为何涨跌')

    expect(send).toHaveBeenCalledWith(
      '大盘为何涨跌',
      '2026-07-24',
      expect.stringMatching(/^mtqa_/),
    )
    send.mockRestore()
  })
})

// ========== MarketTraceEvidence 组件渲染测试 ==========

describe('MarketTraceEvidence 组件渲染', () => {
  it('正常 trace → 展示所有字段', () => {
    const trace: MarketTraceQaTrace = {
      artifact_id: 'art-001',
      sources: [
        { source_id: 's1', title: '财联社电报', kind: 'market_fact', provider: 'cls' },
        { source_id: 's2', title: '事件证据A', kind: 'event_evidence', provider: 'internal' },
      ],
      as_of: '2026-07-24T15:00:00+08:00',
      confidence: 'high',
      uncertainty: ['量能不足', '外围市场波动'],
      degraded: false,
      degraded_reason: null,
    }
    const wrapper = mount(MarketTraceEvidence, { props: { trace } })
    const html = wrapper.html()

    expect(html).toContain('证据溯源')
    expect(html).toContain('高置信度')
    expect(html).toContain('2026-07-24T15:00:00+08:00')
    expect(html).toContain('财联社电报')
    expect(html).toContain('事件证据A')
    expect(html).toContain('市场事实')
    expect(html).toContain('事件证据')
    expect(html).toContain('cls')
    expect(html).toContain('internal')
    expect(html).toContain('s1')
    expect(html).toContain('s2')
    expect(html).toContain('量能不足')
    expect(html).toContain('外围市场波动')
    expect(html).toContain('art-001')
    expect(html).toContain('未降级')
    expect(html).not.toContain('degraded-banner')
  })

  it('正常空来源 trace → 展示空态且不降级', () => {
    const trace = normalizeTrace({
      artifact_id: 'art-empty',
      sources: [],
      as_of: '2026-07-24T15:00:00+08:00',
      confidence: 'medium',
      uncertainty: [],
      degraded: false,
      degraded_reason: null,
    })
    const wrapper = mount(MarketTraceEvidence, { props: { trace } })
    const html = wrapper.html()

    expect(html).toContain('2026-07-24T15:00:00+08:00')
    expect(html).toContain('无可用来源')
    expect(html).toContain('未降级')
    expect(html).toContain('无已知未解决问题')
    expect(html).not.toContain('degraded-banner')
  })

  it('缺 trace（null → normalized）→ 展示降级原因', () => {
    const trace = normalizeTrace(null)
    const wrapper = mount(MarketTraceEvidence, { props: { trace } })
    const html = wrapper.html()

    // 证据区始终展示
    expect(html).toContain('证据溯源')
    expect(html).toContain('低置信度')
    // 降级横幅展示
    expect(html).toContain('degraded-banner')
    expect(html).toContain('服务端未返回 trace 元数据')
    // 无可用来源
    expect(html).toContain('无可用来源')
    // 降级状态行
    expect(html).toContain('无法验证：服务端未返回 trace 元数据')
  })

  it('表面正常但缺少必需元数据 → normalized 后展示降级原因', () => {
    const trace = normalizeTrace({
      artifact_id: 'art-missing-as-of',
      sources: [],
      as_of: '',
      confidence: 'medium',
      uncertainty: [],
      degraded: false,
      degraded_reason: null,
    })
    const wrapper = mount(MarketTraceEvidence, { props: { trace } })
    const html = wrapper.html()

    expect(html).toContain('证据溯源')
    expect(html).toContain('degraded-banner')
    expect(html).toContain('trace 缺少工件标识或截至时间，证据不可用')
    expect(html).toContain('无可用来源')
    expect(html).toContain('截至时间未验证')
    expect(html).toContain('无法验证')
  })

  it('明确降级 trace → 展示横幅、原因和不可验证状态', () => {
    const trace: MarketTraceQaTrace = {
      artifact_id: '',
      sources: [],
      as_of: '',
      confidence: 'low',
      uncertainty: [],
      degraded: true,
      degraded_reason: '上游证据服务不可用',
    }
    const wrapper = mount(MarketTraceEvidence, { props: { trace } })
    const html = wrapper.html()

    expect(html).toContain('证据溯源')
    expect(html).toContain('degraded-banner')
    expect(html).toContain('上游证据服务不可用')
    expect(html).toContain('截至时间未验证')
    expect(html).toContain('无法验证：上游证据服务不可用')
    expect(html).toContain('无可用来源')
  })
})
