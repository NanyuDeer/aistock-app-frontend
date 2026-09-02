<template>
  <view
    class="as-insight-card"
    :class="[`as-insight-card--${theme}`]"
    @tap="handleClick"
  >
    <!-- 头部：瞳孔 + 类型标签 + 时间 -->
    <view class="as-insight-card__head">
      <InsightTag :type="type" size="sm">{{ tagText || typeLabel }}</InsightTag>
      <text v-if="time" class="as-insight-card__time">{{ time }}</text>
    </view>

    <!-- 结论标题（一句话） -->
    <text class="as-insight-card__title">{{ title }}</text>

    <!-- 分隔线 -->
    <view class="as-insight-card__divider" />

    <!-- 溯源（横幅卡：蓝） -->
    <view v-if="trace" class="as-insight-card__line as-insight-card__line--trace">
      <text class="as-insight-card__key">溯源</text>
      <text class="as-insight-card__text">{{ trace }}</text>
    </view>

    <!-- 预判：条件化结构化块（structured 传入时；渲染通用 ConditionalForecastBlock，全粒度共用） -->
    <ConditionalForecastBlock v-if="structured" :structured="structured" />

    <!-- 预判（横幅卡：金，文本形态，兼容旧用法） -->
    <view v-else-if="forecast" class="as-insight-card__line as-insight-card__line--forecast">
      <text class="as-insight-card__key">预判</text>
      <text class="as-insight-card__text">{{ forecast }}</text>
    </view>

    <!-- 底部 meta -->
    <view v-if="showMeta" class="as-insight-card__foot">
      <text v-if="confidence" class="as-insight-card__meta">置信度 {{ confidence }}</text>
      <text class="as-insight-card__brand">INSIGHT</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InsightTag from './InsightTag.vue'
import ConditionalForecastBlock from './ConditionalForecastBlock.vue'

/**
 * InsightCard 洞见卡片（全站洞见统一容器）
 * - 文本形态（兼容旧用法）：瞳孔标签 → 结论一句话 → 溯源 → 预判（两句话上限）。
 * - 条件化形态（structured 传入）：溯源 → 通用条件化预判块（ConditionalForecastBlock，
 *   2026-09-02 抽取：大盘/板块/个股等一切有条件化预判的粒度共用同款分支 UI）。
 * 组件保持纯 UI：方向/置信/期段/条件全部经 props 结构化传入，不引业务。
 */
type InsightType = 'emotion' | 'fund' | 'event' | 'market' | 'trend'
type InsightTheme = 'light' | 'dark'
type HorizonKey = 'short' | 'mid' | 'long'
type Direction = 'bullish' | 'bearish' | 'neutral'
type Confidence = 'high' | 'medium' | 'low'
type Verification = 'pending' | 'hit' | 'miss'

interface StructuredHorizon {
  horizon: HorizonKey
  /** 档位时长描述，如 "1-5 交易日"（缺省只显示 短/中/长） */
  remaining?: string
  /** 该期基准方向 */
  direction?: Direction
  /** 该期基准置信度 */
  confidence?: Confidence
}

interface StructuredCondition {
  /** 所属期段（对齐后端 anchor.horizon） */
  horizon: HorizonKey
  /** 情景方向（自挂，可与同档基准方向相反） */
  direction?: Direction
  /** 触发条件（可量化的市场事实描述） */
  condition: string
  /** 条件满足后的走势预判（含幅度/目标位等，展示原文） */
  scenario: string
  /** 验证锚点（可选透传） */
  anchor?: { metric?: string; threshold?: string }
  /** 该条件是否已触发（验证回填）：true=已触发（分支点亮）/ false=未触发（置灰）/ 缺省=待观察常态 */
  met?: boolean | null
}

/** 条件化预判结构化数据（对齐后端 PredictionResult.horizons + conditions） */
interface InsightStructuredForecast {
  horizons?: StructuredHorizon[]
  conditions?: StructuredCondition[]
  /** 到期标签，如 "09-08"（pending 状态时展示） */
  dueLabel?: string
  /** 验证结果：pending 待验证 / hit 命中 / miss 未中 */
  verification?: Verification | null
}

const props = withDefaults(defineProps<{
  /** 洞见类型 */
  type?: InsightType
  /** 结论标题（一句话说清现象） */
  title: string
  /** 溯源：原因说明 */
  trace?: string
  /** 预判：后续走向（文本形态，structured 传入时忽略） */
  forecast?: string
  /** 标签文字覆盖（如板块洞见卡传 tag-text="板块洞见"）；缺省按 type 映射 */
  tagText?: string
  /** 条件化预判结构化数据（传入则渲染期段切换的预判块） */
  structured?: InsightStructuredForecast | null
  /** 时间，如 '08-21 · 09:10' */
  time?: string
  /** 主题：light 亮色列表卡 / dark 深蓝研报卡 */
  theme?: InsightTheme
  /** 是否显示底部 meta（置信度 + INSIGHT 角标） */
  showMeta?: boolean
  /** 数据置信度，如 '0.82'（文本形态展示用） */
  confidence?: string
}>(), {
  type: 'emotion',
  trace: '',
  forecast: '',
  tagText: '',
  structured: null,
  time: '',
  theme: 'light',
  showMeta: false,
  confidence: ''
})

const emit = defineEmits<{
  click: []
}>()

const typeLabelMap: Record<InsightType, string> = {
  emotion: '情绪洞见',
  fund: '资金洞见',
  event: '事件洞见',
  market: '市场洞见',
  trend: '趋势洞见'
}

const typeLabel = computed(() => typeLabelMap[props.type])

const handleClick = () => {
  emit('click')
}
</script>

<style lang="scss" scoped>
.as-insight-card {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  padding: $s-4;
  border-radius: $r-lg;
  transition: transform $t-fast;
  user-select: none;
}

.as-insight-card:active {
  transform: scale(0.995);
}

/* ===== Head ===== */
.as-insight-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.as-insight-card__time {
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== Title ===== */
.as-insight-card__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

/* ===== Divider ===== */
.as-insight-card__divider {
  height: 2rpx;
  background: linear-gradient(90deg, $primary-100, rgba($primary-100, 0));
  margin: $s-1 0;
}

/* ===== Lines（彩色横幅卡，同"归因结论"样式） ===== */
/* 语义色：溯源=蓝 / 预判=金 */
.as-insight-card__line--trace {
  --banner-bg: #{$insight-market};
  --banner-glow: rgba(11, 95, 255, 0.18);
}

.as-insight-card__line--forecast {
  --banner-bg: #{$gold-soft-bg};
  --banner-glow: rgba(138, 100, 17, 0.12);
}

@include insight-banner('.as-insight-card__line', '.as-insight-card__key', '.as-insight-card__text');

/* 预判：浅金柔底（需在 mixin 之后覆盖白字） */
.as-insight-card__line--forecast {
  border: 1rpx solid $gold-soft-border;

  .as-insight-card__key,
  .as-insight-card__text {
    color: $gold-deep;
  }
}

/* ===== Foot ===== */
.as-insight-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $s-1;
}

.as-insight-card__meta {
  font-size: 20rpx;
  color: $ink-faint;
}

.as-insight-card__brand {
  font-size: 20rpx;
  font-weight: 600;
  letter-spacing: $ls-wider;
  color: $ink-faint;
}

/* ===== Theme: Light ===== */
.as-insight-card--light {
  background: $bg-card;
  border: 2rpx solid $line;
  box-shadow: $shadow-xs;
}

/* ===== Theme: Dark（深蓝研报卡） ===== */
.as-insight-card--dark {
  background: $insight-card-dark-gradient;
  border: none;
  box-shadow: $shadow-card;

  .as-insight-card__title {
    color: $white;
  }

  .as-insight-card__divider {
    background: linear-gradient(90deg, rgba($gold-light, 0.6), rgba($white, 0.12));
  }

  .as-insight-card__meta,
  .as-insight-card__brand {
    color: rgba($white, 0.55);
  }
}
</style>
