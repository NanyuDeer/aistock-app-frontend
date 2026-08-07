<template>
  <view class="ai-event-report" v-if="detail">
    <view class="report-content">
      <!-- Hero 卡：白底 + 左侧蓝色色条 + 事件标题/来源/评级徽章（方案A 样式） -->
      <view class="hero-card">
        <view class="hero-bar"></view>
        <text class="hero-title">{{ detail.event.title }}</text>
        <view class="hero-meta">
          <text class="meta-label">来源：</text>
          <text
            v-if="detail.event.sourceInfo?.url"
            class="meta-link"
            @tap="openSourceUrl(detail.event.sourceInfo!.url!)"
          >{{ detail.event.sourceInfo.name }}</text>
          <text v-else-if="detail.event.source" class="meta-text">{{ detail.event.source }}</text>
          <text v-else class="meta-unverified">暂不可验证</text>
          <text class="meta-dot">·</text>
          <text class="meta-time">{{ detail.event.publishTime }}</text>
          <template v-if="detail.event.eventType">
            <text class="meta-dot">·</text>
            <text class="meta-type">{{ detail.event.eventType }}</text>
          </template>
        </view>
        <!-- 评级徽章：Step 1 完成后展示 -->
        <view
          v-if="detail.investmentSummary"
          class="hero-rating"
          :class="'rating-' + detail.investmentSummary.rating"
        >
          <text class="rating-text">{{ ratingLabel }}</text>
        </view>
      </view>

      <!-- Step 1: AI投资机会 -->
      <AiAnalysisSection
        v-for="(step, index) in mainSteps"
        :key="step.id"
        :id="'step-' + step.id"
        :step-number="step.id"
        :title="step.title"
        :status="step.status"
        :explanation="(step.content.explanation as string) || ''"
        :streaming-text="(step.content.text as string) || ''"
        :is-first="index === 0"
        :is-last="index === mainSteps.length - 1"
      >
        <template v-if="step.status === 'completed'">
          <InvestmentSummaryCard :data="detail.investmentSummary" />
        </template>
      </AiAnalysisSection>

      <!-- Step 2: 投资逻辑解析（过渡模块） -->
      <InvestmentLogicHeader v-if="logicStep?.status === 'completed'" />

      <!-- Step 3~5: 深度分析模块 -->
      <AiAnalysisSection
        v-for="(step, index) in analysisSteps"
        :key="step.id"
        :id="'step-' + step.id"
        :step-number="step.displayNumber"
        :title="step.title"
        :status="step.status"
        :explanation="(step.content.explanation as string) || ''"
        :streaming-text="(step.content.text as string) || ''"
        :is-first="index === 0"
        :is-last="index === analysisSteps.length - 1"
      >
        <template v-if="step.status === 'completed'">
          <AiEventUnderstanding v-if="step.id === 3" :data="detail.eventUnderstanding" />
          <AiTransmissionAnalysis v-else-if="step.id === 4" :data="detail.transmissionAnalysis" :event-title="detail.event.title" />
          <HistoryTimeline v-else-if="step.id === 5" :events="detail.historyEvents" />
        </template>
      </AiAnalysisSection>
    </view>

    <view class="report-footer" v-if="isAllCompleted">
      <text class="footer-text">以上分析由 AI 生成，不构成投资建议</text>
    </view>
  </view>

  <EmptyState v-else text="暂无分析数据" />
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick, computed } from 'vue'
import type { EventDetailResponse } from '../types'
import { useAiReasoning } from '../composables/useAiReasoning'
import { EmptyState } from '@/shared/components'
import AiAnalysisSection from './AiAnalysisSection.vue'
import AiEventUnderstanding from './AiEventUnderstanding.vue'
import AiTransmissionAnalysis from './transmission/AiTransmissionAnalysis.vue'
import InvestmentSummaryCard from './InvestmentSummaryCard.vue'
import InvestmentLogicHeader from './InvestmentLogicHeader.vue'
import HistoryTimeline from './HistoryTimeline.vue'

interface Props { detail?: EventDetailResponse | null }
const props = defineProps<Props>()
const emit = defineEmits<{ 
  back: []
  'update:subtitle': [text: string]
}>()

const {
  visibleSteps, isAllCompleted, currentStep, currentStepTitle,
  startAnalysis,
} = useAiReasoning([
  { title: 'AI投资机会' },
  { title: '投资逻辑解析' },
  { title: '事件理解' },
  { title: 'AI影响传导推理' },
  { title: '历史验证' },
])

/** 思考状态副标题，传递给 SubPageCard2 展示 */
const thinkingSubtitle = computed(() => {
  if (isAllCompleted.value) return '✓ 分析完成'
  return currentStepTitle.value || ''
})

/** Hero 卡评级徽章文案（与 InvestmentSummaryCard 保持一致） */
const ratingLabel = computed(() => {
  switch (props.detail?.investmentSummary?.rating) {
    case 'positive': return '★ 整体偏积极'
    case 'negative': return '★ 整体偏谨慎'
    default: return '★ 整体中性'
  }
})

watch(thinkingSubtitle, (text) => {
  emit('update:subtitle', text)
}, { immediate: true })

onMounted(() => {
  if (!props.detail) return
  startAnalysis()
})

/** 打开来源 URL（H5 新窗口，App 用系统浏览器） */
function openSourceUrl(url: string): void {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  // 非 H5 平台复制 URL 到剪贴板并提示
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '来源链接已复制', icon: 'none' }),
  })
  // #endif
}

/** Step 1: AI投资机会 */
const mainSteps = computed(() => visibleSteps.value.filter(s => s.id === 1))

/** Step 2: 投资逻辑解析（过渡） */
const logicStep = computed(() => visibleSteps.value.find(s => s.id === 2))

/** Step 3~5: 深度分析（显示序号连续化：02/03/04 —— 因 02 为无编号的过渡模块投资逻辑解析） */
const analysisSteps = computed(() => visibleSteps.value
  .filter(s => s.id >= 3)
  .map(s => ({ ...s, displayNumber: s.id - 1 })))

// ===== 自动滚动到当前步骤（仅滚动 scroll-view 容器，避免触发外层页面滚动导致 fixed 导航栏移位） =====
watch(currentStep, async (stepId) => {
  await nextTick()
  if (!stepId) return
  // #ifdef H5
  const el = document.getElementById('step-' + stepId)
  // 找到 SubPageCard2 的 scroll-view 容器，只滚动它
  const scrollContainer = document.querySelector('.sub-page-2-content .uni-scroll-view-content')
    || document.querySelector('.sub-page-2-content')
  if (el && scrollContainer) {
    const elRect = el.getBoundingClientRect()
    const containerRect = scrollContainer.getBoundingClientRect()
    // 计算元素相对于滚动容器的偏移量，留 8px 间距
    const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - 8
    scrollContainer.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
  }
  // #endif
  // #ifdef APP-PLUS
  uni.createSelectorQuery().select('#step-' + stepId).boundingClientRect((rect: any) => {
    if (rect) uni.pageScrollTo({ scrollTop: rect.top - 120, duration: 300 })
  }).exec()
  // #endif
})

</script>

<style lang="scss" scoped>
.ai-event-report { padding: 0 0 48rpx; }

.report-content {
  padding: 16rpx 24rpx 0;
  --ev-text-secondary: #{$ink-soft};
  --ev-text-muted: #{$ink-mute};
  --ev-text-tertiary: #{$ink-soft};
}

/* ===== Hero 卡（方案A 样式：白底 + 左侧蓝色色条 + 标题/来源/评级徽章） ===== */
.hero-card {
  position: relative;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 24rpx 28rpx 22rpx 36rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}
.hero-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  background: $primary;
}
.hero-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
  line-height: 1.4;
  margin-bottom: 12rpx;
}
.hero-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6rpx;
}
.meta-label {
  font-size: 22rpx;
  color: $ink-mute;
  flex-shrink: 0;
}
.meta-link {
  font-size: 22rpx;
  color: $primary;
  text-decoration: underline;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200rpx;
}
.meta-text {
  font-size: 22rpx;
  color: $ink-soft;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200rpx;
}
.meta-unverified {
  font-size: 22rpx;
  font-style: italic;
  color: $ink-mute;
  opacity: 0.7;
}
.meta-dot {
  font-size: 22rpx;
  color: $ink-mute;
}
.meta-time {
  font-size: 22rpx;
  color: $ink-mute;
}

/* 事件类型标签：与卡片 EVENT_TYPE_COLORS 语义一致，使用中性色 */
.meta-type {
  font-size: 22rpx;
  color: $primary;
}

/* 评级徽章：复用 InvestmentSummaryCard 的语义色（A股：positive=绿/跌，negative=红/涨） */
.hero-rating {
  display: inline-flex;
  align-self: flex-start;
  padding: 6rpx 18rpx;
  border-radius: $r-full;
  margin-top: 16rpx;
}
.rating-positive {
  background: var(--ev-positive-soft);
  border: 2rpx solid var(--ev-positive-soft);
}
.rating-positive .rating-text { color: var(--ev-positive); }
.rating-neutral {
  background: rgba(148, 163, 184, 0.12);
  border: 2rpx solid rgba(148, 163, 184, 0.18);
}
.rating-neutral .rating-text { color: var(--ev-text-tertiary); }
.rating-negative {
  background: var(--ev-negative-soft);
  border: 2rpx solid rgba(229, 77, 94, 0.2);
}
.rating-negative .rating-text { color: var(--ev-negative); }
.rating-text {
  font-size: 22rpx;
  font-weight: 600;
}

.report-footer { padding: 32rpx 48rpx 0; display: flex; justify-content: center; }
.footer-text { font-size: 20rpx; color: var(--ev-text-muted); }
</style>
