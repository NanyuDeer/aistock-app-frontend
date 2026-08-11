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
  hitRate: number | null
}

/** 命中率口径：hit/(hit+miss)，insufficient 与未验证档位不计入（与后端 stats 对齐；后端缺 stats 字段时兜底） */
export function computeStats(records: PredictionRecord[], today: string): PredictionStatsView {
  let pendingCount = 0
  let verifiedCount = 0
  let hitCount = 0
  let missCount = 0
  for (const record of records) {
    if (overallStatus(record, today) === 'verified') verifiedCount += 1
    else pendingCount += 1
    for (const h of HORIZON_ORDER) {
      const stage = horizonStage(record, h, today)
      if (stage.kind === 'verified') {
        if (stage.result === 'hit') hitCount += 1
        else if (stage.result === 'miss') missCount += 1
      }
    }
  }
  const comparable = hitCount + missCount
  return {
    total: records.length,
    pendingCount,
    verifiedCount,
    hitRate: comparable > 0 ? hitCount / comparable : null,
  }
}
