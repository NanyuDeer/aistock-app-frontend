<template>
  <view class="pm-analysis">
    <view v-if="analysis?.processing_status === 'processing'" class="pm-section pm-status is-processing">
      <SvgIcon name="timer-2-line" size="30rpx" color="#0b5fff" />
      <text>归因分析中，请稍候...</text>
    </view>
    <view v-else-if="analysis?.processing_status === 'unavailable'" class="pm-section pm-status is-unavailable">
      <text>{{ analysis.unavailable?.message ?? '归因暂不可用' }}</text>
    </view>
    <template v-else-if="artifact && analysis?.processing_status === 'completed'">
      <view v-if="primaryCause" class="pm-section">
        <view class="pm-title-row">
          <text class="pm-title">支撑性主因</text>
          <view class="pm-title-tags">
            <text class="pm-tag">{{ layerText(primaryCause.layer) }}</text>
            <text v-if="confidence" class="pm-tag is-gold">{{ confidenceText(confidence.level) }}</text>
            <text v-if="isConfirmed" class="pm-tag is-confirmed">已确认</text>
          </view>
        </view>
        <view class="pm-conclusion"><text class="pm-conclusion-label">归因结论</text><text class="pm-conclusion-text">{{ primaryCause.verdict }}</text></view>
        <view v-for="chain in primaryChains" :key="chain.chainId" class="pm-chain">
          <view v-for="(node, index) in chain.nodes" :key="node.nodeId" class="pm-chain-item">
            <view class="pm-rail"><view :class="['pm-dot', { 'is-primary': index <= 1 || index === chain.nodes.length - 1 }]" /><view v-if="index < chain.nodes.length - 1" class="pm-line" /></view>
            <view class="pm-chain-body"><text :class="['pm-stage', { 'is-primary': index <= 1 || index === chain.nodes.length - 1 }]">{{ stageText(node.stage) }}</text><text class="pm-claim">{{ node.claim }}</text></view>
          </view>
        </view>
        <view class="pm-meta"><text class="pm-tag">{{ layerText(primaryCause.layer) }} · {{ statusText(primaryCause.status) }}</text><text>证据 {{ primaryCause.supportingEvidenceIds.length }} 条{{ isConfirmed ? ' · 已确认' : '' }}</text></view>
      </view>
      <view v-if="candidateCards.length" class="pm-section">
        <text class="pm-title">候选归因</text>
        <view class="pm-candidate-list"><view v-for="candidate in candidateCards" :key="candidate.candidateId" class="pm-candidate"><view class="pm-candidate-head"><text>{{ layerText(candidate.layer) }}</text><text :class="['pm-tag', `is-${candidate.status}`]">{{ statusText(candidate.status) }}</text></view><text>{{ candidate.verdict }}</text></view></view>
      </view>
      <view v-if="unresolvedQuestions.length" class="pm-section pm-questions"><text class="pm-title">未解问题</text><view v-for="question in unresolvedQuestions" :key="question" class="pm-question"><text>·</text><text>{{ question }}</text></view></view>
      <view v-if="evidenceList.length" class="pm-section">
        <view class="pm-title pm-evidence-toggle" @tap="evidenceOpen = !evidenceOpen"><text>证据清单（{{ evidenceList.length }}）</text><text>{{ evidenceOpen ? '收起' : '展开' }}</text></view>
        <view v-show="evidenceOpen"><view v-for="(evidence, index) in evidenceList" :key="evidence.source_id || index" class="pm-evidence"><view class="pm-evidence-head"><text>{{ evidence.title }}</text><text class="pm-tag">{{ evidence.source_level }}</text></view><text>{{ evidenceExcerpt(evidence) }}</text><text class="pm-evidence-meta">{{ kindText(evidence.kind) }} · {{ evidence.occurred_at ? formatTime(evidence.occurred_at) : '' }}</text></view></view>
      </view>
    </template>
    <view v-else-if="analysis?.processing_status === 'completed'" class="pm-section pm-status is-unavailable"><text>归因已完成，但结果暂不可用</text></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import type { StockTraceAnalysisResponse, StockTraceArtifact, StockTraceEvent, TraceChain, TraceEvidence } from '@/shared/api/modules/stockTrace'

const props = defineProps<{ detail: StockTraceEvent; analysis: StockTraceAnalysisResponse | null }>()
const evidenceOpen = ref(false)
const artifact = computed<StockTraceArtifact | null>(() => props.analysis?.artifact || null)
const allCandidates = computed(() => {
  const candidates = artifact.value?.artifactJson.candidates ?? []
  const primaryChainId = artifact.value?.artifactJson.primary_chain_id
  const primaryCandidateId = artifact.value?.artifactJson.chains?.find(chain => chain.chainId === primaryChainId)?.candidateId
  const primary = candidates.find(candidate => candidate.candidateId === primaryCandidateId)
  return [primary, ...candidates.filter(candidate => candidate.candidateId !== primaryCandidateId)]
    .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate)
    .filter(candidate => candidate.status === 'supported' || candidate.status === 'weak')
})
const primaryCause = computed(() => allCandidates.value[0] || null)
const candidateCards = computed(() => allCandidates.value.slice(1))
const primaryChains = computed<TraceChain[]>(() => artifact.value?.artifactJson.chains?.filter(chain => chain.role === 'primary') ?? [])
const evidenceList = computed<TraceEvidence[]>(() => (artifact.value?.artifactJson.evidence_index ?? []).filter(evidence => evidence.kind !== 'trigger_fact' && evidence.kind !== 'quote_fact'))
const unresolvedQuestions = computed<string[]>(() => artifact.value?.artifactJson.unresolved_questions ?? [])
const confidence = computed<{ level: string } | null>(() => {
  const value = artifact.value?.artifactJson.confidence
  if (!value || value.score == null) return null
  return { level: value.level ?? (value.score >= 0.7 ? 'high' : value.score >= 0.5 ? 'medium' : 'low') }
})
const isConfirmed = computed(() => artifact.value?.artifactJson.attribution_status === 'confirmed')
function layerText(value?: string): string { return ({ company: '公司', sector: '板块', market: '市场', capital: '资金', technical: '技术' } as Record<string, string>)[value || ''] || value || '' }
function statusText(value?: string): string { return ({ supported: '支撑', weak: '偏弱', rejected: '排除', insufficient: '证据不足' } as Record<string, string>)[value || ''] || value || '' }
function confidenceText(value?: string): string { return ({ high: '高置信', medium: '中置信', low: '低置信' } as Record<string, string>)[value || ''] || value || '' }
function stageText(value?: string): string { return ({ structural_root: '结构根源', trigger: '触发', transmission: '传导', exposure: '暴露', repricing: '重新定价', observable_result: '可见结果' } as Record<string, string>)[value || ''] || value || '' }
function kindText(value?: string): string { return ({ trigger_fact: '触发事实', quote_fact: '行情事实', sector_fact: '板块事实', market_fact: '市场事实', announcement: '公告', news: '新闻', capital_fact: '资金事实', technical_fact: '技术事实' } as Record<string, string>)[value || ''] || value || '' }
function formatTime(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? '--' : `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function evidenceExcerpt(evidence: TraceEvidence): string {
  if (evidence.kind === 'market_fact') { const match = String(evidence.content_excerpt).match(/change\s+([-+]?[\d.]+%)\.?\s*$/); if (match) return `涨跌幅 ${match[1]}` }
  if (evidence.kind === 'sector_fact') { const match = String(evidence.content_excerpt).match(/Board latest daily change\s+([-+]?[\d.]+%)\s+on\s+\d{4}(\d{2})(\d{2})\.?\s*$/); if (match) return `板块最新日涨跌幅 ${match[1]}（${match[2]}-${match[3]}）` }
  return evidence.content_excerpt
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
.pm-analysis { display: flex; flex-direction: column; gap: $s-3; }
.pm-section { padding: $s-3; border: 2rpx solid $line; border-radius: $r-md; background: $bg-card; }
.pm-status { display: flex; align-items: center; gap: $s-2; font-size: $font-size-sm; }.pm-status.is-processing { color: $primary; }.pm-status.is-unavailable { color: $ink-mute; }
.pm-title { display: flex; justify-content: space-between; margin-bottom: $s-2; color: $ink; font-size: $font-size-base; font-weight: 600; }.pm-title-row { display: flex; align-items: center; justify-content: space-between; gap: $s-2; margin-bottom: $s-2; }.pm-title-row .pm-title { margin: 0; }.pm-title-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: $s-2; }
.pm-tag { padding: 2rpx 12rpx; border-radius: $r-sm; color: $primary; background: $primary-50; font-size: $font-size-xs; }.pm-tag.is-gold, .pm-tag.is-weak { color: $warning; background: $warning-bg; }.pm-tag.is-confirmed { color: $down; background: $down-bg; }
.pm-conclusion { margin-bottom: $s-3; padding: $s-3 $s-4; border-radius: $r-lg; background: $primary; }.pm-conclusion-label { display: block; margin-bottom: 4rpx; color: rgba(255,255,255,.8); font-size: $font-size-xs; }.pm-conclusion-text { display: block; color: $white; font-size: $font-size-base; font-weight: 600; line-height: 1.5; }
.pm-chain-item { display: flex; }.pm-rail { position: relative; flex: 0 0 32rpx; }.pm-dot { position: absolute; top: 8rpx; left: 50%; width: 20rpx; height: 20rpx; border-radius: $r-full; background: $ink-mute; transform: translateX(-50%); }.pm-dot.is-primary { background: $primary; }.pm-line { position: absolute; top: 28rpx; bottom: 0; left: 50%; width: 2rpx; background: $line-soft; }.pm-chain-body { flex: 1; padding-bottom: $s-3; }.pm-stage { display: block; margin-bottom: 4rpx; color: $ink-soft; font-size: $font-size-xs; }.pm-stage.is-primary { color: $primary; }.pm-claim { display: block; color: $ink; font-size: $font-size-sm; line-height: 1.5; }
.pm-meta { display: flex; align-items: center; gap: $s-2; color: $ink-soft; font-size: $font-size-xs; }.pm-meta text:last-child { margin-left: auto; }.pm-candidate-list { display: flex; flex-direction: column; gap: $s-2; }.pm-candidate { padding: $s-3; border-radius: $r-md; background: $bg-soft; color: $ink-soft; font-size: $font-size-xs; line-height: 1.5; }.pm-candidate-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: $s-1; color: $ink; font-size: $font-size-sm; font-weight: 600; }.pm-questions { border-color: $primary-100; background: $primary-50; }.pm-question { display: flex; gap: $s-1; margin-top: $s-1; color: $ink; font-size: $font-size-sm; line-height: 1.5; }.pm-question text:first-child { color: $primary; }.pm-evidence-toggle { cursor: pointer; }.pm-evidence { padding: $s-2 0; border-bottom: 2rpx solid $line-soft; color: $ink-soft; font-size: $font-size-sm; line-height: 1.5; }.pm-evidence:last-child { border: 0; }.pm-evidence-head { display: flex; align-items: center; justify-content: space-between; gap: $s-2; margin-bottom: 4rpx; color: $ink; font-weight: 500; }.pm-evidence-meta { display: block; margin-top: 4rpx; color: $ink-mute; font-size: $font-size-xs; }
</style>
