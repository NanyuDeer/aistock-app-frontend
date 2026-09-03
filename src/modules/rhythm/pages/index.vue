<template>
  <SubPageCard2 title="节奏大师" :subtitle="navSubtitle" back-url="/modules/home/pages/index">
    <template #header-right>
      <view class="nav-cal" @tap="goCalendar">
        <text class="nav-cal-text">日历</text>
      </view>
    </template>

    <view class="body">
      <!-- 顶部紧凑日期条：近 7 交易日收盘基准（日历接口，升序：左旧右新）。
           格 = 档位色 + 短码 + 建议仓位；点格切换目标日（无报告日走详情页既有回退链） -->
      <view class="day-strip" v-if="stripDays.length">
        <view
          v-for="d in stripDays"
          :key="d.date"
          class="day-cell"
          :class="{ active: d.date === targetDate, dim: !d.level }"
          :style="{ background: dayCellBg(d) }"
          @tap="pickDay(d)"
        >
          <text class="day-date">{{ d.date.slice(5) }}</text>
          <text class="day-lev" v-if="d.level">{{ LEVEL_SHORT[d.level] ?? d.level.slice(0, 1) }}</text>
          <text class="day-pos" v-else>沿用</text>
          <text class="day-pos" v-if="d.level && bandShort(d)">{{ bandShort(d) }}</text>
        </view>
      </view>

      <view class="slots" v-if="versions.length > 1">
        <view
          v-for="v in versions"
          :key="v.refresh_slot"
          class="slot"
          :class="{ active: activeSlot === v.refresh_slot }"
          @tap="switchSlot(v.refresh_slot)"
        >
          {{ slotLabel(v.refresh_slot) }}
        </view>
      </view>
      <view class="fallback" v-if="isFallback">非交易日/当日无报告，沿用前值（{{ basisLabel }}）</view>
      <RhythmCard
        v-if="content"
        :card="content.rhythm_card!"
        :title="cardTitle"
        :slot="content.refresh_slot"
        :target-date="content.target_date"
        :basis-date="content.basis_date"
        :refresh-slot="content.refresh_slot"
      />
      <EmptyState v-else title="节奏状态暂不可用" />
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { EmptyState } from '@/shared/components'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import RhythmCard from '../components/RhythmCard.vue'
import { agentApi } from '@/shared/api/modules/agent'
import type { RhythmCalendarDay, RhythmMasterContent } from '@/shared/api/modules/agent'

interface RhythmMasterVersion {
  refresh_slot: string
  created_at?: string
  content?: RhythmMasterContent
}

const versions = ref<RhythmMasterVersion[]>([])
const activeSlot = ref('')
const targetDate = ref('')
const isFallback = ref(false)

const SLOT_LABEL: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }
const SLOT_ORDER = ['midday', 'morning', 'after_close']
function slotLabel(s: string) { return SLOT_LABEL[s] ?? s }

const content = computed<RhythmMasterContent | undefined>(() => {
  const v = versions.value.find((x) => x.refresh_slot === activeSlot.value)
  return v?.content
})

const pageTitle = computed(() => {
  const s = activeSlot.value
  if (s === 'after_close') return `明日节奏（${targetDate.value}）`
  if (s === 'morning' || s === 'midday') return `今日节奏（${targetDate.value}）`
  return '节奏大师'
})
const cardTitle = computed(() => pageTitle.value)
const basisLabel = computed(() => content.value?.basis_date ?? '')

// ── 顶部紧凑日期条：近 7 交易日收盘基准（日历接口含 position_band 建议仓位）──
const STRIP_DAYS = 7
const stripDays = ref<RhythmCalendarDay[]>([])
// 独立五档色板（与节奏日历页同源：ice 紫灰 / low 青 / normal 主蓝 / active 橙 / euphoria 红）
const LEVEL_SHORT: Record<string, string> = { ice: '冰', low: '低', normal: '常', active: '活', euphoria: '亢' }
const LEVEL_COLOR: Record<string, string> = {
  ice: '#8a6fae',
  low: '#2f9e9e',
  normal: '#4d7cfe',
  active: '#f59e0b',
  euphoria: '#ef4444',
}
const GREY = '#eceef1' // 灰格：该交易日行缺失 / level=null（沿用前值）
function dayCellBg(d: RhythmCalendarDay): string {
  return (d.level && LEVEL_COLOR[d.level]) || GREY
}
/** 格上建议仓位短文本：去掉"建议仓位"前缀只留区间（格宽有限，超长走省略号） */
function bandShort(d: RhythmCalendarDay): string {
  const t = d.position_band?.text?.trim()
  if (!t) return ''
  return t.replace(/^建议仓位\s*/, '')
}

const navSubtitle = computed(() => {
  const parts: string[] = []
  if (targetDate.value) parts.push(`目标日 ${targetDate.value}`)
  if (isFallback.value && basisLabel.value) parts.push(`沿用前值 ${basisLabel.value}`)
  else if (activeSlot.value) parts.push(slotLabel(activeSlot.value))
  return parts.join(' · ')
})

onLoad(async (options) => {
  const date = String(options?.date ?? '')
  targetDate.value = date
  // 顶部日期条与目标日数据并行加载；各自内部兜底，不互相阻塞
  loadStripDays()
  await loadVersions(date || undefined)
})

/** 顶部日期条点格：切换目标日并重拉三时点版本（无报告日由 loadVersions 回退并展示 banner） */
async function pickDay(d: RhythmCalendarDay) {
  if (d.date === targetDate.value) return
  targetDate.value = d.date
  await loadVersions(d.date)
}

/** 顶部日期条数据：接口"最近在前"（降序），升序展示（左旧右新，最右=最新） */
async function loadStripDays() {
  try {
    const res = await agentApi.getRhythmMasterCalendar(STRIP_DAYS)
    stripDays.value = [...(res?.days ?? [])].reverse()
  } catch {
    stripDays.value = []
  }
}

/** 右上角"日历"入口：进入 60 交易日热力图总览页 */
function goCalendar() {
  uni.navigateTo({ url: '/modules/rhythm/pages/calendar' })
}

function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function loadVersions(date?: string) {
  const d = date || (await fallbackDate())
  if (!d) { isFallback.value = true; return }
  let res: unknown
  try {
    res = await agentApi.getRhythmMaster(d)
  } catch {
    // F2：网络/服务错误不抛 unhandled rejection，保持空态（EmptyState）
    return
  }
  // 响应拦截器（shared/api/request.ts）已解包 {code,data} 信封：code===0 时直接 return data，
  // 故 getRhythmMaster 的解析值即 {date, versions}，没有 .data 字段，这里直接取 .versions。
  const list = (res as { date?: string; versions?: RhythmMasterVersion[] }).versions ?? []
  if (!list.length) {
    if (isFallback.value) return
    isFallback.value = true
    // 回退取"严格早于 d"的前一交易日：getRecentTradingDays 含当天（若当天为交易日），
    // 当日无报告时 prev===d 会导致回退失效，故改用 getPreviousTradingDay。
    const prev = await previousTradingDay(d)
    if (prev && prev !== d) return loadVersions(prev)
    return
  }
  versions.value = list.sort((a, b) => SLOT_ORDER.indexOf(a.refresh_slot) - SLOT_ORDER.indexOf(b.refresh_slot))
  activeSlot.value = list[0]?.refresh_slot ?? ''
  targetDate.value = d
}

/** 未指定日期时：取今天（若为交易日）否则最近交易日 */
async function fallbackDate(): Promise<string | undefined> {
  try {
    const t = await agentApi.getRecentTradingDays(todayStr(), 1)
    return t?.[0]
  } catch { return undefined }
}

/** 严格早于指定日期的前一个交易日（回退取前值用，避免 getRecentTradingDays 含当天导致 prev===d） */
async function previousTradingDay(date: string): Promise<string | undefined> {
  try {
    return await agentApi.getPreviousTradingDay(date)
  } catch { return undefined }
}

function switchSlot(s: string) { activeSlot.value = s }
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
.body { padding: 24rpx 32rpx; }

/* 顶部紧凑日期条 */
.day-strip { display: flex; gap: 12rpx; margin-bottom: 24rpx; }
.day-cell {
  flex: 1;
  min-width: 0;
  border-radius: 12rpx;
  border: 4rpx solid transparent;
  padding: 8rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  box-shadow: $shadow-sm;
}
.day-cell.active { border-color: $primary; }
.day-cell.dim { opacity: 0.75; }
.day-date { font-size: 20rpx; font-weight: 600; color: $ink; }
.day-lev {
  font-size: 20rpx; color: #fff; background: rgba(0, 0, 0, 0.18);
  border-radius: 8rpx; padding: 1rpx 8rpx;
}
.day-pos {
  font-size: 16rpx; color: #fff; max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* 右上角"日历"入口（SubPageCard2 header-right 插槽） */
.nav-cal { padding: 8rpx 0 8rpx 24rpx; }
.nav-cal-text { font-size: 26rpx; color: $primary; font-weight: 600; }

/* 三时点分段切换（设计稿：surface 底 + 边框 + pill，active 主色填充） */
.slots { display: flex; gap: 8rpx; background: $bg-card; border: 1rpx solid $line; border-radius: 999rpx; padding: 6rpx; margin-bottom: 24rpx; }
.slot { flex: 1; text-align: center; padding: 12rpx 0; border-radius: 999rpx; font-size: 24rpx; color: $ink-soft; font-weight: 500; }
.slot.active { background: $primary; color: #fff; }
.fallback { margin-bottom: 16rpx; font-size: 24rpx; color: $warning; }
</style>
