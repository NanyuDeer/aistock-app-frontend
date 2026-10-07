/**
 * 个股情报（stock_info_judgements）相关 API
 * 抓取入库时已由 LLM 生成一句话结论，供二级页首屏「快评」立即展示。
 */
import request from '../request'

/** 个股情报一句话结论（对齐后端 GET /api/cn/stock-info/latest 的 data 结构） */
export interface StockInfoJudgementBrief {
  symbol: string
  stock_name: string
  ai_impact: string
  ai_horizon: string
  ai_summary: string
  published_at: string | null
  url: string | null
}

/**
 * 取某只股票最新一条个股情报（抓取时已生成的一句话结论）。无数据返回 null。
 *
 * 拦截器语义（request.ts）：`{code, data:<对象>}` → 解包返回 data 本身；
 * `{code, data:null}` → `data ?? response.data` 走右侧，返回整个信封对象。
 * 故此处需判信封（对象且含 code 键）：信封 → 取 data（可为 null）；否则返回值即情报体本身。
 */
export async function getLatestJudgement(symbol: string): Promise<StockInfoJudgementBrief | null> {
  const res = await request.get<StockInfoJudgementBrief | { code: number; data: StockInfoJudgementBrief | null }>(
    `/api/cn/stock-info/latest?symbol=${encodeURIComponent(symbol)}`,
  )
  return res && typeof res === 'object' && 'code' in res
    ? (res as { data: StockInfoJudgementBrief | null }).data ?? null
    : (res as StockInfoJudgementBrief)
}
