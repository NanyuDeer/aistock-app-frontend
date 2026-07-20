<template>
  <SubPageCard title="异动捕手">
    <view class="alert-catcher">
      <!-- 说明卡片 -->
      <view class="intro-card">
        <view class="intro-header">
          <SvgIcon name="bell-line" size="32rpx" color="#4d7cfe" />
          <text class="intro-title">自选股异动监控</text>
        </view>
        <text class="intro-desc">实时监控自选股涨跌幅异动（超5%触发），AI反推三层级原因</text>
      </view>

      <!-- 幅度分级筛选 -->
      <view class="filter-bar">
        <view
          v-for="tab in amplitudeTabs"
          :key="tab.value"
          :class="['filter-tab', activeAmplitude === tab.value ? 'active' : '']"
          @tap="activeAmplitude = tab.value"
        >
          <text class="filter-tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 异动列表 -->
      <view class="alert-list">
        <view
          v-for="(item, idx) in filteredAlerts"
          :key="idx"
          class="alert-card"
          :class="'alert-card--' + item.level"
        >
          <!-- 股票头部 -->
          <view class="alert-card-header">
            <view class="alert-stock">
              <text class="stock-name">{{ item.name }}</text>
              <text class="stock-code">{{ item.code }}</text>
            </view>
            <view :class="['change-badge', item.direction]">
              <text class="change-text">{{ item.change }}</text>
            </view>
          </view>

          <!-- 异动信息 -->
          <view class="alert-meta">
            <text class="meta-type">{{ item.type }}</text>
            <text class="meta-time">{{ item.time }}</text>
          </view>

          <!-- 三层级原因分析 -->
          <view class="cause-section">
            <text class="cause-section-title">原因分析</text>

            <!-- 第一层：个股自身 -->
            <view class="cause-item">
              <view :class="['cause-badge', 'cause-badge--self']">
                <text class="cause-badge-text">个股</text>
              </view>
              <text class="cause-text">{{ item.causes.self }}</text>
            </view>

            <!-- 第二层：板块联动 -->
            <view class="cause-item">
              <view :class="['cause-badge', 'cause-badge--sector']">
                <text class="cause-badge-text">板块</text>
              </view>
              <text class="cause-text">{{ item.causes.sector }}</text>
            </view>

            <!-- 第三层：市场整体 -->
            <view class="cause-item">
              <view :class="['cause-badge', 'cause-badge--market']">
                <text class="cause-badge-text">市场</text>
              </view>
              <text class="cause-text">{{ item.causes.market }}</text>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="!filteredAlerts.length" class="empty-state">
          <text class="empty-title">暂无异动</text>
          <text class="empty-desc">自选股涨跌幅超5%时将自动捕获</text>
        </view>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

type AmplitudeLevel = 'fast' | 'deep' | 'full'
type Direction = 'up' | 'down'

interface AlertItem {
  name: string
  code: string
  change: string
  direction: Direction
  type: string
  time: string
  level: AmplitudeLevel
  causes: {
    self: string
    sector: string
    market: string
  }
}

const amplitudeTabs = [
  { label: '全部', value: 'all' as const },
  { label: '5-8%', value: 'fast' as const },
  { label: '8-12%', value: 'deep' as const },
  { label: '>12%', value: 'full' as const },
]

const activeAmplitude = ref<'all' | AmplitudeLevel>('all')

// Mock 数据（后端 Agent 实现后替换）
const alertList = ref<AlertItem[]>([
  {
    name: '恒瑞医药',
    code: '600276',
    change: '+6.2%',
    direction: 'up',
    type: '快速拉升',
    time: '10:15',
    level: 'fast',
    causes: {
      self: 'PD-1新药获FDA批准上市，利好公司创新药管线',
      sector: '创新药板块整体走强，多只个股联动上涨',
      market: '大盘震荡上行，医药板块受资金青睐',
    },
  },
  {
    name: '迈瑞医疗',
    code: '300760',
    change: '-9.5%',
    direction: 'down',
    type: '急速下跌',
    time: '13:45',
    level: 'deep',
    causes: {
      self: '三季报业绩不及预期，机构下调评级',
      sector: '医疗器械板块回调，集采政策预期升温',
      market: '午后市场情绪转弱，防御性板块承压',
    },
  },
  {
    name: '广生堂',
    code: '300436',
    change: '+15.8%',
    direction: 'up',
    type: '涨停封板',
    time: '14:32',
    level: 'full',
    causes: {
      self: '新冠药临床获批，题材概念叠加',
      sector: '新冠药概念股集体异动，资金涌入',
      market: '题材股活跃，短线资金 seeking 高弹性标的',
    },
  },
  {
    name: '舒泰神',
    code: '300204',
    change: '+10.2%',
    direction: 'up',
    type: '涨停封板',
    time: '10:15',
    level: 'deep',
    causes: {
      self: '创新药临床试验进展顺利',
      sector: '生物医药板块情绪高涨',
      market: '市场风险偏好回升',
    },
  },
  {
    name: '中国平安',
    code: '601318',
    change: '-5.3%',
    direction: 'down',
    type: '快速下跌',
    time: '11:20',
    level: 'fast',
    causes: {
      self: '保费收入增速放缓',
      sector: '保险板块整体承压',
      market: '金融股集体走弱',
    },
  },
])

const filteredAlerts = computed(() => {
  if (activeAmplitude.value === 'all') return alertList.value
  return alertList.value.filter(item => item.level === activeAmplitude.value)
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.alert-catcher {
  padding: 0 $spacing-base $spacing-lg;
}

/* ===== 说明卡片 ===== */
.intro-card {
  background: rgba($brand-color, 0.06);
  border-radius: $radius-base;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
}

.intro-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: 8rpx;
}

.intro-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-color-title;
}

.intro-desc {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  line-height: 1.5;
}

/* ===== 幅度筛选 ===== */
.filter-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: $spacing-base;
}

.filter-tab {
  padding: 8rpx 24rpx;
  border-radius: $radius-pill;
  background: $bg-color-grey;

  &.active {
    background: $brand-color;
  }
}

.filter-tab-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;

  .active & {
    color: #ffffff;
  }
}

/* ===== 异动卡片 ===== */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
}

.alert-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: $spacing-base;
  box-shadow: $shadow-card;
  border-left: 6rpx solid transparent;
}

.alert-card--fast {
  border-left-color: #f59e0b;
}

.alert-card--deep {
  border-left-color: #f97316;
}

.alert-card--full {
  border-left-color: #f43f5e;
}

.alert-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.alert-stock {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.stock-name {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-color-title;
}

.stock-code {
  font-size: $font-size-xs;
  color: $text-color-tertiary;
}

.change-badge {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  &.up {
    background: rgba(244, 63, 94, 0.1);
  }

  &.down {
    background: rgba(34, 197, 94, 0.1);
  }
}

.change-text {
  font-size: $font-size-base;
  font-weight: 700;

  .up & {
    color: #f43f5e;
  }

  .down & {
    color: #22c55e;
  }
}

.alert-meta {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.meta-type {
  font-size: $font-size-sm;
  color: $brand-color;
  background: rgba($brand-color, 0.08);
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.meta-time {
  font-size: $font-size-sm;
  color: $text-color-tertiary;
}

/* ===== 原因分析 ===== */
.cause-section {
  background: $bg-color-grey;
  border-radius: 12rpx;
  padding: $spacing-sm $spacing-base;
}

.cause-section-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-color-secondary;
  display: block;
  margin-bottom: 8rpx;
}

.cause-item {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: 6rpx 0;
}

.cause-badge {
  width: 48rpx;
  height: 32rpx;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cause-badge--self {
  background: rgba($brand-color, 0.1);
}

.cause-badge--sector {
  background: rgba(39, 210, 191, 0.1);
}

.cause-badge--market {
  background: rgba(239, 170, 23, 0.1);
}

.cause-badge-text {
  font-size: 20rpx;
  font-weight: 700;

  .cause-badge--self & {
    color: $brand-color;
  }

  .cause-badge--sector & {
    color: #27D2BF;
  }

  .cause-badge--market & {
    color: #EFAA17;
  }
}

.cause-text {
  font-size: $font-size-sm;
  color: $text-color;
  line-height: 1.6;
  flex: 1;
}

/* ===== 空状态 ===== */
.empty-state {
  padding: $spacing-lg 0;
  text-align: center;
}

.empty-title {
  font-size: $font-size-base;
  color: $text-color-secondary;
  display: block;
  margin-bottom: 8rpx;
}

.empty-desc {
  font-size: $font-size-sm;
  color: $text-color-tertiary;
}
</style>
