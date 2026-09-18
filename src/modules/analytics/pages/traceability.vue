<template>
  <view class="page-traceability">
    <SubPageCard title="市场洞见">
      <template #header-right>
        <view class="header-right-actions">
          <view v-if="displayedDate" class="date-label">
            <text class="date-label-text">{{ displayedDate }}</text>
          </view>
          <view class="history-btn" @tap="goPredictionHistory">
            <text class="history-btn-text">预测验证</text>
          </view>
        </view>
      </template>
      <LoadingState v-if="loading" />

      <Card v-else-if="error" class="error-state">
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

      <EmptyState v-else-if="!presentation" text="当日暂无已完成复盘报告" />

      <view v-else class="report-content">
        <MarketInsightCard :presentation="presentation" />

        <!-- 大盘归因链（P1 chain-attribution）：大盘根 → 主驱动板块分支（relation 徽 + 一句话驱动卡 + 事件胶囊）；
             链数据由本页拉取后受控传入；链空/接口失败由组件内空态承接（无链日不报错，不阻断报告内容）。
             2026-09-18：原「今日影响大盘的主要板块」区块已并入本视图（同一份链、同一过滤判据、信息重复），
             其「看该板块预判 →」入口下移到每个链分支上（AttributionChainView 的 select-sector 事件）。 -->
        <view class="chain-view-block">
          <AttributionChainView
            :date="displayedDate"
            :chain="chain"
            :loading="chainLoading"
            :sector-stages="sectorStageMap"
            @select-sector="goSectorDetail"
          />
          <!-- 链级标记行：弱依据提示 + 全部板块入口（原挂在被合并区块的标题行上，随区块移除后保留于此） -->
          <view v-if="chain" class="chain-foot">
            <text v-if="chainWeak" class="chain-foot-weak">归因较弱</text>
            <view class="chain-foot-more" @tap="goSectorLoop">
              <text class="chain-foot-more-text">全部板块 ›</text>
            </view>
          </view>
        </view>

        <!-- 2026-09-18：「今日影响大盘的主要板块」区块已移除 —— 与上方大盘归因链同一份链、同一过滤判据、
             同一批板块，信息重复；其能力去向往下：
             「看该板块预判 →」→ 每个链分支（AttributionChainView select-sector）；
             「归因较弱」/「全部板块 ›」→ 上方 chain-foot 行；
             「今日暂无可确认的驱动板块」空态 → 不再需要（链树本身已过滤未确认节点，无分支即无卡）。 -->
      </view>

      <!-- 日期切换（放在 footer 插槽，固定在底部不依赖 scroll-view 滚动） -->
      <template #footer>
        <view class="date-nav">
          <view class="date-btn" @click="changeDate(-1)">
            <SvgIcon name="arrow-left-line" size="32rpx" color="#0b5fff" />
            <text class="date-btn-text">前一天</text>
          </view>
          <view class="date-btn" @click="changeDate(1)">
            <text class="date-btn-text">后一天</text>
            <SvgIcon name="arrow-right-line" size="32rpx" color="#0b5fff" />
          </view>
        </view>
      </template>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Button, Card } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import { predictionApi } from '@/shared/api/modules/prediction'
import { shanghaiDateString, addCalendarDays } from '@/shared/utils/tradingTime'
import { traceDateCandidates } from '@/shared/utils/traceDate'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { toMarketTracePresentation, type MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'
import MarketInsightCard from '@/modules/analytics/components/MarketInsightCard.vue'
import AttributionChainView from '@/shared/components/AttributionChainView.vue'
import { fetchAttributionChain, type AttributionChain } from '@/shared/api/modules/attributionChain'
import { toReasonStages, type ReasonStageRow } from '@/shared/utils/sectorInsight'

const loading = ref(false)
const error = ref(false)
const presentation = ref<MarketTracePresentation | null>(null)
const reportAvailability = ref<'pending' | 'failed' | null>(null)

/** 当前实际展示报告的日期（回退后为上一交易日） */
const displayedDate = ref('')

/** 当前导航到的目标交易日（切日基准；默认今天） */
const date = ref(shanghaiDateString())

async function fetchData(strictTarget?: string) {
  loading.value = true
  error.value = false
  presentation.value = null
  reportAvailability.value = null

  try {
    // strictTarget 提供时严格只看该日（切日不回退）；否则从 date 起向前回退找最近 completed（进入页面/轮询默认体验）
    const candidates = strictTarget ? [strictTarget] : traceDateCandidates(date.value, 3)

    for (const cdate of candidates) {
      // 先取报告，再用报告真实日期关联预测：后端 review 查询会回退返回最近可用报告
      // （如请求 08-28 返回 08-27 报告），预测记录以报告真实日期落库（source_id=review:{report_date}），
      // 若按请求日期查会查空 → 预判显示"暂无预判"
      const record = await agentApi.getMarketTraceReview(cdate)
      const predDate = record?.report_date || cdate
      const predResp = await predictionApi
        .list({ source_id: `review:${predDate}` })
        .then((r) => ({ ok: true as const, r }))
        .catch(() => ({ ok: false as const, r: null }))

      // 找到已完成报告：采用该日期，并透传 prediction 供预判块展示
      if (record && record.status === 'completed') {
        const model = toMarketTracePresentation(record, cdate, predResp.ok ? (predResp.r?.items?.[0] ?? null) : null)
        if (model) {
          // 采用报告真实日期展示（请求日无报告时后端回退到最近可用报告，标签跟随真实日期）
          displayedDate.value = record.report_date
          // 清除此前候选日残留的 'pending'，确保已采用的历史报告正常展示
          reportAvailability.value = null
          presentation.value = model
          return
        }
        // schema/字段不完整：走整页 error
        error.value = true
        return
      }
      // 记录是否处于"生成中"（queued/processing）——仅当全候选都非 completed 时用
      if (record && (record.status === 'queued' || record.status === 'processing')) {
        reportAvailability.value = 'pending'
      }
      // 严格目标模式：该日无 completed 即结束，不回退到更早日期
      if (strictTarget) {
        if (!reportAvailability.value) reportAvailability.value = 'failed'
        return
      }
      // 其余（null / failed / pending）：继续向前回退到更早日期
    }

    // 没有任何 completed 报告：pending（存在生成中）/ failed
    if (!reportAvailability.value) reportAvailability.value = 'failed'
  } catch (err: unknown) {
    // getMarketTraceReview 抛错（网络/401/服务器）：报告拉取失败非"日期不存在"，停止回退并走整页 error
    console.error('Failed to fetch market trace review:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

/** 前一天/后一天：按交易日历跳档，自动跳过非交易日；接口异常时退回自然日加减 */
async function changeDate(delta: number) {
  let target: string
  try {
    target = delta > 0
      ? await agentApi.getNextTradingDay(date.value)
      : await agentApi.getPreviousTradingDay(date.value)
  } catch (err) {
    console.error('切换交易日失败，退回自然日加减:', err)
    target = addCalendarDays(date.value, delta)
  }
  date.value = target
  await fetchData(target)
}

function retry() {
  void fetchData()
}

function goPredictionHistory() {
  uni.navigateTo({ url: '/modules/analytics/pages/prediction-history' })
}

/* ===== 大盘归因链（链式溯源 P3'；2026-09-18 起「今日影响大盘的主要板块」区块已并入本视图） ===== */

/** 当日大盘归因链（页面持有：链视图展示 + 「看该板块预判」跳转） */
const chain = ref<AttributionChain | null>(null)
const chainLoading = ref(false)

/** 拉取归因链：fetchAttributionChain 内部已兜底 → null（无链日/失败均落 null），此处仅结算 loading */
async function loadChain(d: string) {
  if (!d) return
  chainLoading.value = true
  try {
    chain.value = await fetchAttributionChain(d)
  } finally {
    chainLoading.value = false
  }
}

/** 链级弱依据（root.evidence_weak=true：当日大盘未确认主因，2026-09-17 R16）→ 链视图下方中性灰「归因较弱」 */
const chainWeak = computed(() => chain.value?.root?.evidence_weak === true)

/**
 * 每板块原因链 3 段（2026-09-18）：**首屏拉一次 `sector-insight` 缓存**，链分支展开时零延迟读取
 * （与板块详情/四环页同源同映射；不再用它出卡列表 —— 那个区块已并入链树）。
 * 键同时给 `ts_code` 与板块名两种形态：链节点以 ts_code 为主，名称会在权威名↔复盘原始名之间漂移。
 */
const sectorStageMap = ref<Record<string, ReasonStageRow[]>>({})

/** 拉取并索引每板块原因链：失败静默置空（分支展开入口不出现），不阻断报告内容 */
async function loadSectorStages(d: string) {
  if (!d) return
  try {
    const res = await agentApi.getSectorInsight(d)
    const map: Record<string, ReasonStageRow[]> = {}
    for (const c of res?.candidates ?? []) {
      const rows = toReasonStages(c.trace?.stages)
      if (!rows.length) continue
      if (c.ts_code) map[c.ts_code] = rows
      const name = (c.name ?? '').trim()
      if (name) map[name] = rows
    }
    sectorStageMap.value = map
  } catch (err) {
    console.error('板块原因链加载失败:', err)
    sectorStageMap.value = {}
  }
}

// 复盘报告实际展示日期确定后（成功展示/切日）拉取归因链与每板块原因链
watch(displayedDate, (d) => {
  if (d) {
    void loadChain(d)
    void loadSectorStages(d)
  }
})

/** 全部板块入口：跳板块四环页并定位到当前展示日期（traceability 当日为交易日、接口按交易日落库） */
function goSectorLoop() {
  const q = displayedDate.value ? `?date=${encodeURIComponent(displayedDate.value)}` : ''
  uni.navigateTo({ url: `/modules/market/pages/sector-loop${q}` })
}

/** 主因卡预判入口：跳该板块详情页（入参沿用项目既有约定 ?name=<板块名>，见 sector-loop/leaders） */
function goSectorDetail(name: string) {
  if (!name) return
  uni.navigateTo({ url: `/modules/market/pages/sector-detail?name=${encodeURIComponent(name)}` })
}

/** 跨 20:30 / 15:30 切日自动刷新定时器句柄 */
let refreshTimer: ReturnType<typeof setInterval> | null = null

function startRefreshTimer() {
  stopRefreshTimer()
  // 60s 轮询：捕捉 15:30 当日报告完成、20:30 预判落库的自动切换
  refreshTimer = setInterval(() => { void fetchData() }, 60_000)
}

function stopRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onShow(() => {
  void fetchData()
  startRefreshTimer()
})
onHide(stopRefreshTimer)
onUnload(stopRefreshTimer)
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-traceability { height: 100%; }
.report-content { display: flex; flex-direction: column; gap: 0; padding: 0 0 $spacing-base 0; }
.error-state { margin: $spacing-base; }

.header-right-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.history-btn {
  padding: 8rpx 16rpx;
  background: $primary-50;
  border-radius: $r-xs;
}

.history-btn-text {
  font-size: $font-size-sm;
  color: $primary;
  font-weight: 500;
}

.date-label {
  padding: 8rpx 16rpx;
  background: $bg-soft;
  border-radius: $r-xs;
}

.date-label-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  font-weight: 500;
}

/* 底部日期切换（对齐 agent-report.vue 的 date-nav） */
.date-nav {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  background: $bg-page;
  border-top: 2rpx solid $line-soft;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 22rpx;
  background: #ffffff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(11, 95, 255, 0.08);
}

.date-btn-text {
  font-size: 26rpx;
  color: $primary;
  font-weight: 500;
}

/* ===== 大盘归因链（水平内边距与 MarketInsightCard 对齐） ===== */
.chain-view-block {
  padding: $spacing-xs $spacing-base 0;
}

/* 链级标记行：左「归因较弱」（弱依据，中性灰），右「全部板块 ›」入口
   —— 2026-09-18 自被合并的「今日影响大盘的主要板块」区块标题行迁来 */
.chain-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xs 0 0;
}

.chain-foot-weak {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border: 2rpx solid $line-strong;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 400;
  line-height: 1.6;
  color: $ink-mute;
}

.chain-foot-more {
  margin-left: auto;
  padding: 6rpx 16rpx;
  background: $primary-50;
  border-radius: $r-xs;

  &:active {
    opacity: 0.8;
  }
}

.chain-foot-more-text {
  font-size: $font-size-sm;
  color: $primary;
  font-weight: 500;
}

</style>
