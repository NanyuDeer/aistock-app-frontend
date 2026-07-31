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

/** 仅开发预览：让落后分支页面在后端暂未对接时也能完整查看归因链样式。 */
const STOCK_TRACE_MOCK_EVENT: StockTraceEvent = {
  event_id: 'mock-trace-001', trigger_revision: 1, symbol: '300204', stock_name: '舒泰神', event_type: 'price',
  direction: 'up', triggered_at: '2026-07-31T10:15:00+08:00', latest_price: 18.72, previous_close: 17.04,
  change_pct: 9.86, threshold_pct: 5, severity: 'high', rule_version: 'mock-v1', analysis_status: 'completed',
}

const STOCK_TRACE_MOCK_ANALYSIS: StockTraceAnalysisResponse = {
  event_id: 'mock-trace-001', trigger_revision: 1, processing_status: 'completed',
  artifact: {
    artifactId: 'mock-artifact-001', artifactVersion: 1,
    movementView: {
      schemaVersion: 'movement-view-v2', eventId: 'mock-trace-001', artifactId: 'mock-artifact-001', artifactVersion: 1,
      status: 'confirmed', confidenceScore: 0.82, confidenceLevel: 'high', evidenceCount: 3,
      generatedAt: '2026-07-31T10:18:00+08:00',
      primaryCandidate: {
        layer: 'company', status: 'supported', verdict: '创新药临床进展与资金放量共振，推动股价快速上行。',
        supportingEvidenceIds: ['mock-news-001', 'mock-quote-001'],
      },
      alternatives: [{ layer: 'sector', status: 'weak', verdict: '医药板块回暖提供情绪支撑，但非唯一驱动。', supportingEvidenceIds: ['mock-sector-001'] }],
      unresolvedQuestions: [], suggestedActions: ['关注后续公告与量能持续性。'],
    },
    artifactJson: {
      primary_chain_id: 'mock-chain-primary',
      chains: [{
        chainId: 'mock-chain-primary', candidateId: 'mock-candidate-primary', role: 'primary', nodes: [
          { nodeId: 'mock-node-1', stage: 'structural_root', stageOrder: 1, epistemicType: 'fact', status: 'established', claim: '公司创新药管线近期披露积极临床进展。', evidenceIds: ['mock-news-001'], counterEvidenceIds: [] },
          { nodeId: 'mock-node-2', stage: 'transmission', stageOrder: 2, epistemicType: 'inference', status: 'established', claim: '基本面催化提升市场对产品商业化预期。', evidenceIds: ['mock-news-001'], counterEvidenceIds: [] },
          { nodeId: 'mock-node-3', stage: 'observable_result', stageOrder: 3, epistemicType: 'fact', status: 'established', claim: '盘中放量上涨 9.86%，触发异动阈值。', evidenceIds: ['mock-quote-001'], counterEvidenceIds: [] },
        ],
      }],
      evidence_index: [
        { source_id: 'mock-news-001', kind: 'news', provider: 'mock', source_level: 'A', title: '创新药临床进展披露，市场关注度上升', content_excerpt: '', content_hash: 'mock-hash-news' },
        { source_id: 'mock-quote-001', kind: 'quote_fact', provider: 'mock', source_level: 'A', title: '舒泰神盘中涨幅 9.86%，成交额显著放大', content_excerpt: '', content_hash: 'mock-hash-quote' },
        { source_id: 'mock-sector-001', kind: 'sector_fact', provider: 'mock', source_level: 'B', title: '医药板块整体走强', content_excerpt: '', content_hash: 'mock-hash-sector' },
      ],
    },
    createdAt: '2026-07-31T10:18:00+08:00',
  },
}

function loadMockTrace() {
  event.value = STOCK_TRACE_MOCK_EVENT
  analysis.value = STOCK_TRACE_MOCK_ANALYSIS
}

onLoad((options) => { eventId.value = typeof options?.event_id === 'string' ? options.event_id : '' })
onMounted(async () => {
  if (!eventId.value) {
    if (import.meta.env.DEV) loadMockTrace()
    loading.value = false
    return
  }
  try {
    event.value = await stockTraceApi.get(eventId.value)
    analysis.value = await stockTraceApi.getAnalysis(eventId.value)
    await stockTraceApi.markRead(eventId.value)
  } catch {
    if (import.meta.env.DEV) loadMockTrace()
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
