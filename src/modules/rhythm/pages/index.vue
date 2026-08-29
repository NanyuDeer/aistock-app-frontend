<template>
  <view class="page">
    <view class="nav">
      <text class="back" @tap="goBack">‹</text>
      <text class="nav-title">{{ pageTitle }}</text>
    </view>
    <scroll-view scroll-y class="content">
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
      <RhythmCard v-if="content" :card="content.rhythm_card!" :title="cardTitle" :slot="content.refresh_slot" />
      <EmptyState v-else title="节奏状态暂不可用" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { EmptyState } from '@/shared/components'
import RhythmCard from '../components/RhythmCard.vue'
import { agentApi } from '@/shared/api/modules/agent'
import type { RhythmMasterContent, RhythmMasterReport } from '@/shared/api/modules/agent'

const versions = ref<{ refresh_slot: string; created_at?: string; content?: RhythmMasterContent }[]>([])
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

onLoad(async (options) => {
  const date = String(options?.date ?? '')
  targetDate.value = date
  await loadVersions(date || undefined)
})

function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function loadVersions(date?: string) {
  const d = date || (await fallbackDate())
  if (!d) { isFallback.value = true; return }
  const res: unknown = await agentApi.getRhythmMaster(d)
  const data = (res as { data?: { versions?: { refresh_slot: string; created_at?: string; content?: RhythmMasterContent }[] } })?.data
  const list = data?.versions ?? []
  if (!list.length) {
    if (isFallback.value) return
    isFallback.value = true
    const prev = await fallbackDate()
    if (prev && prev !== d) return loadVersions(prev)
    return
  }
  versions.value = list.sort((a, b) => SLOT_ORDER.indexOf(a.refresh_slot) - SLOT_ORDER.indexOf(b.refresh_slot))
  activeSlot.value = list[0]?.refresh_slot ?? ''
  targetDate.value = d
}

async function fallbackDate(): Promise<string | undefined> {
  try {
    const t = await agentApi.getRecentTradingDays(todayStr(), 1)
    return t?.[0]
  } catch { return undefined }
}

function switchSlot(s: string) { activeSlot.value = s }
function goBack() { uni.navigateBack() }
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
.page { display: flex; flex-direction: column; height: 100%; background: $bg-page; }
.nav { display: flex; align-items: center; padding: 24rpx 32rpx; background: $bg-card; }
.back { font-size: 40rpx; color: $ink; padding-right: 24rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: $ink; }
.content { flex: 1; padding: 24rpx 32rpx; }
.slots { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.slot { padding: 12rpx 28rpx; border-radius: 999rpx; background: $bg-card; font-size: 26rpx; color: $ink-soft; }
.slot.active { background: $primary; color: #fff; }
.fallback { margin-bottom: 16rpx; font-size: 24rpx; color: $warning; }
</style>
