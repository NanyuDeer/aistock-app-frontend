/**
 * 大盘归因链 API（agent 代理域共享封装，P1 chain-attribution）
 * 2026-09-04 自 modules/market/api 提升至 shared/api/modules（消除 analytics → market 跨模块依赖），
 * 与同目录 agent.ts 同模式：request.get<T> + baseURL 已含 /api，路径写 /agent/...。
 * 对接 Node 代理域 GET /api/agent/attribution-chain/:date。
 * 后端返回 { date, chain | null }；无链日/接口异常 → null，由组件空态承接（不抛出）。
 */
import request from '../request'

/** 归因链板块分支（relation：self_driven=自驱动 / market_follow=跟随大盘 / unknown=未入链语义） */
export interface AttributionChainChild {
  sector: string
  relation: 'self_driven' | 'market_follow' | 'unknown'
  pct: number | null
  trace_summary: string
}

/** 归因链大盘根 */
export interface AttributionChainRoot {
  type: 'market'
  date: string
  summary: string
  index_pct: number | null
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
