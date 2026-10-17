/**
 * 自选股相关事件 — 数据流
 *
 * 在事件传导列表页顶部筛出与用户自选股相关的事件：
 *   ① 未登录（无 token）→ 返回 []
 *   ② 读本地缓存（TTL 24h）；miss 则请求 aliases 接口并写缓存；失败/空对象 → []
 *   ③ 拉取事件流（getEventList，取前 100 条）
 *   ④ 建反向索引：stripRoman(行业别名) → MatchedStock[]
 *   ⑤ 遍历事件 chain_summary，按 stripRoman(industry) 命中索引即收集该事件的相关自选股
 *
 * 全流程仅 2 次请求（aliases + 事件流），aliases 结果缓存 24h。
 * 卡片数据独立拉取，不复用主列表分页，避免干扰主列表。
 */
import { stockApi } from '@/shared/api/modules/stock'
import type { FavoriteIndustryAliasMap } from '@/shared/api/modules/stock'
import { storage } from '@/shared/utils/storage'
import { getEventList } from './api/eventApi'
import type { EventItem } from './types'

/** 被事件影响的自选股 */
export interface MatchedStock {
  symbol: string
  name: string
  industry: string
  /** 命中的事件侧行业名（已去罗马后缀），用于理由行「影响板块：X」 */
  matchedIndustry: string
}

/** 一条自选股相关事件（事件 + 命中的自选股） */
export interface RelatedEventRow {
  event: EventItem
  matchedStocks: MatchedStock[]
}

/** 缓存 key（与 Web 端一致） */
const CACHE_KEY = 'fav_industry_aliases'
/** aliases 缓存有效期：24h */
const CACHE_TTL = 24 * 60 * 60 * 1000
/** 相关事件上限 */
const MAX_ROWS = 20

/** 缓存载荷 */
interface AliasCachePayload {
  data: FavoriteIndustryAliasMap
  cachedAt: number
}

/** 罗马数字分级符（Ⅰ/Ⅱ/Ⅲ…），顺带覆盖 Ⅳ/Ⅴ/Ⅵ/Ⅶ/Ⅷ/Ⅸ/Ⅹ */
const ROMAN_CHARS = '[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]'
const ROMAN_RE = new RegExp(`^${ROMAN_CHARS}+|${ROMAN_CHARS}+$`, 'g')

/**
 * 去「Ⅲ/Ⅱ/Ⅰ…」罗马数字分级前后缀。
 * 命中两侧求交时两侧都过此函数（事件侧可能是「保险Ⅲ」，索引侧是「保险」）。
 */
function stripRoman(name: string): string {
  return String(name ?? '').trim().replace(ROMAN_RE, '')
}

/** 读取 aliases 本地缓存；未命中或已过期返回 null */
function readAliasCache(): FavoriteIndustryAliasMap | null {
  const cached = storage.get<AliasCachePayload>(CACHE_KEY)
  if (!cached?.cachedAt || !cached.data) return null
  if (Date.now() - cached.cachedAt > CACHE_TTL) return null
  return cached.data
}

/**
 * 加载与自选股相关的事件。
 * 未登录 / 无自选股 / 接口失败 / 事件请求失败 → 返回 []（调用方据此不渲染卡片）。
 */
export async function loadFavoriteRelatedEvents(): Promise<RelatedEventRow[]> {
  // ① 未登录静默返回
  if (!uni.getStorageSync('token')) return []

  // ② 读缓存；miss 则请求并写缓存
  let aliasMap = readAliasCache()
  if (!aliasMap) {
    try {
      aliasMap = await stockApi.getFavoriteIndustryAliases()
    } catch {
      return []
    }
    if (!aliasMap || Object.keys(aliasMap).length === 0) return []
    storage.set(CACHE_KEY, { data: aliasMap, cachedAt: Date.now() } satisfies AliasCachePayload)
  }
  if (Object.keys(aliasMap).length === 0) return []

  // ④ 反向索引：stripRoman(行业别名) → 自选股（matchedIndustry 命中时才补，此处不带）
  const index = new Map<string, Array<Omit<MatchedStock, 'matchedIndustry'>>>()
  for (const [symbol, info] of Object.entries(aliasMap)) {
    const stock: Omit<MatchedStock, 'matchedIndustry'> = {
      symbol,
      name: String(info?.name ?? ''),
      industry: String(info?.industry ?? ''),
    }
    for (const alias of info?.aliases ?? []) {
      const key = stripRoman(alias)
      if (!key) continue
      const list = index.get(key)
      if (list) list.push(stock)
      else index.set(key, [stock])
    }
  }

  // ③ 拉取事件流（前 100 条）
  let events: EventItem[]
  try {
    const response = await getEventList({ page: 1, pageSize: 100 })
    events = response.events
  } catch {
    return []
  }

  // ⑤ 遍历事件 chain_summary，命中索引即产出相关事件
  const rows: RelatedEventRow[] = []
  for (const event of events) {
    const seen = new Set<string>()
    const matchedStocks: MatchedStock[] = []
    for (const summary of event.chain_summary ?? []) {
      const key = stripRoman(summary?.industry ?? '')
      if (!key) continue
      for (const stock of index.get(key) ?? []) {
        if (seen.has(stock.symbol)) continue
        seen.add(stock.symbol)
        matchedStocks.push({ ...stock, matchedIndustry: stripRoman(summary.industry) })
      }
    }
    if (matchedStocks.length === 0) continue
    rows.push({ event, matchedStocks })
    if (rows.length >= MAX_ROWS) break
  }

  return rows
}
