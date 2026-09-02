<template>
  <view class="as-sector-insight">
    <!-- 加载中 -->
    <LoadingState v-if="loading" size="sm" text="研判生成中..." layout="horizontal" />

    <!-- 严格占位（D4）：当日/近 7 天无该板块溯源/预判 -->
    <view v-else-if="!candidate" class="as-sector-insight__empty">
      <text class="as-sector-insight__empty-title">暂无板块研判</text>
      <text class="as-sector-insight__empty-desc">该板块近期无溯源/预判记录</text>
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

/** 卡标题：板块名 + 当日涨跌（如 "存储板块 -4.2%"） */
const cardTitle = computed(() => {
  const c = props.candidate
  if (!c) return ''
  const pct = c.quote?.pct_change
  const pctText =
    typeof pct === 'number' && Number.isFinite(pct)
      ? (pct > 0 ? `+${pct}%` : `${pct}%`)
      : ''
  return `${c.name}${pctText ? ` ${pctText}` : ''}`
})

/** 溯源行文案（wind_leader-only 来源无溯源 → 空则隐藏该行） */
const traceText = computed(() => props.candidate?.trace?.summary ?? '')

const timeLabel = computed(() => {
  const d = props.date || ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return ''
  return `${Number(m[2])}/${Number(m[3])}`
})

/** InsightCard 条件化预判结构化数据（映射自聚合接口 horizons/conditions/met；与 sector-loop 共用映射工具） */
const structured = computed(() => sectorPredictionToStructured(props.candidate?.prediction))
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
