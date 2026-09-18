/**
 * 板块研判（sector-insight 聚合）辅助工具：候选匹配 + 本地日期。
 */
import type { SectorInsightCandidate, SectorInsightPrediction } from '@/shared/api/modules/agent'
import type { AttributionChain, AttributionChainChild, AttributionChainEvent, AttributionChainExtraction } from '@/shared/api/modules/attributionChain'
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
  /** 本板块在链上的涨跌幅（未入链 → null）；市场洞见主因卡列表按 |pct| 降序用（spec §7.1） */
  pct: number | null
  /** 链上事件节点（spec §3.2-4；未入链/无命中/旧链 → []，前端按无事件渲染） */
  events: AttributionChainEvent[]
  /** 链级弱依据（root.evidence_weak=true：当日大盘未确认主因，2026-09-17 R16） */
  chainWeak: boolean
  /** 本板块的兜底来源标记（未入链/正常日 → null）；展示文案由 extractionWeakLabel 单点产出 */
  extraction: AttributionChainExtraction | null
}

/** 关系徽文案：自驱动 / 跟随大盘；未入链/unknown → 空（不渲染徽） */
export function relationLabel(relation: AttributionChainChild['relation'] | null | undefined): string {
  if (relation === 'self_driven') return '自驱动'
  if (relation === 'market_follow') return '跟随大盘'
  return ''
}

/** 板块名归一化用的空白/括号与常见后缀（与 app-api `ThsBoardService.normName` 同口径） */
const SECTOR_SPACE_RE = /[\s（）()]/g
const SECTOR_SUFFIX_RE = /（A股）|\(A股\)|概念$|板块$|行业$|产业链$/g

/**
 * 板块名归一化（去空白/括号 + 去「概念/板块/行业/产业链」后缀 + 小写）。
 * 用途：桥接两侧命名口径——链 `children[].sector` 是复盘报告里的原始板块名，
 * 候选 `name` 是 app-api `resolveBoardName` 归一后的权威名，可能差一个后缀或空格。
 */
export function normalizeSectorName(name: string): string {
  return String(name ?? '').replace(SECTOR_SPACE_RE, '').replace(SECTOR_SUFFIX_RE, '').toLowerCase()
}

/**
 * 在当日链 children 中定位板块节点（R14 匹配优先级，2026-09-17 升级）：
 * ① `ts_code` 精确（去交易所后缀比较）→ ② `sector_std` 精确（归一化权威名） →
 * ③ `sector` 精确（复盘报告原始名）→ ④ 现有归一化比较（`sector` 优先，其次 `sector_std`）。
 * 起因：链 `children[].sector` 是复盘原文名、候选是 THS 权威名，仅靠"精确名 → 归一化名"
 * 会出现"有链但角色徽/驱动句不显示"；链路侧已补 `ts_code`（快照行码）与 `sector_std`。
 * **不做包含匹配**（"半导体" 与 "半导体材料" 是不同板块，包含匹配会误连；对比 `findSectorCandidate`
 * 的包含匹配用于用户手输板块名的宽松检索，场景不同）。
 */
export function findChainChild(
  chain: AttributionChain | null | undefined,
  sectorName: string,
  opts?: { code?: string | null }
): AttributionChainChild | null {
  const children = chain?.children ?? []
  if (!children.length) return null

  const code = opts?.code?.trim()
  if (code) {
    const bare = stripExchangeSuffix(code)
    const byCode = children.find((c) => {
      const t = c.ts_code?.trim()
      return Boolean(t) && stripExchangeSuffix(t as string) === bare
    })
    if (byCode) return byCode
  }

  const name = sectorName?.trim()
  if (!name) return null
  const exact = children.find((c) => c.sector_std === name) ?? children.find((c) => c.sector === name)
  if (exact) return exact
  const norm = normalizeSectorName(name)
  if (!norm) return null
  return (
    children.find((c) => normalizeSectorName(c.sector) === norm) ??
    children.find((c) => normalizeSectorName(c.sector_std ?? '') === norm) ??
    null
  )
}

/**
 * 板块级弱依据标记文案（2026-09-17 R16，单点口径）：
 * - `extraction.weak !== true` → ''（老数据/正常日/未入链 → 不渲染任何标记）；
 * - `source === 'snapshot'` → 「无归因依据」（纯快照异动兜底，无归因理由）；
 * - 其余（`candidate_claim` 等）→ 「依据较弱」。
 */
export function extractionWeakLabel(extraction: AttributionChainExtraction | null | undefined): string {
  if (extraction?.weak !== true) return ''
  return extraction.source === 'snapshot' ? '无归因依据' : '依据较弱'
}

/**
 * 「未确认驱动原因」判定（2026-09-18 R17，单点口径）：
 * 驱动句（`trace_summary`）去空白后为空、或命中中性/未确认表述 → 该归因节点属"未确认驱动原因"，不展示。
 *
 * **为什么无条件按摘要判、不看 `events[]`**：当前 `events[]` 里常是「沪指跌0.41%…」「A股收評」
 * 这类**行情综述（现象）**，不是驱动原因；把它们当作归因理由会让用户误以为已归因。
 * 消费方：市场洞见「今日影响大盘的主要板块」卡列表 + 大盘归因链树（AttributionChainView）children。
 */
const UNCONFIRMED_ATTRIBUTION_RE = /未确认驱动原因|证据不足[，,]?\s*未确认主因/

export function isUnconfirmedAttribution(traceSummary: string | null | undefined): boolean {
  const s = String(traceSummary ?? '').replace(/\s+/g, '')
  if (!s) return true
  return UNCONFIRMED_ATTRIBUTION_RE.test(s)
}

/**
 * 由大盘归因链构建当前板块的「大盘联动」数据：
 * - 无链 → null（洞见卡溯源行回退板块四环文本形态）；
 * - 链存在 → 按板块名/代码匹配 children（ts_code → sector_std → sector → 归一化；
 *   unknown/未命中 → relation=null 未入链语义）。
 */
export function buildMarketLink(
  chain: AttributionChain | null | undefined,
  sectorName: string,
  opts?: { code?: string | null }
): SectorMarketLink | null {
  if (!chain) return null
  const node = findChainChild(chain, sectorName, opts)
  return {
    summary: chain.root?.summary?.trim() || '',
    index_pct: chain.root?.index_pct ?? null,
    relation: node?.relation && node.relation !== 'unknown' ? node.relation : null,
    driver: node?.trace_summary?.trim() || '',
    pct: node?.pct ?? null,
    events: node?.events ?? [],
    chainWeak: chain.root?.evidence_weak === true,
    extraction: node?.extraction ?? null
  }
}

/**
 * 市场洞见「今日影响大盘的主要板块」卡列表排序（spec §7.1）：
 * 自驱动优先 → 按 |涨跌幅| 降序（涨跌幅取链上该板块 pct；未入链无 pct → 排末尾）。
 * 同组同 |pct| 保持入参原序（显式带原序兜底，不依赖引擎排序稳定性）。
 * 返回 `{ candidate, marketLink }` 对，避免页面二次匹配（口径单点）。
 */
export function rankSectorCandidatesByChain(
  candidates: SectorInsightCandidate[],
  chain: AttributionChain | null | undefined
): SectorInsightRow[] {
  const rows = candidates.map((candidate, index) => ({
    candidate,
    index,
    // R14：先按候选 ts_code 精确匹配链上快照行码（修复"有链但角色徽不显示"），未命中回退名称口径
    marketLink: buildMarketLink(chain, candidate.name, { code: candidate.ts_code })
  }))
  // 自驱动 = 0，其余（跟随大盘/未入链）= 1
  const rank = (link: SectorMarketLink | null): number => (link?.relation === 'self_driven' ? 0 : 1)
  // 无 pct（未入链/链上 pct 缺失）→ -1，天然排在所有真实 |pct| 之后（避免 -Infinity 相减出 NaN）
  const absPct = (link: SectorMarketLink | null): number => (link?.pct == null ? -1 : Math.abs(link.pct))
  rows.sort((a, b) => {
    const byRank = rank(a.marketLink) - rank(b.marketLink)
    if (byRank !== 0) return byRank
    const byPct = absPct(b.marketLink) - absPct(a.marketLink)
    if (byPct !== 0) return byPct
    return a.index - b.index
  })
  return rows.map(({ candidate, marketLink }) => ({ candidate, marketLink }))
}

/** 主因卡行：聚合候选 + 该候选在当日链上的大盘联动（排序与展示同源） */
export interface SectorInsightRow {
  candidate: SectorInsightCandidate
  marketLink: SectorMarketLink | null
}

/**
 * 行驱动句（`isUnconfirmedAttribution` 的输入口径单点）：
 * 链上驱动句优先（区块已改为以链 children 为准），未入链/链上无驱动句时回退候选溯源主句。
 */
export function rowDriverSummary(row: SectorInsightRow): string {
  return row.marketLink?.driver?.trim() || row.candidate.trace?.summary?.trim() || ''
}

/**
 * 链节点 ↔ 板块洞见候选匹配（2026-09-18 R17）——`findChainChild` 的**反向复用**，
 * 优先级与 R14 完全一致：① `ts_code`（去交易所后缀）→ ② `sector_std` 精确 →
 * ③ `sector` 精确 → ④ 归一化名比较（链原名优先，其次权威名）。
 * 与正向一样**不做包含匹配**；仅用于"该链节点在候选里是谁"（配对/补漏判重），
 * 展示用的大盘联动仍走 `buildMarketLink` 的正向口径，两处不会漂移。
 */
function matchesChainChild(candidate: SectorInsightCandidate, child: AttributionChainChild): boolean {
  const childCode = child.ts_code?.trim()
  if (childCode) {
    const bare = stripExchangeSuffix(childCode)
    const candCode = candidate.ts_code?.trim()
    if (candCode && stripExchangeSuffix(candCode) === bare) return true
  }

  const std = child.sector_std?.trim()
  if (std && candidate.name === std) return true

  const raw = child.sector?.trim()
  if (raw && candidate.name === raw) return true

  const norm = normalizeSectorName(candidate.name)
  if (!norm) return false
  return (
    normalizeSectorName(child.sector ?? '') === norm ||
    normalizeSectorName(child.sector_std ?? '') === norm
  )
}

/**
 * 由链节点合成最小候选（`source='chain_only'`）：链上有、sector-insight 候选里没有的板块。
 * 无四环数据（quote/trace/prediction 恒 null）——展示内容全部来自链（驱动句/角色徽/事件），
 * 名称取 `sector_std || sector`（权威名优先），category 按概念兜底。
 */
function chainOnlyCandidate(child: AttributionChainChild): SectorInsightCandidate {
  return {
    ts_code: child.ts_code?.trim() || '',
    name: child.sector_std?.trim() || child.sector,
    category: 'concept',
    source: 'chain_only',
    cycle: null,
    quote: null,
    trace: null,
    prediction: null
  }
}

/**
 * 主因卡候选合成（2026-09-18 R17，spec §7.1 修订）：
 * **以当日链 `children` 为主出卡**，再补上"候选里有、链上没有"的候选（避免链不全时信息丢失）。
 * 起因：弱归因日链上有 3 个板块、`sector-insight` 只给 1 个 `review_primary`，
 * 只按候选出卡会让用户误以为"只分析了一个板块"。
 * 调用方（traceability）此前已把候选过滤为 `review_primary`/`both`，本函数不再筛 source。
 */
export function buildPrimarySectorCandidates(
  chain: AttributionChain | null | undefined,
  candidates: SectorInsightCandidate[]
): SectorInsightCandidate[] {
  const rest = [...(candidates ?? [])]
  const fromChain: SectorInsightCandidate[] = []
  for (const child of chain?.children ?? []) {
    const idx = rest.findIndex((c) => matchesChainChild(c, child))
    if (idx >= 0) {
      fromChain.push(rest[idx] as SectorInsightCandidate)
      rest.splice(idx, 1)
    } else {
      fromChain.push(chainOnlyCandidate(child))
    }
  }
  return [...fromChain, ...rest]
}
