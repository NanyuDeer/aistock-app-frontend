<template>
  <SubPageCard title="长线风口">
    <view class="leaders-content">
      <!-- 风口概念泡泡图 -->
      <view class="bubble-card">
        <view class="bubble-title-row">
          <text class="bubble-title">风口概念</text>
          <text class="bubble-hint">泡泡越大持续性越强</text>
        </view>
        <view class="bubble-wrap" :style="{ height: bubbleHeight + 'px' }">
          <view
            v-for="(b, idx) in bubbleLayout"
            :key="idx"
            class="bubble-item"
            :style="bubbleItemStyle(b)"
            @tap="selectBubble(b)"
          >
            <text class="bubble-name" :style="{ fontSize: b.fontSize + 'px' }">{{ b.name }}</text>
            <text
              class="bubble-change"
              :style="{ fontSize: (b.fontSize - 3) + 'px' }"
              :class="b.change >= 0 ? 'up' : 'down'"
            >
              {{ b.change >= 0 ? '+' : '' }}{{ b.change.toFixed(2) }}%
            </text>
          </view>
        </view>
      </view>

      <!-- 板块列表 -->
      <view v-if="sectors.length" class="sector-list">
      <view
        v-for="(sector, idx) in sectors"
        :key="sector.code || idx"
        class="sector-card"
      >
        <!-- 板块头部 -->
        <view class="sector-top">
          <view class="sector-info">
            <text class="sector-rank">No.{{ idx + 1 }}</text>
            <text class="sector-name">{{ sector.name }}</text>
            <text v-if="sector.frequency" class="sector-freq">频次 {{ sector.frequency }}</text>
          </view>
          <view class="sector-change-wrap">
            <text
              :class="['sector-change', (sector.today_change ?? 0) >= 0 ? 'up' : 'down']"
            >
              {{ (sector.today_change ?? 0) >= 0 ? '+' : '' }}{{ formatPct(sector.today_change) }}
            </text>
          </view>
        </view>

        <!-- 龙头股摘要 -->
        <view v-if="sector.leading_stock || sector.leading_stock_info" class="leader-row">
          <view class="leader-left">
            <text class="leader-label">龙头</text>
            <text class="leader-name">{{ sector.leading_stock_info?.name || sector.leading_stock || sector.leading_stock_info?.code }}</text>
            <text
              v-if="sector.leading_stock_info?.change_pct !== undefined && sector.leading_stock_info?.change_pct !== null"
              :class="['leader-change', (sector.leading_stock_info.change_pct ?? 0) >= 0 ? 'up' : 'down']"
            >
              {{ (sector.leading_stock_info.change_pct ?? 0) >= 0 ? '+' : '' }}{{ formatPct(sector.leading_stock_info.change_pct) }}
            </text>
          </view>
          <text v-if="sector.leading_stock_info?.price" class="leader-price">
            {{ Number(sector.leading_stock_info.price).toFixed(2) }}
          </text>
        </view>

        <!-- 驱动因素 -->
        <view v-if="sector.driver" class="driver-row">
          <text class="driver-label">驱动</text>
          <text class="driver-text">{{ sector.driver }}</text>
        </view>

        <!-- AI 分析 -->
        <view v-if="getAnalysisRows(sector.ai_analysis).length" class="analysis-box">
          <view
            v-for="(row, rIdx) in getAnalysisRows(sector.ai_analysis)"
            :key="rIdx"
            class="analysis-row"
          >
            <text class="analysis-label">{{ row.label }}</text>
            <text :class="['analysis-value', row.risk ? 'risk' : '']">{{ row.value }}</text>
          </view>
        </view>

        <!-- 涨跌家数 -->
        <view v-if="sector.up_count || sector.down_count" class="count-row">
          <text class="count-up">↑ {{ sector.up_count || 0 }}</text>
          <text class="count-down">↓ {{ sector.down_count || 0 }}</text>
        </view>

        <!-- 主线个股 -->
        <view v-if="sector.main_stocks && sector.main_stocks.length" class="stocks-section">
          <text class="stocks-section-title">主线个股</text>
          <view class="stocks-list">
            <view
              v-for="stock in sector.main_stocks.slice(0, 6)"
              :key="stock.code"
              class="stock-item"
              @tap="goStockDetail(stock.code)"
            >
              <view class="stock-info">
                <text class="stock-name">{{ stock.name }}</text>
                <text class="stock-code">{{ stock.code }}</text>
              </view>
              <view class="stock-quote">
                <text v-if="stock.price !== null && stock.price !== undefined" class="stock-price">
                  {{ Number(stock.price).toFixed(2) }}
                </text>
                <text
                  v-if="stock.change_pct !== null && stock.change_pct !== undefined"
                  :class="['stock-change', (stock.change_pct ?? 0) >= 0 ? 'up' : 'down']"
                >
                  {{ (stock.change_pct ?? 0) >= 0 ? '+' : '' }}{{ formatPct(stock.change_pct) }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 更新时间 -->
      <view v-if="updateTime" class="update-time">
        <text class="update-time-text">数据更新于 {{ formatTime(updateTime) }}</text>
      </view>
    </view>

    <!-- 无板块数据时显示mock -->
    <view v-else class="sector-list">
      <view
        v-for="(sector, idx) in mockSectors"
        :key="'mock-' + idx"
        class="sector-card"
      >
        <view class="sector-top">
          <view class="sector-info">
            <text class="sector-rank">No.{{ idx + 1 }}</text>
            <text class="sector-name">{{ sector.name }}</text>
            <text class="sector-freq">频次 {{ sector.frequency }}</text>
          </view>
          <view class="sector-change-wrap">
            <text :class="['sector-change', sector.today_change >= 0 ? 'up' : 'down']">
              {{ sector.today_change >= 0 ? '+' : '' }}{{ sector.today_change.toFixed(2) }}%
            </text>
          </view>
        </view>
        <view class="leader-row">
          <view class="leader-left">
            <text class="leader-label">龙头</text>
            <text class="leader-name">{{ sector.leader }}</text>
            <text :class="['leader-change', sector.leader_change >= 0 ? 'up' : 'down']">
              {{ sector.leader_change >= 0 ? '+' : '' }}{{ sector.leader_change.toFixed(2) }}%
            </text>
          </view>
        </view>
        <view class="driver-row">
          <text class="driver-label">驱动</text>
          <text class="driver-text">{{ sector.driver }}</text>
        </view>
        <view class="analysis-box">
          <view class="analysis-row">
            <text class="analysis-label">持续性</text>
            <text class="analysis-value">{{ sector.persistence }}</text>
          </view>
          <view class="analysis-row">
            <text class="analysis-label">理由</text>
            <text class="analysis-value">{{ sector.persistence_reason }}</text>
          </view>
          <view v-if="sector.risk" class="analysis-row">
            <text class="analysis-label">风险</text>
            <text class="analysis-value risk">{{ sector.risk }}</text>
          </view>
        </view>
        <view class="count-row">
          <text class="count-up">↑ {{ sector.up_count }}</text>
          <text class="count-down">↓ {{ sector.down_count }}</text>
        </view>
        <view class="stocks-section">
          <text class="stocks-section-title">主线个股</text>
          <view class="stocks-list">
            <view
              v-for="stock in sector.stocks"
              :key="stock.code"
              class="stock-item"
            >
              <view class="stock-info">
                <text class="stock-name">{{ stock.name }}</text>
                <text class="stock-code">{{ stock.code }}</text>
              </view>
              <view class="stock-quote">
                <text class="stock-price">{{ stock.price }}</text>
                <text :class="['stock-change', stock.change >= 0 ? 'up' : 'down']">
                  {{ stock.change >= 0 ? '+' : '' }}{{ stock.change.toFixed(2) }}%
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/api/modules/stock'
import SubPageCard from '@/components/layout/SubPageCard.vue'

interface SectorStock {
  code: string
  name: string
  industry?: string
  score?: number
  reason?: string
  reason_tag?: string
  price?: number | null
  change_pct?: number | null
}

interface AiAnalysis {
  persistence?: string
  persistence_reason?: string
  heat_transfer?: boolean
  transfer_direction?: string
  transfer_reason?: string
  risk_warning?: string
}

interface HotSector {
  code?: string
  name: string
  type?: string
  frequency?: string
  avg_change?: number
  today_change?: number
  net_inflow?: number
  score?: number
  leading_stock?: string
  leading_change?: number
  up_count?: number
  down_count?: number
  driver?: string
  ai_analysis?: AiAnalysis | string | null
  main_stocks?: SectorStock[]
  leading_stock_info?: {
    code?: string
    name?: string
    price?: number | null
    change_pct?: number | null
  } | null
}

const loading = ref(false)
const sectors = ref<HotSector[]>([])
const updateTime = ref('')

// ===== 泡泡图数据 =====
interface Bubble {
  name: string
  change: number
  score: number
  persistence: string
  radius: number  // px 半径
  fontSize: number
}

// 泡泡布局结果
interface BubbleLayout extends Bubble {
  x: number
  y: number
}

const bubbleHeight = 380 // 容器高度 px

// 根据持续性决定半径，参考网页版
function calcRadius(persistence: string, score: number): number {
  let base = 22 // 短期
  if (persistence.includes('长期')) base = 50
  else if (persistence.includes('中期')) base = 35
  // score 微调
  base += (score - 50) * 0.08
  return Math.max(18, Math.min(60, Math.round(base)))
}

const bubbleData = computed<Bubble[]>(() => {
  const source = sectors.value.length
    ? sectors.value.slice(0, 10).map(s => ({
        name: s.name,
        change: s.today_change || 0,
        score: s.score || 50,
        persistence: typeof s.ai_analysis === 'object' ? s.ai_analysis?.persistence || '短期' : '短期',
      }))
    : mockBubbles
  return source.map(s => ({
    ...s,
    radius: calcRadius(s.persistence, s.score),
    fontSize: calcRadius(s.persistence, s.score) > 40 ? 14 : (calcRadius(s.persistence, s.score) > 28 ? 12 : 10),
  }))
})

// 简单 force simulation：碰撞检测 + 居中
const bubbleLayout = computed<BubbleLayout[]>(() => {
  const items = bubbleData.value
  if (!items.length) return []
  const W = 320 // 容器宽度近似
  const H = bubbleHeight
  const cx = W / 2
  const cy = H / 2

  // 初始化随机位置
  const nodes = items.map(b => ({
    ...b,
    x: cx + (Math.random() - 0.5) * W * 0.6,
    y: cy + (Math.random() - 0.5) * H * 0.6,
    vx: 0,
    vy: 0,
  }))

  // 迭代模拟
  const iterations = 200
  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations

    // 居中力
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.005 * alpha
      n.vy += (cy - n.y) * 0.005 * alpha
    }

    // 碰撞检测
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const na = nodes[a]
        const nb = nodes[b]
        const dx = nb.x - na.x
        const dy = nb.y - na.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = na.radius + nb.radius + 4
        if (dist < minDist) {
          const push = (minDist - dist) / 2
          const ux = dx / dist
          const uy = dy / dist
          na.x -= ux * push
          na.y -= uy * push
          nb.x += ux * push
          nb.y += uy * push
        }
      }
    }

    // 边界约束
    for (const n of nodes) {
      n.x = Math.max(n.radius + 4, Math.min(W - n.radius - 4, n.x))
      n.y = Math.max(n.radius + 4, Math.min(H - n.radius - 4, n.y))
    }
  }

  return nodes.map(n => ({ ...n, x: n.x, y: n.y }))
})

// 颜色：基于score，从浅蓝到深蓝（匹配网页版）
function bubbleItemStyle(b: BubbleLayout) {
  const ratio = Math.max(0, Math.min(1, (b.score - 40) / 60))
  // 浅蓝 #bfdbfe → 深蓝 #1d4ed8
  const r = Math.round(191 + (29 - 191) * ratio)
  const g = Math.round(219 + (78 - 219) * ratio)
  const bl = Math.round(254 + (216 - 254) * ratio)
  const fillColor = `rgb(${r}, ${g}, ${bl})`
  return {
    width: b.radius * 2 + 'px',
    height: b.radius * 2 + 'px',
    left: b.x - b.radius + 'px',
    top: b.y - b.radius + 'px',
    background: fillColor,
    borderColor: '#ffffff',
    opacity: '0.9',
  }
}

const mockBubbles = [
  { name: '创新药', change: 3.52, score: 85, persistence: '长期(5-10天)' },
  { name: '光伏', change: 2.18, score: 72, persistence: '中期(3-5天)' },
  { name: '半导体', change: 1.85, score: 68, persistence: '中期(3-5天)' },
  { name: '动力煤', change: -0.92, score: 55, persistence: '短期(1-3天)' },
  { name: '锂电池', change: 1.45, score: 62, persistence: '中期(3-5天)' },
  { name: '白酒', change: 0.78, score: 48, persistence: '短期(1-3天)' },
  { name: 'AI算力', change: 4.22, score: 90, persistence: '长期(5-10天)' },
  { name: '稀土', change: -1.35, score: 42, persistence: '短期(1-3天)' },
]

function selectBubble(b: Bubble) {
  // 点击泡泡时滚动到对应板块卡片
  uni.showToast({ title: b.name, icon: 'none', duration: 800 })
}

// ===== Mock 板块数据 =====
const mockSectors = [
  {
    name: '创新药',
    frequency: 12,
    today_change: 3.52,
    leader: '药明康德',
    leader_change: 8.52,
    driver: '美国标普生物科技指数大涨，创新药出海预期升温',
    persistence: '长期(5-10天)',
    persistence_reason: '海外临床进展密集发布，政策支持创新药审评加速',
    risk: '部分标的估值偏高，注意回调风险',
    up_count: 38,
    down_count: 7,
    stocks: [
      { name: '舒泰神', code: '300204', price: '18.52', change: 20.00 },
      { name: '广生堂', code: '300436', price: '32.15', change: 20.00 },
      { name: '药明康德', code: '603259', price: '68.90', change: 8.52 },
      { name: '恒瑞医药', code: '600276', price: '42.30', change: 5.33 },
    ],
  },
  {
    name: '光伏',
    frequency: 9,
    today_change: 2.18,
    leader: '隆基绿能',
    leader_change: 4.15,
    driver: '硅料价格企稳，组件排产环比提升',
    persistence: '中期(3-5天)',
    persistence_reason: '欧洲能源转型需求旺盛，国内装机数据超预期',
    risk: '',
    up_count: 25,
    down_count: 12,
    stocks: [
      { name: '隆基绿能', code: '601012', price: '22.45', change: 4.15 },
      { name: '通威股份', code: '600438', price: '28.90', change: 3.22 },
      { name: '阳光电源', code: '300274', price: '75.60', change: 2.88 },
    ],
  },
  {
    name: 'AI算力',
    frequency: 15,
    today_change: 4.22,
    leader: '中际旭创',
    leader_change: 6.78,
    driver: '英伟达再创新高，光模块需求持续爆发',
    persistence: '长期(5-10天)',
    persistence_reason: 'AI大模型训练和推理需求指数级增长，算力基础设施扩容确定性强',
    risk: '部分概念股缺乏实际业绩支撑',
    up_count: 42,
    down_count: 5,
    stocks: [
      { name: '中际旭创', code: '300308', price: '128.50', change: 6.78 },
      { name: '新易盛', code: '300502', price: '85.20', change: 5.42 },
      { name: '浪潮信息', code: '000977', price: '35.80', change: 3.95 },
    ],
  },
]

async function loadData() {
  loading.value = true
  try {
    const res: any = await stockApi.getWindLeaders(10)
    const data = res?.data ?? res
    sectors.value = data?.hot_sectors || []
    updateTime.value = data?.update_time || ''
  } catch {
    // 本地降级模式下数据库不可用，静默处理
    sectors.value = []
  } finally {
    loading.value = false
  }
}

function formatPct(val?: number | null): string {
  if (val === undefined || val === null) return '--'
  return Number(val).toFixed(2) + '%'
}

function getAnalysisRows(a: AiAnalysis | string | null | undefined): Array<{ label: string; value: string; risk?: boolean }> {
  if (!a) return []
  const obj: AiAnalysis = typeof a === 'string' ? { persistence_reason: a } : a
  const rows: Array<{ label: string; value: string; risk?: boolean }> = []
  if (obj.persistence) rows.push({ label: '持续性', value: obj.persistence })
  if (obj.persistence_reason) rows.push({ label: '理由', value: obj.persistence_reason })
  if (obj.transfer_direction) rows.push({ label: '传导方向', value: obj.transfer_direction })
  if (obj.risk_warning) rows.push({ label: '风险提示', value: obj.risk_warning, risk: true })
  return rows
}

function formatTime(t?: string): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/pages/stock/detail?symbol=${symbol}` })
}

onShow(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.leaders-content {
  padding: 24rpx;
}

/* ===== 泡泡图 ===== */
.bubble-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.bubble-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.bubble-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.bubble-hint {
  font-size: 20rpx;
  color: #9ca3af;
}

.bubble-wrap {
  position: relative;
  width: 100%;
}

.bubble-item {
  position: absolute;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #ffffff;
  transition: transform 0.2s ease;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);

  &:active {
    transform: scale(0.92);
  }
}

.bubble-name {
  font-weight: 600;
  color: #ffffff;
  line-height: 1.2;
  text-align: center;
  padding: 0 4px;
}

.bubble-change {
  font-weight: 500;
  margin-top: 2rpx;
  color: #ffffff;

  &.up { color: #ffffff; }
  &.down { color: #fef2f2; }
}

/* ===== 板块卡片 ===== */
.sector-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.sector-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.sector-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.sector-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  overflow: hidden;
}

.sector-rank {
  font-size: 22rpx;
  color: #ffffff;
  background: #4d7cfe;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.sector-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1d24;
}

.sector-freq {
  font-size: 22rpx;
  color: #6b7280;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.sector-change-wrap {
  display: flex;
  align-items: center;
}

.sector-change {
  font-size: 30rpx;
  font-weight: 600;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 龙头行 */
.leader-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.08), rgba(77, 124, 254, 0.03));
  border: 1rpx solid rgba(77, 124, 254, 0.15);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.leader-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.leader-label {
  font-size: 22rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.leader-name {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;
}

.leader-change {
  font-size: 26rpx;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

.leader-price {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 600;
}

/* 驱动因素 */
.driver-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.driver-label {
  font-size: 24rpx;
  color: #6b7280;
  flex-shrink: 0;
}

.driver-text {
  font-size: 24rpx;
  color: #1a1d24;
  line-height: 1.5;
  flex: 1;
}

/* AI 分析 */
.analysis-box {
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.analysis-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.analysis-label {
  font-size: 22rpx;
  color: #9ca3af;
  flex-shrink: 0;
  width: 100rpx;
}

.analysis-value {
  font-size: 22rpx;
  color: #6b7280;
  line-height: 1.5;
  flex: 1;

  &.risk {
    color: #f59e0b;
  }
}

/* 涨跌家数 */
.count-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.count-up {
  font-size: 24rpx;
  color: #f43f5e;
  font-weight: 500;
}

.count-down {
  font-size: 24rpx;
  color: #22c55e;
  font-weight: 500;
}

/* 主线个股 */
.stocks-section {
  border-top: 1rpx solid #f0f2f5;
  padding-top: 20rpx;
}

.stocks-section-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1d24;
  margin-bottom: 16rpx;
  display: block;
}

.stocks-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stock-name {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;
}

.stock-code {
  font-size: 22rpx;
  color: #6b7280;
}

.stock-quote {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stock-price {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 600;
}

.stock-change {
  font-size: 24rpx;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 更新时间 */
.update-time {
  text-align: center;
  padding: 24rpx 0;
}

.update-time-text {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
