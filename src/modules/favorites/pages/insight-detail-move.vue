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

    <!-- 事件不存在 -->
    <view v-else-if="!detail" class="state-wrap">
      <text class="state-text">异动事件不存在或已过期</text>
    </view>

    <block v-else>
      <!-- ===== 事件信息卡 ===== -->
      <view class="section event-card">
        <view class="event-head">
          <text class="event-name">{{ detail.stock_name }}（{{ detail.symbol }}）</text>
          <text :class="['event-dir', detail.direction === 'up' ? 'dir-up' : 'dir-down']">
            {{ detail.direction === 'up' ? '上涨' : '下跌' }}
          </text>
        </view>
        <view class="event-meta">
          <text :class="['event-pct', detail.direction === 'up' ? 'pct-up' : 'pct-down']">
            {{ detail.direction === 'up' ? '+' : '' }}{{ detail.change_pct }}%
          </text>
          <text class="event-time">{{ fmtTime(detail.triggered_at) }}</text>
          <text :class="['event-severity', 'severity-' + detail.severity]">{{ severityText(detail.severity) }}</text>
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

      <!-- ===== 归因结果（completed） ===== -->
      <template v-if="artifact && analysis?.processing_status === 'completed'">
        <!-- 五层候选列表 -->
        <view v-if="allCandidates.length" class="section">
          <text class="section-title">归因候选</text>
          <view
            v-for="c in allCandidates"
            :key="c.layer"
            class="candidate-card"
          >
            <view class="cand-head">
              <text class="cand-layer">{{ layerText(c.layer) }}</text>
              <text :class="['cand-status', 'cstatus-' + c.status]">{{ statusText(c.status) }}</text>
            </view>
            <text class="cand-verdict">{{ c.verdict }}</text>
            <text class="cand-evi-count">证据 {{ c.supportingEvidenceIds?.length ?? 0 }} 条</text>
          </view>
        </view>

        <!-- 六阶段链（仅主因链；备选链信息已由归因候选全量覆盖，统一不展示） -->
        <view
          v-for="ch in primaryChains"
          :key="ch.chainId"
          class="section"
        >
          <text class="section-title">主因链</text>
          <view class="chain-node-list">
            <view
              v-for="n in ch.nodes"
              :key="n.nodeId"
              class="chain-node"
            >
              <view class="node-head">
                <text class="node-stage">{{ stageText(n.stage) }}</text>
                <text :class="['node-epistemic', 'epi-' + n.epistemicType]">{{ epistemicText(n.epistemicType) }}</text>
                <text :class="['node-nstatus', 'ns-' + n.status]">{{ nodeStatusText(n.status) }}</text>
              </view>
              <text class="node-claim">{{ n.claim }}</text>
            </view>
          </view>
        </view>

        <!-- 证据清单 -->
        <view v-if="evidenceList.length" class="section">
          <text class="section-title">证据清单（{{ evidenceList.length }}）</text>
          <view
            v-for="(evi, i) in evidenceList"
            :key="evi.source_id || i"
            class="evidence-item"
          >
            <view class="evi-head">
              <text class="evi-title">{{ evi.title }}</text>
              <text :class="['evi-level', 'level-' + evi.source_level]">{{ evi.source_level }}</text>
            </view>
            <text class="evi-excerpt">{{ evidenceExcerpt(evi) }}</text>
            <text class="evi-meta">{{ kindText(evi.kind) }} · {{ evi.occurred_at ? fmtTime(evi.occurred_at) : '' }}</text>
          </view>
        </view>
      </template>

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
import { stockTraceApi, type StockTraceEvent, type StockTraceAnalysisResponse, type TraceChain, type TraceEvidence } from '@/shared/api/modules/stockTrace'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'

const detail = ref<StockTraceEvent | null>(null)
const analysis = ref<StockTraceAnalysisResponse | null>(null)
const loading = ref(true)

const artifact = computed(() => analysis.value?.artifact)

/**
 * 全部归因候选（五层）：直接取 artifactJson.candidates（含偏弱/证据不足/排除的各层判定结论）。
 * movementView.alternatives 只含 supported 候选，证据不足时为空会导致候选区信息缺失。
 */
const allCandidates = computed(() => {
  const art = artifact.value
  const candidates = art?.artifactJson.candidates ?? []
  if (!candidates.length) return []
  const primaryChainId = art?.artifactJson.primary_chain_id
  const primaryCandidateId = art?.artifactJson.chains?.find((ch) => ch.chainId === primaryChainId)?.candidateId
  const primary = candidates.find((c) => c.candidateId === primaryCandidateId)
  const rest = candidates.filter((c) => c.candidateId !== primaryCandidateId)
  return [primary, ...rest].filter((c): c is NonNullable<typeof c> => !!c)
})

/** 主因链（备选链信息由归因候选全量覆盖，统一不展示） */
const primaryChains = computed<TraceChain[]>(() => {
  return artifact.value?.artifactJson.chains?.filter((ch) => ch.role === 'primary') ?? []
})

/** 证据清单（过滤系统生成的触发事实/行情事实条目，不展示） */
const evidenceList = computed<TraceEvidence[]>(() => {
  return (artifact.value?.artifactJson.evidence_index ?? []).filter(
    (evi) => evi.kind !== 'trigger_fact' && evi.kind !== 'quote_fact'
  )
})

const layerText = (l?: string): string =>
  ({ company: '公司', sector: '板块', market: '市场', capital: '资金', technical: '技术' }[l ?? ''] ?? l ?? '')

const statusText = (s?: string): string =>
  ({ supported: '支撑', weak: '偏弱', rejected: '排除', insufficient: '证据不足' }[s ?? ''] ?? s ?? '')

const stageText = (s?: string): string =>
  ({
    structural_root: '结构根源',
    trigger: '触发',
    transmission: '传导',
    exposure: '暴露',
    repricing: '重新定价',
    observable_result: '可见结果',
  }[s ?? ''] ?? s ?? '')

const epistemicText = (t?: string): string =>
  ({ fact: '事实', inference: '推断', hypothesis: '假设' }[t ?? ''] ?? t ?? '')

const nodeStatusText = (s?: string): string =>
  ({ established: '已确立', partial: '部分确立', not_established: '未确立' }[s ?? ''] ?? s ?? '')

const severityText = (s?: string): string =>
  ({ critical: '严重', high: '重要', medium: '中等' }[s ?? ''] ?? s ?? '')

const kindText = (k?: string): string =>
  ({
    trigger_fact: '触发事实',
    quote_fact: '行情事实',
    sector_fact: '板块事实',
    market_fact: '市场事实',
    announcement: '公告',
    news: '新闻',
    capital_fact: '资金事实',
    technical_fact: '技术事实',
  }[k ?? ''] ?? k ?? '')

/**
 * 系统生成的证据摘要（market_fact / sector_fact）由 Node 采集器写入英文固定模板
 * （StockTraceSnapshotService），此处转中文展示；非模板条目原样返回。
 * trigger_fact / quote_fact 条目已在 evidenceList 中过滤，不在此处理。
 */
function evidenceExcerpt(evi: TraceEvidence): string {
  const text = evi.content_excerpt
  if (evi.kind === 'market_fact') {
    // 模板：上证指数 change -2.40%.
    const m = String(text).match(/change\s+([-+]?[\d.]+%)\.?\s*$/)
    if (m) return `涨跌幅 ${m[1]}`
  }
  if (evi.kind === 'sector_fact') {
    // 模板：Board latest daily change -1.53% on 20260819.
    const m = String(text).match(/Board latest daily change\s+([-+]?[\d.]+%)\s+on\s+(\d{4})(\d{2})(\d{2})\.?\s*$/)
    if (m) return `板块最新日涨跌幅 ${m[1]}（${m[3]}-${m[4]}）`
  }
  return evi.content_excerpt
}

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
  } catch {
    detail.value = null
    analysis.value = null
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

/* ===== 事件信息卡 ===== */
.event-card {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.event-head {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.event-name {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
}

.event-dir {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 600;
}

.dir-up {
  color: $up;
  background: $up-bg;
}

.dir-down {
  color: $down;
  background: $down-bg;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: $s-2;
  flex-wrap: wrap;
}

.event-pct {
  font-size: $font-size-lg;
  font-weight: 700;
}

.pct-up {
  color: $up;
}

.pct-down {
  color: $down;
}

.event-time {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.event-severity {
  padding: 2rpx 10rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 500;
}

.severity-critical {
  color: $up;
  background: $up-bg;
}

.severity-high {
  color: $warning;
  background: $warning-bg;
}

.severity-medium {
  color: $ink-mute;
  background: $bg-soft;
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

/* ===== 候选列表 ===== */
.candidate-card {
  padding: $s-2 0;
  border-bottom: 2rpx solid $line-soft;

  &:last-child {
    border-bottom: none;
  }
}

.cand-head {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: 4rpx;
}

.cand-layer {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $primary;
}

.cand-status {
  padding: 0 10rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 500;
}

.cstatus-supported {
  color: $down;
  background: $down-bg;
}

.cstatus-weak {
  color: $warning;
  background: $warning-bg;
}

.cstatus-rejected {
  color: $ink-mute;
  background: $bg-soft;
}

.cstatus-insufficient {
  color: $ink-soft;
  background: $bg-soft;
}

.cand-verdict {
  display: block;
  font-size: $font-size-sm;
  color: $ink;
  line-height: 1.5;
  margin-bottom: 4rpx;
}

.cand-evi-count {
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== 六阶段链 ===== */
.chain-node-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.chain-node {
  padding: $s-2;
  background: $bg-soft;
  border-radius: $r-sm;
  border-left: 6rpx solid $primary-300;
}

.node-head {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: 4rpx;
  flex-wrap: wrap;
}

.node-stage {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $primary;
}

.node-epistemic {
  padding: 0 8rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 500;
}

.epi-fact {
  color: $down;
  background: $down-bg;
}

.epi-inference {
  color: $warning;
  background: $warning-bg;
}

.epi-hypothesis {
  color: $ink-mute;
  background: $bg-deep;
}

.node-nstatus {
  padding: 0 8rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 500;
}

.ns-established {
  color: $down;
  background: $down-bg;
}

.ns-partial {
  color: $warning;
  background: $warning-bg;
}

.ns-not_established {
  color: $ink-mute;
  background: $bg-soft;
}

.node-claim {
  display: block;
  font-size: $font-size-sm;
  color: $ink;
  line-height: 1.5;
}

/* ===== 证据清单 ===== */
.evidence-item {
  padding: $s-2 0;
  border-bottom: 2rpx solid $line-soft;

  &:last-child {
    border-bottom: none;
  }
}

.evi-head {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: 4rpx;
}

.evi-title {
  flex: 1;
  font-size: $font-size-sm;
  font-weight: 500;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evi-level {
  padding: 0 8rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 500;
  flex-shrink: 0;
}

.level-A {
  color: $primary;
  background: $primary-50;
}

.level-B {
  color: $down;
  background: $down-bg;
}

.level-C {
  color: $warning;
  background: $warning-bg;
}

.level-D {
  color: $ink-mute;
  background: $bg-soft;
}

.evi-excerpt {
  display: block;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.5;
  margin-bottom: 4rpx;
}

.evi-meta {
  font-size: $font-size-xs;
  color: $ink-mute;
}
</style>
