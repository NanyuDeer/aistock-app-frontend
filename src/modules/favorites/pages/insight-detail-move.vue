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

      <!-- ===== 洞见卡：主因结论作一句话 + 主链作溯源 + 建议跟踪作预判 ===== -->
      <InsightCard
        v-if="insightData.content"
        type="event"
        :title="insightData.content"
        :trace="insightData.trace"
        :forecast="insightData.forecast"
        :time="insightData.time"
        theme="light"
        class="insight-in-page"
      />

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
        <!-- 主因：蓝色结论横幅（含置信度）+ 聚焦因果链 + 元信息 -->
        <view v-if="primaryCause" class="section main-cause">
          <!-- 标题行：主因 + 右侧徽标组（归类标签 + 置信度 + 已确认） -->
          <view class="main-title-row">
            <text class="section-title main-title">支撑性主因</text>
            <view class="title-right">
              <text class="cat-badge">{{ layerText(primaryCause.layer) }}</text>
              <text v-if="confidence" class="badge is-gold">{{ confidenceText(confidence.level) }}</text>
              <text v-if="isConfirmed" class="badge is-confirmed">已确认</text>
            </view>
          </view>

          <view class="conclusion-banner">
            <text class="banner-label">归因结论</text>
            <text class="banner-text">{{ primaryCause.verdict }}</text>
          </view>

          <!-- 聚焦因果链：主链节点自顶向下，起点/终点高亮 -->
          <view v-for="ch in primaryChains" :key="ch.chainId" class="focus-chain">
            <view v-for="(n, i) in ch.nodes" :key="n.nodeId" class="fc-item">
              <view class="fc-rail">
                <view :class="['fc-dot', { 'is-pri': i <= 1 || i === ch.nodes.length - 1 }]" />
                <view v-if="i < ch.nodes.length - 1" class="fc-line" />
              </view>
              <view class="fc-body">
                <text class="fc-label" :class="{ 'is-pri': i <= 1 || i === ch.nodes.length - 1 }">{{ stageText(n.stage) }}</text>
                <text class="fc-text">{{ n.claim }}</text>
              </view>
            </view>
          </view>

          <view class="main-meta">
            <text :class="['main-tag', `is-${primaryCause.status}`]">{{ layerText(primaryCause.layer) }} · {{ statusText(primaryCause.status) }}</text>
            <text class="main-ev">{{ evidenceCountLabel }}</text>
          </view>
        </view>

        <!-- 候选归因：卡片列表（主因外的支撑性/偏弱候选） -->
        <view v-if="candidateCards.length" class="section">
          <text class="section-title">候选归因</text>
          <view class="cand-list">
            <view v-for="c in candidateCards" :key="c.layer" class="cand-card">
              <view class="cand-header">
                <text class="cand-label">{{ layerText(c.layer) }}</text>
                <text :class="['cand-tag', `is-${c.status}`]">{{ statusText(c.status) }}</text>
              </view>
              <text v-if="c.verdict" class="cand-text">{{ c.verdict }}</text>
            </view>
          </view>
        </view>

        <!-- 未解问题：待验证 -->
        <view v-if="unresolvedQuestions.length" class="section question-card">
          <text class="section-title">未解问题</text>
          <view v-for="q in unresolvedQuestions" :key="q" class="risk-item">
            <text class="risk-dot">·</text>
            <text class="risk-text">{{ q }}</text>
          </view>
        </view>

        <!-- 证据清单（默认收起，点击标题展开） -->
        <view v-if="evidenceList.length" class="section">
          <view class="section-title row" @tap="eviOpen = !eviOpen">
            <text>证据清单（{{ evidenceList.length }}）</text>
            <view :class="['evi-arrow', { 'is-open': eviOpen }]"></view>
          </view>
          <view v-show="eviOpen" class="evi-body">
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
import InsightCard from '@/shared/components/InsightCard.vue'

const detail = ref<StockTraceEvent | null>(null)
const analysis = ref<StockTraceAnalysisResponse | null>(null)
const loading = ref(true)
/** 加载失败原因（区分 401 未登录 / 404 非自选或不存在），用于替代误导性的"事件不存在"提示 */
const loadError = ref('')

/** 证据清单是否展开（默认收起） */
const eviOpen = ref(false)

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

/**
 * 候选归因（五层）：取 artifactJson.candidates，只保留支撑性（supported）与偏弱（weak）。
 * 证据不足（insufficient）/反向排除（rejected）的维度不展示（2026-08-25 决策）；主因候选排到最前。
 */
const allCandidates = computed(() => {
  const art = artifact.value
  const candidates = art?.artifactJson.candidates ?? []
  if (!candidates.length) return []
  const primaryChainId = art?.artifactJson.primary_chain_id
  const primaryCandidateId = art?.artifactJson.chains?.find((ch) => ch.chainId === primaryChainId)?.candidateId
  const primary = candidates.find((c) => c.candidateId === primaryCandidateId)
  const rest = candidates.filter((c) => c.candidateId !== primaryCandidateId)
  return [primary, ...rest]
    .filter((c): c is NonNullable<typeof c> => !!c)
    .filter((c) => c.status === 'supported' || c.status === 'weak')
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

/** 归因置信度：取 artifactJson.confidence，缺失时按分数回退等级 */
const confidence = computed<{ score: number; level: string } | null>(() => {
  const conf = artifact.value?.artifactJson.confidence
  if (!conf || conf.score == null) return null
  const level = conf.level ?? (conf.score >= 0.7 ? 'high' : conf.score >= 0.5 ? 'medium' : 'low')
  return { score: conf.score, level }
})

/** 主因聚焦层：归因候选首项（allCandidates 已把主因候选排到最前） */
const primaryCause = computed(() => allCandidates.value[0] ?? null)

/** 候选归因列表：除主因外的支撑性/偏弱候选卡片 */
const candidateCards = computed(() => allCandidates.value.slice(1))

/** 待验证问题（收尾区块；建议追踪已按 2026-08-25 决策移除） */
const unresolvedQuestions = computed<string[]>(() => artifact.value?.artifactJson.unresolved_questions ?? [])

/**
 * 洞见卡数据：主因结论作一句话标题、主链声明作「溯源」。
 * 预判（forecast）字段随建议跟踪一并移除（2026-08-25 决策），暂留空串；
 * 后续由 stock_trace agent 的 LLM 直接产出溯源/预判全文。
 */
const insightData = computed(() => {
  const cause = primaryCause.value
  if (!cause?.verdict) return { content: '', trace: '', forecast: '', time: '' }
  const chain = primaryChains.value[0]
  const trace = chain?.nodes?.map(n => n.claim).filter(Boolean).join(' → ') || ''
  return {
    content: cause.verdict,
    trace,
    // 建议跟踪已移除、无数据源，空串兜底（InsightCard 对空 forecast 不渲染该行）
    forecast: '',
    time: detail.value?.triggered_at ? fmtTime(detail.value.triggered_at).slice(5) : '',
  }
})

/** 主因卡头部右侧：证据条数 + 归因状态 */
const evidenceCountLabel = computed(() => {
  const acc = artifact.value?.artifactJson.attribution_status
  const count = allCandidates.value?.[0]?.supportingEvidenceIds?.length ?? evidenceList.value.length
  return `证据 ${count} 条 ${acc === 'confirmed' ? '· 已确认' : ''}`
})

/** 归因是否已确认：用于主因卡片 hero-meta 徽标展示 */
const isConfirmed = computed(() => artifact.value?.artifactJson.attribution_status === 'confirmed')

const layerText = (l?: string): string =>
  ({ company: '公司', sector: '板块', market: '市场', capital: '资金', technical: '技术' }[l ?? ''] ?? l ?? '')

const statusText = (s?: string): string =>
  ({ supported: '支撑', weak: '偏弱', rejected: '排除', insufficient: '证据不足' }[s ?? ''] ?? s ?? '')

const confidenceText = (l?: string): string =>
  ({ high: '高置信', medium: '中置信', low: '低置信' }[l ?? ''] ?? l ?? '')

const stageText = (s?: string): string =>
  ({
    structural_root: '结构根源',
    trigger: '触发',
    transmission: '传导',
    exposure: '暴露',
    repricing: '重新定价',
    observable_result: '可见结果',
  }[s ?? ''] ?? s ?? '')

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

.insight-in-page {
  margin-bottom: $s-3;
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

/* ===== 主因标题行：主因标题 + 右侧徽标组（归类标签 + 置信度 + 已确认） ===== */
.main-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $s-2;
  margin-bottom: $s-2;
}
.main-title {
  margin-bottom: 0;
  flex-shrink: 0;
}
.title-right {
  display: flex;
  align-items: center;
  gap: $s-2;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.cat-badge {
  font-size: $font-size-xs;
  font-weight: 500;
  color: $primary;
  background: $primary-50;
  padding: 2rpx 12rpx;
  border-radius: $r-sm;
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
  &.is-confirmed { color: $down; background: $down-bg; }
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

/* ===== 主因：结论横幅（含置信度）+ 聚焦因果链 ===== */
.conclusion-banner {
  margin-bottom: $s-3;
  padding: $s-3 $s-4;
  background: $primary;
  border-radius: $r-lg;
  box-shadow: 0 4rpx 12rpx rgba(11, 95, 255, 0.2);
}
.banner-label {
  display: block;
  margin-bottom: 4rpx;
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 2rpx;
}
.banner-text {
  display: block;
  font-size: $font-size-base;
  font-weight: 600;
  color: $white;
  line-height: 1.5;
}

.focus-chain { display: flex; flex-direction: column; }
.fc-item { position: relative; display: flex; }
.fc-rail { position: relative; width: 32rpx; flex-shrink: 0; }
.fc-dot {
  width: 20rpx; height: 20rpx; border-radius: $r-full;
  background: $ink-mute;
  box-shadow: 0 0 0 6rpx rgba(11, 95, 255, 0.15);
  position: absolute; top: 8rpx; left: 50%; transform: translateX(-50%);
  &.is-pri { background: $primary; }
}
.fc-line {
  position: absolute; top: 28rpx; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 2rpx; background: $line-soft;
}
.fc-body { flex: 1; padding-bottom: $s-3; }
.fc-label {
  display: block; font-size: $font-size-xs; color: $ink-soft; font-weight: 600; margin-bottom: 4rpx;
  &.is-pri { color: $primary; }
}
.fc-text { display: block; font-size: $font-size-sm; color: $ink; line-height: 1.5; }

.main-meta { display: flex; align-items: center; gap: $s-2; margin-top: $s-2; }
.main-tag {
  font-size: $font-size-xs; color: $primary; background: $primary-50;
  padding: 2rpx 12rpx; border-radius: $r-sm;
  &.is-weak { color: $warning; background: $warning-bg; }
  &.is-rejected, &.is-insufficient { color: $ink-soft; background: $bg-soft; }
}
.main-ev { margin-left: auto; font-size: $font-size-xs; color: $ink-soft; }

/* ===== 候选解释：卡片列表 ===== */
.cand-list { display: flex; flex-direction: column; gap: $s-2; }
.cand-card { padding: $s-3; background: $bg-soft; border-radius: $r-md; }
.cand-header { display: flex; align-items: center; gap: $s-2; margin-bottom: $s-1; }
.cand-label { font-size: $font-size-sm; font-weight: 600; color: $ink; flex: 1; }
.cand-tag {
  font-size: $font-size-xs; color: $primary; background: $primary-50;
  padding: 2rpx 12rpx; border-radius: $r-sm; flex-shrink: 0;
  &.is-weak { color: $warning; background: $warning-bg; }
  &.is-rejected { color: $white; background: $ink-mute; }
  &.is-insufficient { color: $ink-soft; background: $bg-soft; }
}
.cand-text { display: block; font-size: $font-size-xs; color: $ink-soft; line-height: 1.5; }

/* ===== 未解问题 ===== */
.question-card { background: $primary-50; border: 2rpx solid $primary-100; }
.risk-item { display: flex; align-items: flex-start; gap: $s-1; margin-top: $s-1; }
.risk-item:first-child { margin-top: 0; }
.risk-dot { color: $primary; font-size: $font-size-base; line-height: 1.4; }
.risk-text { flex: 1; color: $ink; font-size: $font-size-sm; line-height: 1.5; }
.suggest-block { margin-top: $s-3; padding-top: $s-2; border-top: 2rpx solid $primary-100; }
.suggest-label { display: block; font-size: $font-size-xs; color: $ink-soft; margin-bottom: $s-1; }
.suggest-chips { display: flex; flex-wrap: wrap; gap: $s-1; }
.suggest-chip { font-size: $font-size-xs; color: $primary; background: $white; padding: 4rpx 16rpx; border-radius: $r-full; }

/* ===== 证据清单（默认收起，点击标题展开） ===== */
.section-title.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.evi-arrow {
  width: 16rpx;
  height: 16rpx;
  border-right: 4rpx solid $ink-mute;
  border-bottom: 4rpx solid $ink-mute;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  flex-shrink: 0;
  &.is-open {
    transform: rotate(225deg);
  }
}

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
