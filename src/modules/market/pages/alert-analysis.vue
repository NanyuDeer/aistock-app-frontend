<template>
  <SubPageCard2 title="AI 异动解读" :subtitle="`${symbol} ${cycleLabel}`">
    <view class="page-alert-analysis">
      <!-- 状态徽标 -->
      <view class="status-row">
        <Badge v-if="loading && !done" type="info" size="sm">分析中</Badge>
        <Badge v-else-if="done" type="success" size="sm">完成</Badge>
      </view>

      <!-- 错误状态 -->
      <Card v-if="error" class="error-section">
        <EmptyState title="分析失败" :description="error">
          <Button size="sm" @click="retry">重试</Button>
        </EmptyState>
      </Card>

      <!-- 关键词标签 -->
      <view v-if="!error && analysisKeywords.length" class="keywords-row">
        <Tag
          v-for="(kw, idx) in analysisKeywords"
          :key="idx"
          :type="keywordTagType(idx)"
          size="sm"
        >{{ kw }}</Tag>
      </view>

      <!-- 精简摘要卡片（优先展示，第一时间了解异动） -->
      <Card v-if="!error && (analysisSummary || loading)" class="summary-section">
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
      </Card>

      <!-- 工具执行步骤 -->
      <view v-if="!error && toolSteps.length" class="analysis-tools-section">
        <text class="section-label">分析进度</text>
        <view class="analysis-tools-list">
          <Tag
            v-for="(step, idx) in toolSteps"
            :key="idx"
            :type="step.endTime != null ? 'down' : 'neutral'"
            size="sm"
          >{{ step.label }}</Tag>
        </view>
      </view>

      <!-- 详细内容区域 -->
      <Card v-if="!error && content" class="content-section">
        <text class="section-label">详细分析</text>
        <view class="analysis-body">
          <mp-html :content="htmlContent" class="analysis-html" />
          <text v-if="loading && !done" class="analysis-cursor">|</text>
        </view>
      </Card>

      <!-- 加载中（初始） -->
      <Card v-if="!error && !content && loading" class="content-section">
        <LoadingState text="AI 正在分析异动数据..." />
      </Card>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAlertSSE } from '@/modules/market/utils/useAlertSSE'
import { markdownToHtml } from '@/shared/utils/markdown'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { LoadingState, EmptyState, Tag, Badge, Button, Card } from '@/shared/components'
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

function keywordTagType(idx: number): 'neutral' | 'warning' | 'up' | 'down' {
  const types: Array<'neutral' | 'warning' | 'up' | 'down'> = ['neutral', 'warning', 'up', 'down']
  return types[idx % 4]
}

function begin() {
  start(symbol.value, cycle.value)
}

function retry() {
  stop()
  begin()
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
  padding: $s-3;
  background: $bg-soft;
}

/* 状态徽标 */
.status-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $s-2;
}

/* 错误 */
.error-section {
  margin-bottom: $s-3;
}

/* 关键词标签 */
.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: $s-3;
}

/* 精简摘要卡片 */
.summary-section {
  margin-bottom: $s-3;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.summary-title { font-size: 24rpx; font-weight: 600; color: #92400e; }

.summary-text {
  font-size: 28rpx;
  color: $ink;
  line-height: 1.6;
  font-weight: 500;
}

.summary-loading {
  padding: 12rpx 0;
}

.summary-loading-text {
  font-size: 24rpx;
  color: $ink-mute;
}

/* 工具步骤 */
.analysis-tools-section { margin-bottom: $s-3; }

.section-label {
  font-size: 24rpx;
  color: $ink-mute;
  margin-bottom: 10rpx;
  display: block;
  padding-left: 4rpx;
}

.analysis-tools-list { display: flex; flex-wrap: wrap; gap: 10rpx; }

/* 内容卡片 */
.content-section {
  margin-bottom: $s-4;
}

/* 正文 */
.analysis-body { position: relative; }

.analysis-html {
  word-break: keep-all;
  overflow-wrap: break-word;
  :deep(h2.md-h2) {
    font-size: 32rpx; font-weight: 600; color: $ink;
    margin: 24rpx 0 16rpx; padding-bottom: 12rpx;
    border-bottom: 2rpx solid $line-soft;
  }
  :deep(h3.md-h3) { font-size: 28rpx; font-weight: 600; color: $ink-soft; margin: 20rpx 0 10rpx; }
  :deep(hr.md-hr) {
    border: none; height: 1rpx;
    background: linear-gradient(90deg, transparent, $line, transparent);
    margin: 20rpx 0;
  }
  :deep(strong) { color: $ink; font-weight: 600; }
  :deep(table.md-table) {
    width: 100%; border-collapse: collapse; margin: 12rpx 0;
    font-size: 24rpx; border-radius: 12rpx; overflow: hidden;
    th { background: $bg-soft; padding: 12rpx 16rpx; text-align: left; font-weight: 600; color: $primary; }
    td { padding: 10rpx 16rpx; border-bottom: 1rpx solid $line-soft; color: $ink-soft; }
    tr:last-child td { border-bottom: none; }
  }
  :deep(ol.md-ol), :deep(ul.md-ul) { padding-left: 32rpx; margin: 8rpx 0; }
  :deep(li) { font-size: 26rpx; color: $ink-soft; line-height: 1.8; }
}

.analysis-cursor {
  display: inline; color: $primary; font-weight: 700;
  font-size: 26rpx; animation: blink 0.8s infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
