<template>
  <Card
    class="headline-card"
    :class="`headline-card--${type}`"
    flat
    clickable
    @click="handleClick"
  >
    <view class="card-inner">
      <!-- 双平面结构·上层：顶部语义色块面板，仅承载焦点标识。
          白字在色块上保持可读；渐变色块从顶部向下收深，营造"上重下轻"的厚重/立体感 -->
      <view class="panel-top">
        <view class="panel-tag">
          <!-- 火焰焦点标识：色块上使用白色，去掉深色光晕 -->
          <SvgIcon name="fire-fill" size="26rpx" color="#ffffff" class="panel-flame" />
          <!-- 标题主体：「重大机会 / 重大风险」（major 前缀由脚本计算），白色中等字重，零投影 -->
          <text class="panel-title">{{ headlineTitle }}</text>
        </view>
      </view>

      <!-- 双平面结构·下层：白色正文区，承载事件标题 + 影响行业 + 关注按钮（纯黑白灰，不承担红/绿语义） -->
      <view class="panel-body">
        <!-- 事件标题（字体与普通事件列表卡片一致，点击跳转原文，触摸变蓝与事件列表一致；点击阻止冒泡避免触发整卡详情跳转） -->
        <text class="event-title" @click.stop="handleTitleClick">{{ title }}</text>

        <!-- 影响行业（中性灰标签；方向箭头样式与普通事件列表卡片一致） -->
        <view class="industries-container">
          <Tag
            v-for="(industry, index) in displayIndustries"
            :key="index"
            type="gray"
            class="industry-tag"
          >
            {{ industry.name }}
            <text class="industry-arrow" :class="'industry-arrow--' + industry.sentiment">
              {{ industry.sentiment === 'bullish' ? '↑' : industry.sentiment === 'bearish' ? '↓' : '→' }}
            </text>
          </Tag>
          <Tag v-if="remainingCount > 0" type="gray" class="industry-tag">+{{ remainingCount }}</Tag>
        </view>
      </view>
    </view>
  </Card>
</template>

<script setup lang="ts">
/**
 * EventHeadlineCard - AI 关注焦点高亮卡片
 *
 * 展示重大利好或重大利空事件的紧凑型卡片。
 * 用途：事件传导页面顶部的 AI 关注焦点区域。
 *
 * 视觉层对齐组件库：Card 容器 + 双平面结构（顶部语义渐变色块承载焦点标识 + 白色正文区承载标题/行业标签）。
 * 顶部色块通过渐变 + 底面内阴影营造厚重/立体感，颜色集中在色块层，正文区保持黑白灰。
 */
import { computed } from 'vue'
import type { AffectedIndustry } from '../types'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface Props {
  /** 事件方向：利好/利空/综合 */
  type: 'positive' | 'negative' | 'mixed'
  /** 事件标题 */
  title: string
  /** 重要性：重大/重要 */
  importance?: 'major' | 'normal'
  /** 影响行业（最多展示5个，一行压缩展示，含涨跌方向） */
  industries?: AffectedIndustry[]
  /** 事件ID（用于跳转） */
  eventId?: string
  /** 来源信息（含原文 URL，标题点击跳转原文） */
  sourceInfo?: {
    name: string
    url?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  importance: 'normal',
  industries: () => [],
  eventId: '',
})

// 定义事件
const emit = defineEmits<{
  click: [eventId: string]
  'view-news': [url: string]
}>()

/** 整体标题文案：major 时「重大机会/重大风险」；非 major 保留「机会/风险/综合」 */
const headlineTitle = computed(() => {
  const base = directionText.value
  return props.importance === 'major' ? `重大${base}` : base
})

// 点击处理
function handleClick() {
  if (props.eventId) {
    emit('click', props.eventId)
  }
}

/** 标题点击 → 跳转原文；无原文链接时友好提示（与事件列表卡片一致），不触发整卡详情跳转 */
function handleTitleClick() {
  const url = props.sourceInfo?.url
  if (!url) {
    uni.showToast({ title: '暂无原文链接', icon: 'none' })
    return
  }
  emit('view-news', url)
}

// 计算方向文本（更符合投资用户理解）
const directionText = computed(() => {
  if (props.type === 'positive') return '机会'
  if (props.type === 'negative') return '风险'
  return '综合'
})

// 展示的行业（最多3个，超过显示 +N；正常字号自然排列，不压缩）
const displayIndustries = computed(() => {
  return props.industries.slice(0, 3)
})

// 剩余行业数量
const remainingCount = computed(() => {
  return Math.max(0, props.industries.length - 3)
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

/* Card 容器覆盖：双平面卡片——上层语义色块 + 下层白色正文。
   整卡以更高的柔和投影浮起，厚重感来自顶部渐变色块，立体感来自分层 + 内阴影。 */
.headline-card.as-card {
  padding: 0;
  border: none;
  border-left: 6rpx solid; /* 仅保留左侧语义竖线：粗，标出卡片边界，延续原"左竖线"辨识 */
  border-right: none;
  border-bottom: none;
  border-radius: $r-md;
  overflow: hidden; /* 裁剪顶部色块圆角，使色块贴合卡片圆角 */
  position: relative;
  background: $bg-card;
  box-shadow: $shadow-card;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
  width: 100%;
  min-width: 0; /* 防止双卡横向排列时被内部内容撑破 */
}

/* 边框颜色随语义：取顶部色块渐变的深端色，使左/右/下边框观感一致
   （渐变整体视觉重心偏深端，用浅端色会让边框在白底上显浅） */
.headline-card--positive.as-card { border-color: #d81f1f; }
.headline-card--negative.as-card { border-color: #0d9e43; }
.headline-card--mixed.as-card { border-color: $ink-soft; }

.headline-card.as-card:active {
  transform: scale(0.98);
}

.headline-card :deep(.as-card__body) {
  padding: 0;
}

/* 内层容器：上下两平面紧贴，色块高度固定、正文随内容自适应 */
.card-inner {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ========== 上层：顶部语义色块面板 ==========
   渐变方向 180deg：顶部为较浅语义色、向下收深，模拟顶面受光、由上往下压重的厚重感。
   white-space: nowrap 保证标题不换行、用省略号兜底。 */
.panel-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 52rpx; /* 固定色块高度，保证上平面稳定 */
  padding: 0 16rpx;
  flex-shrink: 0;
  box-shadow: inset 0 -2rpx 0 rgba(0, 0, 0, 0.06); /* 底面内阴影：分隔两平面，制造立体感 */
}

/* 机会：正宗正红渐变（顶部正红 → 底部深红，上轻下重 = 顶面受光）。
   使用饱和度更高的纯正红，替代默认 $up 的橘粉调 */
.headline-card--positive .panel-top {
  background: linear-gradient(180deg, #e22c2c, #d81f1f);
}

/* 风险：正宗正绿渐变（顶部正绿 → 底部深绿，与机会同理）。
   使用纯粹的明绿，替代默认 $down 的暗青调 */
.headline-card--negative .panel-top {
  background: linear-gradient(180deg, #0faa4a, #0d9e43);
}

/* 综合：中性紫渐变，保留历史语义但无红/绿倾向 */
.headline-card--mixed .panel-top {
  background: linear-gradient(180deg, $ink-soft, $ink);
}

.panel-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
  min-width: 0;
}

.panel-flame {
  flex-shrink: 0;
}

/* 标题主体：色块上白字、中等字重，与事件标题（$font-size-md）同号。
   零 text-shadow：白字直接落在纯语义色块上已足够清晰，投影在鲜艳底上反而刺眼 */
.panel-title {
  font-size: $font-size-md; /* 与事件标题同号 */
  font-weight: bold; /* 字重 Bold，色块上保证可读 */
  color: #f8f8f8; /* 近白但非纯白 #fff，弱化刺眼感（仍满足对比度） */
  letter-spacing: 1rpx;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========== 下层：白色正文区（纯黑白灰，不再承担红/绿语义） ========== */
.panel-body {
  position: relative;
  z-index: 1;
  padding: 14rpx 22rpx 16rpx; /* 左右留白对齐事件列表卡（22rpx），底部容纳按钮行 */
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

/* ========== 事件标题（清楚低于顶部标签；字体与普通事件列表卡片一致，最多一行省略） ========== */
.event-title {
  font-size: $font-size-md; /* 与普通事件列表卡片 .card-title 一致 */
  font-weight: 600;
  color: $ink;
  line-height: 1.4; /* 与普通事件列表卡片一致 */
  /* 最多一行，超出不换行并用省略号省略（单行截断 + ellipsis） */
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  position: relative;
  z-index: 1;
  /* 触摸变蓝：与事件列表 .card-title 一致（点击标题代表可跳转原文） */
  transition: color $t-fast;
  -webkit-tap-highlight-color: transparent;
}

.event-title:active {
  color: $primary;
}

/* ========== 影响行业（第三视觉：中性灰标签，不承担红/绿语义） ========== */
.industries-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* 行业标签允许换行，避免长行业名挤压/溢出卡片右缘 */
  flex-shrink: 0;
  min-width: 0; /* 窄卡下行业区可收缩，防止把卡片撑宽 */
  position: relative;
  z-index: 1;
  /* 间距用 margin 实现（见 .industry-tag），避免依赖 flex gap（部分旧 Android WebView 不渲染 gap） */
}

/* 行业标签：复用 <Tag type="gray"> 中性容器（md 默认，与普通事件列表卡 .t5-tag 一致；白底灰黑字，不按涨跌染色） */
.industry-tag {
  flex-shrink: 0;
  margin-right: 6rpx; /* 替代 flex gap 的横向间距 */
  margin-bottom: 2rpx; /* 换行后的最小行间距 */
  white-space: nowrap;
  background: $bg-card !important; /* 白底，与卡片正文区底色一致（覆盖 Tag gray 的 $bg-soft 浅灰） */
}

/* 行业名过长省略兜底（命中 Tag 内部文字），防极端长名撑破 */
.industry-tag :deep(.as-tag__text) {
  max-width: 240rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 方向箭头：位于行业名右侧，样式与普通事件列表卡 .t5-arrow 一致（小面积语义色：涨红/跌绿/中性灰） */
.industry-arrow {
  margin-left: 4rpx;
  font-weight: 700;
  font-size: 18rpx;
}

.industry-arrow--bullish { color: $up; }
.industry-arrow--bearish { color: $down; }
.industry-arrow--neutral { color: $ink-mute; }


</style>
