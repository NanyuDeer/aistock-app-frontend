<template>
  <view class="ai-event-report" v-if="detail">
    <!-- ===== 固定顶部 AI 思考状态头部 ===== -->
    <AiThinkingHeader
      :phase="thinkingStatus.phase"
      :thinking-logs="thinkingLogs"
      :current-step-title="currentStepTitle"
      :current-step-text="currentTask.text"
      :is-complete="isAllCompleted"
      @back="$emit('back')"
    />

    <view class="report-content">
      <!-- 来源信息：真实来源 URL 或"来源暂不可验证" -->
      <view class="source-info-bar">
        <text class="source-label">来源：</text>
        <text
          v-if="detail.event.sourceInfo?.url"
          class="source-link"
          @tap="openSourceUrl(detail.event.sourceInfo!.url!)"
        >{{ detail.event.sourceInfo.name }}</text>
        <text v-else-if="detail.event.source" class="source-text">{{ detail.event.source }}</text>
        <text v-else class="source-unverified">来源暂不可验证</text>
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
        :step-number="step.id"
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

  <view class="report-empty" v-else>
    <text class="empty-text">暂无分析数据</text>
  </view>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick, computed } from 'vue'
import type { EventDetailResponse } from '../types'
import { useAiReasoning } from '../composables/useAiReasoning'
import AiThinkingHeader from './AiThinkingHeader.vue'
import AiAnalysisSection from './AiAnalysisSection.vue'
import AiEventUnderstanding from './AiEventUnderstanding.vue'
import AiTransmissionAnalysis from './transmission/AiTransmissionAnalysis.vue'
import InvestmentSummaryCard from './InvestmentSummaryCard.vue'
import InvestmentLogicHeader from './InvestmentLogicHeader.vue'
import HistoryTimeline from './HistoryTimeline.vue'

interface Props { detail?: EventDetailResponse | null }
const props = defineProps<Props>()
defineEmits<{ back: [] }>()

const {
  visibleSteps, isRunning, thinkingStatus, isThinking,
  currentTask, isAllCompleted, currentStep, thinkingLogs, currentStepTitle,
  startAnalysis,
} = useAiReasoning([
  { title: 'AI投资机会' },
  { title: '投资逻辑解析' },
  { title: '事件理解' },
  { title: 'AI影响传导推理' },
  { title: '历史验证' },
])

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

/** Step 3~5: 深度分析 */
const analysisSteps = computed(() => visibleSteps.value.filter(s => s.id >= 3))

// ===== 自动滚动到当前步骤 =====
watch(currentStep, async (stepId) => {
  await nextTick()
  // #ifdef H5
  const el = document.getElementById('step-' + stepId)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // #endif
  // #ifdef APP-PLUS
  uni.createSelectorQuery().select('#step-' + stepId).boundingClientRect((rect: any) => {
    if (rect) uni.pageScrollTo({ scrollTop: rect.top - 120, duration: 300 })
  }).exec()
  // #endif
})

</script>

<style scoped>
.ai-event-report { padding: 120rpx 0 48rpx; }

.report-content {
  padding-top: 16rpx;
  --ev-text-secondary: #374151;
  --ev-text-muted: #4b5563;
  --ev-text-tertiary: #6b7280;
}

/* 来源信息栏 */
.source-info-bar {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  margin-bottom: 8rpx;
  background: var(--ev-bg-elevated, #f9fafb);
  border-radius: 10rpx;
}
.source-label {
  font-size: 22rpx;
  color: var(--ev-text-muted);
  flex-shrink: 0;
}
.source-link {
  font-size: 22rpx;
  color: var(--ev-accent);
  text-decoration: underline;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.source-text {
  font-size: 22rpx;
  color: var(--ev-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.source-unverified {
  font-size: 22rpx;
  font-style: italic;
  color: var(--ev-text-tertiary);
  opacity: 0.7;
}

.report-footer { padding: 32rpx 48rpx 0; display: flex; justify-content: center; }
.footer-text { font-size: 20rpx; color: var(--ev-text-muted); }

.report-empty { display: flex; align-items: center; justify-content: center; padding: 300rpx 32rpx; }
.empty-text { font-size: 28rpx; color: var(--ev-text-muted); }
</style>
