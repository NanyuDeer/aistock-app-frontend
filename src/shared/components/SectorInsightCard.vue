<template>
  <view class="as-sector-insight">
    <!-- 加载中 -->
    <LoadingState v-if="loading" size="sm" text="研判生成中..." layout="horizontal" />

    <!-- 占位：未入链且无四环溯源/预判内容（避免仅渲染"板块+涨跌幅"空壳标题卡） -->
    <view v-else-if="!showCard" class="as-sector-insight__empty">
      <text class="as-sector-insight__empty-title">暂无板块研判</text>
      <text class="as-sector-insight__empty-desc">
        {{ candidate ? '该板块今日无溯源/预判记录，暂无洞察内容' : '该板块近期无溯源/预判记录' }}
      </text>
    </view>

    <!-- 板块洞见卡（InsightCard 条件化形态） -->
    <InsightCard
      v-else
      type="market"
      tag-text="板块洞见"
      :title="cardTitle"
      :trace="traceText"
      :trace-structured="traceStructured"
      :time="timeLabel"
      :structured="structured"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InsightCard from './InsightCard.vue'
import { LoadingState } from '@/shared/components'
import { sectorPredictionToStructured, relationLabel } from '@/shared/utils/sectorInsight'
import type { SectorInsightCandidate } from '@/shared/api/modules/agent'
import type { SectorMarketLink, SectorStructuredForecast } from '@/shared/utils/sectorInsight'

/**
 * SectorInsightCard 板块洞见卡（shared wrapper，板块四环前端 spec 2026-09-02）
 *
 * 板块溯源/预判/验证的洞见承载卡：数据（candidate）由父页面从
 * agentApi.getSectorInsight(date) 拉取并匹配当前板块后传入；组件保持纯展示。
 * - candidate 命中（prediction/trace 任一存在）→ InsightCard 条件化预判形态；
 * - candidate 为空 → 严格占位（不跨日兜底，D4）。
 * 大盘联动（2026-09-04，P1 chain-attribution）：marketLink 传入时，溯源行升级为
 * InsightCard 结构化溯源（大盘一句话 + 板块角色徽 + 驱动句），优先于四环文本 trace；
 * 无链（marketLink=null）回退四环文本形态。板块入链但四环无内容 → 仍渲染大盘联动溯源。
 * 复用点：风口详情页 sector-detail / 大盘溯源页 traceability（主因板块）。
 */
const props = withDefaults(defineProps<{
  /** 当前板块的聚合候选（无 → 占位） */
  candidate: SectorInsightCandidate | null
  /** 拉取中 */
  loading?: boolean
  /** 查询日期 YYYY-MM-DD（展示用，可选） */
  date?: string
  /** 大盘联动（板块在大盘归因链中的角色）；无链/未取到 → null */
  marketLink?: SectorMarketLink | null
  /** 板块名（入链但四环无内容时标题兜底用） */
  sectorName?: string
  /** 预判结构化覆盖（演示/事件驱动剧本用；正常模式 null → 走 candidate.prediction 映射） */
  forecastOverride?: SectorStructuredForecast | null
}>(), {
  loading: false,
  date: '',
  marketLink: null,
  sectorName: '',
  forecastOverride: null
})

/**
 * 卡标题 = 一句话研判（与大盘溯源"现象一句话"同构，均取 LLM 生成句，不拼行情）：
 * 1. prediction.attribution_summary（预判综述一句话）优先，但跳过合规下架占位句
 *    （"（点位表述已按合规要求移除）"——该句被红线下架整体替换，无研判信息）；
 * 2. 回退 trace.summary（仅溯源无预判时标题即溯源主句，避免下方重复）；
 * 3. 回退首档基准走势生成"短/中/长期预计 {label}"（如 短期预计窄幅整理）；
 * 4. 兜底板块名。
 */
const REDACT_PLACEHOLDER_RE = /（点位表述已按合规要求移除）/

const hasAttributionSummary = computed<boolean>(() => {
  const a = props.candidate?.prediction?.attribution_summary?.trim() ?? ''
  return a.length > 0 && !REDACT_PLACEHOLDER_RE.test(a)
})

/** 入链但四环无内容时的标题兜底（板块角色一句话；无 sectorName → "该板块"） */
const marketLinkFallbackTitle = computed(() => {
  const m = props.marketLink
  if (!m?.relation) return ''
  const nm = props.sectorName?.trim() || '该板块'
  return m.relation === 'self_driven' ? `${nm}为大盘主要驱动` : `${nm}随大盘联动`
})

const cardTitle = computed(() => {
  const c = props.candidate
  if (!c) return marketLinkFallbackTitle.value
  const conclusion = c.prediction?.attribution_summary?.trim()
  if (conclusion && !REDACT_PLACEHOLDER_RE.test(conclusion)) return conclusion
  const traceSum = c.trace?.summary?.trim()
  if (traceSum) return traceSum
  // 首档基准走势兜底（label 4~6 字，如 高位震荡/窄幅整理 → "短期预计高位震荡"）
  const first = structured.value?.horizons?.[0]
  const horizonCn = { short: '短期', mid: '中期', long: '长期' }[first?.horizon ?? 'short'] ?? '短期'
  if (first?.label) return `${horizonCn}预计${first.label}`
  // 入链时优先角色标题（如 "半导体材料为大盘主要驱动"），否则兜底板块名
  return marketLinkFallbackTitle.value || c.name
})

/** 溯源行文案（文本形态）：标题已用溯源主句时不再重复展示（仅无 attribution_summary 回退场景） */
const traceText = computed(() => {
  const c = props.candidate
  if (!c || !hasAttributionSummary.value) return ''
  return c.trace?.summary ?? ''
})

const timeLabel = computed(() => {
  const d = props.date || ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return ''
  return `${Number(m[2])}/${Number(m[3])}`
})

/**
 * InsightCard 条件化预判结构化数据：演示/事件驱动剧本覆盖优先（forecastOverride），
 * 否则映射自聚合接口 horizons/conditions/met（与 sector-loop 共用映射工具）。
 */
const structured = computed(() => props.forecastOverride ?? sectorPredictionToStructured(props.candidate?.prediction))

/**
 * 溯源行结构化数据（V2 大盘联动）：marketLink 传入 → InsightCard 结构化溯源
 * （大盘一句话行；入链时附加角色徽 + 驱动句行）；未传入 → null 回退文本形态 traceText。
 */
const traceStructured = computed(() => {
  const m = props.marketLink
  // 链无大盘一句话且未入链 → 无可用内容，回退文本形态（避免空溯源卡）
  if (!m || (!m.summary && !m.relation)) return null
  return {
    summary: m.summary,
    index_pct: m.index_pct,
    badge: m.relation ? relationLabel(m.relation) : '',
    detail: m.driver
  }
})

/** 四环聚合本身是否有实际洞察内容（溯源主句或预判分支任一存在） */
const hasContent = computed<boolean>(() => {
  const c = props.candidate
  const s = structured.value
  return Boolean(c?.trace?.summary?.trim() || s?.horizons?.length || s?.conditions?.length)
})

/** 板块已入归因链（大盘联动入链）：即便四环暂无内容也应展示溯源行 */
const inChain = computed(() => Boolean(props.marketLink?.relation))

/** 是否渲染洞见卡：四环有内容，或板块已入归因链 */
const showCard = computed(() => Boolean(hasContent.value || inChain.value))
</script>

<style lang="scss" scoped>
.as-sector-insight {
  width: 100%;
}

/* 空态占位（严格占位 D4，白卡弱化） */
.as-sector-insight__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $s-1;
  padding: $s-6 $s-4;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-lg;
}

.as-sector-insight__empty-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink-soft;
}

.as-sector-insight__empty-desc {
  font-size: $font-size-xs;
  color: $ink-mute;
}
</style>
