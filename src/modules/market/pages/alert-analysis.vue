<template>
  <view class="page-alert-analysis">
    <!-- 头部信息区 -->
    <view class="analysis-header">
      <view class="analysis-header-bg" />
      <view class="analysis-header-content">
        <view class="analysis-back-btn" @tap="goBack">
          <text class="analysis-back-arrow">←</text>
        </view>
        <view class="analysis-header-icon">
          <SvgIcon name="robot-line" size="36rpx" color="#ffffff" />
        </view>
        <view class="analysis-header-info">
          <text class="analysis-header-title">AI 异动解读</text>
          <text class="analysis-header-sub">{{ symbol }} {{ cycleLabel }}</text>
        </view>
        <view v-if="loading && !done" class="analysis-header-badge">
          <text class="analysis-header-badge-text">分析中</text>
        </view>
        <view v-else-if="done" class="analysis-header-badge done">
          <SvgIcon name="check-line" size="20rpx" color="#ffffff" />
          <text class="analysis-header-badge-text">完成</text>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-if="error" class="analysis-error-card">
      <SvgIcon name="error-warning-line" size="48rpx" color="#ef4444" />
      <text class="analysis-error-text">{{ error }}</text>
      <view class="analysis-retry-btn" @tap="retry">
        <text class="analysis-retry-text">重试</text>
      </view>
    </view>

    <!-- 关键词标签 -->
    <view v-if="!error && analysisKeywords.length" class="keywords-row">
      <text
        v-for="(kw, idx) in analysisKeywords"
        :key="idx"
        :class="['keyword-chip', 'keyword-' + (idx % 4)]"
      >{{ kw }}</text>
    </view>

    <!-- 精简摘要卡片（优先展示，第一时间了解异动） -->
    <view v-if="!error && (analysisSummary || loading)" class="summary-card">
      <view class="summary-header">
        <SvgIcon name="flashlight-line" size="24rpx" color="#92400e" />
        <text class="summary-title">一句话速览</text>
      </view>
      <view v-if="analysisSummary" class="summary-body">
        <text class="summary-text">{{ analysisSummary }}</text>
      </view>
      <view v-else class="summary-loading">
        <text class="summary-loading-text">正在提取核心结论...</text>
      </view>
    </view>

    <!-- 工具执行步骤 -->
    <view v-if="!error && toolSteps.length" class="analysis-tools-section">
      <text class="section-label">分析进度</text>
      <view class="analysis-tools-list">
        <view
          v-for="(step, idx) in toolSteps"
          :key="idx"
          :class="['analysis-tool-chip', step.endTime != null ? 'done' : 'running']"
        >
          <SvgIcon v-if="step.endTime != null" name="check-line" size="18rpx" color="#059669" />
          <SvgIcon v-else name="loader-line" size="20rpx" color="#3b82f6" class="analysis-tool-chip-spinner" />
          <text class="analysis-tool-chip-label">{{ step.label }}</text>
        </view>
      </view>
    </view>

    <!-- 详细内容区域 -->
    <view v-if="!error && content" class="analysis-content-card">
      <text class="section-label">详细分析</text>
      <view class="analysis-body">
        <mp-html :content="htmlContent" class="analysis-html" />
        <text v-if="loading && !done" class="analysis-cursor">|</text>
      </view>
    </view>

    <!-- 加载中（初始） -->
    <view v-if="!error && !content && loading" class="analysis-content-card">
      <view class="analysis-loading">
        <view class="analysis-loading-dots">
          <view class="analysis-loading-dot" />
          <view class="analysis-loading-dot" />
          <view class="analysis-loading-dot" />
        </view>
        <text class="analysis-loading-tip">AI 正在分析异动数据...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAlertSSE } from '@/modules/market/utils/useAlertSSE'
import { markdownToHtml } from '@/shared/utils/markdown'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

const symbol = ref('')
const cycle = ref('')

const { content, toolSteps, loading, error, done, start, stop } = useAlertSSE()

const cycleLabel = computed(() => {
  switch (cycle.value) {
    case 'short': return '短线分析'
    case 'mid': return '中线分析'
    case 'long': return '长线分析'
    default: return ''
  }
})

const htmlContent = computed(() => (content.value ? markdownToHtml(content.value) : ''))

/** 从流式内容中动态提取关键词（emoji 标记的指标名 + 股票名） */
const analysisKeywords = computed(() => {
  const c = content.value || ''
  const kw: string[] = []
  // 从 **粗体** 标记中提取核心指标名
  const boldRe = /\*\*(.+?)\*\*/g
  let m: RegExpExecArray | null
  const seen = new Set<string>()
  while ((m = boldRe.exec(c)) !== null) {
    const key = m[1].trim()
    // 只取分析结论类关键词（评分/判断/驱动力等），过滤长文本
    if (key.length <= 12 && !seen.has(key) && (
      key.includes('评分') || key.includes('判断') || key.includes('驱动力') ||
      key.includes('诊断') || key.includes('提示') || key.includes('条件') ||
      key.includes('信息源') || key.includes('补涨') || key.includes('候选') ||
      key.includes('材料') || key.includes('扩散') || key.includes('逻辑')
    )) {
      kw.push(key)
      seen.add(key)
    }
  }
  // 提取 emoticon 标记的关键指标
  const emojiRe = /[💡🔍📝⚠️📊🚨🔗🎯]/g
  while ((m = emojiRe.exec(c)) !== null) {
    // 获取 emoji 后面的文字（到下一个 emoji 或换行）
    const rest = c.slice(m.index + 1)
    const line = rest.split(/[\n💡🔍📝⚠️📊🚨🔗🎯]/)[0].trim()
    const word = line.replace(/\*\*/g, '').slice(0, 12)
    if (word && !seen.has(word)) {
      kw.push(word)
      seen.add(word)
    }
  }
  return kw.slice(0, 6) // 最多 6 个关键词
})

/** 从流式内容中提取一句话精简摘要 */
const analysisSummary = computed(() => {
  const c = content.value || ''
  // 1. 优先提取 异动驱动力
  const driverRe = /异动驱动力\*?\*?[：:]\s*(.+?)(?:\n|$)/u
  let m = c.match(driverRe)
  if (m) return m[1].trim()

  // 2. 提取 含金量评分
  const scoreRe = /含金量评分\*?\*?[：:]\s*(.+?)(?:\n|$)/u
  m = c.match(scoreRe)
  if (m) return m[1].trim()

  // 3. 提取核心判断
  const judgeRe = /核心判断\*?\*?[：:]\s*(.+?)(?:\n|$)/u
  m = c.match(judgeRe)
  if (m) return m[1].trim()

  // 4. 提取盘口诊断
  const diagRe = /盘口诊断\*?\*?[：:]\s*(.+?)(?:\n|$)/u
  m = c.match(diagRe)
  if (m) return m[1].trim()

  return ''
})

function begin() {
  start(symbol.value, cycle.value)
}

function retry() {
  stop()
  begin()
}

function goBack() {
  stop()
  uni.navigateBack()
}

onLoad((options: any) => {
  symbol.value = options?.symbol || ''
  cycle.value = options?.cycle || ''
  if (symbol.value) {
    begin()
  }
})

onUnmounted(() => {
  stop()
})
</script>

<style lang="scss" scoped>
.page-alert-analysis {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
  overscroll-behavior: none;
  touch-action: none;
}

/* 头部 */
.analysis-header {
  position: relative;
  padding: 48rpx 28rpx 36rpx;
  overflow: hidden;
}

.analysis-header-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #4d7cfe 0%, #6c5ce7 100%);
  &::after {
    content: '';
    position: absolute;
    top: -40%; right: -15%;
    width: 240rpx; height: 240rpx;
    background: rgba(255,255,255,0.06);
    border-radius: 50%;
  }
}

.analysis-header-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.analysis-back-btn {
  width: 56rpx; height: 56rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { opacity: 0.6; }
}

.analysis-back-arrow { font-size: 32rpx; color: #ffffff; font-weight: 700; }

.analysis-header-icon {
  width: 64rpx; height: 64rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.analysis-header-emoji { display: none; }

.analysis-header-info { flex: 1; min-width: 0; }

.analysis-header-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  display: block;
}

.analysis-header-sub {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  display: block;
  margin-top: 4rpx;
}

.analysis-header-badge {
  padding: 4rpx 14rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 20rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4rpx;
  &.done { background: rgba(52,211,153,0.3); }
}

.analysis-header-badge-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 500;
}

/* 错误 */
.analysis-error-card {
  margin: 24rpx 28rpx;
  padding: 40rpx 28rpx;
  background: #ffffff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.analysis-error-icon { display: none; }
.analysis-error-text { font-size: 28rpx; color: #ef4444; text-align: center; }
.analysis-retry-btn {
  padding: 12rpx 40rpx;
  background: linear-gradient(135deg, #4d7cfe, #6c5ce7);
  border-radius: 24rpx;
  margin-top: 8rpx;
}
.analysis-retry-text { font-size: 26rpx; color: #ffffff; font-weight: 500; }

/* 关键词标签 */
.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  padding: 20rpx 28rpx;
}

.keyword-chip {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 500;

  &.keyword-0 { background: rgba(77,124,254,0.1); color: #4d7cfe; }
  &.keyword-1 { background: rgba(245,158,11,0.1); color: #f59f0b; }
  &.keyword-2 { background: rgba(239,68,68,0.08); color: #ef4444; }
  &.keyword-3 { background: rgba(16,185,129,0.1); color: #10b981; }
}

/* 精简摘要卡片 */
.summary-card {
  margin: 8rpx 28rpx 16rpx;
  background: linear-gradient(135deg, #fefce8 0%, #fffbeb 100%);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  border: 1rpx solid #fef3c7;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.summary-icon { display: none; }
.summary-title { font-size: 24rpx; font-weight: 600; color: #92400e; }

.summary-text {
  font-size: 28rpx;
  color: #1a1d24;
  line-height: 1.6;
  font-weight: 500;
}

.summary-loading {
  padding: 12rpx 0;
}

.summary-loading-text {
  font-size: 24rpx;
  color: #9ca3af;
}

/* 工具步骤 */
.analysis-tools-section { margin: 0 28rpx 12rpx; }

.section-label {
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 10rpx;
  display: block;
  padding-left: 4rpx;
}

.analysis-tools-list { display: flex; flex-wrap: wrap; gap: 10rpx; }

.analysis-tool-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  background: #ffffff;

  &.done { color: #059669; background: #ecfdf5; }
  &.running { color: #3b82f6; background: #eff6ff; }
}

.analysis-tool-chip-icon { display: none; }
.analysis-tool-chip-spinner { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.analysis-tool-chip-label { font-size: 22rpx; }

/* 内容卡片 */
.analysis-content-card {
  margin: 0 28rpx 40rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

/* 加载 */
.analysis-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  gap: 24rpx;
}

.analysis-loading-dots { display: flex; gap: 10rpx; }
.analysis-loading-dot {
  width: 12rpx; height: 12rpx;
  background: #4d7cfe;
  border-radius: 50%;
  animation: pulse 1.4s ease-in-out infinite;
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}
@keyframes pulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
.analysis-loading-tip { font-size: 26rpx; color: #9ca3af; }

/* 正文 */
.analysis-body { position: relative; }

.analysis-html {
  word-break: keep-all;
  overflow-wrap: break-word;
  :deep(h2.md-h2) {
    font-size: 32rpx; font-weight: 600; color: #1a1d24;
    margin: 24rpx 0 16rpx; padding-bottom: 12rpx;
    border-bottom: 2rpx solid #f0f2f5;
  }
  :deep(h3.md-h3) { font-size: 28rpx; font-weight: 600; color: #374151; margin: 20rpx 0 10rpx; }
  :deep(hr.md-hr) {
    border: none; height: 1rpx;
    background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
    margin: 20rpx 0;
  }
  :deep(strong) { color: #1a1d24; font-weight: 600; }
  :deep(table.md-table) {
    width: 100%; border-collapse: collapse; margin: 12rpx 0;
    font-size: 24rpx; border-radius: 12rpx; overflow: hidden;
    th { background: #f0f4ff; padding: 12rpx 16rpx; text-align: left; font-weight: 600; color: #4d7cfe; }
    td { padding: 10rpx 16rpx; border-bottom: 1rpx solid #f0f2f5; color: #374151; }
    tr:last-child td { border-bottom: none; }
  }
  :deep(ol.md-ol), :deep(ul.md-ul) { padding-left: 32rpx; margin: 8rpx 0; }
  :deep(li) { font-size: 26rpx; color: #374151; line-height: 1.8; }
}

.analysis-cursor {
  display: inline; color: #4d7cfe; font-weight: 700;
  font-size: 26rpx; animation: blink 0.8s infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
