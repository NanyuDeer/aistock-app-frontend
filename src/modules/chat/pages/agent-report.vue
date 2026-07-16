<template>
  <SubPageCard2 :title="titleMap[intent] || '分析报告'" :subtitle="subtitleText">
    <view class="report-content-wrap">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">报告加载中...</text>
      </view>

      <!-- 有报告 -->
      <view v-else-if="report" class="report-body">
        <text class="report-date">{{ reportDateText }}</text>

        <!-- wind_leader / hot_burst: 结构化展示 -->
        <template v-if="displayReport">
          <!-- 龙头股票 -->
          <view v-if="leaderStocks.length" class="section">
            <text class="section-title">龙头股票</text>
            <view class="stock-tags">
              <view v-for="code in leaderStocks" :key="code" class="stock-tag">
                <text class="stock-tag-text">{{ code }}</text>
              </view>
            </view>
          </view>

          <!-- 详细分析 -->
          <view v-if="detailsText" class="section">
            <text class="section-title">详细分析</text>
            <view class="report-text-wrap">
              <mp-html :content="markdownToHtml(detailsText)" class="report-html" />
            </view>
          </view>

          <!-- 风险提示 -->
          <view v-if="risks.length" class="section">
            <text class="section-title">风险提示</text>
            <view v-for="(risk, idx) in risks" :key="idx" class="risk-item">
              <text class="risk-text">· {{ risk }}</text>
            </view>
          </view>
        </template>

        <!-- broadcast / morning: 纯文本展示 -->
        <template v-else>
          <view class="report-text-wrap">
            <text class="report-text">{{ reportText }}</text>
          </view>
        </template>
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
import { markdownToHtml } from '@/shared/utils/markdown'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

interface DisplayReport {
  risks?: string[]
  stocks?: string[]
  details?: string
}

interface AgentReport {
  report_type: string
  report_date: string
  content: {
    text?: string
    audio_path?: string | null
    display_report?: DisplayReport
    podcast_brief?: string
    schema_version?: string
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

const reportDateText = computed(() => {
  if (!report.value?.report_date) return ''
  // report_date 可能是 ISO 字符串（含时区），截取日期部分
  return String(report.value.report_date).split('T')[0]
})

// wind_leader / hot_burst 的结构化数据
const displayReport = computed(() => {
  return report.value?.content?.display_report || null
})

const leaderStocks = computed(() => {
  return displayReport.value?.stocks || []
})

const risks = computed(() => {
  return displayReport.value?.risks || []
})

const detailsText = computed(() => {
  return displayReport.value?.details || ''
})

// broadcast / morning 的纯文本
const reportText = computed(() => {
  return report.value?.content?.text || ''
})

async function loadReport() {
  if (!intent.value || !date.value) return
  loading.value = true
  try {
    const res: unknown = await agentApi.getReport(intent.value, date.value)
    // 响应拦截器已解包: 返回的是 {report_type, report_date, content: {...}, ...}
    report.value = (res as AgentReport) || null
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

.section {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 16rpx;
  display: block;
}

.stock-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.stock-tag {
  background: #eff6ff;
  border-radius: 12rpx;
  padding: 8rpx 20rpx;
}

.stock-tag-text {
  font-size: 26rpx;
  color: #2563eb;
  font-weight: 500;
}

.report-text-wrap {
  margin-top: 8rpx;
}

/* mp-html 样式覆盖：keep-all 必须覆盖到内部所有子元素（p/div/span 等） */
:deep(.report-html),
:deep(.report-html *) {
  word-break: keep-all;
  overflow-wrap: break-word;
}
:deep(.report-html) {
  font-size: 28rpx;
  color: #1a1d24;
  line-height: 1.8;
}
:deep(.md-h2) { font-size: 32rpx; font-weight: 600; margin: 16rpx 0 8rpx; }
:deep(.md-h3) { font-size: 30rpx; font-weight: 600; margin: 12rpx 0 6rpx; }
:deep(.md-hr) { border: none; border-top: 1rpx solid #e5e7eb; margin: 12rpx 0; }
:deep(.md-ul) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ol) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ul-li) { font-size: 28rpx; color: #1a1d24; line-height: 1.8; }
:deep(.md-ol-li) { font-size: 28rpx; color: #1a1d24; line-height: 1.8; }

.report-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #1a1d24;
  white-space: pre-wrap;
}

.risk-item {
  margin-bottom: 12rpx;
}

.risk-text {
  font-size: 26rpx;
  line-height: 1.6;
  color: #6b7280;
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
