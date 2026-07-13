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
    <AiAnalysisSection
      v-for="(step, index) in visibleSteps"
      :key="step.id"
      :id="'step-' + step.id"
      :step-number="step.id"
      :title="step.title"
      :status="step.status"
      :explanation="(step.content.explanation as string) || ''"
      :streaming-text="(step.content.text as string) || ''"
      :is-first="index === 0"
      :is-last="index === visibleSteps.length - 1"
    >
      <template v-if="step.status === 'completed'">
        <!-- Step 1: 事件理解 — AI 事件本质分析 -->
        <AiEventUnderstanding
          v-if="step.id === 1"
          :data="detail.eventUnderstanding"
        />

        <!-- Step 2: AI影响传导推理（TransmissionAnalysis 驱动） -->
        <AiTransmissionAnalysis
          v-else-if="step.id === 2"
          :data="detail.transmissionAnalysis"
          :event-title="detail.event.title"
        />
        <HistoryTimeline v-else-if="step.id === 3" :events="detail.historyEvents" />
        <InvestmentSummaryCard v-else-if="step.id === 4" :data="detail.investmentSummary" />
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
import { onMounted, watch, nextTick } from 'vue'
import type { EventDetailResponse } from '../types'
import { useAiReasoning } from '../composables/useAiReasoning'
import type { AnalysisContext } from '../composables/useAiReasoning'
import AiThinkingHeader from './AiThinkingHeader.vue'
import AiAnalysisSection from './AiAnalysisSection.vue'
import AiEventUnderstanding from './AiEventUnderstanding.vue'
import AiTransmissionAnalysis from './transmission/AiTransmissionAnalysis.vue'
import InvestmentSummaryCard from './InvestmentSummaryCard.vue'
import HistoryTimeline from './HistoryTimeline.vue'

interface Props { detail?: EventDetailResponse | null }
const props = defineProps<Props>()
defineEmits<{ back: [] }>()

const {
  visibleSteps, isRunning, thinkingStatus, isThinking,
  currentTask, isAllCompleted, currentStep, thinkingLogs, currentStepTitle,
  startAnalysis,
} = useAiReasoning([
  { title: '事件理解' },
  { title: 'AI影响传导推理' },
  { title: '历史验证' },
  { title: '投资总结' },
])

onMounted(() => {
  if (!props.detail) return
  const a = props.detail.aiAnalysis
  startAnalysis({
    eventType: props.detail.event.eventType,
    source: props.detail.event.source,
    publishTime: props.detail.event.publishTime,
    transferDirection: a?.transferDirection,
    transferReason: a?.transferReason,
    persistenceReason: a?.persistenceReason,
  })
})

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

.report-footer { padding: 32rpx 48rpx 0; display: flex; justify-content: center; }
.footer-text { font-size: 20rpx; color: var(--ev-text-muted); }

.report-empty { display: flex; align-items: center; justify-content: center; padding: 300rpx 32rpx; }
.empty-text { font-size: 28rpx; color: var(--ev-text-muted); }
</style>
