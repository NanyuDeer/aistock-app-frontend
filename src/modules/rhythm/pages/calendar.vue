<template>
  <view class="page">
    <view class="nav">
      <text class="back" @tap="goBack">‹</text>
      <text class="nav-title">节奏日历</text>
      <text class="nav-sub">近 {{ days }} 个交易日 · 收盘基准</text>
    </view>
    <scroll-view scroll-y class="content">
      <!-- 图例：五档冷→热 + 灰格 -->
      <view class="legend">
        <view v-for="l in LEGEND" :key="l.label" class="legend-item">
          <view class="legend-swatch" :style="{ background: l.color }"></view>
          <text class="legend-label">{{ l.label }}</text>
        </view>
        <view class="legend-item">
          <view class="legend-swatch legend-grey"></view>
          <text class="legend-label">无报告</text>
        </view>
      </view>

      <!-- 热力图网格：按周 7 列，每日一格（日期升序），点格跳详情 -->
      <view class="cal-grid">
        <view v-for="d in orderedDays" :key="d.date" class="cal-cell" :style="{ background: cellColor(d) }" @tap="goDetail(d)">
          <text class="cal-date" :class="{ dim: !d.level }">{{ d.date.slice(8) }}</text>
          <text class="cal-lev" v-if="d.level">{{ levelShort(d.level) }}</text>
          <text class="cal-basis" v-else-if="d.basis_date">沿用前值</text>
        </view>
      </view>

      <!-- 说明 -->
      <view class="tip">
        <text>格子 = 该交易日（after_close 收盘基准档）。点击格子查看当日节奏详情。周休/无报告日为灰格。</text>
      </view>
      <view class="tip dim">
        <text>数据自部署起前向积累，早期日可能缺失（灰格）——如实展示，不伪造。</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'

interface RhythmDay {
  date: string
  refresh_slot?: string
  level: string | null
  score: number | null
  basis_date: string | null
}

const days = ref(60)
const dayList = ref<RhythmDay[]>([])

// 独立五档色板（design-debate A6/R8：不复用卡片 chip 色——low/normal 同蓝系、ice 灰蓝撞灰格）
const LEVEL_COLOR: Record<string, string> = {
  ice: '#8a6fae',      // 冰点：紫灰
  low: '#2f9e9e',      // 低迷：青
  normal: '#4d7cfe',   // 常温：主蓝
  active: '#f59e0b',   // 活跃：橙
  euphoria: '#ef4444', // 亢奋：红
}
const GREY = '#eceef1' // 灰格：行缺失 / level=null
const LEVEL_SHORT: Record<string, string> = { ice: '冰', low: '低', normal: '常', active: '活', euphoria: '亢' }
const LEGEND = [
  { label: '冰点', color: LEVEL_COLOR.ice },
  { label: '低迷', color: LEVEL_COLOR.low },
  { label: '常温', color: LEVEL_COLOR.normal },
  { label: '活跃', color: LEVEL_COLOR.active },
  { label: '亢奋', color: LEVEL_COLOR.euphoria },
]

function levelShort(level: string): string {
  return LEVEL_SHORT[level] ?? level.slice(0, 1)
}
function cellColor(d: RhythmDay): string {
  return (d.level && LEVEL_COLOR[d.level]) || GREY
}
// 接口返回"最近在前"（降序），网格按日期升序（左→右时间前进）
const orderedDays = computed(() => [...dayList.value].reverse())

onLoad(async () => {
  try {
    const res = (await agentApi.getRhythmMasterCalendar(days.value)) as {
      days?: RhythmDay[]
    }
    dayList.value = res?.days ?? []
  } catch {
    // 网络/服务错误保持空态，不抛 unhandled rejection
    dayList.value = []
  }
})

function goDetail(d: RhythmDay) {
  uni.navigateTo({ url: `/modules/rhythm/pages/index?date=${d.date}` })
}

function goBack() {
  // H5 直接以 URL 打开时无上级页面栈（深度=1），navigateBack 会静默失败（对齐详情页兜底）
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/modules/home/pages/index' })
  }
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
.page { display: flex; flex-direction: column; height: 100%; background: $bg-page; }
.nav { display: flex; align-items: baseline; gap: 16rpx; padding: 24rpx 32rpx; background: $bg-card; }
.back { font-size: 40rpx; color: $ink; padding-right: 8rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: $ink; }
.nav-sub { font-size: 22rpx; color: $ink-soft; }
.content { flex: 1; padding: 24rpx 32rpx; }

.legend { display: flex; align-items: center; gap: 18rpx; flex-wrap: wrap; margin-bottom: 20rpx; }
.legend-item { display: flex; align-items: center; gap: 8rpx; }
.legend-swatch { width: 28rpx; height: 28rpx; border-radius: 8rpx; }
.legend-grey { background: #eceef1; border: 1rpx solid $line; }
.legend-label { font-size: 22rpx; color: $ink-soft; }

.cal-grid { display: flex; flex-wrap: wrap; gap: 10rpx; }
.cal-cell { width: calc((100% - 60rpx) / 7); aspect-ratio: 1 / 0.9; border-radius: 12rpx; padding: 8rpx 4rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; }
.cal-date { font-size: 22rpx; font-weight: 600; color: $ink; }
.cal-date.dim { color: $ink-soft; }
.cal-lev { font-size: 20rpx; color: #fff; background: rgba(0, 0, 0, 0.18); border-radius: 8rpx; padding: 1rpx 8rpx; }
.cal-basis { font-size: 16rpx; color: $ink-soft; }

.tip { margin-top: 24rpx; font-size: 22rpx; color: $ink-soft; line-height: 1.6; }
.tip.dim { margin-top: 8rpx; color: $ink-soft; opacity: 0.8; }
</style>
