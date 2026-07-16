<template>
  <view class="ai-event-report" v-if="detail">
      <!-- ===== 思考状态条（圆点+颜色可视化） ===== -->
      <view class="thinking-status-bar">
        <view class="logs-row" v-if="!isAllCompleted && thinkingLogs.length">
          <view v-for="(log, idx) in thinkingLogs" :key="idx" class="log-item"
            :class="{ active: idx === activeLogIdx, done: idx < activeLogIdx }">
            <text class="log-dot">{{ idx < activeLogIdx ? '✓' : idx === activeLogIdx ? '●' : '○' }}</text>
            <text class="log-text">{{ log }}</text>
          </view>
          <view class="log-item active" v-if="currentTask.text && activeLogIdx >= thinkingLogs.length">
            <text class="log-dot">●</text>
            <text class="log-text">{{ currentTask.text }}</text>
          </view>
        </view>
        <view class="done-row" v-else-if="isAllCompleted">
          <text class="done-text">✓ 分析完成</text>
        </view>
        <view class="phase-row" v-if="currentStepTitle && !isAllCompleted">
          <text class="phase-label">{{ currentStepTitle }}</text>
        </view>
      </view>

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
import { onMounted, watch, nextTick, computed } from 'vue'
import type { EventDetailResponse } from '../types'
import { useAiReasoning } from '../composables/useAiReasoning'
import type { AnalysisContext } from '../composables/useAiReasoning'
import AiAnalysisSection from './AiAnalysisSection.vue'
import AiEventUnderstanding from './AiEventUnderstanding.vue'
import AiTransmissionAnalysis from './transmission/AiTransmissionAnalysis.vue'
import InvestmentSummaryCard from './InvestmentSummaryCard.vue'
import HistoryTimeline from './HistoryTimeline.vue'

interface Props { detail?: EventDetailResponse | null }
const props = defineProps<Props>()
defineEmits<{ back: [] }>()

const {
  visibleSteps, isAllCompleted, currentStep, currentStepTitle,
  thinkingStatus, thinkingLogs, currentTask,
  startAnalysis,
} = useAiReasoning([
  { title: '事件理解' },
  { title: 'AI影响传导推理' },
  { title: '历史验证' },
  { title: '投资总结' },
])

// ===== 思考日志活跃索引（与 AiThinkingHeader 逻辑一致） =====
const phaseMap: Record<string, number> = { reading: 0, identifying: 1, analyzing: 2, done: 99 }
const activeLogIdx = computed(() => {
  if (isAllCompleted.value) return thinkingLogs.value.length
  return phaseMap[thinkingStatus.value.phase] ?? -1
})

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
.ai-event-report {
  padding-bottom: 147rpx; /* GlobalChatBar 高度 */
}

/* ===== 思考状态条 ===== */
.thinking-status-bar {
  padding: 20rpx 32rpx 16rpx;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20rpx);
  border-bottom: 1px solid var(--ev-accent-soft);
}

.logs-row { display: flex; align-items: center; gap: 20rpx; flex-wrap: wrap; margin-bottom: 8rpx; }

.log-item { display: flex; align-items: center; gap: 6rpx; transition: all 0.4s; }
.log-dot { font-size: 18rpx; color: var(--ev-text-muted); flex-shrink: 0; width: 20rpx; text-align: center; }
.log-text { font-size: 20rpx; color: var(--ev-text-muted); }

.log-item.active .log-dot { color: var(--ev-accent); animation: pulse 1s ease-in-out infinite; }
.log-item.active .log-text { color: var(--ev-text-secondary); }
.log-item.done .log-dot { color: var(--ev-positive); }
.log-item.done .log-text { color: var(--ev-text-muted); }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

.done-row { display: flex; align-items: center; margin-bottom: 4rpx; }
.done-text { font-size: 22rpx; color: var(--ev-positive); font-weight: 500; }

.phase-row { padding-top: 4rpx; }
.phase-label { font-size: 22rpx; color: var(--ev-accent); font-weight: 500; }

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
