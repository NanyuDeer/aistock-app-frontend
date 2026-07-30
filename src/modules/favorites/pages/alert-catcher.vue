<template>
  <SubPageCard title="异动捕手">
    <view class="alert-catcher">
      <view class="intro-card">
        <view class="intro-header"><SvgIcon name="bell-line" size="32rpx" color="#4d7cfe" /><text>自选股价格异动</text></view>
        <text class="intro-desc">盘中涨跌幅达到正负 7% 时生成事件，并在证据校验通过后展示结构化归因。</text>
      </view>
      <view v-if="loading" class="empty-state"><text>加载中</text></view>
      <view v-else-if="displayEvents.length" class="alert-list">
        <view v-for="item in displayEvents" :key="item.event_id" :class="['alert-card', item.direction]" @tap="markRead(item.event_id)">
          <view class="alert-card-header">
            <view><text class="stock-name">{{ item.stock_name }}</text><text class="stock-code">{{ item.symbol }}</text></view>
            <text :class="['change', item.direction]">{{ signedChange(item.change_pct) }}</text>
          </view>
          <view class="fact-grid">
            <text>触发：{{ formatTime(item.triggered_at) }}</text><text>最新价：{{ item.latest_price.toFixed(2) }}</text>
            <text>昨收：{{ item.previous_close.toFixed(2) }}</text><text>规则：价格异动，阈值 {{ item.threshold_pct.toFixed(0) }}%</text>
          </view>
          <view v-if="requestedEventId" class="trace-status">
            <template v-if="analysis?.artifact">
              <text>归因状态：{{ attributionLabel(analysis.artifact.movementView.status) }} · 置信度 {{ confidenceLabel(analysis.artifact.movementView.confidenceLevel) }}</text>
              <text v-if="analysis.artifact.movementView.primaryCandidate">主因候选：{{ layerLabel(analysis.artifact.movementView.primaryCandidate.layer) }}</text>
              <text v-if="analysis.artifact.movementView.primaryCandidate">{{ analysis.artifact.movementView.primaryCandidate.verdict }}</text>
              <text>已校验证据：{{ analysis.artifact.movementView.evidenceCount }} 条</text>
              <text v-if="analysis.artifact.movementView.unresolvedQuestions[0]">未解问题：{{ analysis.artifact.movementView.unresolvedQuestions[0] }}</text>
              <view v-if="analysisSummary" class="analysis-section">
                <text class="analysis-title">归因分析</text>
                <text class="analysis-summary">{{ analysisSummary }}</text>
              </view>
              <view v-if="primaryChainNodes.length" class="analysis-section">
                <text class="analysis-title">可审计推理链</text>
                <view v-for="node in primaryChainNodes" :key="node.nodeId" class="chain-node">
                  <view class="chain-node-header">
                    <text class="chain-stage">{{ stageLabel(node.stage) }}</text>
                    <text :class="['chain-tag', node.epistemicType]">{{ epistemicLabel(node.epistemicType) }}</text>
                    <text :class="['chain-tag', node.status]">{{ nodeStatusLabel(node.status) }}</text>
                  </view>
                  <text class="chain-claim">{{ node.claim }}</text>
                </view>
              </view>
              <view v-if="supportingEvidence.length" class="analysis-section">
                <text class="analysis-title">新闻 / 公告证据</text>
                <view v-for="source in supportingEvidence" :key="source.source_id" class="evidence-card" @tap="openEvidence(source.canonical_url)">
                  <view class="evidence-header"><text :class="['source-level', source.source_level]">{{ source.source_level }}级</text><text class="evidence-kind">{{ sourceKindLabel(source.kind) }}</text><text class="evidence-time">{{ formatTime(source.occurred_at || source.captured_at || '') }}</text></view>
                  <text class="evidence-title">{{ source.title }}</text>
                  <text class="evidence-excerpt">{{ source.content_excerpt }}</text>
                  <text v-if="source.canonical_url" class="evidence-link">查看原始来源</text>
                </view>
              </view>
            </template>
            <template v-else-if="analysis?.unavailable">
              <text>归因分析：{{ analysis.unavailable.message }}</text>
              <text>仅展示异动触发事实，未展示未通过校验的分析内容。</text>
            </template>
            <template v-else><text>归因分析：处理中，结果仅会在证据校验通过后展示</text></template>
            <text>事件 ID：{{ item.event_id }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-state"><text class="empty-title">暂无价格异动</text><text class="empty-desc">自选股盘中涨跌幅达到正负 7% 时会显示在这里</text></view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { stockTraceApi, type StockTraceAnalysisResponse, type StockTraceEvent, type TraceChainNode, type TraceEvidence } from '@/shared/api/modules/stockTrace'

const loading = ref(true)
const events = ref<StockTraceEvent[]>([])
const requestedEventId = ref('')
const analysis = ref<StockTraceAnalysisResponse | null>(null)
const displayEvents = computed(() => requestedEventId.value ? events.value.filter((item) => item.event_id === requestedEventId.value) : events.value)
const artifactContent = computed(() => analysis.value?.artifact?.artifactJson)
const primaryChainNodes = computed<TraceChainNode[]>(() => {
  const content = artifactContent.value
  const chain = content?.chains?.find((item) => item.chainId === content.primary_chain_id || item.role === 'primary')
  return chain?.nodes || []
})
const supportingEvidence = computed<TraceEvidence[]>(() => {
  const content = artifactContent.value
  const ids = new Set(analysis.value?.artifact?.movementView.primaryCandidate?.supportingEvidenceIds || [])
  return (content?.evidence_index || []).filter((item) => ids.has(item.source_id))
})
const analysisSummary = computed(() => {
  const event = displayEvents.value[0]
  const primary = analysis.value?.artifact?.movementView.primaryCandidate
  const source = supportingEvidence.value[0]
  if (!event || !primary) return ''
  const movement = `${event.stock_name}（${event.symbol}）在 ${formatTime(event.triggered_at)} 出现 ${signedChange(event.change_pct)} 的价格异动。`
  if (!source) return `${movement}当前没有可引用的主因证据，结论仅保留为待验证。`
  return `${movement}在异动时间窗内发现 ${source.source_level} 级${sourceKindLabel(source.kind)}《${source.title}》，该事实支持“${layerLabel(primary.layer)}”为当前主因候选；结论为${attributionLabel(analysis.value?.artifact?.movementView.status || '')}，置信度${confidenceLabel(analysis.value?.artifact?.movementView.confidenceLevel)}。`
})

onLoad((options) => {
  requestedEventId.value = typeof options?.event_id === 'string' ? options.event_id : ''
})

function formatTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function signedChange(value: number): string { return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` }
function attributionLabel(value: string): string { return ({ confirmed: '已确认', hypothesis: '待验证假设', insufficient: '证据不足', not_applicable: '不适用' } as Record<string, string>)[value] || value }
function confidenceLabel(value?: string): string { return ({ high: '高', medium: '中', low: '低' } as Record<string, string>)[value || ''] || '--' }
function layerLabel(value: string): string { return ({ company: '个股自身', sector: '板块联动', market: '市场环境' } as Record<string, string>)[value] || value }
function stageLabel(value: TraceChainNode['stage']): string { return ({ structural_root: '根因事实', trigger: '异动触发', transmission: '传导路径', exposure: '影响暴露', repricing: '市场重估', observable_result: '可观测结果' })[value] }
function epistemicLabel(value: TraceChainNode['epistemicType']): string { return ({ fact: '事实', inference: '推断', hypothesis: '假设' })[value] }
function nodeStatusLabel(value: TraceChainNode['status']): string { return ({ established: '已建立', partial: '部分成立', not_established: '未建立' })[value] }
function sourceKindLabel(value: TraceEvidence['kind']): string { return ({ announcement: '公告', news: '新闻', trigger_fact: '触发事实', quote_fact: '行情事实', sector_fact: '板块事实', market_fact: '市场事实' })[value] }

function openEvidence(url?: string) {
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank', 'noopener')
  // #endif
  // #ifndef H5
  void uni.setClipboardData({ data: url })
  // #endif
}

async function load() {
  loading.value = true
  try {
    if (requestedEventId.value) {
      const event = await stockTraceApi.get(requestedEventId.value)
      events.value = [event]
      analysis.value = await stockTraceApi.getAnalysis(requestedEventId.value)
      await stockTraceApi.markRead(requestedEventId.value)
    } else {
      events.value = (await stockTraceApi.list(50)).items
    }
  } catch {
    events.value = []
    analysis.value = null
  } finally { loading.value = false }
}

async function markRead(eventId: string) {
  try { await stockTraceApi.markRead(eventId) } catch { return }
}

onMounted(() => { void load() })
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
.alert-catcher { padding: 0 $spacing-base $spacing-lg; }.intro-card { background: rgba($brand-color, .06); border-radius: $radius-base; padding: $spacing-base; margin-bottom: $spacing-base; }.intro-header { display: flex; align-items: center; gap: $spacing-sm; color: $text-color-title; font-size: $font-size-base; font-weight: 600; margin-bottom: 8rpx; }.intro-desc { color: $text-color-secondary; font-size: $font-size-sm; line-height: 1.6; }.alert-list { display: flex; flex-direction: column; gap: $spacing-sm; }.alert-card { background: $bg-color-grey; border-left: 6rpx solid $stock-flat-color; border-radius: $radius-base; padding: $spacing-base; }.alert-card.up { border-left-color: $stock-up-color; }.alert-card.down { border-left-color: $stock-down-color; }.alert-card-header { display: flex; justify-content: space-between; margin-bottom: $spacing-sm; }.stock-name { font-size: $font-size-lg; color: $text-color-title; font-weight: 600; margin-right: 12rpx; }.stock-code, .fact-grid, .trace-status { color: $text-color-secondary; font-size: $font-size-sm; }.change { font-size: $font-size-lg; font-weight: 700; }.change.up { color: $stock-up-color; }.change.down { color: $stock-down-color; }.fact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; line-height: 1.5; }.trace-status { margin-top: $spacing-sm; padding-top: $spacing-sm; border-top: 1rpx solid $border-color-light; display: flex; flex-direction: column; gap: 6rpx; }.analysis-section { display: flex; flex-direction: column; gap: 10rpx; margin-top: $spacing-sm; padding-top: $spacing-sm; border-top: 1rpx solid $border-color-light; }.analysis-title { color: $text-color-title; font-size: $font-size-sm; font-weight: 600; }.analysis-summary, .chain-claim, .evidence-excerpt { color: $text-color-secondary; font-size: $font-size-sm; line-height: 1.55; }.chain-node, .evidence-card { display: flex; flex-direction: column; gap: 6rpx; background: $bg-color-muted; border-radius: $radius-sm; padding: $spacing-sm; }.chain-node-header, .evidence-header { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }.chain-stage, .evidence-title { color: $text-color-title; font-size: $font-size-sm; font-weight: 600; }.chain-tag, .source-level, .evidence-kind, .evidence-time, .evidence-link { font-size: $font-size-xs; }.chain-tag, .source-level { padding: 2rpx 8rpx; border-radius: $radius-sm; background: rgba($brand-color, .1); color: $brand-color; }.chain-tag.hypothesis, .chain-tag.not_established { background: rgba($text-color-secondary, .1); color: $text-color-secondary; }.chain-tag.partial { background: rgba($warning-color, .12); color: $warning-color; }.evidence-kind, .evidence-time { color: $text-color-secondary; }.evidence-link { color: $brand-color; }.empty-state { padding: 80rpx 0; display: flex; flex-direction: column; gap: 12rpx; align-items: center; color: $text-color-secondary; }.empty-title { font-size: $font-size-base; }.empty-desc { font-size: $font-size-sm; }
</style>
