<template>
  <view class="as-sector-insight">
    <!-- 加载中 -->
    <LoadingState v-if="loading" size="sm" text="研判生成中..." layout="horizontal" />

    <!-- 占位：未命中候选，或命中但无溯源/预判内容（避免仅渲染"板块+涨跌幅"空壳标题卡） -->
    <view v-else-if="!candidate || !hasContent" class="as-sector-insight__empty">
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
      :time="timeLabel"
      :structured="structured"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InsightCard from './InsightCard.vue'
import { LoadingState } from '@/shared/components'
import { sectorPredictionToStructured } from '@/shared/utils/sectorInsight'
import type { SectorInsightCandidate } from '@/shared/api/modules/agent'

/**
 * SectorInsightCard 板块洞见卡（shared wrapper，板块四环前端 spec 2026-09-02）
 *
 * 板块溯源/预判/验证的洞见承载卡：数据（candidate）由父页面从
 * agentApi.getSectorInsight(date) 拉取并匹配当前板块后传入；组件保持纯展示。
 * - candidate 命中（prediction/trace 任一存在）→ InsightCard 条件化预判形态；
 * - candidate 为空 → 严格占位（不跨日兜底，D4）。
 * 复用点：风口详情页 sector-detail / 大盘溯源页 traceability（主因板块）。
 */
const props = withDefaults(defineProps<{
  /** 当前板块的聚合候选（无 → 占位） */
  candidate: SectorInsightCandidate | null
  /** 拉取中 */
  loading?: boolean
  /** 查询日期 YYYY-MM-DD（展示用，可选） */
  date?: string
}>(), {
  loading: false,
  date: ''
})

/**
 * 卡标题 = 一句话研判（与大盘溯源"现象一句话"同构，均取 LLM 生成句，不拼行情）：
 * 1. prediction.attribution_summary（预判综述一句话，agent 30~40 字产出）优先；
 * 2. 回退 trace.summary（仅溯源无预判时，标题即溯源主句，避免下方重复）；
 * 3. 兜底板块名（罕见旧数据仅有分支无综述）。
 */
const hasAttributionSummary = computed<boolean>(() =>
  Boolean(props.candidate?.prediction?.attribution_summary?.trim())
)

const cardTitle = computed(() => {
  const c = props.candidate
  if (!c) return ''
  const conclusion = c.prediction?.attribution_summary?.trim()
  if (conclusion) return conclusion
  const traceSum = c.trace?.summary?.trim()
  if (traceSum) return traceSum
  return c.name
})

/** 溯源行文案：标题已用溯源主句时不再重复展示（仅无 attribution_summary 回退场景） */
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

/** InsightCard 条件化预判结构化数据（映射自聚合接口 horizons/conditions/met；与 sector-loop 共用映射工具） */
const structured = computed(() => sectorPredictionToStructured(props.candidate?.prediction))

/** 是否有实际洞察内容（溯源主句或预判分支任一存在）；无 → 走占位而非空壳标题卡 */
const hasContent = computed<boolean>(() => {
  const c = props.candidate
  const s = structured.value
  return Boolean(c?.trace?.summary?.trim() || s?.horizons?.length || s?.conditions?.length)
})
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
