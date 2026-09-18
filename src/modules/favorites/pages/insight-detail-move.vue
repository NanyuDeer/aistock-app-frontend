<!--
  价格异动洞察详情页（午盘/尾盘 price_move 专用）：
  数据源已迁移至 stocktrace 链路（movements API），展示五层候选 + 六阶段链 + 证据清单。
  涨停雷达洞察见 insight-detail.vue（两页独立，列表按 event_type 分流）。
-->
<template>
  <SubPageCard2 title="洞察详情">
    <view class="page-insight-detail">
    <!-- 加载状态 -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">加载中...</text>
    </view>

    <!-- 事件不存在/无权限 -->
    <view v-else-if="!detail" class="state-wrap">
      <text class="state-text">{{ loadError || '异动事件不存在或已过期' }}</text>
    </view>

    <block v-else>
      <!-- ===== 报价头（对齐涨停雷达页：标签入名称行 + 指标上色 + 最左开盘） ===== -->
      <view class="quote">
        <view class="o3-top">
          <view class="avatar">{{ (detail.stock_name || '').charAt(0) }}</view>
          <view class="o3-info">
            <view class="q-name-row">
              <text class="q-name">{{ detail.stock_name }}</text>
              <view class="q-tag" :class="detail.direction === 'up' ? 'tag-up' : 'tag-down'">
                {{ detail.direction === 'up' ? '上涨异动' : '下跌异动' }}
              </view>
            </view>
            <view class="q-code">{{ detail.symbol }} · {{ fmtTime(detail.triggered_at) }}</view>
          </view>
          <view class="o3-price">
            <text class="o3-p" :class="trendClass">{{ fmtPrice(detail.latest_price) }}</text>
            <text class="o3-c" :class="trendClass">{{ fmtPercent(detail.change_pct) }}</text>
          </view>
        </view>

        <view class="o3-metrics">
          <view class="o3-m">
            <text class="o3-v o3-mid">{{ fmtPrice(detail.previous_close) }}</text>
            <text class="o3-l">开盘</text>
          </view>
          <view class="o3-m">
            <text class="o3-v" :class="trendClass">≥{{ detail.threshold_pct }}%</text>
            <text class="o3-l">涨跌幅阈值</text>
          </view>
          <view v-if="detail.severity" class="o3-m">
            <text class="o3-v o3-warn">{{ severityText(detail.severity) }}</text>
            <text class="o3-l">严重度</text>
          </view>
          <view class="o3-m">
            <text class="o3-v" :class="trendClass">{{ fmtAmount(detail.latest_price, detail.change_pct) }}</text>
            <text class="o3-l">触发</text>
          </view>
        </view>
      </view>

      <!-- ===== 归因状态 ===== -->
      <view
        v-if="analysis && analysis.processing_status === 'processing'"
        class="section status-pending"
      >
        <text class="status-icon">⏳</text>
        <text class="status-text">归因分析中，请稍候...</text>
      </view>

      <view
        v-else-if="analysis && analysis.processing_status === 'unavailable'"
        class="section status-unavailable"
      >
        <text class="status-icon">--</text>
        <text class="status-text">{{ analysis.unavailable?.message ?? '归因暂不可用' }}</text>
      </view>

      <!-- ===== 一句话主因（精简版详情，完整归因见 PDF 报告） ===== -->
      <view v-if="oneLineCause" class="section main-cause-simple">
        <view class="main-title-row">
          <text class="section-title">归因主因</text>
          <view class="title-right">
            <text v-if="confidenceLevel" class="badge is-gold">{{ confidenceText(confidenceLevel) }}</text>
          </view>
        </view>
        <text class="one-line-text">{{ oneLineCause }}</text>
      </view>

      <!-- ===== 完整报告下载（仅 completed 且有有效归因时可用） ===== -->
      <view
        v-if="canDownloadReport"
        :class="['report-btn', { 'is-busy': reportBusy }]"
        @tap="onDownloadReport"
      >
        <text class="report-btn-text">{{ reportBusy ? '正在生成报告…' : '生成完整洞察报告 PDF' }}</text>
      </view>
      <text v-else-if="analysis?.processing_status === 'completed'" class="report-hint">
        本次归因未产出完整报告
      </text>

      <!-- 归因完成但结果不可用 -->
      <view
        v-else-if="analysis?.processing_status === 'completed' && !artifact"
        class="section status-unavailable"
      >
        <text class="status-icon">--</text>
        <text class="status-text">归因已完成，但结果暂不可用</text>
      </view>
    </block>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stockTraceApi, type StockTraceEvent, type StockTraceAnalysisResponse } from '@/shared/api/modules/stockTrace'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { downloadInsightReport } from '@/shared/utils/downloadInsightReport'

const detail = ref<StockTraceEvent | null>(null)
const analysis = ref<StockTraceAnalysisResponse | null>(null)
const loading = ref(true)
/** 加载失败原因（区分 401 未登录 / 404 非自选或不存在），用于替代误导性的"事件不存在"提示 */
const loadError = ref('')

/** 涨跌方向：up → 红涨，down → 绿跌（与涨停雷达详情页一致） */
const trendClass = computed(() => (detail.value?.direction === 'up' ? 'is-up' : 'is-down'))

function fmtPrice(price?: number): string {
  if (price == null || Number.isNaN(price)) return '--'
  return price.toFixed(2)
}

/** 相对昨收涨跌幅 → +4.20% */
function fmtPercent(pct?: number): string {
  if (pct == null) return '--'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

/** 由最新价与涨跌幅反推涨跌额 → +0.85/-1.20 */
function fmtAmount(price?: number, pct?: number): string {
  if (!price || price <= 0 || pct == null) return '--'
  const prevClose = price / (1 + pct / 100)
  const amount = price - prevClose
  const sign = amount > 0 ? '+' : ''
  return `${sign}${amount.toFixed(2)}`
}

const artifact = computed(() => analysis.value?.artifact)

/** 一句话主因：优先 artifact 主因候选 verdict → 详情 primary_cause；无结论返回空串 */
const oneLineCause = computed<string>(() => {
  const verdict = artifact.value?.artifactJson.candidates
    ?.find((c) => c.candidateId === artifact.value?.artifactJson.chains
      ?.find((ch) => ch.chainId === artifact.value?.artifactJson.primary_chain_id)?.candidateId)?.verdict
  return String(verdict || detail.value?.primary_cause || '').trim()
})

/** 置信度等级（高/中/低）；level 与 score 皆缺时不显示徽标 */
const confidenceLevel = computed<string>(() => {
  const conf = artifact.value?.artifactJson.confidence
  if (!conf) return ''
  const level = conf.level
  const score = conf.score
  if (level == null && score == null) return ''
  return level ?? (score! >= 0.7 ? 'high' : score! >= 0.5 ? 'medium' : 'low')
})

/** 报告可下载：归因已完成且存在有效 artifact */
const canDownloadReport = computed(() => analysis.value?.processing_status === 'completed' && !!artifact.value)

const reportBusy = ref(false)
async function onDownloadReport(): Promise<void> {
  if (reportBusy.value || !detail.value) return
  const eventId = detail.value.event_id
  if (!eventId) {
    uni.showToast({ title: '该异动暂无完整归因', icon: 'none' })
    return
  }
  reportBusy.value = true
  try {
    await downloadInsightReport(eventId)
  } catch (err) {
    uni.showToast({ title: (err as Error).message || '报告生成失败，请重试', icon: 'none' })
  } finally {
    reportBusy.value = false
  }
}

const confidenceText = (l?: string): string =>
  ({ high: '高置信', medium: '中置信', low: '低置信' }[l ?? ''] ?? l ?? '')

const severityText = (s?: string): string =>
  ({ critical: '严重', high: '重要', medium: '中等' }[s ?? ''] ?? s ?? '')

const fmtTime = (t: string): string => {
  if (!t) return '--'
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return '--'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

onLoad(async (query) => {
  // 列表页导航时对 event_id 做了 encodeURIComponent（见 insight.vue goDetail），需还原，否则会双重编码
  const raw = typeof query?.event_id === 'string' ? query.event_id : ''
  let eventId = raw
  try { eventId = decodeURIComponent(raw) } catch { /* 原值非法编码时按原值使用 */ }
  if (!eventId) {
    loading.value = false
    return
  }
  try {
    detail.value = await stockTraceApi.get(eventId)
    analysis.value = await stockTraceApi.getAnalysis(eventId)
  } catch (err) {
    detail.value = null
    analysis.value = null
    // 后端对 stocktrace 事件也做登录/自选归属校验；按状态码给可操作提示，替代误导性的"事件不存在"
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (statusCode === 401) {
      loadError.value = '请先登录查看自选股异动事件'
    } else if (statusCode === 404) {
      loadError.value = '该异动事件不在你的自选范围内，或已过期'
    } else {
      loadError.value = '异动事件加载失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-insight-detail {
  padding: $s-3;
  background: $bg-page;
}

.state-wrap {
  padding: $s-10;
  text-align: center;
}
.state-text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

/* ===== 通用区块 ===== */
.section {
  margin-bottom: $s-3;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.section-title {
  display: block;
  margin-bottom: $s-2;
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

/* ===== 主因标题行：主因标题 + 右侧徽标组（置信度） ===== */
.main-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $s-2;
  margin-bottom: $s-2;
}
.title-right {
  display: flex;
  align-items: center;
  gap: $s-2;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.badge {
  display: inline-block;
  padding: 2rpx 12rpx;
  border-radius: $r-sm;
  font-size: $font-size-xs;
  font-weight: 500;
  line-height: 1.6;
  flex-shrink: 0;
  &.is-gold { color: $warning; background: $warning-bg; }
}

/* ===== 报价头（对齐涨停雷达页：标签入名称行 + 指标上色 + 最左开盘） ===== */
.quote {
  padding: $s-4;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
  margin-bottom: $s-3;
}

.o3-top {
  display: flex;
  align-items: flex-start;
  gap: $s-3;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: $brand-gradient;
  color: $white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-lg;
  font-weight: 700;
  flex-shrink: 0;
}

.o3-info {
  flex: 1;
  min-width: 0;
}

.q-name-row {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.q-name {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $ink;
}

.q-code {
  font-size: $font-size-xs;
  color: $ink-mute;
  margin-top: 2rpx;
}

.o3-price {
  text-align: right;
  flex-shrink: 0;
}

.o3-p {
  display: block;
  font-size: $font-size-3xl;
  font-weight: 800;
  font-family: $font-mono;
  line-height: $lh-tight;
  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

.o3-c {
  display: block;
  font-size: $font-size-md;
  font-weight: 600;
  font-family: $font-mono;
  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

.q-tag {
  font-size: $font-size-xs;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: $r-full;
  flex-shrink: 0;
  &.tag-up { color: $up; background: $up-soft; }
  &.tag-down { color: $down; background: $down-soft; }
}

.o3-metrics {
  display: flex;
  justify-content: space-between;
  gap: $s-2;
  margin-top: $s-3;
  padding-top: $s-3;
  border-top: 2rpx solid $line;
}

.o3-m {
  text-align: center;
  flex: 1;
}

.o3-v {
  display: block;
  font-size: $font-size-sm;
  font-weight: 700;
  font-family: $font-mono;
  color: $ink;
  &.is-up { color: $up; }
  &.is-down { color: $down; }
  &.o3-mid { color: $ink; }
  &.o3-warn { color: $warning; }
}

.o3-l {
  display: block;
  font-size: $font-size-xs;
  color: $ink-soft;
  margin-top: 4rpx;
}

/* ===== 归因状态 ===== */
.status-pending {
  display: flex;
  align-items: center;
  gap: $s-2;
  color: $accent;
}
.status-unavailable {
  display: flex;
  align-items: center;
  gap: $s-2;
  color: $ink-mute;
}
.status-icon {
  font-size: $font-size-base;
}
.status-text {
  font-size: $font-size-sm;
}

/* ===== 一句话主因（精简版） ===== */
.main-cause-simple {
  display: flex; flex-direction: column; gap: $s-2;
}
.one-line-text {
  font-size: $font-size-base; color: $ink; line-height: 1.6;
}

/* ===== 完整报告下载按钮 ===== */
.report-btn {
  margin-top: $s-4; padding: $s-3; border-radius: $r-md;
  background: $primary; text-align: center;
  /* #ifdef H5 */
  cursor: pointer;
  /* #endif */
}
.report-btn.is-busy { background: $line; }
.report-btn-text { font-size: $font-size-base; color: #ffffff; font-weight: 600; }
.report-hint { display: block; margin-top: $s-3; font-size: $font-size-xs; color: $ink-soft; text-align: center; }
</style>