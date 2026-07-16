<template>
  <SubPageCard2 :title="titleMap[intent] || '分析报告'" :subtitle="subtitleText">
    <view class="report-content-wrap">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">报告加载中...</text>
      </view>

      <!-- 有报告 -->
      <view v-else-if="report" class="report-body">
        <text class="report-date">{{ report.report_date }}</text>
        <view class="report-text-wrap">
          <text class="report-text">{{ reportText }}</text>
        </view>
      </view>

      <!-- 无报告 -->
      <view v-else class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">今日报告尚未生成</text>
        <text class="empty-hint">请在 9:10 后查看</text>
      </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface AgentReport {
  report_type: string
  report_date: string
  content: {
    text?: string
    audio_path?: string | null
  }
}

const intent = ref('')
const date = ref('')
const loading = ref(true)
const report = ref<AgentReport | null>(null)

const titleMap: Record<string, string> = {
  morning: '今日晨报',
  wind_leader: '长线风口分析',
  hot_burst: '机构调研分析',
  broadcast: '双人播报',
}

const subtitleText = computed(() => {
  if (report.value?.report_date) {
    return `${report.value.report_date} · AI 生成内容，仅供参考`
  }
  return 'AI 生成内容，仅供参考'
})

const reportText = computed(() => {
  if (!report.value?.content?.text) return ''
  return report.value.content.text
})

async function loadReport() {
  if (!intent.value || !date.value) return
  loading.value = true
  try {
    const res: unknown = await agentApi.getReport(intent.value, date.value)
    const data = (res as Record<string, unknown>)?.data ?? res
    report.value = (data as AgentReport) || null
  } catch {
    report.value = null
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  intent.value = options?.intent || ''
  date.value = options?.date || new Date().toISOString().split('T')[0]
  loadReport()
})
</script>

<style lang="scss" scoped>
.report-content-wrap {
  padding: 32rpx;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #6b7280;
}

.report-body {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
}

.report-date {
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 24rpx;
  display: block;
}

.report-text-wrap {
  margin-top: 16rpx;
}

.report-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #1a1d24;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
