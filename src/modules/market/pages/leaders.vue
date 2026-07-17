<template>
  <SubPageCard title="长线风口">
    <template #header-right>
      <view class="history-btn" @tap="goPushHistory">
        <text class="history-btn-text">历史推送</text>
      </view>
    </template>
    <view class="leaders-content">
      <!-- 引导卡片：点击查看今日分析报告 -->
      <view class="report-guide-card" @tap="goAgentReport">
        <view class="guide-left">
          <SvgIcon name="file-line" color="#ffffff" size="40rpx" />
          <text class="guide-title">点击查看今日分析报告</text>
        </view>
        <SvgIcon name="arrow-right-line" color="#ffffff" size="32rpx" />
      </view>

      <view v-if="errorMessage" class="state-card">
        <text class="state-text">{{ errorMessage }}</text>
        <text class="state-hint">请检查网络连接后重新加载</text>
        <button
          class="retry-button"
          :class="{ disabled: loading }"
          :disabled="loading"
          @tap="loadData"
        >
          {{ loading ? '加载中...' : '重新加载' }}
        </button>
      </view>

      <view v-else-if="loading && !sectors.length" class="state-card">
        <text class="state-text">正在加载长线风口数据...</text>
      </view>

      <view v-else-if="!sectors.length" class="state-card">
        <text class="state-text">暂无长线风口数据</text>
        <text class="state-hint">数据更新后将在这里展示</text>
      </view>

      <!-- 风口概念泡泡图 -->
      <view v-if="sectors.length" class="bubble-card">
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

    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import { onShow, onReady } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import type { WindLeaderAiAnalysis, WindLeaderSector } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const loading = ref(false)
const errorMessage = ref('')
const sectors = ref<WindLeaderSector[]>([])
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

const bubbleHeight = 200 // 容器高度 px（横向椭圆布局，纵向更短）

// 动态计算容器宽度：windowWidth - 两侧padding（leaders-content 24rpx×2 + bubble-card 24rpx×2）
// 不能硬编码，否则不同设备屏幕宽度下泡泡会溢出画布
const containerWidth = ref(320)
try {
  const sysInfo = uni.getSystemInfoSync()
  const winW = sysInfo.windowWidth || 375
  const rpx2px = (rpx: number) => rpx * winW / 750
  containerWidth.value = Math.round(winW - rpx2px(24) * 4)
} catch {
  containerWidth.value = 320
}

// onReady 中测量 .bubble-wrap 的实际渲染宽度并修正 containerWidth。
// 上面 getSystemInfoSync() 只能拿到 windowWidth，无法感知 App 端 zoom:1.2 缩放等
// 导致的实际容器宽度差异，这里用 boundingClientRect 拿到真实渲染宽度兜底。
onReady(() => {
  const instance = getCurrentInstance()
  const query = uni.createSelectorQuery()
  if (instance?.proxy) {
    query.in(instance.proxy)
  }
  query
    .select('.bubble-wrap')
    .boundingClientRect((rect) => {
      // boundingClientRect 回调参数类型为 NodeInfo | NodeInfo[]，需收窄到单节点
      const r = Array.isArray(rect) ? rect[0] : rect
      const w = r?.width
      if (w && w > 0) {
        containerWidth.value = Math.round(w)
      }
    })
    .exec()
})

// 根据持续性决定半径，横向椭圆布局允许稍大半径
function calcRadius(persistence: string, score: number): number {
  let base = 20 // 短期
  if (persistence.includes('长期')) base = 36
  else if (persistence.includes('中期')) base = 27
  // score 微调
  base += (score - 50) * 0.05
  return Math.max(16, Math.min(40, Math.round(base)))
}

const bubbleData = computed<Bubble[]>(() => {
  const source = sectors.value.slice(0, 10).map(s => ({
    name: s.name,
    change: s.today_change ?? 0,
    score: s.score ?? 50,
    persistence: typeof s.ai_analysis === 'object'
      ? s.ai_analysis?.persistence || '短期'
      : '短期',
  }))
  return source.map(s => ({
    ...s,
    radius: calcRadius(s.persistence, s.score),
    fontSize: calcRadius(s.persistence, s.score) > 40 ? 14 : (calcRadius(s.persistence, s.score) > 28 ? 12 : 10),
  }))
})

// force simulation：碰撞检测 + 居中 + 自适应缩放（确定性布局，同数据同结果）
const bubbleLayout = computed<BubbleLayout[]>(() => {
  const items = bubbleData.value
  if (!items.length) return []
  const W = containerWidth.value // 动态容器宽度，匹配实际画布大小
  const H = bubbleHeight
  const cx = W / 2
  const cy = H / 2

  // 自适应缩放：如果泡泡总面积占画布面积超过45%，等比缩小半径
  const totalArea = items.reduce((sum, b) => sum + Math.PI * b.radius * b.radius, 0)
  const canvasArea = W * H
  let scale = 1
  if (totalArea / canvasArea > 0.45) {
    scale = Math.sqrt(0.45 * canvasArea / totalArea)
  }

  // 确定性初始位置：按 index 在横向椭圆上均匀分布
  const ellipseA = W * 0.4  // 横向半轴（更宽）
  const ellipseB = H * 0.3  // 纵向半轴（更窄）
  const nodes = items.map((b, idx) => {
    const r = b.radius * scale
    const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2
    return {
      ...b,
      radius: r,
      x: cx + Math.cos(angle) * ellipseA,
      y: cy + Math.sin(angle) * ellipseB,
      vx: 0,
      vy: 0,
    }
  })

  // 迭代模拟
  const iterations = 300
  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations

    // 居中力（Y方向更强，X方向更弱，让泡泡横向展开）
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.08 * alpha  // X: 居中力增强，帮助泡泡回归中心
      n.vy += (cy - n.y) * 0.15 * alpha  // Y: 强居中
    }

    // 碰撞检测
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const na = nodes[a]
        const nb = nodes[b]
        const dx = nb.x - na.x
        const dy = nb.y - na.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = na.radius + nb.radius + 3
        if (dist < minDist) {
          const push = (minDist - dist) / 2 * 0.9
          const ux = dx / dist
          const uy = dy / dist
          na.x -= ux * push
          na.y -= uy * push
          nb.x += ux * push
          nb.y += uy * push
        }
      }
    }

    // 应用速度
    for (const n of nodes) {
      n.x += n.vx * 0.3
      n.y += n.vy * 0.3
      n.vx *= 0.6
      n.vy *= 0.6
    }

    // 边界约束（更强：确保泡泡完全在画布内，留2px安全边距）
    for (const n of nodes) {
      const safeR = n.radius + 2
      n.x = Math.max(safeR, Math.min(W - safeR, n.x))
      n.y = Math.max(safeR, Math.min(H - safeR, n.y))
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

function selectBubble(b: Bubble) {
  // 点击泡泡时滚动到对应板块卡片
  uni.showToast({ title: b.name, icon: 'none', duration: 800 })
}

function goAgentReport() {
  const today = new Date().toISOString().split('T')[0]
  uni.navigateTo({
    url: `/modules/chat/pages/agent-report?intent=wind_leader&date=${today}`
  })
}

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const data = await stockApi.getWindLeaders(10)
    const hotSectors = Array.isArray(data?.hot_sectors) ? data.hot_sectors : []
    sectors.value = hotSectors.filter(
      (sector): sector is WindLeaderSector => Boolean(sector && typeof sector.name === 'string' && sector.name.trim())
    )
    updateTime.value = typeof data?.update_time === 'string' ? data.update_time : ''
    errorMessage.value = ''
  } catch {
    sectors.value = []
    updateTime.value = ''
    errorMessage.value = '长线风口数据加载失败'
  } finally {
    loading.value = false
  }
}

function formatPct(val?: number | null): string {
  if (val === undefined || val === null) return '--'
  return Number(val).toFixed(2) + '%'
}

function getAnalysisRows(a: WindLeaderAiAnalysis | string | null | undefined): Array<{ label: string; value: string; risk?: boolean }> {
  if (!a) return []
  const obj: WindLeaderAiAnalysis = typeof a === 'string' ? { persistence_reason: a } : a
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
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goPushHistory() {
  uni.navigateTo({ url: '/modules/market/pages/push-history' })
}

onShow(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.leaders-content {
  padding: 24rpx;
}

/* ===== 引导卡片 ===== */
.report-guide-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #4d7cfe 0%, #667eea 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.guide-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.guide-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  text-align: center;
}

.state-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}

.state-hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

.retry-button {
  min-width: 200rpx;
  margin-top: 28rpx;
  padding: 0 32rpx;
  color: #ffffff;
  font-size: 26rpx;
  line-height: 72rpx;
  background: #4d7cfe;
  border: 0;
  border-radius: 36rpx;

  &::after {
    border: 0;
  }

  &.disabled {
    opacity: 0.6;
  }
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

.history-btn {
  padding: 8rpx 16rpx;
  background: rgba(77, 124, 254, 0.1);
  border-radius: 8rpx;
}

.history-btn-text {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
}
</style>
