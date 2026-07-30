<template>
  <view class="page-stock-trace">
    <view v-if="loading" class="state"><text>加载中</text></view>
    <view v-else-if="!event" class="state"><text>异动事件不存在或已过期</text></view>
    <template v-else>
      <view class="event-card">
        <view class="event-title"><text>{{ event.stock_name }}</text><text class="symbol">{{ event.symbol }}</text></view>
        <text :class="['change', event.direction]">{{ signedChange(event.change_pct) }}</text>
        <text class="event-fact">价格异动，阈值 {{ event.threshold_pct.toFixed(0) }}%，触发于 {{ formatTime(event.triggered_at) }}</text>
      </view>

      <view v-if="analysis?.artifact" class="section">
        <text class="section-title">归因结论</text>
        <text class="summary">{{ primary?.verdict || '当前未形成主因结论' }}</text>
        <text class="meta">状态：{{ statusLabel(analysis.artifact.movementView.status) }} · 置信度：{{ confidenceLabel(analysis.artifact.movementView.confidenceLevel) }}</text>
        <text v-if="primary" class="meta">主因层级：{{ layerLabel(primary.layer) }} · 已校验证据 {{ analysis.artifact.movementView.evidenceCount }} 条</text>
      </view>

      <view v-if="chainNodes.length" class="section">
        <text class="section-title">可审计推理链</text>
        <view v-for="node in chainNodes" :key="node.nodeId" class="row">
          <text class="tag">{{ stageLabel(node.stage) }}</text>
          <text class="row-text">{{ node.claim }}</text>
        </view>
      </view>

      <view v-if="evidence.length" class="section">
        <text class="section-title">新闻 / 公告证据</text>
        <view v-for="source in evidence" :key="source.source_id" class="row">
          <text class="tag">{{ source.source_level }}级{{ sourceKindLabel(source.kind) }}</text>
          <text class="row-text">{{ source.title }}</text>
        </view>
      </view>

      <view v-if="analysis?.artifact?.movementView.alternatives.length" class="section">
        <text class="section-title">备选解释</text>
        <view v-for="item in analysis.artifact.movementView.alternatives" :key="`${item.layer}-${item.verdict}`" class="row">
          <text class="tag">{{ layerLabel(item.layer) }}</text>
          <text class="row-text">{{ item.verdict }}</text>
        </view>
      </view>

      <view v-if="analysis?.unavailable" class="section unavailable">
        <text class="section-title">原因暂不可用</text>
        <text class="summary">{{ analysis.unavailable.message }}</text>
        <text class="meta">仅展示异动触发事实，未展示未通过校验的模型内容。</text>
      </view>
      <view v-else-if="!analysis?.artifact" class="section"><text class="summary">归因处理中，结果仅在证据校验通过后展示。</text></view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stockTraceApi, type MovementCandidate, type StockTraceAnalysisResponse, type StockTraceEvent, type TraceChainNode, type TraceEvidence } from '@/shared/api/modules/stockTrace'

const eventId = ref('')
const event = ref<StockTraceEvent | null>(null)
const analysis = ref<StockTraceAnalysisResponse | null>(null)
const loading = ref(true)
const primary = computed<MovementCandidate | undefined>(() => analysis.value?.artifact?.movementView.primaryCandidate)
const chainNodes = computed<TraceChainNode[]>(() => {
  const content = analysis.value?.artifact?.artifactJson
  return content?.chains?.find((chain) => chain.chainId === content.primary_chain_id || chain.role === 'primary')?.nodes || []
})
const evidence = computed<TraceEvidence[]>(() => {
  const ids = new Set(primary.value?.supportingEvidenceIds || [])
  return (analysis.value?.artifact?.artifactJson.evidence_index || []).filter((source) => ids.has(source.source_id))
})

onLoad((options) => { eventId.value = typeof options?.event_id === 'string' ? options.event_id : '' })
onMounted(async () => {
  if (!eventId.value) { loading.value = false; return }
  try {
    event.value = await stockTraceApi.get(eventId.value)
    analysis.value = await stockTraceApi.getAnalysis(eventId.value)
    await stockTraceApi.markRead(eventId.value)
  } finally { loading.value = false }
})

function signedChange(value: number): string { return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` }
function formatTime(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? '--' : `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function statusLabel(value: string): string { return ({ confirmed: '已确认', hypothesis: '待验证', insufficient: '证据不足', not_applicable: '不适用' } as Record<string, string>)[value] || value }
function confidenceLabel(value?: string): string { return ({ high: '高', medium: '中', low: '低' } as Record<string, string>)[value || ''] || '--' }
function layerLabel(value: string): string { return ({ company: '个股自身', sector: '板块联动', market: '市场环境' } as Record<string, string>)[value] || value }
function stageLabel(value: TraceChainNode['stage']): string { return ({ structural_root: '根因事实', trigger: '异动触发', transmission: '传导路径', exposure: '影响暴露', repricing: '市场重估', observable_result: '可观测结果' })[value] }
function sourceKindLabel(value: TraceEvidence['kind']): string { return ({ announcement: '公告', news: '新闻', trigger_fact: '触发事实', quote_fact: '行情事实', sector_fact: '板块事实', market_fact: '市场事实' })[value] }
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
.page-stock-trace { min-height: 100%; padding: $spacing-base; background: $bg-color-grey; }
.event-card, .section { display: flex; flex-direction: column; gap: $spacing-sm; padding: $spacing-base; margin-bottom: $spacing-base; background: $bg-color; border-radius: $radius-base; }
.event-title { display: flex; align-items: baseline; gap: $spacing-sm; color: $text-color-title; font-size: $font-size-lg; font-weight: 600; }.symbol, .meta, .event-fact { color: $text-color-secondary; font-size: $font-size-sm; font-weight: 400; }.change { font-size: 44rpx; font-weight: 700; }.change.up { color: $stock-up-color; }.change.down { color: $stock-down-color; }
.section-title { color: $text-color-title; font-size: $font-size-base; font-weight: 600; }.summary, .row-text { color: $text-color-secondary; font-size: $font-size-sm; line-height: 1.6; }.row { display: flex; gap: $spacing-sm; align-items: flex-start; padding-top: $spacing-sm; border-top: 1rpx solid $border-color-light; }.tag { flex: 0 0 auto; padding: 2rpx 8rpx; color: $brand-color; background: rgba($brand-color, .1); border-radius: $radius-sm; font-size: $font-size-xs; }.unavailable { border-left: 6rpx solid $warning-color; }.state { padding: 120rpx 0; text-align: center; color: $text-color-secondary; font-size: $font-size-base; }
</style>
