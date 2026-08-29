<!--
  涨停雷达洞察详情页（limit_up_radar 专用）：
  方案A布局 —— 报价头 + 主导因素卡片 + 次要因素列表 + 归因证据时间线 + 详细分析 + 原始来源。
  价格异动洞察见 insight-detail-move.vue（两页独立，列表按 event_type 分流）。
-->
<template>
  <SubPageCard2 title="洞察详情">
    <view class="page-insight-detail">
      <view v-if="loading" class="state"><text>加载中</text></view>
      <view v-else-if="!detail" class="state"><text>{{ loadError || '洞察不存在或已过期' }}</text></view>

      <block v-else>
        <!-- 报价头：信息左·价格右 + 等分指标并上色（与异动页同版式） -->
        <view class="quote">
          <view class="o3-top">
            <view class="avatar">{{ (detail.stock_name || '').charAt(0) }}</view>
            <view class="o3-info">
              <view class="q-name-row">
                <text class="q-name">{{ detail.stock_name }}</text>
                <view class="q-tag">涨停雷达</view>
              </view>
              <view class="q-code">{{ detail.symbol }} · {{ fmtDate(detail.trade_date) }}</view>
            </view>
            <view class="o3-price">
              <text class="o3-p" :class="trendClass">{{ fmtPrice(detail.latest_price) }}</text>
              <text class="o3-c" :class="trendClass">{{ fmtPercent(detail.change_pct) }}</text>
            </view>
          </view>
          <view class="o3-metrics">
            <view class="o3-m">
              <text class="o3-v o3-mid">{{ fmtPrice(detail.open_price) }}</text>
              <text class="o3-l">开盘</text>
            </view>
            <view class="o3-m">
              <text class="o3-v o3-up" :class="trendClass">{{ fmtAmount(detail.latest_price, detail.change_pct) }}</text>
              <text class="o3-l">涨跌额</text>
            </view>
            <view v-if="detail.confidence" class="o3-m">
              <text :class="['o3-v', 'o3-gold']">{{ confidenceText(detail.confidence) }}</text>
              <text class="o3-l">置信度</text>
            </view>
            <view v-if="detail.attribution_status === 'confirmed'" class="o3-m">
              <text class="o3-v o3-green">已确认</text>
              <text class="o3-l">归因</text>
            </view>
          </view>
        </view>

        <!-- 洞见卡：复用主因归因结论作一句话 + 证据引用作溯源（预判后续由情报 agent LLM 产出） -->
        <InsightCard
          v-if="insightData.content"
          type="event"
          :title="insightData.content"
          trace-label="依据"
          forecast-label="展望"
          :trace="insightData.trace"
          :forecast="insightData.forecast"
          :time="insightData.time"
          theme="light"
          class="insight-in-page"
        />

        <!-- 主因判定卡（标题行徽标组 + 蓝横幅结论 + 证据引用，与异动页对齐） -->
        <template v-if="detail.primary_driver">
          <view class="hero-card">
            <view class="hero-head">
              <text class="hero-tag">支撑性主因</text>
              <view class="hero-chips">
                <text :class="['cat-badge', 'cat-' + detail.primary_driver.category]">{{ categoryText(detail.primary_driver.category) }}</text>
                <text
                  v-if="detail.primary_driver.confidence"
                  class="badge"
                  :class="confClass(detail.primary_driver.confidence)"
                >{{ confidenceText(detail.primary_driver.confidence) }}</text>
                <text v-if="detail.attribution_status === 'confirmed'" class="badge is-confirmed">已确认</text>
              </view>
            </view>
            <view class="hero-banner">
              <text class="banner-label">归因结论</text>
              <text class="banner-text">{{ detail.primary_driver.label }}</text>
            </view>
            <view v-if="driverQuotes.length" class="hero-quote">
              <!-- 主因 + 各次因的证据引用：行业原因等不再只存在详细分析里，聚合到主因卡一并展示 -->
              <view v-for="(q, i) in driverQuotes" :key="i" class="hq-item">
                <text :class="['hq-label', { 'is-pri': q.isPrimary }]">
                  {{ q.isPrimary ? '主因' : '次因' }} · {{ q.label }}
                </text>
                <text class="hq-text">{{ q.quote }}</text>
              </view>
            </view>
          </view>
        </template>

        <!-- 候选归因：次要因素卡片列表（与价格异动页同款） -->
        <view v-if="detail.secondary_drivers?.length" class="section">
          <text class="section-title">候选归因</text>
          <view class="cand-list">
            <view v-for="d in detail.secondary_drivers" :key="d.label" class="cand-card">
              <view class="cand-header">
                <text class="cand-label">{{ d.label }}</text>
                <text class="cand-tag is-weak">{{ categoryText(d.category) }}</text>
                <text v-if="d.confidence" class="badge" :class="confClass(d.confidence)">{{ confidenceText(d.confidence) }}</text>
              </view>
              <text v-if="d.evidence_quote" class="cand-text">{{ d.evidence_quote }}</text>
            </view>
          </view>
        </view>

        <!-- 主因待验证 -->
        <view v-if="detail.attribution_status === 'unconfirmed'" class="unconfirmed">主因待验证</view>

        <!-- 归因证据时间线 -->
        <view v-if="detail.evidence_package?.length" class="sec-title">归因证据</view>
        <view v-if="detail.evidence_package?.length" class="timeline">
          <view v-for="ev in detail.evidence_package" :key="ev.source_id || ev.title" class="tl-item">
            <view class="tl-dot"></view>
            <view class="tl-title">{{ ev.title }}</view>
            <view class="tl-meta">{{ providerText(ev) }} · {{ fmtDate(ev.published_at) }}</view>
          </view>
        </view>

        <!-- 详细分析 -->
        <view v-if="detail.display_report?.details" class="sec-title">详细分析</view>
        <view v-if="detail.display_report?.details" class="detail-text">{{ detail.display_report.details }}</view>

        <!-- 原始来源 -->
        <block v-if="detail.source_id">
          <view class="sec-title">原始来源</view>
          <view class="source">
            <view class="src" @tap="openSource">{{ detail.title }}</view>
            <view v-if="detail.keywords?.length" class="kw">
              <text v-for="k in detail.keywords" :key="k" class="kw-item">{{ k }}</text>
            </view>
            <view class="meta">发布于 {{ detail.published_at }}</view>
          </view>
        </block>
      </block>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { watchlistInsightApi, type WatchlistInsight, type InsightEvidenceItem } from '@/shared/api/modules/insight'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import InsightCard from '@/shared/components/InsightCard.vue'

const detail = ref<WatchlistInsight | null>(null)
const loading = ref(true)
/** 加载失败原因（区分 401 未登录 / 404 非自选或不存在），用于替代误导性的"不存在"提示 */
const loadError = ref('')

/**
 * 主因 + 各次因的证据引用（evidence_quote），在主因卡 hero-quote 聚合展示。
 * 详细分析里"行业原因"等次因证据原先只存在 display_report.details，这里也一并上屏。
 */
const driverQuotes = computed<Array<{ label: string; quote: string; isPrimary: boolean }>>(() => {
  const items: Array<{ label: string; quote: string; isPrimary: boolean }> = []
  const pd = detail.value?.primary_driver
  if (pd?.evidence_quote) items.push({ label: pd.label, quote: pd.evidence_quote, isPrimary: true })
  for (const d of detail.value?.secondary_drivers ?? []) {
    if (d.evidence_quote) items.push({ label: d.label, quote: d.evidence_quote, isPrimary: false })
  }
  return items
})

/**
 * 洞见卡数据：主因归因结论作一句话标题，证据引用作「溯源」。
 * 「预判」本轮留空，后续由情报 agent 的 LLM 直接产出溯源/预判全文。
 */
const insightData = computed(() => {
  const pd = detail.value?.primary_driver
  if (!pd) return { content: '', trace: '', forecast: '', time: '' }
  const trace = driverQuotes.value.find(q => q.isPrimary)?.quote || detail.value?.display_report?.details || ''
  return {
    content: pd.label || detail.value?.title || '',
    trace,
    forecast: '',
    time: fmtDate(detail.value?.trade_date).slice(5),
  }
})

/** 涨停/异动方向：up → 红涨，down → 绿跌 */
const trendClass = computed(() => (detail.value?.direction === 'up' ? 'is-up' : 'is-down'))

/** trade_date（DATE/ISO）→ "YYYY-MM-DD" */
function fmtDate(v?: string | Date): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

function fmtPrice(price?: number): string {
  if (price == null) return '--'
  return price.toFixed(2)
}

/** 相对昨收涨跌幅 → +10.00% */
function fmtPercent(pct?: number): string {
  if (pct == null) return '--'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

/** 由最新价与涨跌幅反推涨跌额 */
function fmtAmount(price?: number, pct?: number): string {
  if (!price || price <= 0 || pct == null) return '--'
  const prevClose = price / (1 + pct / 100)
  const amount = price - prevClose
  const sign = amount > 0 ? '+' : ''
  return `${sign}${amount.toFixed(2)}`
}

function categoryText(c?: string): string {
  return ({ industry_theme: '行业题材', company_event: '公司事件', earnings: '业绩', market: '市场', trading_sentiment: '交易情绪' } as Record<string, string>)[c || ''] || c || ''
}

function confidenceText(c?: string): string {
  return ({ high: '高置信', medium: '中置信', low: '低置信' } as Record<string, string>)[c || ''] || c || ''
}

/** 置信度徽标配色：high=金，medium/low=中性蓝 */
function confClass(c?: string): string {
  return c === 'high' ? 'is-gold' : 'is-blue'
}

/** 证据来源文本：优先 provider，回退 source_type 中文名 */
function providerText(ev: InsightEvidenceItem): string {
  if (ev.provider) return ev.provider
  const map: Record<string, string> = { announcement: '公告', news: '资讯', earnings: '业绩', rating: '研报', radar_article: '雷达文章', quant: '量化' }
  return map[ev.source_type] || ev.source_type || ''
}

/** 原始来源跳转：H5 新窗口打开，非 H5 复制链接（与 stock-trace 证据跳转一致） */
function openSource() {
  const url = detail.value?.source_url
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank', 'noopener')
  // #endif
  // #ifndef H5
  void uni.setClipboardData({ data: url })
  // #endif
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
    detail.value = await watchlistInsightApi.getInsightDetail(eventId)
  } catch (err) {
    detail.value = null
    // 真实后端用"登录 + 自选归属"校验洞察详情：401=未登录/凭证失效，404=非自选或事件不存在。
    // 原统一显示"不存在"极具误导性，这里按状态码给出可操作的指引。
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (statusCode === 401) {
      loadError.value = '请先登录，并在自选股中添加该股票后再查看洞察详情'
    } else if (statusCode === 404) {
      loadError.value = '该股票不在你的自选中，或事件已过期'
    } else {
      loadError.value = '洞察加载失败，请稍后重试'
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

.state {
  padding: $s-10;
  text-align: center;
  font-size: $font-size-sm;
  color: $ink-soft;
}

/* ===== 区块标题（section-title 与 sec-title 同款，对齐价格异动页） ===== */
.sec-title,
.section-title {
  display: flex;
  align-items: center;
  margin-bottom: $s-2;
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.cat-badge {
  margin-left: $s-2;
  font-size: $font-size-xs;
  font-weight: 500;
  color: $primary;
  background: $primary-50;
  padding: 2rpx 12rpx;
  border-radius: $r-sm;
}

/* ===== 报价头（信息左·价格右 + 等分指标并上色，与异动页同版式） ===== */
.quote {
  background: $bg-card;
  border-radius: $r-md;
  padding: $s-4;
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
  color: $up;
  background: $up-soft;
  padding: 4rpx 16rpx;
  border-radius: $r-full;
  flex-shrink: 0;
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
  &.o3-up { color: $up; }
  &.o3-mid { color: $ink; }
  &.o3-gold { color: $warning; }
  &.o3-green { color: $down; }
}

.o3-l {
  display: block;
  font-size: $font-size-xs;
  color: $ink-soft;
  margin-top: 4rpx;
}

/* ===== 主因判定卡（标题行徽标组 + 蓝横幅结论 + 证据引用，与异动页对齐） ===== */
.hero-card {
  background: $bg-card;
  border-radius: $r-md;
  padding: $s-3;
  margin-bottom: $s-3;
  box-shadow: $shadow-card;
}

.hero-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $s-2;
}

.hero-tag {
  font-size: $font-size-xs;
  color: $primary;
  font-weight: 600;
  letter-spacing: 0.3rpx;
  flex-shrink: 0;
}

.hero-chips {
  display: flex;
  align-items: center;
  gap: $s-2;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hero-banner {
  margin-top: $s-3;
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

.hero-quote {
  /* uni-app H5 的 view 组件默认非 block，补 display:block + width:100% 撑满，
     避免长文在 flex 默认布局下溢出不换行导致"没显示完全" */
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin-top: $s-2;
  padding: $s-2 $s-3;
  background: $primary-50;
  border-radius: $r-sm;
  border-left: 6rpx solid $primary;
}

/* 每条（主因/次因）证据引用独立成块 */
.hq-item {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  &:not(:first-child) {
    margin-top: $s-2;
    padding-top: $s-2;
    border-top: 2rpx solid $primary-100;
  }
}

.hq-label {
  display: block;
  margin-bottom: 4rpx;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $ink-soft;
  &.is-pri { color: $primary; }
}

.hq-text {
  display: block;
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: $lh-base;
  /* pre-wrap 保住源文本换行（evidence_quote 可能为多行）；break+anywhere 兜底无空格/连续长段不横向溢出 */
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
}

/* ===== 候选归因：卡片列表（与价格异动页同款） ===== */
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

/* 置信度徽标（高置信=金 / 中低=蓝 / 已确认=绿），与主因卡 meta 共用 */
.badge {
  display: inline-block;
  padding: 2rpx 12rpx;
  border-radius: $r-sm;
  font-size: $font-size-xs;
  font-weight: 500;
  line-height: 1.6;
  flex-shrink: 0;
  &.is-gold { color: $warning; background: $warning-bg; }
  &.is-blue { color: $primary; background: $primary-50; }
  &.is-confirmed { color: $down; background: $down-bg; }
}

/* ===== 主因待验证 ===== */
.unconfirmed {
  margin-bottom: $s-3;
  padding: $s-2 $s-3;
  border-radius: $r-sm;
  font-size: $font-size-sm;
  color: $warning;
  background: $warning-bg;
}

/* ===== 归因证据时间线 ===== */
.timeline {
  background: $bg-card;
  border-radius: $r-md;
  padding: $s-3;
  box-shadow: $shadow-sm;
  margin-bottom: $s-3;
}

.tl-item {
  position: relative;
  padding-left: $s-4;
  padding-bottom: $s-3;
  border-left: 2rpx solid $line;
  &:last-child { border-color: transparent; padding-bottom: 0; }
}

.tl-dot {
  position: absolute;
  left: -7rpx;
  top: 6rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: $primary;
}

.tl-title {
  font-size: $font-size-sm;
  color: $ink;
  font-weight: 500;
  line-height: $lh-base;
}

.tl-meta {
  margin-top: 4rpx;
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== 详细分析 ===== */
.detail-text {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin-bottom: $s-3;
  padding: $s-3;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-sm;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: $lh-loose;
  /* 详细分析是带换行的 Markdown：必须用 pre-wrap 保留原有换行，否则 \n 被塌缩成一段墙
     （这就是"没换行/没显示完全"的根因）；break+anywhere 兜底无空格长段不横向溢出 */
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
}

/* ===== 原始来源 ===== */
.source {
  background: $bg-card;
  border-radius: $r-md;
  padding: $s-3;
  box-shadow: $shadow-sm;
  margin-bottom: $s-3;
}

.src {
  font-size: $font-size-sm;
  color: $primary;
  font-weight: 500;
  line-height: $lh-base;
}

.kw {
  display: flex;
  flex-wrap: wrap;
  gap: $s-2;
  margin-top: $s-2;
}

.kw-item {
  font-size: $font-size-xs;
  color: $ink-soft;
  background: $bg-soft;
  padding: 4rpx 12rpx;
  border-radius: $r-sm;
}

.meta {
  margin-top: $s-2;
  font-size: $font-size-xs;
  color: $ink-mute;
}
</style>