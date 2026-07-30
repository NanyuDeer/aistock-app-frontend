<template>
  <SubPageCard title="异动捕手">
    <view class="alert-catcher">
      <!-- 说明卡片 -->
      <Card flat class="intro-card">
        <view class="intro-header">
          <SvgIcon name="bell-line" size="32rpx" color="#0b5fff" />
          <text class="intro-title">自选股异动监控</text>
        </view>
        <text class="intro-desc">实时监控自选股涨跌幅异动（超5%触发），AI反推三层级原因</text>
      </Card>

      <!-- 幅度分级筛选 -->
      <view class="filter-bar">
        <Segmented :items="amplitudeTabs" v-model="activeAmplitude" fullWidth />
      </view>

      <!-- 异动列表 -->
      <view class="alert-list">
        <Card
          v-for="(item, idx) in filteredAlerts"
          :key="idx"
          class="alert-item-card"
          :class="'alert-level-' + item.level"
        >
          <!-- 股票头部 -->
          <view class="alert-card-header">
            <view class="alert-stock">
              <text class="stock-name">{{ item.name }}</text>
              <text class="stock-code">{{ item.code }}</text>
            </view>
            <Tag :type="item.direction === 'up' ? 'up' : 'down'">{{ item.change }}</Tag>
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
              <Tag type="up" size="sm">个股</Tag>
              <text class="cause-text">{{ item.causes.self }}</text>
            </view>

            <!-- 第二层：板块联动 -->
            <view class="cause-item">
              <Tag type="warning" size="sm">板块</Tag>
              <text class="cause-text">{{ item.causes.sector }}</text>
            </view>

            <!-- 第三层：市场整体 -->
            <view class="cause-item">
              <Tag type="neutral" size="sm">市场</Tag>
              <text class="cause-text">{{ item.causes.market }}</text>
            </view>
          </view>
        </Card>

        <!-- 空状态 -->
        <EmptyState v-if="!filteredAlerts.length" title="暂无异动信号" description="自选股涨跌幅超5%时将自动捕获" />
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { Card, Segmented, Tag, EmptyState } from '@/shared/components'

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
  background: rgba($primary, 0.06) !important;
  border-color: transparent !important;
  padding: $s-3 !important;
  margin-bottom: $s-3;
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
  margin-bottom: $s-3;
}

/* ===== 异动卡片 ===== */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: $s-3;
}

.alert-item-card {
  padding: $s-3 !important;
  border-left: 6rpx solid transparent;
}

.alert-level-fast {
  border-left-color: $warning !important;
}

.alert-level-deep {
  border-left-color: #f97316 !important;
}

.alert-level-full {
  border-left-color: $up !important;
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
  gap: $s-2;
  padding: 6rpx 0;
}

.cause-text {
  font-size: $font-size-sm;
  color: $text-color;
  line-height: 1.6;
  flex: 1;
}
</style>
