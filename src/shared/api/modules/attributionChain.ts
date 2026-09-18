/**
 * 大盘归因链 API（agent 代理域共享封装，P1 chain-attribution）
 * 2026-09-04 自 modules/market/api 提升至 shared/api/modules（消除 analytics → market 跨模块依赖），
 * 与同目录 agent.ts 同模式：request.get<T> + baseURL 已含 /api，路径写 /agent/...。
 * 对接 Node 代理域 GET /api/agent/attribution-chain/:date。
 * 后端返回 { date, chain | null }；无链日/接口异常 → null，由组件空态承接（不抛出）。
 */
import request from '../request'

/**
 * 链上事件节点（spec §3.2-4 事件层，2026-09-17 Task 2.1 契约）
 * source：warehouse=事件抓取中台存量命中（event_id 为权威事件 id，必填）；
 *         search=板块定向检索补漏（无中台 id，event_id 为 null，ref 为 URL 或检索 query+title）。
 */
export interface AttributionChainEvent {
  event_id: string | null
  ref: string
  headline: string
  source: 'warehouse' | 'search'
}

/**
 * 弱归因日兜底来源标记（2026-09-17 R16 契约，可选）：
 * weak=true 表示该板块是兜底得到的（非主链确认），source 记录兜底级别——
 * `candidate_claim`=从全部候选链（含 weak）的 claim 匹配而来 / `snapshot`=直接用快照异动板块兜底（无归因理由）。
 * T1 正常路径不写该键（老数据/正常日缺省 → 前端不渲染任何弱标记）。
 */
export interface AttributionChainExtraction {
  source?: string
  weak?: boolean
}

/** 归因链板块分支（relation：self_driven=自驱动 / market_follow=跟随大盘 / unknown=未入链语义） */
export interface AttributionChainChild {
  sector: string
  relation: 'self_driven' | 'market_follow' | 'unknown'
  pct: number | null
  trace_summary: string
  /** 事件层（可选：旧链无该字段；无命中为空数组，前端按无事件渲染） */
  events?: AttributionChainEvent[]
  /** 归一化权威板块名（另一路 agent-py 任务新增；可能缺失）——角色徽匹配优先级高于原始 sector 名 */
  sector_std?: string | null
  /** 快照行板块码（可能缺失）——角色徽匹配第一优先级（精确匹配） */
  ts_code?: string | null
  /** 弱依据兜底来源（可选：仅弱归因日兜底板块携带） */
  extraction?: AttributionChainExtraction
}

/** 归因链大盘根 */
export interface AttributionChainRoot {
  type: 'market'
  date: string
  summary: string
  index_pct: number | null
  /** 归因状态（可选；hypothesis=当日未确认主因）。弱归因日随 evidence_weak 一并写入 */
  attribution_status?: string
  /** 弱依据（可选）：true = 当日大盘**未确认主因**（摘要为中性表述），前端弱化呈现 */
  evidence_weak?: boolean
}

/** 大盘归因链：大盘根 → 主驱动板块分支 */
export interface AttributionChain {
  date: string
  root: AttributionChainRoot
  children: AttributionChainChild[]
}

/** 接口响应信封（拦截器解包 {code,data} 后即此结构） */
interface AttributionChainEnvelope {
  date: string
  chain: AttributionChain | null
}

/**
 * 读取指定交易日的大盘归因链。
 * 无链（chain=null）/请求失败 → 返回 null，由视图空态承接，不向调用方抛错。
 */
export async function fetchAttributionChain(date: string): Promise<AttributionChain | null> {
  try {
    const res = await request.get<AttributionChainEnvelope>(`/agent/attribution-chain/${date}`)
    // 拦截器在 data 为 null 时返回整个信封 {code:0,data:null} → res.chain 为 undefined → 统一落 null
    return res?.chain ?? null
  } catch (e) {
    console.error('[attributionChain] fetch failed:', e)
    return null
  }
}
