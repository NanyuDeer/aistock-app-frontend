<template>
  <view
    class="as-insight-card"
    :class="[`as-insight-card--${theme}`]"
    @tap="handleClick"
  >
    <!-- 头部：瞳孔 + 类型标签 + 时间 -->
    <view class="as-insight-card__head">
      <InsightTag :type="type" size="sm">{{ typeLabel }}</InsightTag>
      <text v-if="time" class="as-insight-card__time">{{ time }}</text>
    </view>

    <!-- 结论标题（一句话） -->
    <text class="as-insight-card__title">{{ title }}</text>

    <!-- 分隔线 -->
    <view class="as-insight-card__divider" />

    <!-- 多行模式：由 lines 逐行渲染（每行 key + text），优先于 trace/forecast -->
    <template v-if="lines.length">
      <view
        v-for="(line, i) in lines"
        :key="i"
        class="as-insight-card__line"
        :class="lineBannerClass(line.tone)"
      >
        <text class="as-insight-card__key">{{ line.key }}</text>
        <text class="as-insight-card__text">{{ line.text }}</text>
      </view>
    </template>

    <!-- 默认模式：traceLabel/trace + forecastLabel/forecast -->
    <template v-else>
      <view v-if="trace" class="as-insight-card__line as-insight-card__line--trace">
        <text class="as-insight-card__key">{{ traceLabel }}</text>
        <text class="as-insight-card__text">{{ trace }}</text>
      </view>

      <view v-if="forecast" class="as-insight-card__line as-insight-card__line--forecast">
        <text class="as-insight-card__key">{{ forecastLabel }}</text>
        <text class="as-insight-card__text">{{ forecast }}</text>
      </view>
    </template>

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

/**
 * InsightCard 洞见卡片
 * 全站洞见统一容器：瞳孔标签置前 → 结论一句话 → 关键结论行（默认 trace/forecast，
 * 也可用 lines 传入多行，每行 key+text，risk 行用金色高亮）。
 */
type InsightType = 'emotion' | 'fund' | 'event' | 'market' | 'trend'
type InsightTheme = 'light' | 'dark'

interface InsightLine {
  /** 行关键词（如「核心优势」「潜在风险」「建议」） */
  key: string
  /** 行内容 */
  text: string
  /** risk 行使用金色高亮（对应预判语义色）；positive 行使用优势绿 */
  tone?: 'default' | 'positive' | 'risk'
}

const props = withDefaults(defineProps<{
  /** 洞见类型 */
  type?: InsightType
  /** 结论标题（一句话说清现象） */
  title: string
  /** 溯源：原因说明（默认模式用；lines 模式可省略） */
  trace?: string
  /** 预判：后续走向（默认模式用；lines 模式可省略） */
  forecast?: string
  /** 溯源/预判 关键词（默认「溯源」「预判」，可按页自定义） */
  traceLabel?: string
  forecastLabel?: string
  /** 多行模式：自定义关键结论行（优先于 trace/forecast） */
  lines?: InsightLine[]
  /** 时间，如 '08-21 · 09:10' */
  time?: string
  /** 主题：light 亮色列表卡 / dark 深蓝研报卡 */
  theme?: InsightTheme
  /** 是否显示底部 meta（置信度 + INSIGHT 角标） */
  showMeta?: boolean
  /** 数据置信度，如 '0.82' */
  confidence?: string
}>(), {
  type: 'emotion',
  trace: '',
  forecast: '',
  traceLabel: '溯源',
  forecastLabel: '预判',
  lines: () => [],
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

/** lines 模式的语义色修饰类：positive=绿 / risk=红 / default=蓝 */
function lineBannerClass(tone: InsightLine['tone'] = 'default'): string {
  if (tone === 'positive') return 'as-insight-card__line--positive'
  if (tone === 'risk') return 'as-insight-card__line--risk'
  return 'as-insight-card__line--trace'
}

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
  font-size: $font-size-sm;
  color: $ink-mute;
}

/* ===== Title ===== */
.as-insight-card__title {
  font-size: $font-size-lg;
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
/* 语义色：溯源=蓝 / 预判=金 / 优势=绿 / 风险=红 */
/* 注意：CSS 自定义属性声明内 Sass 不自动插值 SCSS 变量，需用插值语法写入变量值 */
.as-insight-card__line--trace {
  --banner-bg: #{$insight-market};
  --banner-glow: rgba(11, 95, 255, 0.18);
}

.as-insight-card__line--forecast {
  --banner-bg: #{$gold-soft-bg};
  --banner-glow: rgba(166, 124, 31, 0.12);
}

.as-insight-card__line--positive {
  --banner-bg: #{$down};
  --banner-glow: rgba(24, 160, 88, 0.18);
}

.as-insight-card__line--risk {
  --banner-bg: #{$up};
  --banner-glow: rgba(229, 77, 94, 0.18);
}

/* 横幅卡排版统一走全局 insight-banner mixin（一处调整全站生效） */
@include insight-banner('.as-insight-card__line', '.as-insight-card__key', '.as-insight-card__text');

/* 预判：浅金柔底（浅底+深金字，与溯源实底蓝一实一柔；需在 mixin 之后覆盖白字） */
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
  font-size: 22rpx;
  color: $ink-faint;
}

.as-insight-card__brand {
  font-size: 22rpx;
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
    color: #fff;
  }

  .as-insight-card__divider {
    background: linear-gradient(90deg, rgba($gold-light, 0.6), rgba($white, 0.12));
  }

  /* 横幅行自含底色/白字，不受 dark 卡片影响，无需覆盖 */

  .as-insight-card__meta,
  .as-insight-card__brand {
    color: rgba($white, 0.55);
  }
}
</style>