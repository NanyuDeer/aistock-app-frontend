<template>
  <view
    class="as-insight-card"
    :class="[`as-insight-card--${theme}`]"
    @tap="handleClick"
  >
    <!-- 头部：洞见字标标签（字标 + 灰点 + 彩色类型词）+ 时间 -->
    <view class="as-insight-card__head">
      <view class="wm-tag" :class="`wm-tag--${type}`">
        <!-- "洞见"字标 PNG：浅色卡深色版 / 深蓝研报卡反白版（预览环境 image 标签不可用，走内联背景图） -->
        <view class="wm-img" :style="wmStyle" />
        <text class="wm-dot">·</text>
        <text class="wm-label">{{ typeWord }}</text>
      </view>
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
import ConditionalForecastBlock from './ConditionalForecastBlock.vue'
import wordmarkPng from './insight-wordmark.png'
import wordmarkLightPng from './insight-wordmark-light.png'

/** 洞见字标（"洞见"PNG：浅底用深色版 / 深蓝研报卡用反白版） */
const wmStyle = computed(() => ({
  backgroundImage: `url(${props.theme === 'dark' ? wordmarkLightPng : wordmarkPng})`
}))

/**
 * InsightCard 洞见卡片（全站洞见统一容器）
 * - 文本形态（兼容旧用法）：洞见字标标签（洞见字标 · 类型词）→ 结论一句话 → 溯源 → 预判（两句话上限）。
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
  /** 基准走势短语（4~6 字；基准行“基准 · {label}”展示） */
  label?: string
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
  /** 路径短语名，两段式“状态 · 走势”（路径首行加粗展示） */
  label?: string
  /** 触发条件（可量化的市场事实描述） */
  condition: string
  /** 条件满足后的走势预判（含幅度/目标位等，展示原文） */
  scenario: string
  /** 验证锚点（可选透传） */
  anchor?: { metric?: string; threshold?: string }
  /** 简洁展示用关键词（1~2 个，单条 ≤10 字；仅新数据携带，旧记录无 → 走长句兜底） */
  keywords?: string[]
  /** 预判关键词（2026-09-03 起新数据携带：scenario 摘要，侧重方向+幅度） */
  scenario_keywords?: string[]
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
  /** 标签词覆盖（如板块卡传 tag-text="板块洞见"，剥"洞见"后缀后显示"板块"）；缺省按 type 取短词 */
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
  emotion: '情绪',
  fund: '资金',
  event: '事件',
  market: '市场',
  trend: '趋势'
}

/** 类型词：字标已含"洞见"二字，词仅显示类型；tagText 自定义时剥掉重复的"洞见"后缀 */
const typeWord = computed(() => {
  const t = props.tagText?.trim()
  return t ? t.replace(/洞见$/, '') : typeLabelMap[props.type]
})

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

/* ===== 洞见字标标签（字标 PNG + 灰点 + 彩色类型词；2026-09-03 由瞳孔标签 InsightTag 换为洞见字标） ===== */
.wm-tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  line-height: 1;
}

/* "洞见"字标 PNG（内联背景图 + 右下远距阴影 drop-shadow 按图片 alpha 成形；若 PNG 自带投影可去掉） */
.wm-img {
  width: 58rpx;
  height: 40rpx;
  flex: 0 0 auto;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  filter: drop-shadow(3rpx 5rpx 8rpx rgba(10, 46, 111, 0.25));
}

/* 间隔号：灰色缓冲，弱化字标与类型词的连接 */
.wm-dot {
  font-size: 26rpx;
  color: $ink-mute;
  line-height: 1;
}

.wm-label {
  font-size: $font-size-base;
  font-weight: 700;
  line-height: 1;
  color: var(--wm-color, $primary);
}

/* 类型词彩色（沿用 5 类型色）：event 主色 #00b8ff 在白卡偏浅，取中调保证可读 */
.wm-tag--emotion { --wm-color: #{$insight-emotion}; }
.wm-tag--fund    { --wm-color: #{$insight-fund}; }
.wm-tag--event   { --wm-color: #00a8d8; }
.wm-tag--market  { --wm-color: #{$insight-market}; }
.wm-tag--trend   { --wm-color: #{$insight-trend}; }

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

/* ===== 双子卡（同构：key 标题行 + 内容，仅底色区分；去金全中性 2026-09-03） ===== */
.as-insight-card {
  /* 溯源=冷雾蓝 / 预判(文本形态)=浅中性；dark 深蓝研报卡内转深面板 */
  --ins-trace-bg: #f4f8fe;
  --ins-trace-bd: #dce7f8;
  --ins-trace-key: #4a6fbf;
  --ins-fc-bg: #f7f8fb;
  --ins-fc-bd: #e3e6ec;
  --ins-fc-key: #181b22;
  --ins-card-tx: #5e6673;
}

.as-insight-card--dark {
  --ins-trace-bg: rgba(11, 95, 255, 0.10);
  --ins-trace-bd: rgba(11, 95, 255, 0.30);
  --ins-trace-key: #9db6e8;
  --ins-fc-bg: rgba(255, 255, 255, 0.06);
  --ins-fc-bd: rgba(255, 255, 255, 0.12);
  --ins-fc-key: #cfd8ff;
  --ins-card-tx: rgba(255, 255, 255, 0.74);
}

.as-insight-card__line {
  border-radius: $r-md;
  padding: 16rpx 20rpx;
}

.as-insight-card__line .as-insight-card__key {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  margin-bottom: 8rpx;
}

.as-insight-card__line .as-insight-card__text {
  display: block;
  font-size: $font-size-sm;
  line-height: $lh-base;
  color: var(--ins-card-tx);
}

/* 溯源子卡：冷雾蓝 */
.as-insight-card__line--trace {
  background: var(--ins-trace-bg);
  border: 1rpx solid var(--ins-trace-bd);

  .as-insight-card__key {
    color: var(--ins-trace-key);
  }
}

/* 预判（文本形态）子卡：浅中性（structured 形态由 ConditionalForecastBlock 同款呈现） */
.as-insight-card__line--forecast {
  background: var(--ins-fc-bg);
  border: 1rpx solid var(--ins-fc-bd);

  .as-insight-card__key {
    color: var(--ins-fc-key);
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

  /* 字标标签：类型词提亮为 light 色，间隔号淡化；反白字标在深底上无需投影 */
  .wm-img {
    filter: none;
  }
  .wm-dot {
    color: rgba($white, 0.45);
  }
  .wm-tag--emotion { --wm-color: #{$insight-emotion-light}; }
  .wm-tag--fund    { --wm-color: #{$insight-fund-light}; }
  .wm-tag--event   { --wm-color: #{$insight-event-light}; }
  .wm-tag--market  { --wm-color: #{$insight-market-light}; }
  .wm-tag--trend   { --wm-color: #{$insight-trend-light}; }
}
</style>
