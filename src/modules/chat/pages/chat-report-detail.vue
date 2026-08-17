<template>
  <SubPageCard2 title="深度分析报告">
    <view class="report-content-wrap">
      <!-- 加载中 -->
      <LoadingState v-if="loading" :text="loadingText" />

      <!-- 成功：渲染报告 -->
      <template v-else-if="report">
        <!-- 结论卡：summary（G15 修订：经 markdownToHtml 渲染，保留加粗/列表等结构） -->
        <Card v-if="summaryHtml" class="conclusion-card">
          <text class="section-kicker">今日结论</text>
          <view class="report-text-wrap">
            <mp-html :content="summaryHtml" class="report-html" />
          </view>
        </Card>

        <!-- details 全文 -->
        <Card v-if="detailsHtml" class="stream-section">
          <text class="section-title">报告详情</text>
          <view class="report-text-wrap">
            <mp-html :content="detailsHtml" class="report-html" />
          </view>
        </Card>

        <!-- 风险提示：risks 非空才渲染（M4 修正——无风险时不显示空段） -->
        <Card v-if="risks.length" class="risk-card stream-section">
          <text class="section-title">风险提示</text>
          <view class="bullet-list">
            <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
          </view>
        </Card>
      </template>

      <!-- 空态：reportId 缺失 或 报告不存在/过期（G12 修订：不用"当日报告尚未生成"） -->
      <EmptyState
        v-else-if="empty"
        title="报告已过期或不存在"
        description="请返回对话页重新发起深度分析"
        icon="file-line"
      />

      <!-- 错误态：请求失败，提供重试入口 -->
      <EmptyState v-else title="加载失败，请稍后重试" description="网络异常或服务暂不可用" icon="file-warning-line">
        <Button size="sm" type="ghost" @click="loadReport">重新加载</Button>
      </EmptyState>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import type { ChatAnalysisReport } from '@/shared/api/modules/agent'
import { markdownToHtml } from '@/shared/utils/markdown'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { LoadingState, EmptyState, Card, Button } from '@/shared/components'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

const loading = ref(true)
const loadingText = ref('报告加载中...')
const report = ref<ChatAnalysisReport | null>(null)
/** 空态（报告不存在/过期）与错误态（请求失败）分开管理，文案与交互不同 */
const empty = ref(false)
const error = ref(false)
const reportId = ref('')

/** 报告展示数据：旧记录可能缺失 display_report 或子字段，全部防御性兜底 */
const displayReport = computed(() => report.value?.content?.display_report)
const summaryHtml = computed(() => {
  const summary = displayReport.value?.summary
  return summary ? markdownToHtml(summary) : ''
})
const detailsHtml = computed(() => {
  const details = displayReport.value?.details
  return details ? markdownToHtml(details) : ''
})
const risks = computed(() => displayReport.value?.risks ?? [])

async function loadReport() {
  const id = reportId.value
  if (!id) return
  loading.value = true
  error.value = false
  try {
    const data = await agentApi.getChatAnalysisReport(id)
    report.value = data
    empty.value = !data
  } catch {
    // 请求失败 → 错误态，保留重试入口
    report.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  const id = options?.reportId
  // reportId 缺失（非法跳转）→ 不发请求，直接空态（硬约束 8 精神）
  if (!id) {
    loading.value = false
    empty.value = true
    return
  }
  reportId.value = id
  loadReport()
})
</script>

<style lang="scss" scoped>
.report-content-wrap {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 结论卡：主品牌蓝左边框 + kicker（对齐 agent-report 结论卡样式） */
.conclusion-card {
  border-left: 6rpx solid $primary;

  .section-kicker { color: $primary; }
}

.stream-section {
  animation: section-in 0.28s ease-out both;
}

@keyframes section-in {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.section-kicker {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.section-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.report-text-wrap {
  margin-top: 8rpx;
}

/* mp-html 样式覆盖：对齐 agent-report 的 report-html 渲染规范 */
:deep(.report-html),
:deep(.report-html *) {
  word-break: keep-all;
  overflow-wrap: break-word;
}
:deep(.report-html) {
  font-size: 28rpx;
  color: $ink;
  line-height: 1.8;
}
:deep(.md-h2) { font-size: 32rpx; font-weight: 600; margin: 16rpx 0 8rpx; color: $ink; }
:deep(.md-h3) { font-size: 28rpx; font-weight: 600; margin: 12rpx 0 6rpx; color: $ink; padding-left: 12rpx; border-left: 4rpx solid $primary; }
:deep(.md-h4) { font-size: 26rpx; font-weight: 600; margin: 10rpx 0 4rpx; color: $ink-soft; }
:deep(.md-hr) { border: none; border-top: 1rpx solid $line; margin: 12rpx 0; }
:deep(.md-ul) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ol) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ul-li) { font-size: 26rpx; color: $ink-soft; line-height: 1.8; }
:deep(.md-ol-li) { font-size: 26rpx; color: $ink-soft; line-height: 1.8; }
:deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12rpx 0;
  font-size: 24rpx;
}
:deep(.md-table th) {
  background: $bg-soft;
  color: $ink;
  font-weight: 600;
  padding: 10rpx 12rpx;
  border: 1rpx solid $line;
  text-align: left;
}
:deep(.md-table td) {
  color: $ink-soft;
  padding: 10rpx 12rpx;
  border: 1rpx solid $line;
}
:deep(.md-table tr:nth-child(even) td) {
  background: $bg-soft;
}
:deep(strong) { color: $ink; font-weight: 600; }

/* 风险卡片：红色调强调（对齐 agent-report risk-card） */
.risk-card {
  border-left: 6rpx solid $up;
  background: linear-gradient(135deg, rgba(224, 69, 69, 0.04), rgba(224, 69, 69, 0.01));

  .section-title { color: $up; }
}

.bullet-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.risk-item {
  display: block;
  font-size: 25rpx;
  line-height: 1.65;
  color: $ink-soft;

  &::before {
    content: '!';
    margin-right: 8rpx;
    font-weight: 600;
    color: $up;
  }
}
</style>
