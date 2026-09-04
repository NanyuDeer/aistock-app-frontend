/**
 * 板块研判（sector-insight 聚合）辅助工具：候选匹配 + 本地日期。
 */
import type { SectorInsightCandidate, SectorInsightPrediction } from '@/shared/api/modules/agent'
import type { AttributionChain, AttributionChainChild } from '@/shared/api/modules/attributionChain'
import { expandConditionalBranches } from '@/shared/utils/conditionalForecast'

/** 条件化预判块（ConditionalForecastBlock）的输入形态（与 InsightCard.structured 结构性一致） */
export interface SectorStructuredForecast {
  horizons?: Array<{
    horizon: 'short' | 'mid' | 'long'
    remaining?: string
    /** 基准走势短语（4~6 字） */
    label?: string
    direction?: 'bullish' | 'bearish' | 'neutral'
    confidence?: 'high' | 'medium' | 'low'
  }>
  conditions?: Array<{
    horizon: 'short' | 'mid' | 'long'
    direction?: 'bullish' | 'bearish' | 'neutral'
    condition: string
    /** 路径短语名（两段式“状态 · 走势”） */
    label?: string
    scenario: string
    /** 简洁展示关键词（新数据携带） */
    keywords?: string[]
    /** 预判关键词（2026-09-03 起新数据携带：scenario 摘要，侧重方向+幅度） */
    scenario_keywords?: string[]
    met?: boolean | null
  }>
  dueLabel?: string
  verification?: 'pending' | 'hit' | 'miss' | null
}

/**
 * 板块预测 → 通用条件化预判块结构化数据。
 * 供板块洞见卡（SectorInsightCard）与板块四环列表（sector-loop）复用，避免两处映射漂移。
 */
export function sectorPredictionToStructured(p: SectorInsightPrediction | null | undefined): SectorStructuredForecast | null {
  if (!p || !p.present) return null
  return {
    horizons:
      p.horizons?.map((h) => ({
        horizon: h.horizon,
        remaining: h.remaining,
        label: h.label ?? undefined,
        direction: h.direction,
        confidence: h.confidence
      })) ?? [],
    conditions:
      (p.conditions ?? []).flatMap(expandConditionalBranches).map((c) => ({
        horizon: c.horizon,
        direction: c.direction,
        condition: c.condition,
        label: c.label ?? undefined,
        scenario: c.scenario,
        keywords: c.keywords ?? [],
        scenario_keywords: c.scenario_keywords ?? [],
        met: c.met ?? undefined
      })) ?? [],
    dueLabel: p.dueLabel ?? undefined,
    verification: p.verification ?? null
  }
}

/** 剥离交易所后缀（如 881101.TI → 881101） */
function stripExchangeSuffix(code: string): string {
  return code.replace(/\.TI$/i, '')
}

/**
 * 在板块洞见候选列表中匹配当前板块：
 * - code 命中优先：opts.code 为 6 位裸码时，比较 c.ts_code 去掉 .TI 后缀后 === code，
 *   或 c.ts_code === code + '.TI'（传入带后缀 code 同样兼容）；
 * - code 未命中/未提供 → 按 name 全等或双向包含命中；
 * - 均未命中返回 null。
 */
export function findSectorCandidate(
  list: SectorInsightCandidate[],
  opts: { name?: string; code?: string }
): SectorInsightCandidate | null {
  if (!list?.length) return null
  const { name, code } = opts

  if (code) {
    const bare = stripExchangeSuffix(code)
    const byCode = list.find(c =>
      stripExchangeSuffix(c.ts_code) === bare || c.ts_code === `${bare}.TI`
    )
    if (byCode) return byCode
  }

  if (!name) return null
  return list.find(c =>
    c.name === name || (name.includes(c.name) || c.name.includes(name))
  ) ?? null
}

/** 本地今日日期字符串（YYYY-MM-DD，设备本地时区，非 UTC） */
export function todayDateStr(): string {
  const d = new Date()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mo}-${dd}`
}

/**
 * 板块「大盘联动」（P1 chain-attribution，2026-09-04）：
 * 当前板块在当日大盘归因链中的角色数据，供板块洞见卡溯源行（InsightCard traceStructured）使用。
 */
export interface SectorMarketLink {
  /** 大盘一句话（chain.root.summary，如归因综述） */
  summary: string
  /** 大盘指数涨跌幅（chain.root.index_pct） */
  index_pct: number | null
  /** 本板块在链上的关系；null = 当日未入链（大盘主因中无本板块） */
  relation: 'self_driven' | 'market_follow' | null
  /** 本板块驱动一句话（入链时 = child.trace_summary） */
  driver: string
}

/** 关系徽文案：自驱动 / 跟随大盘；未入链/unknown → 空（不渲染徽） */
export function relationLabel(relation: AttributionChainChild['relation'] | null | undefined): string {
  if (relation === 'self_driven') return '自驱动'
  if (relation === 'market_follow') return '跟随大盘'
  return ''
}

/**
 * 由大盘归因链构建当前板块的「大盘联动」数据：
 * - 无链 → null（洞见卡溯源行回退板块四环文本形态）；
 * - 链存在 → 按板块名匹配 children（unknown/未命中 → relation=null 未入链语义）。
 */
export function buildMarketLink(
  chain: AttributionChain | null | undefined,
  sectorName: string
): SectorMarketLink | null {
  if (!chain) return null
  const node = (chain.children ?? []).find((c) => c.sector === sectorName)
  return {
    summary: chain.root?.summary?.trim() || '',
    index_pct: chain.root?.index_pct ?? null,
    relation: node?.relation && node.relation !== 'unknown' ? node.relation : null,
    driver: node?.trace_summary?.trim() || ''
  }
}

/** 演示用跟随分支候选（大盘联动 mock；避开当前板块防重名） */
const DEMO_PARTNER_SECTORS = ['券商', '白酒', '银行', '新能源']

/**
 * 演示用大盘归因链（2026-09-04，P1 演示）：真实大盘归因 18:30 收盘后才生成，演示前经
 * 板块详情 `?mock=1` 注入示意数据：聚焦板块（focusSector）为自驱动主因 + 一个跟随分支。
 * 仅用于前端演示，勿当真实数据（页面 mock 模式下会显示"演示模式"提示）。
 */
export function buildDemoAttributionChain(date: string, focusSector?: string): AttributionChain {
  const focus = focusSector?.trim()
  const partner = DEMO_PARTNER_SECTORS.find((s) => s !== focus) ?? '券商'
  const children: AttributionChain['children'] = []
  if (focus) {
    children.push({
      sector: focus,
      relation: 'self_driven',
      pct: -3.2,
      trace_summary: `${focus}突发利空事件落地，资金避险离场`
    })
  }
  children.push({
    sector: partner,
    relation: 'market_follow',
    pct: -0.6,
    trace_summary: '大盘情绪拖累，观望为主'
  })
  return {
    date,
    root: {
      type: 'market',
      date,
      summary: focus ? `大盘低开承压，${focus}事件异动拖累情绪` : '大盘低开承压，板块结构性分化',
      index_pct: -0.9
    },
    children
  }
}

/**
 * 演示用事件驱动板块预判（P2 新模型静态剧本，2026-09-04）：
 * 事件确认 → 预判在途（档位基准）→ 条件触发点亮（met:true）/ 未触发置灰（met:false）；
 * 验证不设固定日（dueLabel 提示），事件驱动、可提前兑现。
 * 经板块详情 `?mock=1` 注入洞见卡预判侧；仅用于前端演示，勿当真实数据。
 */
export function buildDemoEventForecast(focusSector?: string): SectorStructuredForecast {
  const focus = focusSector?.trim() || '该板块'
  return {
    horizons: [
      {
        horizon: 'short',
        remaining: '事件后 1-5 个交易日',
        label: '事件驱动走弱',
        direction: 'bearish',
        confidence: 'medium'
      }
    ],
    conditions: [
      {
        horizon: 'short',
        direction: 'bearish',
        label: '事件确认 · 承压',
        condition: '核心事件确认落地（演示数据）',
        keywords: ['事件确认'],
        scenario: `${focus}受核心事件驱动下探，短期承压（演示数据）`,
        scenario_keywords: ['承压'],
        met: true
      },
      {
        horizon: 'short',
        direction: 'bearish',
        label: '事件扩散 · 加码',
        condition: '事件沿产业链扩散（演示数据）',
        keywords: ['事件扩散'],
        scenario: `${focus}随事件沿产业链扩散，跌幅扩大（演示数据）`,
        scenario_keywords: ['跌幅扩大'],
        met: false
      }
    ],
    dueLabel: '无固定验证日',
    verification: 'pending'
  }
}
