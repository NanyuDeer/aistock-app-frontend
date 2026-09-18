import { describe, it, expect } from 'vitest'
import {
  buildSectorTags, buildActions, buildAdvice, buildDriversSentence, zoneLabel,
  type FgContext,
} from './fgAdvice'
import type { FgSectorBoard } from '@/shared/api/modules/fear-greed'

function ind(key: string, name: string, score: number): FgContext['indicators'][number] {
  return { key, name, score, raw: 0, desc: '', label: '', history: { dates: [], scores: [] } }
}
const FALLBACK = [
  { name: '防御性消费', desc: '刚需消费，业绩确定性高。' },
  { name: '医药生物', desc: '需求刚性。' },
  { name: '公用事业', desc: '现金流稳定。' },
]
const BOARD: FgSectorBoard = {
  availability: true, tradeDate: '2026-09-03', source: 'eastmoney',
  sectors: {
    topGainers: [{ tsCode: '1', name: '航运港口', pctChange: 6, netAmount: 8e8, leadStock: '海通发展' }],
    topInflows: [
      { tsCode: '2', name: '保险', pctChange: 2.5, netAmount: 9e8, leadStock: '中国太保' },
      { tsCode: '3', name: '电力', pctChange: 1.2, netAmount: 6e8, leadStock: '长江电力' },
      { tsCode: '4', name: '银行', pctChange: 0.8, netAmount: 5e8, leadStock: '招商银行' },
    ],
    topLosers: [{ tsCode: '5', name: '半导体', pctChange: -3, netAmount: -5e8, leadStock: '' }],
    topOutflows: [{ tsCode: '6', name: '光伏', pctChange: 3.5, netAmount: -9e8, leadStock: '' }],
  },
}
function ctx(composite: number, list: { key: string; name: string; score: number }[]): FgContext {
  return { composite, indicators: list.map((i) => ind(i.key, i.name, i.score)), board: BOARD }
}

describe('zoneLabel', () => {
  it('五档划分', () => {
    expect(zoneLabel(10)).toBe('冰点')
    expect(zoneLabel(30)).toBe('寒冷')
    expect(zoneLabel(50)).toBe('常温')
    expect(zoneLabel(70)).toBe('温热')
    expect(zoneLabel(90)).toBe('沸点')
  })
})

describe('buildSectorTags', () => {
  it('寒冷档：从净流入榜选流入方向，不用涨幅榜', () => {
    const tags = buildSectorTags(ctx(30, []), FALLBACK)
    expect(tags.length).toBe(3)
    expect(tags.map((t) => t.name)).toEqual(['保险', '电力', '银行'])
    expect(tags.every((t) => t.kind === 'flow-in')).toBe(true)
    expect(tags[0].desc).toContain('保险')
    expect(tags[0].desc).toContain('9亿')
  })

  it('温热档：2 流入 + 1 高位流出警示', () => {
    const tags = buildSectorTags(ctx(70, []), FALLBACK)
    expect(tags.length).toBe(3)
    expect(tags.filter((t) => t.kind === 'flow-in').length).toBe(2)
    expect(tags.filter((t) => t.kind === 'warning').length).toBe(1)
    expect(tags.find((t) => t.kind === 'warning')?.name).toBe('光伏')
  })

  it('行情不可用：回退 fallback', () => {
    const noBoard: FgContext = { composite: 30, indicators: [], board: { ...BOARD, availability: false } }
    const tags = buildSectorTags(noBoard, FALLBACK)
    expect(tags.map((t) => t.name)).toEqual(['防御性消费', '医药生物', '公用事业'])
    expect(tags.every((t) => t.kind === 'fallback')).toBe(true)
  })

  it('温热档：净流出警示用“主力净流出 + 绝对金额”措辞', () => {
    const tags = buildSectorTags(ctx(70, []), FALLBACK)
    const warn = tags.find((t) => t.kind === 'warning')
    expect(warn?.name).toBe('光伏')
    expect(warn?.desc).toContain('主力净流出 9亿')
    expect(warn?.desc).not.toContain('主力净流入')
  })

  it('温热档：净流出榜无高位股时回退涨幅榜警示，文案不与净流入冲突', () => {
    const board: FgSectorBoard = {
      ...BOARD,
      sectors: { ...BOARD.sectors, topOutflows: [{ ...BOARD.sectors.topOutflows[0], pctChange: 1 }] },
    }
    const tags = buildSectorTags({ composite: 70, indicators: [], board }, FALLBACK)
    const warn = tags.find((t) => t.kind === 'warning')
    expect(warn?.name).toBe('航运港口')
    expect(warn?.desc).toContain('主力净流入 8亿')
    expect(warn?.desc).not.toContain('资金流出')
  })
})

describe('buildActions / buildAdvice / buildDriversSentence', () => {
  it('北向大幅流出：actions 含外资要点，advice 提到主驱动，drivers 含指标中文名', () => {
    const c = ctx(30, [
      { key: 'north_flow', name: '北向资金', score: 8 },
      { key: 'seal_rate', name: '封板率', score: 60 },
      { key: 'breadth', name: '股价强度', score: 52 },
    ])
    const actions = buildActions(c)
    expect(actions.length).toBe(3)
    expect(actions.some((a) => a.includes('外资'))).toBe(true)
    expect(buildAdvice(c)).toContain('北向资金')
    expect(buildDriversSentence(c)).toContain('北向资金')
  })

  it('零命中也恒返回恰好 3 条互不全等的要点（常温 50 / 寒冷 30 / 沸点 90）', () => {
    for (const composite of [50, 30, 90]) {
      const actions = buildActions(ctx(composite, []))
      expect(actions.length).toBe(3)
      expect(new Set(actions).size).toBe(3)
    }
  })

  it('寒冷零命中：不出现两条“控制仓位”开头的语义重复要点', () => {
    const actions = buildActions(ctx(30, []))
    expect(actions.filter((a) => a.startsWith('控制仓位'))).toHaveLength(1)
  })

  it('多条命中（≥2）仍恒返回 3 条互不全等的要点', () => {
    const c = ctx(50, [
      { key: 'north_flow', name: '北向资金', score: 8 },
      { key: 'breadth', name: '股价强度', score: 20 },
    ])
    const actions = buildActions(c)
    expect(actions.length).toBe(3)
    expect(new Set(actions).size).toBe(3)
  })
})
