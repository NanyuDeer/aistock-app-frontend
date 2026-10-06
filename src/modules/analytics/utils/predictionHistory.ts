import type {
  PredictionHorizonKey,
  PredictionRecord,
  PredictionVerificationEntry,
} from '@/shared/api/modules/prediction'

export const HORIZON_ORDER: PredictionHorizonKey[] = ['short', 'mid', 'long']
export const HORIZON_LABELS: Record<PredictionHorizonKey, string> = {
  short: '短线',
  mid: '中线',
  long: '长线',
}

export type HorizonStage =
  | { kind: 'verified'; result: 'hit' | 'miss' | 'insufficient'; entry: PredictionVerificationEntry }
  | { kind: 'due_pending' } // 已到期待验证（due ≤ today 但验证任务未跑）
  | { kind: 'not_due' }     // 未到期待验证

/** 单档状态：verification 存在 → 已验证；due_date ≤ today → 已到期待验证；否则未到期 */
export function horizonStage(
  record: PredictionRecord,
  horizon: PredictionHorizonKey,
  today: string,
): HorizonStage {
  const entry = record.verification?.[horizon]
  if (entry) return { kind: 'verified', result: entry.result, entry }
  const dueDate = record.due_dates?.[horizon]
  if (dueDate && dueDate <= today) return { kind: 'due_pending' }
  return { kind: 'not_due' }
}

export type ConditionStage =
  | { kind: 'verified'; result: 'hit' | 'miss' | 'insufficient'; entry: PredictionVerificationEntry }
  | { kind: 'condition_met' } // 条件已成立·待到期验证（两段判定第①段：只点亮、无 result）
  | { kind: 'pending' } // 尚未验证 / 条件未触发

/**
 * 条件状态（Spec A §4.2/§4.3）：condition 验证按 c{i} key 读取，独立于 horizon key。
 * 两段判定（2026-09-16）：到期前只写 condition_met（entry **无 result**）→ condition_met；
 * 到期后写入 result → verified。缺 result 时不得按「已验证」渲染。
 */
export function conditionStage(record: PredictionRecord, index: number): ConditionStage {
  const entry = record.verification?.[`c${index}`]
  if (!entry) return { kind: 'pending' }
  const result: unknown = entry.result
  if (result == null && entry.condition_met === true) return { kind: 'condition_met' }
  return { kind: 'verified', result: entry.result, entry }
}

/** 整体状态：全部已登记档位已验证 → verified，否则 pending（以 verification 实况计算，与后端 status 双保险） */
export function overallStatus(record: PredictionRecord, today: string): 'pending' | 'verified' {
  const registered = HORIZON_ORDER.filter((h) => Boolean(record.due_dates?.[h]))
  if (registered.length === 0) return record.status === 'verified' ? 'verified' : 'pending'
  return registered.every((h) => Boolean(record.verification?.[h])) ? 'verified' : 'pending'
}

export interface PredictionStatsView {
  total: number
  pendingCount: number
  verifiedCount: number
  skippedCount: number
  hitRate: number | null
  /** long 档命中率单列（不进迭代判读；无样本时 hitRate=null） */
  long: { n: number; hits: number; hitRate: number | null }
}

/** 当前生产验证口径版本（与后端 publicRouter.CURRENT_METHODOLOGY_VERSION / agent-py 四处同批保持 4.0） */
const CURRENT_METHODOLOGY_VERSION = '4.0'

/** 越年近似档位集合（record 级 `due_dates_approximate`；缺失视为无近似档） */
function approximateHorizons(record: PredictionRecord): Set<string> {
  const approx = record.prediction?.due_dates_approximate
  if (!Array.isArray(approx)) return new Set()
  return new Set(approx.filter((h): h is string => typeof h === 'string'))
}

/**
 * 当前版本口径的**已结算** entry（hit/miss + methodology_version=4.0 + 非近似）；否则 null。
 * 口径对齐后端 publicRouter（版本过滤 + 排除 approximate + 排除 long 由调用方处理）。
 */
function settledEntry(record: PredictionRecord, horizon: string): PredictionVerificationEntry | null {
  const entry = record.verification?.[horizon]
  if (!entry) return null
  if (entry.methodology_version !== CURRENT_METHODOLOGY_VERSION) return null
  if (entry.result !== 'hit' && entry.result !== 'miss') return null
  if (entry.approximate === true) return null
  if (approximateHorizons(record).has(horizon)) return null
  return entry
}

/**
 * 命中率口径（对齐后端迭代看板 4.0）：hit/(hit+miss)，仅当前版本、排除 approximate。
 * long 档不计入命中率（单列 `long`，不参与迭代判读）；insufficient 与未验证档位不计入。
 * 仅在后端未返回 stats（旧版本）时作为兜底估算使用。
 */
export function computeStats(records: PredictionRecord[], today: string): PredictionStatsView {
  let pendingCount = 0
  let verifiedCount = 0
  let skippedCount = 0
  let hitCount = 0
  let missCount = 0
  let longN = 0
  let longHits = 0
  for (const record of records) {
    // 显式跳过 skipped 记录：不计 pending/verified，单独计数（与后端 stats 语义对齐）
    if (record.status === 'skipped') {
      skippedCount += 1
      continue
    }
    if (overallStatus(record, today) === 'verified') verifiedCount += 1
    else pendingCount += 1
    for (const h of HORIZON_ORDER) {
      const entry = settledEntry(record, h)
      if (!entry) continue
      if (h === 'long') {
        // long 档不计入迭代看板命中率，单列展示（§4.7）
        longN += 1
        if (entry.result === 'hit') longHits += 1
      } else if (entry.result === 'hit') {
        hitCount += 1
      } else {
        missCount += 1
      }
    }
  }
  const comparable = hitCount + missCount
  return {
    total: records.length,
    pendingCount,
    verifiedCount,
    skippedCount,
    hitRate: comparable > 0 ? hitCount / comparable : null,
    long: { n: longN, hits: longHits, hitRate: longN > 0 ? longHits / longN : null },
  }
}
