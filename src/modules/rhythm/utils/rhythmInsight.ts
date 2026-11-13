import type { RhythmBranch, RhythmCard } from '@/shared/api/modules/agent'
import { formatBandText } from '@/shared/utils/rhythmBand'
import { positionShort } from '@/shared/utils/rhythmColors'
import { shanghaiDateTimeParts } from '@/shared/utils/tradingTime'

/** 洞见卡结构化预判子集（结构性对齐 ConditionalForecastBlock/InsightCard 入参，仅节奏用到的字段） */
export interface RhythmInsightCondition {
  horizon: 'short'
  condition: string
  scenario: string
  /** 情景方向（自挂，可与同档基准方向相反） */
  direction?: 'bullish' | 'bearish' | 'neutral'
  /** 结构化仓位动作（add/reduce/hold + 成数，如 "+2 成"；后端 position_action 透传） */
  positionAction?: { direction: 'add' | 'reduce' | 'hold'; change: string; band?: { min?: number | null; max?: number | null; text?: string } | null }
  /** 验证锚点（阈值/指标；括号兜底或后端 anchor 透传） */
  anchor?: { threshold?: string; metric?: string }
}
export interface RhythmInsightStructured {
  conditions: RhythmInsightCondition[]
}
/** 与 InsightCard 内部 InsightLine 结构一致；组件未导出该类型，此处按需复刻，字段变更须同步 */
export interface RhythmInsightLine {
  key: string
  text: string
  tone?: 'positive' | 'risk' | 'default'
}

export interface RhythmInsightCard {
  title: string
  trace?: string
  lines?: RhythmInsightLine[]
  structured?: RhythmInsightStructured | null
  time: string
  /** 生成时刻灰字（次行；created_at 上海时区 HH:MM，恒真展示，不做补偿） */
  timeNote?: string
}

const SLOT_LABEL: Record<string, string> = { after_close: '收盘后', morning: '盘前', midday: '午间', tail: '尾盘' }

/** 影子期渲染开关（spec §10）：后端 delta 计算与前端展示**双开关**。
 * 部署后先保持 false 看 3 个交易日，转正时改 true 单独发一次前端，不需后端再发。 */
export const RHYTHM_DELTA_UI = false

const SLOT_KEY: Record<string, string> = {
  after_close: '较昨日',
  morning: '较昨收',
  midday: '较早盘',
}

/**
 * 洞见卡标题两段式：`{仓位} · {压制原因}`（例「空仓观望 · 两个条件都卡着」）。
 * 压制原因由后端 `position_ledger` 三个字段**纯映射**得出（见 suppressReason），
 * 前端不做任何业务判断；ledger 缺失（旧报告）→ 退化为纯仓位（不补分隔符、不伪造第二段）。
 */
export function composeRhythmTitle(positionText: string, reason?: string): string {
  return [positionText, reason].filter(Boolean).join(' · ')
}

/**
 * 标题第二段来源：由 `position_ledger` 纯映射（spec §4「两个条件都卡着 / 关键条件卡着 / 无主线」）。
 *
 * ```text
 * gate_blocked && mainline_state === "none"  → 两个条件都卡着
 * gate_blocked                               → 关键条件卡着
 * mainline_state === "none"                  → 无主线
 * 其他 / ledger 为 null（旧报告）             → undefined
 * ```
 * 前两条必须按此顺序判断：两个条件都卡着是关键条件卡着的超集。
 */
function suppressReason(card: RhythmCard): string | undefined {
  const ledger = card.position_ledger
  if (!ledger) return undefined
  const gateBlocked = ledger.gate_blocked === true
  const noMainline = ledger.mainline_state === 'none'
  if (gateBlocked && noMainline) return '两个条件都卡着'
  if (gateBlocked) return '关键条件卡着'
  if (noMainline) return '无主线'
  return undefined
}

/** 剥离全角/半角括号段（与 ConditionalForecastBlock.condMain 展示口径一致），返回 [主干, 括号段|空] */
function splitParen(text: string): [string, string] {
  const m = text.match(/（[^）]*）|\([^)]*\)/)
  if (!m) return [text, '']
  return [text.replace(m[0], ''), m[0].replace(/^[（(]|[）)]$/g, '')]
}

function toCondition(b: RhythmBranch): RhythmInsightCondition | null {
  if (b.condition.kind !== 'interval' && b.condition.kind !== 'enum') return null
  let main = ''
  let paren = ''
  if (b.condition.kind === 'enum') {
    // 事件分支：条件 = 事件标题预期差 + 档（value 优先，防 label 错位）
    main = `${b.condition.indicator || ''}${b.condition.value || ''}`
  } else {
    const label = b.condition.label || b.condition.value || b.condition.indicator || ''
    ;[main, paren] = splitParen(label)
  }
  const note = b.conclusion.note || ''
  const range = b.conclusion.range || ''
  const condition: RhythmInsightCondition = {
    horizon: 'short',
    condition: main,
    scenario: [note, range].filter(Boolean).join(' '),
    direction: b.conclusion.direction,
    positionAction: b.position_action,
    anchor: b.anchor ? { threshold: b.anchor.threshold, metric: b.anchor.metric } : undefined,
  }
  if (paren && !condition.anchor) condition.anchor = { threshold: paren }
  return condition
}

/** 洞见卡时间行（v3 R-H）：主 = MM-DD · slot 标签（版本标注，恒有——无三时点 pill 后卡上唯一的版本说明）；
 * 次 = HH:MM 生成（created_at 上海时区，恒真展示生产漂移值，spec §8.1 反成诊断线索；缺失/非法不渲染次行）。 */
function formatCardTimeParts(targetDate: string, slot: string, createdAt?: string): { time: string; timeNote?: string } {
  const datePart = targetDate.slice(5)
  const time = `${datePart} · ${SLOT_LABEL[slot] ?? slot}`
  if (!createdAt) return { time }
  const ts = new Date(createdAt)
  if (Number.isNaN(ts.getTime())) return { time }
  const { hour, minute } = shanghaiDateTimeParts(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return { time, timeNote: `${p(hour)}:${p(minute)} 生成` }
}

/** 节奏状态卡 → 统一洞见卡入参；不可拼装/为空返回 null（整卡不渲染，杜绝空壳与臆造） */
export function toRhythmInsight(
  card: RhythmCard | null | undefined,
  slot: string,
  targetDate: string,
  createdAt?: string,
): RhythmInsightCard | null {
  if (!card) return null
  const band = formatBandText(card.position_band?.text)
  // 语义收口（2026-11-04）：节奏＝仓位建议。标题恒取仓位文案（缺失时回退档位短码），
  // 不再退回 level 档位词（冰点/低迷/…与情绪温度分档同名词，并列会造成「低迷 + 亢奋」的观感冲突）。
  const positionText = band || positionShort(card.position_index)
  const title = card.conflict
    ? '信号背离 · 仅区间与提示'
    : composeRhythmTitle(positionText, suppressReason(card))
  if (!title) return null

  const structured = (card.branches ?? []).map(toCondition).filter((c): c is RhythmInsightCondition => c !== null)
  const trace = buildTrace(card)
  const lines = [buildDeltaLine(card, slot), buildReviewLine(card)].filter(
    (x): x is RhythmInsightLine => x !== null,
  )
  const { time, timeNote } = formatCardTimeParts(targetDate, slot, createdAt)

  return {
    title,
    trace,
    lines: lines.length ? lines : undefined,
    structured: structured.length ? { conditions: structured } : undefined,
    time,
    timeNote,
  }
}

/** 溯源行：一句因果 + 全部明细，用「；」连接（key 由 InsightCard 的 traceWord 渲染成「溯源」）。
 * 数据源是后端确定性 causality_text；phase_evidence.reason 已被它覆盖，不再上屏。 */
function buildTrace(card: RhythmCard): string | undefined {
  const ct = card.causality_text
  if (!ct) return undefined
  const parts = [ct.lead, ...(ct.lines ?? [])].map((s) => String(s || '').trim()).filter(Boolean)
  return parts.length ? parts.join('；') : undefined
}

/** 变更行：文案由后端给（已过五条校验，永不空）；缺失则整行不渲染 */
function buildDeltaLine(card: RhythmCard, slot: string): RhythmInsightLine | null {
  const text = String(card.delta_narrative || '').trim()
  if (!text) return null
  const lag = card.delta?.prev?.lag_days ?? 0
  const key = lag > 1 ? `较 ${lag} 个交易日前` : (SLOT_KEY[slot] ?? '较上一条')
  return { key, text }
}

/** 昨日复盘行：只陈述事实，不判对错、不打分；up_ratio 缺失时整半句不渲染 */
function buildReviewLine(card: RhythmCard): RhythmInsightLine | null {
  const r = card.delta?.review
  if (!r) return null
  const pos = String(r.prev_position_text || '').replace('建议仓位：', '') || '未给出仓位'
  const sign = r.index_pct_chg >= 0 ? '+' : ''
  const head = `昨日说${pos}，昨天上证 ${sign}${r.index_pct_chg.toFixed(2)}%`
  const text = r.up_ratio == null ? head : `${head}，${Math.round(r.up_ratio)}% 的股票上涨`
  return { key: '昨日', text }
}
