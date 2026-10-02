import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventItem, EventTimelineItem } from '../types'
import { isPureMarketEvent } from '../constants'

// mock eventApi：eventService 依赖其 getEventList（翻页拉传导历史）与 getEventDetail，
// 避免在测试环境加载真实 request/网络层。
const getEventListMock = vi.fn()
vi.mock('./eventApi', () => ({
  getEventList: (...a: unknown[]) => getEventListMock(...a),
  getEventDetail: vi.fn(),
}))

import { buildTimelineHistoryRows, getTimelineHistoryRows, getEntityRows } from './eventService'

/** 构造最小 EventItem 夹具（affectedIndustries 空数组，其余按需覆盖） */
function makeEvent(overrides: Partial<EventItem>): EventItem {
  return {
    eventId: 'evt-1',
    title: '测试事件',
    publishTime: '2026-09-29',
    source: '',
    eventType: '产业政策',
    affectedIndustries: [],
    aiSummary: 'AI摘要',
    isFollowed: false,
    ...overrides,
  } as EventItem
}

/** 构造最小 EventTimelineItem 夹具 */
function makeTimelineItem(overrides: Partial<EventTimelineItem>): EventTimelineItem {
  return {
    eventId: 't-1',
    title: 'T',
    summary: 'S',
    date: '2026-10-01',
    eventStartTime: '2026-10-01T00:00:00Z',
    eventEndTime: null,
    eventStatus: 'scheduled',
    sourceType: '',
    timeSource: '',
    timeConfidence: null,
    sourceEventId: null,
    impactSectors: [],
    ...overrides,
  } as EventTimelineItem
}

describe('isPureMarketEvent 纯行情判据（现象词命中 && 原因词全不命中）', () => {
  it('现象词命中且无原因词 → true（纯行情，剔除）', () => {
    expect(isPureMarketEvent('科创板收评：PCB与算力租赁概念局部走强')).toBe(true)
    expect(isPureMarketEvent('三大指数缩量小幅上涨 沪深成交额仅1.41万亿')).toBe(true)
  })

  it('现象词但讲清原因（原因词豁免）→ false（放行）', () => {
    // 命中现象词「涨停」，同时命中原因词「收购」→ 不讲原因都会误杀
    expect(isPureMarketEvent('广汽集团拟收购一汽丰田50%股权 复牌一字涨停')).toBe(false)
  })

  it('无现象词（纯原因类事件）→ false', () => {
    expect(isPureMarketEvent('证监会推进科创板1+6政策落地并发布创业板改革方案')).toBe(false)
  })

  it('空标题/空串 → false（不误杀无标题数据）', () => {
    expect(isPureMarketEvent('')).toBe(false)
    expect(isPureMarketEvent('  ')).toBe(false)
  })
})

describe('buildTimelineHistoryRows 历史行映射', () => {
  const TODAY = '2026-09-29'

  it('importance < 4 或 undefined → 剔除；4/5 保留', () => {
    const rows = buildTimelineHistoryRows([
      makeEvent({ eventId: 'e3', title: '某政策落地', importance: 3, publishTime: '2026-09-28' }),
      makeEvent({ eventId: 'e4', title: '某监管披露', importance: 4, publishTime: '2026-09-28' }),
      makeEvent({ eventId: 'e5', title: '某收购完成', importance: 5, publishTime: '2026-09-28' }),
      makeEvent({ eventId: 'undef', title: '某无星', importance: undefined, publishTime: '2026-09-28' }),
    ], TODAY)
    expect(rows.map((r) => r.eventId)).toEqual(['e4', 'e5'])
  })

  it('≥4 星但纯行情（现象词命中且无原因词）→ 剔除', () => {
    const rows = buildTimelineHistoryRows([
      makeEvent({ eventId: 'p1', title: '科创板收评：PCB与算力租赁概念局部走强', importance: 4, publishTime: '2026-09-28' }),
      makeEvent({ eventId: 'p2', title: '三大指数缩量小幅上涨 沪深成交额仅1.41万亿', importance: 4, publishTime: '2026-09-28' }),
    ], TODAY)
    expect(rows).toEqual([])
  })

  it('≥4 星且讲清原因（原因词豁免）→ 保留，防止误杀回归', () => {
    const rows = buildTimelineHistoryRows([
      makeEvent({ eventId: 'g1', title: '广汽集团拟收购一汽丰田50%股权 复牌一字涨停', importance: 4, publishTime: '2026-09-28' }),
      makeEvent({ eventId: 'z1', title: '证监会推进科创板1+6政策落地并发布创业板改革方案', importance: 4, publishTime: '2026-09-28' }),
    ], TODAY)
    expect(rows.map((r) => r.eventId)).toEqual(['g1', 'z1'])
  })

  it('映射正确：date=前10位、eventStartTime=publishTime、isGi、sector 取 chain_summary[0]、summary=""/isFuture=false', () => {
    const row = buildTimelineHistoryRows([
      makeEvent({
        eventId: 'm1',
        title: '某政策发布',
        importance: 4,
        globalImportanceRank: 1,
        publishTime: '2026-09-29T15:06:07.939323+08:00',
        chain_summary: [{ industry: '半导体', direction: 'bullish', impactStrength: 0.9, reason: '需求增长' }],
      }),
    ], TODAY)[0]
    expect(row.date).toBe('2026-09-29')
    expect(row.eventStartTime).toBe('2026-09-29T15:06:07.939323+08:00')
    expect(row.isGi).toBe(true)
    expect(row.sectorName).toBe('半导体')
    expect(row.sectorDirection).toBe('bullish')
    expect(row.summary).toBe('')
    expect(row.importance).toBe(4)
    expect(row.isFuture).toBe(false)
  })

  it('chain_summary 为空数组 → sectorName/sectorDirection 为 null（标签不渲染、不崩）', () => {
    const row = buildTimelineHistoryRows([
      makeEvent({ eventId: 'n1', title: '某披露', importance: 5, publishTime: '2026-09-28' }),
    ], TODAY)[0]
    expect(row.sectorName).toBeNull()
    expect(row.sectorDirection).toBeNull()
  })

  it('date > today → 剔除（历史段只保留 ≤ 今天）', () => {
    const rows = buildTimelineHistoryRows([
      makeEvent({ eventId: 'f1', title: '某未来披露', importance: 4, publishTime: '2026-10-05' }),
    ], TODAY)
    expect(rows).toEqual([])
  })

  it('非 bullish/bearish 的 direction 归一为 neutral', () => {
    const row = buildTimelineHistoryRows([
      makeEvent({
        eventId: 'd1',
        title: '某事件',
        importance: 4,
        publishTime: '2026-09-28',
        chain_summary: [{ industry: '银行', direction: 'mixed', impactStrength: 0.2, reason: '' }],
      }),
    ], TODAY)[0]
    expect(row.sectorDirection).toBe('neutral')
  })

  it('publishTime 缺失/异常（长度 <10）的历史项被跳过，不产生空日期分组行', () => {
    const rows = buildTimelineHistoryRows([
      makeEvent({ eventId: 'empty', title: '某政策', importance: 4, publishTime: '' }),
      makeEvent({ eventId: 'short', title: '某披露', importance: 4, publishTime: '2026-0' }),
      makeEvent({ eventId: 'ok', title: '某落地', importance: 4, publishTime: '2026-09-28' }),
    ], TODAY)
    expect(rows.map((r) => r.eventId)).toEqual(['ok'])
    expect(rows).not.toContainEqual(expect.objectContaining({ date: '' }))
    expect(rows).not.toContainEqual(expect.objectContaining({ date: '2026-0' }))
  })
})

describe('getTimelineHistoryRows 翻页拉取', () => {
  beforeEach(() => {
    getEventListMock.mockReset()
  })

  it('第 2 页早于 earliestDate（今天-30）→ 停止且不越界', async () => {
    getEventListMock
      .mockResolvedValueOnce({ events: [makeEvent({ eventId: 'e1', title: '某披露', importance: 4, publishTime: '2026-09-28' })], total: 2, page: 1, pageSize: 5, hasMore: true })
      .mockResolvedValueOnce({ events: [makeEvent({ eventId: 'e2', title: '某披露', importance: 4, publishTime: '2026-09-20' })], total: 2, page: 2, pageSize: 5, hasMore: false })

    const rows = await getTimelineHistoryRows({ earliestDate: '2026-09-25', pageSize: 5, today: '2026-09-29' })
    expect(getEventListMock).toHaveBeenCalledTimes(2)
    expect(rows.map((r) => r.eventId)).toEqual(['e1'])
  })

  it('按 eventId 去重（跨页重复只保留 1 条）', async () => {
    getEventListMock
      .mockResolvedValueOnce({ events: [makeEvent({ eventId: 'e1', title: '某披露', importance: 4, publishTime: '2026-09-28' })], total: 2, page: 1, pageSize: 5, hasMore: true })
      .mockResolvedValueOnce({ events: [makeEvent({ eventId: 'e1', title: '某披露', importance: 4, publishTime: '2026-09-26' })], total: 2, page: 2, pageSize: 5, hasMore: false })

    const rows = await getTimelineHistoryRows({ earliestDate: '2026-09-25', pageSize: 5, today: '2026-09-29' })
    expect(rows.filter((r) => r.eventId === 'e1')).toHaveLength(1)
  })

  it('getEventList 抛错 → 返回 []（历史段失败不抛到页面，避免整轴白屏）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    getEventListMock.mockRejectedValue(new Error('network'))
    const rows = await getTimelineHistoryRows({ earliestDate: '2026-09-25', pageSize: 5, today: '2026-09-29' })
    expect(rows).toEqual([])
    warnSpy.mockRestore()
  })

  it('本页最新日仍早于下界（整页已出窗）→ 停止，且只请求到该页', async () => {
    getEventListMock
      .mockResolvedValueOnce({ events: [makeEvent({ eventId: 'e1', title: '某披露', importance: 4, publishTime: '2026-09-28' })], total: 2, page: 1, pageSize: 5, hasMore: true })
      .mockResolvedValueOnce({ events: [makeEvent({ eventId: 'e2', title: '某披露', importance: 4, publishTime: '2026-09-20' })], total: 2, page: 2, pageSize: 5, hasMore: true })

    const rows = await getTimelineHistoryRows({ earliestDate: '2026-09-25', pageSize: 5, today: '2026-09-29' })
    expect(getEventListMock).toHaveBeenCalledTimes(2)
    expect(rows.map((r) => r.eventId)).toEqual(['e1'])
  })

  it('同页含错序出窗旧事件时不得提前判停（min/max 判别性用例）', async () => {
    // 判别性：本页同时含「出窗旧事件(09-20)」与「窗内事件(09-28)」。
    // 若判停按本页【最旧】日（< 下界即停）→ 第 1 页就误停，漏掉第 2 页的窗内事件；
    // 按本页【最新】日（整页出窗才停）→ 继续翻页，窗内事件不丢。
    getEventListMock
      .mockResolvedValueOnce({
        events: [
          makeEvent({ eventId: 'stale', title: '某披露', importance: 4, publishTime: '2026-09-20' }),
          makeEvent({ eventId: 'e1', title: '某披露', importance: 4, publishTime: '2026-09-28' }),
        ],
        total: 3,
        page: 1,
        pageSize: 5,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        events: [makeEvent({ eventId: 'e2', title: '某落地', importance: 4, publishTime: '2026-09-26' })],
        total: 3,
        page: 2,
        pageSize: 5,
        hasMore: false,
      })

    const rows = await getTimelineHistoryRows({ earliestDate: '2026-09-25', pageSize: 5, today: '2026-09-29' })
    expect(getEventListMock).toHaveBeenCalledTimes(2)
    expect(rows.map((r) => r.eventId)).toEqual(['e1', 'e2'])
  })

  it('首页 hasMore=false → 判停，只请求 1 页', async () => {
    getEventListMock.mockResolvedValueOnce({ events: [makeEvent({ eventId: 'e1', title: '某披露', importance: 5, publishTime: '2026-09-28' })], total: 1, page: 1, pageSize: 5, hasMore: false })

    const rows = await getTimelineHistoryRows({ earliestDate: '2026-09-25', pageSize: 5, today: '2026-09-29' })
    expect(getEventListMock).toHaveBeenCalledTimes(1)
    expect(rows.map((r) => r.eventId)).toEqual(['e1'])
  })
})

describe('getEntityRows 实体源（未来段）行映射', () => {
  it('EventTimelineItem → TimelineRow（isFuture=true，无 GI/行业，保留摘要）', () => {
    const rows = getEntityRows([makeTimelineItem({})])
    expect(rows[0]).toMatchObject({
      eventId: 't-1',
      date: '2026-10-01',
      eventStartTime: '2026-10-01T00:00:00Z',
      isFuture: true,
      isGi: false,
      sectorName: null,
      sectorDirection: null,
      summary: 'S',
    })
  })

  it('未来行胶囊回归：impactSectors[0] → sectorName，无方向 → sectorDirection=null', () => {
    const rows = getEntityRows([makeTimelineItem({ impactSectors: ['银行'] })])
    expect(rows[0].sectorName).toBe('银行')
    expect(rows[0].sectorDirection).toBeNull()
  })

  it('未来行 impactSectors 为空数组 → sectorName=null（标签不渲染）', () => {
    const rows = getEntityRows([makeTimelineItem({ impactSectors: [] })])
    expect(rows[0].sectorName).toBeNull()
    expect(rows[0].sectorDirection).toBeNull()
  })
})
