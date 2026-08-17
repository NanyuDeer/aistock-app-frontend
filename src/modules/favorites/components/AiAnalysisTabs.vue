<template>
  <view class="ai-analysis-tabs">
    <!-- 周期切换 -->
    <view class="view-tabs">
      <view
        v-for="tab in viewTabs"
        :key="tab.key"
        :class="['view-tab', { 'is-active': activeView === tab.key }]"
        @tap="activeView = tab.key"
      >
        <text class="tab-label">{{ tab.label }}</text>
        <text class="tab-desc">{{ tab.desc }}</text>
      </view>
    </view>

    <!-- 短线：AI 资讯分析 -->
    <view v-show="activeView === 'short'" class="view-content">
      <view class="ai-analysis-card">
        <view class="card-header">
          <text class="card-title">AI 资讯分析</text>
          <view v-if="!aiLoading" class="ai-refresh-btn" @tap="$emit('refresh')">
            <text class="refresh-icon">↻</text>
          </view>
        </view>
        <view class="card-body">
          <view v-if="aiLoading" class="ai-loading">
            <text class="ai-loading-text">正在生成AI分析...</text>
          </view>
          <template v-else-if="aiAnalysis && aiAnalysis.conclusion">
            <view class="ai-conclusion">
              <text :class="['conclusion-badge', aiConclusionClass]">{{ aiAnalysis.conclusion }}</text>
              <text v-if="aiAnalysis.analysisDate" class="analysis-date">{{ formatAiDate(aiAnalysis.analysisDate) }}</text>
            </view>
            <view v-if="logicTags.length" class="ai-tags-section">
              <text class="ai-tags-title">核心逻辑</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in logicTags"
                  :key="'lg'+i"
                  :class="['research-tag', 'is-logic', { 'is-expanded': expandedTag === 'logic' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('logic', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'logic'" class="tag-detail">
                <text class="tag-detail-text">{{ logicTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
            <view v-if="riskTags.length" class="ai-tags-section">
              <text class="ai-tags-title risk">风险提示</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in riskTags"
                  :key="'rk'+i"
                  :class="['research-tag', 'is-risk', { 'is-expanded': expandedTag === 'risk' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('risk', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'risk'" class="tag-detail risk">
                <text class="tag-detail-text">{{ riskTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
          </template>
          <view v-else class="ai-empty">
            <text class="ai-empty-text">暂无 AI 资讯分析</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 中线 AI 研判 -->
    <view v-show="activeView === 'mid'" class="view-content">
      <view class="ai-analysis-card">
        <view class="card-header">
          <text class="card-title">中线AI研判</text>
        </view>
        <view class="card-body">
          <view class="ai-conclusion">
            <text :class="['conclusion-badge', midAiAnalysis.badgeClass]">{{ midAiAnalysis.conclusion }}</text>
          </view>
          <view class="ai-logic">
            <text class="ai-logic-text">{{ midAiAnalysis.logic }}</text>
          </view>
          <view v-if="midBasisTags.length" class="ai-section">
            <text class="ai-section-title">研判依据</text>
            <view class="research-tags">
              <view
                v-for="(tag, i) in midBasisTags"
                :key="'mb'+i"
                :class="['research-tag', 'is-basis', { 'is-expanded': expandedTag === 'midBasis' && expandedTagIdx === i }]"
                @tap="toggleTagExpand('midBasis', i)"
              >
                <text class="research-tag-text">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'midBasis'" class="tag-detail basis">
              <text class="tag-detail-text">{{ midBasisTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
          <view v-if="midAdviceTags.length" class="ai-section">
            <text class="ai-section-title">投资建议</text>
            <view class="research-tags">
              <view
                v-for="(tag, i) in midAdviceTags"
                :key="'ma'+i"
                :class="['research-tag', 'is-advice', { 'is-expanded': expandedTag === 'midAdvice' && expandedTagIdx === i }]"
                @tap="toggleTagExpand('midAdvice', i)"
              >
                <text class="research-tag-text">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'midAdvice'" class="tag-detail advice">
              <text class="tag-detail-text">{{ midAdviceTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
          <view v-if="midRiskTags.length" class="ai-section">
            <text class="ai-section-title risk">风险提示</text>
            <view class="research-tags">
              <view
                v-for="(tag, i) in midRiskTags"
                :key="'mr'+i"
                :class="['research-tag', 'is-risk', { 'is-expanded': expandedTag === 'midRisk' && expandedTagIdx === i }]"
                @tap="toggleTagExpand('midRisk', i)"
              >
                <text class="research-tag-text">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'midRisk'" class="tag-detail risk">
              <text class="tag-detail-text">{{ midRiskTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 长线 AI 研判 -->
    <view v-show="activeView === 'long'" class="view-content">
      <view class="ai-analysis-card">
        <view class="card-header">
          <text class="card-title">长线AI研判</text>
        </view>
        <view class="card-body">
          <view class="ai-conclusion">
            <text :class="['conclusion-badge', longAiAnalysis.badgeClass]">{{ longAiAnalysis.conclusion }}</text>
          </view>
          <view class="ai-logic">
            <text class="ai-logic-text">{{ longAiAnalysis.logic }}</text>
          </view>
          <view v-if="longBasisTags.length" class="ai-section">
            <text class="ai-section-title">研判依据</text>
            <view class="research-tags">
              <view
                v-for="(tag, i) in longBasisTags"
                :key="'lb'+i"
                :class="['research-tag', 'is-basis', { 'is-expanded': expandedTag === 'longBasis' && expandedTagIdx === i }]"
                @tap="toggleTagExpand('longBasis', i)"
              >
                <text class="research-tag-text">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'longBasis'" class="tag-detail basis">
              <text class="tag-detail-text">{{ longBasisTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
          <view v-if="longAdviceTags.length" class="ai-section">
            <text class="ai-section-title">投资建议</text>
            <view class="research-tags">
              <view
                v-for="(tag, i) in longAdviceTags"
                :key="'la'+i"
                :class="['research-tag', 'is-advice', { 'is-expanded': expandedTag === 'longAdvice' && expandedTagIdx === i }]"
                @tap="toggleTagExpand('longAdvice', i)"
              >
                <text class="research-tag-text">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'longAdvice'" class="tag-detail advice">
              <text class="tag-detail-text">{{ longAdviceTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
          <view v-if="longRiskTags.length" class="ai-section">
            <text class="ai-section-title risk">风险提示</text>
            <view class="research-tags">
              <view
                v-for="(tag, i) in longRiskTags"
                :key="'lr'+i"
                :class="['research-tag', 'is-risk', { 'is-expanded': expandedTag === 'longRisk' && expandedTagIdx === i }]"
                @tap="toggleTagExpand('longRisk', i)"
              >
                <text class="research-tag-text">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'longRisk'" class="tag-detail risk">
              <text class="tag-detail-text">{{ longRiskTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useStockAiAnalysis, extractTagsFromText, extractTagsFromArray } from '../composables/useStockAiAnalysis'

const props = defineProps<{
  symbol: string
  stockName: string
  industry: string
  aiAnalysis: any
  aiLoading: boolean
}>()

defineEmits<{
  refresh: []
}>()

const symbolRef = toRef(props, 'symbol')
const quoteRef = ref<{ name?: string; industry?: string } | null>({
  name: props.stockName,
  industry: props.industry
})

watch(() => [props.stockName, props.industry], ([name, industry]) => {
  quoteRef.value = { name: name as string, industry: industry as string }
})

type ViewKey = 'short' | 'mid' | 'long'
const activeView = ref<ViewKey>('mid')
const viewTabs: { key: ViewKey; label: string; desc: string }[] = [
  { key: 'short', label: '短线', desc: '日/周' },
  { key: 'mid', label: '中线', desc: '周/月' },
  { key: 'long', label: '长线', desc: '季/年' }
]

const { midAiAnalysis, longAiAnalysis } = useStockAiAnalysis(symbolRef, quoteRef)

const aiConclusionClass = computed(() => {
  const c = props.aiAnalysis?.conclusion || ''
  if (c.includes('买入') || c.includes('增持') || c.includes('推荐')) return 'is-bull'
  if (c.includes('卖出') || c.includes('减持')) return 'is-bear'
  return 'is-hold'
})

const logicTags = computed(() => extractTagsFromText(props.aiAnalysis?.coreLogic || ''))
const riskTags = computed(() => extractTagsFromText(props.aiAnalysis?.riskWarning || ''))

const midBasisTags = computed(() => extractTagsFromArray(midAiAnalysis.value.basis))
const midAdviceTags = computed(() => extractTagsFromArray(midAiAnalysis.value.advice))
const midRiskTags = computed(() => extractTagsFromArray(midAiAnalysis.value.riskTips))

const longBasisTags = computed(() => extractTagsFromArray(longAiAnalysis.value.basis))
const longAdviceTags = computed(() => extractTagsFromArray(longAiAnalysis.value.advice))
const longRiskTags = computed(() => extractTagsFromArray(longAiAnalysis.value.riskTips))

const expandedTag = ref<string | null>(null)
const expandedTagIdx = ref(0)

function toggleTagExpand(type: string, idx: number) {
  if (expandedTag.value === type && expandedTagIdx.value === idx) {
    expandedTag.value = null
  } else {
    expandedTag.value = type
    expandedTagIdx.value = idx
  }
}

function formatAiDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.ai-analysis-tabs {
  margin-bottom: 24rpx;
}

.view-tabs {
  display: flex;
  height: 120rpx;
  margin-bottom: 20rpx;
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.view-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 100%;
  padding: 0 8rpx;
  background: #ffffff;
  border-bottom: 4rpx solid transparent;
  box-sizing: border-box;

  &:not(:last-child) {
    border-right: 1rpx solid #f0f2f5;
  }

  &:active {
    background: #f8fafc;
  }

  &.is-active {
    background: #f0f7ff;
    border-bottom-color: $brand-color;

    .tab-label { color: $brand-color; }
    .tab-desc { color: $brand-color; }
  }
}

.tab-label {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #64748b;
  line-height: 1.4;
  text-align: center;
}

.tab-desc {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 4rpx;
  line-height: 1.4;
  text-align: center;
}

.ai-analysis-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.ai-refresh-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f7fa;

  &:active { background: #e8ecf1; }
}

.refresh-icon {
  font-size: 28rpx;
  color: $brand-color;
}

.ai-loading {
  padding: 24rpx 0;
  text-align: center;
}

.ai-loading-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.ai-empty {
  padding: 40rpx 0;
  text-align: center;
}

.ai-empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.ai-conclusion {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.conclusion-badge {
  font-size: 36rpx;
  font-weight: 700;

  &.is-bull { color: #f43f5e; }
  &.is-bear { color: #22c55e; }
  &.is-hold { color: #0066cc; }
}

.analysis-date {
  font-size: 22rpx;
  color: #9ca3af;
}

.ai-logic {
  margin-bottom: 20rpx;
}

.ai-logic-text {
  font-size: 28rpx;
  color: #4b5563;
  line-height: 1.7;
}

.ai-tags-section,
.ai-section {
  margin-bottom: 20rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.ai-tags-title,
.ai-section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12rpx;
  display: block;

  &.risk { color: #7f1d1d; }
}

.research-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.research-tag {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 20rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  font-weight: 500;
  transition: all 0.2s;

  &:active {
    opacity: 0.7;
  }

  &.is-logic {
    background: rgba(59, 130, 246, 0.08);
    color: #2563eb;
    border: 1rpx solid rgba(59, 130, 246, 0.25);

    &.is-expanded,
    &:active {
      background: rgba(59, 130, 246, 0.15);
    }
  }

  &.is-basis {
    background: rgba(99, 102, 241, 0.08);
    color: #4f46e5;
    border: 1rpx solid rgba(99, 102, 241, 0.25);

    &.is-expanded,
    &:active {
      background: rgba(99, 102, 241, 0.15);
    }
  }

  &.is-advice {
    background: rgba(34, 197, 94, 0.08);
    color: #16a34a;
    border: 1rpx solid rgba(34, 197, 94, 0.25);

    &.is-expanded,
    &:active {
      background: rgba(34, 197, 94, 0.15);
    }
  }

  &.is-risk {
    background: rgba(239, 68, 68, 0.08);
    color: #dc2626;
    border: 1rpx solid rgba(239, 68, 68, 0.25);

    &.is-expanded,
    &:active {
      background: rgba(239, 68, 68, 0.15);
    }
  }
}

.research-tag-text {
  line-height: 1.4;
}

.tag-detail {
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  border-left: 4rpx solid #2563eb;

  &.basis { border-left-color: #4f46e5; }
  &.advice { border-left-color: #16a34a; }
  &.risk { border-left-color: #dc2626; }
}

.tag-detail-text {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
}
</style>
