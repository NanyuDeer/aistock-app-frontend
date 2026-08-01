<template>
  <view class="page-traceability">
    <SubPageCard2 title="大盘溯源" subtitle="每日收盘复盘 · AI 归因分析">
      <view class="trace-content">

        <!-- ===== 顶部 Hero 卡：标题 + 状态 + 元数据 ===== -->
        <Card class="hero-card">
          <view class="hero-header">
            <view class="hero-text">
              <text class="hero-title">{{ heroTitle }}</text>
              <text class="hero-desc">{{ report?.sourceLabel || '复盘报告' }} · {{ report?.reportDate || '--' }}</text>
            </view>
            <Badge :type="statusBadgeType">{{ statusText }}</Badge>
          </view>
          <view v-if="report" class="hero-meta">
            <view class="meta-row">
              <text class="meta-label">生成时间</text>
              <text class="meta-value">{{ generatedAtText }}</text>
            </view>
            <view class="meta-row confidence-row">
              <text class="meta-label">归因可信度</text>
              <view class="confidence-gauge">
                <view class="confidence-bar">
                  <view class="confidence-fill" :class="confidenceClass" :style="{ width: confidencePercent }"></view>
                </view>
                <text class="confidence-value" :class="confidenceClass">{{ confidenceText }}</text>
              </view>
            </view>
            <view v-if="report.parsed?.snapshotId" class="meta-row">
              <text class="meta-label">快照编号</text>
              <text class="meta-value meta-value-mono">{{ report.parsed.snapshotId }}</text>
            </view>
          </view>
          <text v-if="report?.isFallback" class="fallback-notice">
            当日报告尚未生成，当前显示最近可用报告（{{ report.reportDate }}）
          </text>
        </Card>

        <!-- ===== 加载/错误/空状态 ===== -->
        <LoadingState v-if="loading" />

        <Card v-else-if="error" class="error-card">
          <EmptyState title="复盘报告暂不可用" description="报告内容不完整或服务暂时不可用，请稍后重试" icon="cloud-off-line">
            <Button size="sm" @click="retry">重试</Button>
          </EmptyState>
        </Card>

        <EmptyState
          v-else-if="reportAvailability === 'pending'"
          title="复盘报告生成中"
          description="报告生成完成后将在此展示"
        />

        <EmptyState
          v-else-if="reportAvailability === 'failed'"
          title="暂无可用的复盘报告"
          description="当前最新复盘报告未能完成，请等待后续报告"
        />

        <EmptyState v-else-if="!report" text="当日暂无已完成复盘报告" />

        <!-- ===== 结构化区块（解析成功时） ===== -->
        <template v-else-if="report.parsed">
          <!-- 现象快照（确认的市场现象 + 影响板块合并） -->
          <Card v-if="hasPhenomenon || report.sectors.length" title="现象快照" class="section-card">
            <view v-if="hasPhenomenon" class="phenom-stats">
              <view class="phenom-stat">
                <text class="stat-label">类型</text>
                <text class="stat-value">{{ report.parsed.phenomenon.type || '--' }}</text>
              </view>
              <view class="phenom-stat">
                <text class="stat-label">严重度</text>
                <text class="stat-value" :class="severityClass">{{ severityText }}</text>
              </view>
            </view>
            <text v-if="report.parsed.phenomenon.summary" class="phenom-summary">
              {{ report.parsed.phenomenon.summary }}
            </text>
            <view v-if="report.parsed.phenomenon.factIds.length" class="fact-tags">
              <text class="fact-label">事实 ID</text>
              <view class="tag-list">
                <Tag v-for="fid in report.parsed.phenomenon.factIds" :key="fid" type="neutral" size="sm">{{ fid }}</Tag>
              </view>
            </view>
            <!-- 影响板块：紧跟现象之后 -->
            <view v-if="report.sectors.length" class="sectors-block">
              <text class="fact-label">影响板块</text>
              <view class="tag-list">
                <Tag v-for="sector in report.sectors" :key="sector" type="neutral">{{ sector }}</Tag>
              </view>
            </view>
          </Card>

          <!-- 归因结论（品牌横幅） -->
          <view v-if="report.parsed.attribution" class="attribution-banner">
            <text class="banner-label">归因结论</text>
            <text class="banner-text">{{ report.parsed.attribution }}</text>
          </view>

          <!-- 候选解释与反证（支持/反证分栏） -->
          <Card v-if="report.parsed.candidates.length" title="候选解释与反证" class="section-card">
            <view class="candidate-list">
              <view
                v-for="cand in report.parsed.candidates"
                :key="cand.name"
                class="candidate-item"
              >
                <view class="candidate-head">
                  <text class="candidate-name">{{ cand.name }}</text>
                  <Tag :type="candidateTagType(cand.status)" size="sm">{{ candidateStatusLabel(cand.status) }}</Tag>
                </view>
                <text v-if="cand.conclusion" class="candidate-conclusion">{{ cand.conclusion }}</text>
                <view v-if="cand.supportingEvidence.length || cand.counterEvidence.length" class="evidence-twocol">
                  <view v-if="cand.supportingEvidence.length" class="ev-col">
                    <text class="ev-col-label ev-col-sup">支持证据</text>
                    <view class="ev-col-chips">
                      <Tag v-for="ev in cand.supportingEvidence" :key="ev" type="neutral" size="sm">{{ ev }}</Tag>
                    </view>
                  </view>
                  <view v-if="cand.counterEvidence.length" class="ev-col">
                    <text class="ev-col-label ev-col-ctr">反证</text>
                    <view class="ev-col-chips">
                      <Tag v-for="ev in cand.counterEvidence" :key="ev" type="warning" size="sm">{{ ev }}</Tag>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </Card>

          <!-- 证据索引（chip 云） -->
          <Card v-if="report.parsed.evidenceIndex.length" title="证据索引" class="section-card">
            <view class="evidence-chips">
              <view v-for="ev in report.parsed.evidenceIndex" :key="ev.id" class="evidence-chip">
                <text class="ev-chip-id">{{ ev.id }}</text>
                <text class="ev-chip-meta">{{ ev.source }} · {{ ev.name }} · {{ ev.date }}</text>
              </view>
            </view>
          </Card>

          <!-- 缺失证据 -->
          <Card v-if="report.parsed.missingEvidence.length" title="缺失证据" class="section-card">
            <view class="bullet-list">
              <view v-for="item in report.parsed.missingEvidence" :key="item" class="bullet-item">
                <text class="bullet-dot warning-dot">·</text>
                <text class="bullet-text mono-text">{{ item }}</text>
              </view>
            </view>
          </Card>

          <!-- 未解问题 -->
          <Card v-if="report.parsed.unresolvedQuestions.length" class="section-card question-card">
            <view class="warning-header">
              <SvgIcon name="question-line" size="28rpx" color="#0b5fff" />
              <text class="question-title">未解问题</text>
            </view>
            <view class="bullet-list">
              <view v-for="q in report.parsed.unresolvedQuestions" :key="q" class="bullet-item">
                <text class="bullet-dot brand-dot">·</text>
                <text class="bullet-text">{{ q }}</text>
              </view>
            </view>
          </Card>

          <!-- 风险提示 -->
          <Card v-if="report.risks.length" class="section-card warning-card">
            <view class="warning-header">
              <SvgIcon name="alert-line" size="28rpx" color="#f0a020" />
              <text class="warning-title">风险提示</text>
            </view>
            <view class="bullet-list">
              <view v-for="risk in report.risks" :key="risk" class="bullet-item">
                <text class="bullet-dot warning-dot">·</text>
                <text class="bullet-text">{{ risk }}</text>
              </view>
            </view>
          </Card>
        </template>

        <!-- ===== 解析失败回退：纯 markdown 渲染 ===== -->
        <template v-else>
          <Card class="section-card">
            <text class="report-summary">{{ report.summary }}</text>
          </Card>
          <Card v-if="report.sectors.length" class="section-card">
            <text class="subsection-title">影响板块</text>
            <view class="tag-list">
              <Tag v-for="sector in report.sectors" :key="sector" type="neutral">{{ sector }}</Tag>
            </view>
          </Card>
          <Card class="section-card">
            <rich-text :nodes="detailsHtml" class="report-html" />
          </Card>
          <Card v-if="report.risks.length" class="section-card">
            <text class="subsection-title">风险提示</text>
            <view v-for="risk in report.risks" :key="risk" class="bullet-item">
              <text class="bullet-dot warning-dot">·</text>
              <text class="bullet-text">{{ risk }}</text>
            </view>
          </Card>
        </template>

      </view>
    </SubPageCard2>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { LoadingState, EmptyState, Tag, Badge, Button, Card } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import { formatShanghaiDateTime } from '@/shared/utils/datetime'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import { markdownToHtml } from '@/shared/utils/markdown'
import {
  toMarketTraceViewModel,
  candidateStatusLabel,
  severityLabel,
  type MarketTraceViewModel,
  type CandidateStatus,
} from '@/modules/analytics/utils/marketTraceReview'

const loading = ref(false)
const error = ref(false)
const report = ref<MarketTraceViewModel | null>(null)
const reportAvailability = ref<'pending' | 'failed' | null>(null)

const statusBadgeType = computed<'warning' | 'danger' | 'success' | 'info'>(() => {
  if (loading.value) return 'warning'
  if (error.value) return 'danger'
  if (reportAvailability.value === 'pending') return 'warning'
  if (reportAvailability.value === 'failed') return 'danger'
  if (report.value) return 'success'
  return 'info'
})

const statusText = computed(() => {
  if (loading.value) return '分析中'
  if (error.value) return '失败'
  if (reportAvailability.value === 'pending') return '生成中'
  if (reportAvailability.value === 'failed') return '不可用'
  if (report.value) return '已更新'
  return '待更新'
})

const heroTitle = computed(() => {
  if (report.value?.parsed?.title) return report.value.parsed.title
  return '每日大盘复盘'
})

const generatedAtText = computed(() => {
  const generatedAt = report.value?.generatedAt
  return generatedAt ? formatShanghaiDateTime(generatedAt) || generatedAt : '--'
})

const confidenceText = computed(() => {
  const confidence = report.value?.confidence
  if (!confidence) return '未提供'
  const labels: Record<'high' | 'medium' | 'low', string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  return labels[confidence]
})

const confidenceClass = computed(() => {
  const c = report.value?.confidence
  if (c === 'high') return 'text-down'
  if (c === 'medium') return 'text-warning'
  if (c === 'low') return 'text-mute'
  return ''
})

const confidencePercent = computed(() => {
  const c = report.value?.confidence
  if (c === 'high') return '100%'
  if (c === 'medium') return '66%'
  if (c === 'low') return '33%'
  return '0%'
})

const hasPhenomenon = computed(() => {
  const p = report.value?.parsed?.phenomenon
  if (!p) return false
  return Boolean(p.type || p.summary || p.severity || p.factIds.length)
})

const severityText = computed(() => {
  const s = report.value?.parsed?.phenomenon.severity
  return s ? severityLabel(s) : '--'
})

const severityClass = computed(() => {
  const s = report.value?.parsed?.phenomenon.severity
  if (s === 'high' || s === 'critical') return 'text-up'
  if (s === 'medium') return 'text-warning'
  if (s === 'low') return 'text-mute'
  return ''
})

const detailsHtml = computed(() => (report.value ? markdownToHtml(report.value.details) : ''))

function candidateTagType(status: CandidateStatus): 'up' | 'down' | 'neutral' | 'warning' {
  // supported=已支持(绿/down), weak=弱支持(warning), rejected=已排除(红/up), insufficient=不足(灰/neutral)
  if (status === 'supported') return 'down'
  if (status === 'weak') return 'warning'
  if (status === 'rejected') return 'up'
  return 'neutral'
}

async function fetchData() {
  loading.value = true
  error.value = false
  report.value = null
  reportAvailability.value = null
  const requestedDate = shanghaiDateString()

  try {
    const record = await agentApi.getMarketTraceReview(requestedDate)
    if (record && record.status !== 'completed') {
      reportAvailability.value = record.status === 'queued' || record.status === 'processing'
        ? 'pending'
        : 'failed'
      return
    }
    report.value = record ? toMarketTraceViewModel(record, requestedDate) : null
    if (record && !report.value) {
      throw new Error('复盘报告字段不完整')
    }
  } catch (err: unknown) {
    console.error('Failed to fetch market trace review:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function retry() {
  void fetchData()
}

onShow(() => {
  void fetchData()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-traceability {
  height: 100%;
}

.trace-content {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  padding: $s-3;
}

/* ===== Hero 卡 ===== */
.hero-card {
  margin: 0;
}

.hero-header {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: $s-2;
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  display: block;
  line-height: $lh-tight;
}

.hero-desc {
  font-size: $font-size-xs;
  color: $ink-soft;
  margin-top: 4rpx;
  display: block;
}

.hero-meta {
  display: flex;
  flex-direction: column;
  gap: $s-1;
  padding-top: $s-2;
  border-top: 2rpx solid $line-soft;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;
}

.meta-label {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.meta-value {
  font-size: $font-size-sm;
  color: $ink;
  font-weight: 500;
}

.meta-value-mono {
  font-family: $font-mono;
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== 可信度进度条 ===== */
.confidence-row {
  align-items: center;
}

.confidence-gauge {
  display: flex;
  align-items: center;
  gap: $s-2;
  flex: 1;
  max-width: 60%;
}

.confidence-bar {
  flex: 1;
  height: 12rpx;
  border-radius: $r-full;
  background: $line;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: $r-full;
  background: $ink-faint;
  transition: width $t-base;
}

.confidence-fill.text-down {
  background: $down;
}

.confidence-fill.text-warning {
  background: $warning;
}

.confidence-fill.text-mute {
  background: $ink-faint;
}

.confidence-value {
  font-size: $font-size-sm;
  font-weight: 600;
  flex-shrink: 0;
}

.fallback-notice {
  display: block;
  padding: $s-2;
  margin-top: $s-2;
  background: $warning-bg;
  border-radius: $r-sm;
  color: #8a5a00;
  font-size: $font-size-xs;
  line-height: 1.5;
}

/* ===== 区块卡 ===== */
.section-card {
  margin: 0;
}

.error-card {
  margin: 0;
}

/* ===== 现象卡 ===== */
.phenom-stats {
  display: flex;
  gap: $s-2;
  margin-bottom: $s-2;
}

.phenom-stat {
  flex: 1;
  background: $bg-soft;
  border-radius: $r-sm;
  padding: $s-2;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stat-label {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.stat-value {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
}

.phenom-summary {
  display: block;
  font-size: $font-size-base;
  color: $ink;
  line-height: $lh-base;
  margin-bottom: $s-2;
}

.fact-tags {
  display: flex;
  flex-direction: column;
  gap: $s-1;
}

.fact-label {
  font-size: $font-size-xs;
  color: $ink-soft;
}

/* ===== 归因结论横幅 ===== */
.attribution-banner {
  background: $primary;
  border-radius: $r-lg;
  padding: $s-3 $s-4;
  display: flex;
  flex-direction: column;
  gap: $s-1;
  box-shadow: $shadow-primary;
}

.banner-label {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: $ls-wider;
}

.banner-text {
  font-size: $font-size-md;
  font-weight: 600;
  color: $white;
  line-height: $lh-base;
}

/* ===== 影响板块（现象卡内嵌） ===== */
.sectors-block {
  display: flex;
  flex-direction: column;
  gap: $s-1;
  margin-top: $s-2;
  padding-top: $s-2;
  border-top: 2rpx solid $line-soft;
}

/* ===== 候选解释 ===== */
.candidate-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.candidate-item {
  background: $bg-soft;
  border-radius: $r-sm;
  padding: $s-2;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.candidate-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $s-2;
}

.candidate-name {
  flex: 1;
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
  font-family: $font-mono;
  word-break: break-all;
}

.candidate-conclusion {
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: $lh-base;
}

.evidence-twocol {
  display: flex;
  gap: $s-2;
  margin-top: 4rpx;
}

.ev-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.ev-col-label {
  font-size: $font-size-xs;
  font-weight: 600;
}

.ev-col-sup {
  color: $down;
}

.ev-col-ctr {
  color: $up;
}

.ev-col-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

/* ===== 列表 ===== */
.bullet-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.bullet-item {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}

.bullet-dot {
  font-size: $font-size-md;
  line-height: 1.3;
  flex-shrink: 0;
}

.warning-dot {
  color: $warning;
}

.bullet-text {
  flex: 1;
  font-size: $font-size-sm;
  color: $ink;
  line-height: $lh-base;
}

.mono-text {
  font-family: $font-mono;
  color: $ink-soft;
  font-size: $font-size-xs;
}

/* ===== 标签列表 ===== */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
  margin-top: 4rpx;
}

/* ===== 证据索引 chip 云 ===== */
.evidence-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
}

.evidence-chip {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  background: $bg-soft;
  border: 2rpx solid $line;
  border-radius: $r-sm;
  padding: $s-1 $s-2;
  min-width: 200rpx;
  flex: 1;
}

.ev-chip-id {
  font-size: $font-size-xs;
  font-weight: 700;
  color: $primary;
  font-family: $font-mono;
  word-break: break-all;
}

.ev-chip-meta {
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: $lh-base;
}

/* ===== 警告卡（风险提示） ===== */
.warning-card {
  background: $warning-bg;
  border: 2rpx solid rgba(240, 160, 32, 0.3);
}

.warning-header {
  display: flex;
  align-items: center;
  gap: $s-1;
  margin-bottom: $s-2;
}

.warning-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: #8a5a00;
}

/* ===== 问题卡（未解问题，蓝色信息调与风险提示区分） ===== */
.question-card {
  background: $primary-50;
  border: 2rpx solid $primary-100;
}

.question-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $primary-deep;
}

.brand-dot {
  color: $primary;
}

/* ===== 文本颜色 ===== */
.text-up {
  color: $up !important;
}

.text-down {
  color: $down !important;
}

.text-warning {
  color: $warning !important;
}

.text-mute {
  color: $ink-mute !important;
}

/* ===== 回退纯 markdown ===== */
.report-summary {
  display: block;
  color: $ink;
  font-size: $font-size-base;
  line-height: $lh-loose;
}

.subsection-title {
  display: block;
  margin-bottom: $s-2;
  color: $ink;
  font-size: $font-size-md;
  font-weight: 600;
}

.report-html {
  display: block;
  color: $ink;
  font-size: $font-size-sm;
  line-height: $lh-loose;
}

.report-html :deep(.md-h2) {
  margin: 16rpx 0 8rpx;
  color: $ink;
  font-size: $font-size-md;
  font-weight: 600;
}

.report-html :deep(.md-h1) {
  margin: 16rpx 0 8rpx;
  color: $ink;
  font-size: $font-size-lg;
  font-weight: 600;
}

.report-html :deep(.md-h3) {
  margin: 12rpx 0 6rpx;
  color: $ink;
  font-size: $font-size-base;
  font-weight: 600;
}
</style>
