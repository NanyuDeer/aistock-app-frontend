<template>
  <SubPageCard :title="sectorName || '风口详情'">
    <view class="sector-detail-content">
      <!-- 加载状态 -->
      <LoadingState v-if="loading" text="正在加载板块数据..." />

      <!-- 错误状态 -->
      <Card v-else-if="errorMessage">
        <EmptyState :title="errorMessage" description="请检查网络连接后重新加载">
          <Button size="sm" @click="loadData">重新加载</Button>
        </EmptyState>
      </Card>

      <!-- 空状态 -->
      <EmptyState v-else-if="!sector" title="未找到该板块数据" />

      <!-- 板块详情 -->
      <template v-else>
        <!-- 改动1: 统计卡片 - 头部持续性标签+频次badge，4项统计含领涨股 -->
        <Card class="stats-card">
          <view class="stats-header">
            <view class="stats-title-row">
              <text class="stats-name">{{ sector.name }}</text>
              <Tag v-if="persistenceTag" :type="persistenceTagType" size="sm">{{ persistenceTag }}</Tag>
            </view>
            <Badge v-if="sector.frequency" size="sm">近120日上榜 {{ sector.frequency }} 次</Badge>
          </view>
          <StatGrid :items="sectorStatItems" :columns="4" />
        </Card>

        <!-- 板块K线（近120日，同花顺板块指数日线）；加载失败(数据为null)时整卡隐藏 -->
        <Card v-if="sector.code && (klineLoading || boardKline)" class="kline-card">
          <text class="section-title">板块K线 · 近120日</text>
          <LoadingState v-if="klineLoading" size="sm" text="正在加载K线数据..." />
          <KLineChart v-else-if="boardKline" :title="sector.name" :data="boardKline" />
        </Card>

        <!-- 涨跌家数 -->
        <view v-if="sector.up_count || sector.down_count" class="count-bar">
          <view class="count-section up">
            <text class="count-arrow">↑</text>
            <text class="count-num">{{ sector.up_count || 0 }}</text>
            <text class="count-label">上涨</text>
          </view>
          <view class="count-section down">
            <text class="count-arrow">↓</text>
            <text class="count-num">{{ sector.down_count || 0 }}</text>
            <text class="count-label">下跌</text>
          </view>
        </view>

        <!-- 改动2+5: AI 分析 + 层级流向图 SVG -->
        <view v-if="analysisRows.length || flowChartData" class="ai-card">
          <text class="section-title">AI 分析</text>

          <!-- 层级流向图 SVG -->
          <view v-if="flowChartData" class="flow-chart-box">
            <text class="flow-chart-title">层级流向图</text>
            <!-- #ifdef H5 -->
            <view v-html="flowChartSvg" class="flow-chart-svg"></view>
            <!-- #endif -->
            <!-- #ifndef H5 -->
            <view class="flow-chart-fallback">
              <text class="flow-chart-fallback-text">{{ flowChartTextSummary }}</text>
            </view>
            <!-- #endif -->
          </view>

          <!-- 传递信息（移除持续性，已移到统计卡片头部） -->
          <view v-if="analysisRows.length" class="transfer-info-box">
            <view v-for="(row, idx) in analysisRows" :key="idx" class="ai-row">
              <text class="ai-label">{{ row.label }}</text>
              <text :class="['ai-value', row.risk ? 'risk' : '']">{{ row.value }}</text>
            </view>
          </view>
        </view>

        <!-- 龙头股（前3只），改动3: 删除 leader-reason -->
        <Card v-if="topStocks.length" class="leader-detail-card">
          <text class="section-title">龙头股</text>
          <view
            v-for="(stock, idx) in topStocks.slice(0, 3)"
            :key="stock.code || idx"
            class="leader-detail-row"
            @tap="goStockDetail(stock.code)"
          >
            <view class="leader-detail-left">
              <text class="leader-detail-name">{{ stock.name }}</text>
              <text class="leader-detail-code">{{ stock.code }}</text>
              <!-- 改动4: in_concept 时行业标签红色 -->
              <Tag v-if="stock.industry" :type="stock.in_concept ? 'up' : 'neutral'" size="sm">{{ stock.industry }}</Tag>
            </view>
            <view class="leader-detail-right">
              <text v-if="stock.price !== null && stock.price !== undefined" class="leader-detail-price">
                {{ toFiniteNumber(stock.price)?.toFixed(2) }}
              </text>
              <text
                v-if="stock.change_pct !== null && stock.change_pct !== undefined"
                :class="['leader-detail-change', (stock.change_pct ?? 0) >= 0 ? 'up' : 'down']"
              >
                {{ (stock.change_pct ?? 0) >= 0 ? '+' : '' }}{{ formatPct(stock.change_pct) }}
              </text>
            </view>
          </view>
        </Card>

        <!-- 主线个股（风口精选）— Web表格样式 -->
        <Card v-if="sector.main_stocks && sector.main_stocks.length" class="stocks-card">
          <view class="stock-group-label">
            <view class="group-dot dot-main"></view>
            <text class="section-title">风口精选 ({{ sector.main_stocks.length }})</text>
          </view>
          <view class="stock-table">
            <view class="stock-thead">
              <text class="th-name">名称</text>
              <text class="th-industry">行业</text>
              <text class="th-price">价格</text>
              <text class="th-pnl">盈亏</text>
              <text class="th-reason">理由</text>
            </view>
            <view
              v-for="stock in sector.main_stocks"
              :key="stock.code"
              class="stock-trow"
              @tap="goStockDetail(stock.code)"
            >
              <text class="td-name">{{ stock.name }}</text>
              <view class="td-industry">
                <Tag v-if="stock.industry" :type="stock.in_concept ? 'up' : 'neutral'" size="sm">{{ stock.industry }}</Tag>
              </view>
              <text class="td-price">{{ stock.price != null ? toFiniteNumber(stock.price)?.toFixed(2) : '--' }}</text>
              <text :class="['td-pnl', (stock.change_pct ?? 0) > 0 ? 'pnl-up' : (stock.change_pct ?? 0) < 0 ? 'pnl-down' : 'pnl-flat']">
                {{ stock.change_pct != null ? ((stock.change_pct ?? 0) >= 0 ? '+' : '') + formatPct(stock.change_pct) : '--' }}
              </text>
              <!-- 理由列整列可点击（view 块级占满单元格，含空理由/空白区域），点击弹完整理由弹窗 -->
              <view class="td-reason" @click.stop="openStockModal(stock)">
                <text class="td-reason-text">{{ stock.reason || '--' }}</text>
              </view>
            </view>
          </view>
        </Card>

        <!-- 上游带动 — Web表格样式 -->
        <Card v-if="sector.upstream_stocks && sector.upstream_stocks.length" class="stocks-card">
          <view class="stock-group-label">
            <view class="group-dot dot-up"></view>
            <text class="section-title">上游带动 ({{ sector.upstream_stocks.length }})</text>
          </view>
          <view class="stock-table">
            <view class="stock-thead">
              <text class="th-name">名称</text>
              <text class="th-industry">行业</text>
              <text class="th-price">价格</text>
              <text class="th-pnl">盈亏</text>
              <text class="th-reason">理由</text>
            </view>
            <view
              v-for="stock in sector.upstream_stocks"
              :key="stock.code"
              class="stock-trow"
              @tap="goStockDetail(stock.code)"
            >
              <text class="td-name">{{ stock.name }}</text>
              <view class="td-industry">
                <Tag v-if="stock.industry" :type="stock.in_concept ? 'up' : 'neutral'" size="sm">{{ stock.industry }}</Tag>
              </view>
              <text class="td-price">{{ stock.price != null ? toFiniteNumber(stock.price)?.toFixed(2) : '--' }}</text>
              <text :class="['td-pnl', (stock.change_pct ?? 0) > 0 ? 'pnl-up' : (stock.change_pct ?? 0) < 0 ? 'pnl-down' : 'pnl-flat']">
                {{ stock.change_pct != null ? ((stock.change_pct ?? 0) >= 0 ? '+' : '') + formatPct(stock.change_pct) : '--' }}
              </text>
              <!-- 理由列整列可点击（view 块级占满单元格，含空理由/空白区域），点击弹完整理由弹窗 -->
              <view class="td-reason" @click.stop="openStockModal(stock)">
                <text class="td-reason-text">{{ stock.reason || '--' }}</text>
              </view>
            </view>
          </view>
        </Card>

        <!-- 下游传导 — Web表格样式 -->
        <Card v-if="sector.downstream_stocks && sector.downstream_stocks.length" class="stocks-card">
          <view class="stock-group-label">
            <view class="group-dot dot-down"></view>
            <text class="section-title">下游传导 ({{ sector.downstream_stocks.length }})</text>
          </view>
          <view class="stock-table">
            <view class="stock-thead">
              <text class="th-name">名称</text>
              <text class="th-industry">行业</text>
              <text class="th-price">价格</text>
              <text class="th-pnl">盈亏</text>
              <text class="th-reason">理由</text>
            </view>
            <view
              v-for="stock in sector.downstream_stocks"
              :key="stock.code"
              class="stock-trow"
              @tap="goStockDetail(stock.code)"
            >
              <text class="td-name">{{ stock.name }}</text>
              <view class="td-industry">
                <Tag v-if="stock.industry" :type="stock.in_concept ? 'up' : 'neutral'" size="sm">{{ stock.industry }}</Tag>
              </view>
              <text class="td-price">{{ stock.price != null ? toFiniteNumber(stock.price)?.toFixed(2) : '--' }}</text>
              <text :class="['td-pnl', (stock.change_pct ?? 0) > 0 ? 'pnl-up' : (stock.change_pct ?? 0) < 0 ? 'pnl-down' : 'pnl-flat']">
                {{ stock.change_pct != null ? ((stock.change_pct ?? 0) >= 0 ? '+' : '') + formatPct(stock.change_pct) : '--' }}
              </text>
              <!-- 理由列整列可点击（view 块级占满单元格，含空理由/空白区域），点击弹完整理由弹窗 -->
              <view class="td-reason" @click.stop="openStockModal(stock)">
                <text class="td-reason-text">{{ stock.reason || '--' }}</text>
              </view>
            </view>
          </view>
        </Card>
      </template>

      <!-- 理由详情弹窗：点击表格"理由"列（单行截断）查看完整理由 -->
      <Modal v-model:visible="modalVisible" :title="modalStock?.name || '个股详情'" width="640rpx">
        <view v-if="modalStock" class="stock-detail-modal">
          <view class="modal-row">
            <text class="modal-label">名称</text>
            <view class="modal-value">
              <text class="modal-stock-name">{{ modalStock.name }}</text>
              <text v-if="modalStock.code" class="modal-code">{{ modalStock.code }}</text>
            </view>
          </view>
          <view class="modal-row">
            <text class="modal-label">行业</text>
            <view class="modal-value">
              <Tag v-if="modalStock.industry" :type="modalStock.in_concept ? 'up' : 'neutral'" size="sm">{{ modalStock.industry }}</Tag>
              <text v-else class="modal-placeholder">--</text>
            </view>
          </view>
          <view class="modal-row">
            <text class="modal-label">价格</text>
            <view class="modal-value">
              <text v-if="modalStock.price != null" class="modal-price">{{ toFiniteNumber(modalStock.price)?.toFixed(2) }}</text>
              <text v-else class="modal-placeholder">--</text>
              <text
                v-if="modalStock.change_pct != null"
                :class="['modal-change', (modalStock.change_pct ?? 0) >= 0 ? 'up' : 'down']"
              >
                {{ (modalStock.change_pct ?? 0) >= 0 ? '+' : '' }}{{ formatPct(modalStock.change_pct) }}
              </text>
            </view>
          </view>
          <view class="modal-row modal-reason-row">
            <text class="modal-label">理由</text>
            <text class="modal-reason">{{ modalStock.reason || '--' }}</text>
          </view>
        </view>
      </Modal>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import type { WindLeaderSector, WindLeaderAiAnalysis, WindLeaderFlowData, WindLeaderStock } from '@/shared/api/modules/stock'
import type { TrendKLineData } from '@/shared/api/modules/trend-score'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Tag, Badge, Button, Card, StatGrid, Modal, KLineChart } from '@/shared/components'
import type { StatGridItem } from '@/shared/components'

const loading = ref(false)
const errorMessage = ref('')
const sector = ref<WindLeaderSector | null>(null)
const sectorName = ref('')

/** 板块 K 线（近120日） */
const boardKline = ref<TrendKLineData | null>(null)
const klineLoading = ref(false)

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function formatPct(value: unknown): string {
  const num = toFiniteNumber(value)
  if (num === null) return '--'
  return num.toFixed(2) + '%'
}

function formatNetInflow(value: unknown): string {
  const num = toFiniteNumber(value)
  if (num === null) return '--'
  if (Math.abs(num) >= 10000) return (num / 10000).toFixed(2) + '亿'
  return Math.round(num) + '万'
}

// 改动1: 持续性标签提取到统计卡片头部（只显示"短期"/"中期"/"长期"）
const persistenceTag = computed(() => {
  if (!sector.value?.ai_analysis) return ''
  const ai = sector.value.ai_analysis
  if (typeof ai === 'string') return ''
  const raw = (ai as WindLeaderAiAnalysis).persistence || ''
  if (raw.includes('长期')) return '长期'
  if (raw.includes('中期')) return '中期'
  if (raw.includes('短期')) return '短期'
  return raw
})

const persistenceClass = computed(() => {
  const tag = persistenceTag.value
  if (tag.includes('长期')) return 'long-term'
  if (tag.includes('中期')) return 'mid-term'
  if (tag.includes('短期')) return 'short-term'
  return ''
})

const persistenceTagType = computed<'down' | 'neutral' | 'warning'>(() => {
  const tag = persistenceTag.value
  if (tag.includes('长期')) return 'down'
  if (tag.includes('中期')) return 'neutral'
  if (tag.includes('短期')) return 'warning'
  return 'neutral'
})

const sectorStatItems = computed<StatGridItem[]>(() => {
  if (!sector.value) return []
  const s = sector.value
  const todayChange = s.today_change ?? 0
  const avgChange = s.avg_change ?? 0
  return [
    { label: '今日涨幅', value: (todayChange >= 0 ? '+' : '') + formatPct(s.today_change), color: todayChange >= 0 ? 'up' : 'down' },
    { label: '均涨幅', value: (avgChange >= 0 ? '+' : '') + formatPct(s.avg_change), color: avgChange >= 0 ? 'up' : 'down' },
    { label: '净流入', value: formatNetInflow(s.net_inflow) },
    { label: '领涨股', value: s.leading_stock || s.leading_stock_info?.name || '--' },
  ]
})

interface AnalysisRow {
  label: string
  value: string
  risk: boolean
}

// 改动2: 移除持续性行（已移到头部），保留剩余4项
const analysisRows = computed<AnalysisRow[]>(() => {
  if (!sector.value?.ai_analysis) return []
  const ai = sector.value.ai_analysis
  if (typeof ai === 'string') {
    return [{ label: '分析', value: ai, risk: false }]
  }
  const rows: AnalysisRow[] = []
  const obj = ai as WindLeaderAiAnalysis
  if (obj.persistence_reason) rows.push({ label: '持续原因', value: obj.persistence_reason, risk: false })
  if (obj.transfer_direction) rows.push({ label: '传递方向', value: obj.transfer_direction, risk: false })
  if (obj.transfer_reason) rows.push({ label: '传递判断', value: obj.transfer_reason, risk: false })
  if (obj.risk_warning) rows.push({ label: '风险提示', value: obj.risk_warning, risk: true })
  return rows
})

const topStocks = computed<WindLeaderStock[]>(() => {
  if (!sector.value) return []
  const s = sector.value
  const seen = new Set<string>()
  const stocks: WindLeaderStock[] = []
  if (s.leading_stock_info?.code) {
    stocks.push(s.leading_stock_info)
    seen.add(s.leading_stock_info.code)
  }
  if (s.main_stocks) {
    for (const st of s.main_stocks) {
      if (st?.code && !seen.has(st.code)) {
        stocks.push(st)
        seen.add(st.code)
      }
    }
  }
  return stocks
})

// ===== 改动5: 层级流向图 SVG 渲染 =====
const flowChartData = computed<WindLeaderFlowData | null>(() => {
  return sector.value?.flow_data ?? null
})

// 非 H5 端的文本摘要
const flowChartTextSummary = computed(() => {
  if (!flowChartData.value) return ''
  const data = flowChartData.value
  const main = data.nodes.find(n => n.type === 'main')
  const upstream = data.nodes.filter(n => n.type === 'upstream')
  const downstream = data.nodes.filter(n => n.type === 'downstream')
  const related = data.nodes.filter(n => n.type === 'related')
  let parts: string[] = []
  if (related.length) parts.push(`关联行业: ${related.map(n => n.label).join('、')}`)
  if (upstream.length) parts.push(`上游: ${upstream.map(n => n.label).join('、')}`)
  if (downstream.length) parts.push(`下游: ${downstream.map(n => n.label).join('、')}`)
  return parts.join(' | ')
})

// H5 端 SVG 渲染 — 完全对齐 Web 前端 WindLeaderPanel D3.js 实现
const flowChartSvg = computed(() => {
  if (!flowChartData.value) return ''
  const data = flowChartData.value
  const nodes = data.nodes
  const links = data.links
  if (!nodes.length) return ''

  // 清理标签（移除"(A股)"后缀）
  const cleanLabel = (label: string) => label.replace(/\(A股\)$/, '')

  // 节点宽度计算（与 Web 前端一致：charW=11, padding=12）
  const nodeH = 20
  const charW = 11
  const padding = 12
  const nodeWidths: Record<string, number> = {}
  nodes.forEach(n => {
    const cl = cleanLabel(n.label)
    nodeWidths[n.id] = cl.length * charW + padding
  })
  const nw = (id: string) => nodeWidths[id] || 56

  const mainNode = nodes.find(n => n.type === 'main')
  const relatedNodes = nodes.filter(n => n.type === 'related')
  const upstreamNodes = nodes.filter(n => n.type === 'upstream')
  const downstreamNodes = nodes.filter(n => n.type === 'downstream')
  // 行业板块无 related 节点（主节点直接连上下游），以主节点为枢纽
  const hasRelated = relatedNodes.length > 0

  // 布局算法（与 Web 前端 D3.js 完全一致）
  const W = 320
  const cx = W / 2
  const positions: Record<string, { x: number; y: number }> = {}

  // 分组：每个枢纽节点（related 或主节点）关联的 upstream/downstream
  const upGroups: Record<string, any[]> = {}
  const downGroups: Record<string, any[]> = {}
  const hubIds = hasRelated ? relatedNodes.map(n => n.id) : [mainNode?.id].filter(Boolean) as string[]
  hubIds.forEach(id => { upGroups[id] = []; downGroups[id] = [] })
  links.forEach(link => {
    if (link.direction === 'upstream') {
      const hub = hasRelated ? relatedNodes.find(n => n.id === link.target) : (mainNode && link.target === mainNode.id ? mainNode : null)
      const un = upstreamNodes.find(n => n.id === link.source)
      if (hub && un && !upGroups[hub.id].includes(un)) upGroups[hub.id].push(un)
    } else if (link.direction === 'downstream') {
      const hub = hasRelated ? relatedNodes.find(n => n.id === link.source) : (mainNode && link.source === mainNode.id ? mainNode : null)
      const dn = downstreamNodes.find(n => n.id === link.target)
      if (hub && dn && !downGroups[hub.id].includes(dn)) downGroups[hub.id].push(dn)
    }
  })

  const nodeGap = 22
  const groupGap = 12
  const relatedSlots = hubIds.map(id =>
    Math.max((upGroups[id] || []).length, (downGroups[id] || []).length, 1)
  )
  const groupHeights = relatedSlots.map(s => s * nodeGap)
  const topY = 16

  if (mainNode) {
    positions[mainNode.id] = { x: cx, y: topY }
  }

  let curY = topY + nodeH / 2 + 14
  hubIds.forEach((id, i) => {
    const slotH = groupHeights[i]
    const centerY = curY + slotH / 2
    if (!hasRelated && mainNode && id === mainNode.id) {
      // 行业板块：主节点保持在顶部，上下游从主节点下方居中排列
      positions[id] = { x: cx, y: topY }
      curY = topY + nodeH + 14
    } else {
      positions[id] = { x: cx, y: centerY }
    }
    ;(upGroups[id] || []).forEach((un, j) => {
      positions[un.id] = {
        x: W * 0.20,
        y: curY + (j - (upGroups[id].length - 1) / 2) * nodeGap,
      }
    })
    ;(downGroups[id] || []).forEach((dn, j) => {
      positions[dn.id] = {
        x: W * 0.80,
        y: curY + (j - (downGroups[id].length - 1) / 2) * nodeGap,
      }
    })
    curY += slotH + groupGap
  })

  // 计算 SVG 高度
  const allY = Object.values(positions).map(p => p.y)
  const contentBottom = allY.length ? Math.max(...allY) + nodeH / 2 + 8 : 80
  const svgH = Math.max(contentBottom, 80)

  // 节点颜色（与 Web 前端完全一致）
  const nodeStyle: Record<string, { fill: string; stroke: string }> = {
    main: { fill: '#dbeafe', stroke: '#2563eb' },
    related: { fill: '#ede9fe', stroke: '#7c3aed' },
    upstream: { fill: '#fffbeb', stroke: '#d97706' },
    downstream: { fill: '#f0fdf4', stroke: '#16a34a' },
  }

  // 连线颜色和箭头（与 Web 前端一致）
  const linkColors: Record<string, string> = {
    related: '#94a3b8',
    upstream: '#d97706',
    downstream: '#16a34a',
  }

  let svg = `<svg viewBox="0 0 ${W} ${svgH}" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">`

  // 定义箭头标记（与 Web 前端一致：viewBox 0 0 10 7, refX=10, refY=3.5）
  svg += `<defs>`
  svg += `<marker id="arrow-flow-related" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="6" markerHeight="4" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${linkColors.related}"/></marker>`
  svg += `<marker id="arrow-flow-upstream" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="6" markerHeight="4" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${linkColors.upstream}"/></marker>`
  svg += `<marker id="arrow-flow-downstream" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="6" markerHeight="4" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${linkColors.downstream}"/></marker>`
  svg += `</defs>`

  // 绘制连线（与 Web 前端 D3.js 完全一致）
  for (const link of links) {
    const source = positions[link.source]
    const target = positions[link.target]
    if (!source || !target) continue

    let sx: number, sy: number, tx: number, ty: number
    if (link.direction === 'upstream' || link.direction === 'downstream') {
      sx = source.x + nw(link.source) / 2
      sy = source.y
      tx = target.x - nw(link.target) / 2
      ty = target.y
    } else {
      sx = source.x
      sy = source.y + nodeH / 2
      tx = target.x
      ty = target.y - nodeH / 2
    }

    const color = linkColors[link.direction] || '#94a3b8'
    const arrowId = `arrow-flow-${link.direction}`
    const strokeWidth = 1 + (link.factor || 0.5) * 1.2

    let path: string
    if (link.direction === 'related') {
      path = `M${sx},${sy} L${tx},${ty}`
    } else {
      const midX = (sx + tx) / 2
      path = `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`
    }

    svg += `<path d="${path}" stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" fill="none" stroke-opacity="0.4" marker-end="url(#${arrowId})"/>`

    // 上游/下游连线显示传导因子标签
    if (link.direction !== 'related') {
      const labelX = (sx + tx) / 2
      const labelY = (sy + ty) / 2 - 3
      svg += `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" font-size="9" fill="#9ca3af" text-anchor="middle">${(link.factor || 0).toFixed(2)}</text>`
    }
  }

  // 绘制节点（矩形，与 Web 前端一致）
  for (const node of nodes) {
    const pos = positions[node.id]
    if (!pos) continue
    const style = nodeStyle[node.type] || { fill: '#f3f4f6', stroke: '#9ca3af' }
    const isMain = node.type === 'main'
    const w = nw(node.id) + (isMain ? 8 : 0)
    const h = isMain ? nodeH + 4 : nodeH
    const label = cleanLabel(node.label)

    svg += `<rect x="${(pos.x - w / 2).toFixed(1)}" y="${(pos.y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" fill="${style.fill}" stroke="${style.stroke}" rx="4" ry="4" stroke-width="1.5"/>`
    svg += `<text x="${pos.x.toFixed(1)}" y="${(pos.y + 1).toFixed(1)}" font-size="11" fill="#1f2937" text-anchor="middle" dominant-baseline="central" font-weight="600">${label}</text>`
  }

  svg += `</svg>`
  return svg
})

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

// ===== 理由详情弹窗：理由列单行截断，点击查看完整信息（名称/行业/价格/理由） =====
const modalVisible = ref(false)
const modalStock = ref<WindLeaderStock | null>(null)

function openStockModal(stock: WindLeaderStock) {
  modalStock.value = stock
  modalVisible.value = true
}

async function loadData() {
  if (!sectorName.value) {
    errorMessage.value = '缺少板块名称参数'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const res: any = await stockApi.getWindLeaders(40)
    const data = res?.data ?? res
    const sectors: WindLeaderSector[] = data?.hot_sectors ?? []
    const found = sectors.find(s => s.name === sectorName.value)
      || sectors.find(s => s.name?.includes(sectorName.value) || sectorName.value.includes(s.name || ''))
      || null
    sector.value = found
    // 板块 K 线（按需拉取，失败返回 null → 卡片隐藏）
    boardKline.value = null
    if (found?.code) {
      klineLoading.value = true
      void stockApi.getBoardKline(found.code, 120).then((data) => {
        boardKline.value = data
        klineLoading.value = false
      })
    }
    if (!found) {
      errorMessage.value = '未找到该板块数据'
    }
  } catch (error) {
    console.error('板块详情数据加载失败:', error)
    errorMessage.value = '板块数据加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  const name = options?.name || options?.sector || ''
  sectorName.value = decodeURIComponent(name)
  loadData()
})
</script>

<style lang="scss" scoped>
.sector-detail-content {
  padding: 24rpx;
}

/* ===== 统计卡片（Card 提供 bg/border/shadow，仅保留间距） ===== */
.stats-card {
  margin-bottom: 20rpx;
}

/* ===== 板块K线卡片（Card 提供 bg/border/shadow，仅保留间距） ===== */
.kline-card {
  margin-bottom: 20rpx;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.stats-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.stats-name {
  font-size: 36rpx;
  font-weight: 600;
  color: $ink;
}

/* ===== 涨跌家数 ===== */
.count-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.count-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx;
  border-radius: 12rpx;

  &.up { background: rgba(244, 63, 94, 0.08); }
  &.down { background: rgba(34, 197, 94, 0.08); }
}

.count-arrow {
  font-size: 28rpx;
  font-weight: 600;
}

.count-section.up .count-arrow { color: #f43f5e; }
.count-section.down .count-arrow { color: #22c55e; }

.count-num {
  font-size: 32rpx;
  font-weight: 600;
  color: $ink;
}

.count-label {
  font-size: 22rpx;
  color: $ink-soft;
}

/* ===== 龙头股（Card 提供 bg/border/shadow，仅保留间距） ===== */
.leader-detail-card {
  margin-bottom: 20rpx;
}

.leader-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.08), rgba(77, 124, 254, 0.03));
  border: 1rpx solid rgba(77, 124, 254, 0.15);
  border-radius: 12rpx;
  margin-bottom: 12rpx;

  &:last-child { margin-bottom: 0; }
  &:active { transform: scale(0.98); }
}

.leader-detail-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.leader-detail-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.leader-detail-code {
  font-size: 20rpx;
  color: $ink-soft;
  background: #f0f2f5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.leader-detail-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.leader-detail-price {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.leader-detail-change {
  font-size: 26rpx;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* ===== AI 分析卡片 ===== */
.ai-card {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: $shadow-sm;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 16rpx;
  display: block;
}

/* 层级流向图 */
.flow-chart-box {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #f8f9fb;
  border-radius: 16rpx;
  border: 1rpx solid #e8ecf1;
}

.flow-chart-title {
  font-size: 24rpx;
  color: $ink-soft;
  margin-bottom: 12rpx;
  display: block;
  text-align: center;
}

.flow-chart-svg {
  display: flex;
  justify-content: center;

  :deep(svg) {
    max-width: 100%;
    height: auto;
  }
}

.flow-chart-fallback {
  padding: 16rpx;
  background: #f0f2f5;
  border-radius: 12rpx;
}

.flow-chart-fallback-text {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.6;
}

/* 传递信息（对齐 Web 前端 hs-transfer-info） */
.transfer-info-box {
  background: #f8fafc;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
}

.ai-row {
  display: flex;
  gap: 8rpx;
  margin-bottom: 12rpx;
  line-height: 1.5;

  &:last-child { margin-bottom: 0; }
}

.ai-label {
  font-size: 24rpx;
  color: #2563eb;
  font-weight: 600;
  flex-shrink: 0;
  width: 120rpx;
}

.ai-value {
  font-size: 24rpx;
  color: $ink-soft;
  flex: 1;

  &.risk {
    color: #dc2626;
    background: #fef2f2;
    padding: 2rpx 10rpx;
    border-radius: 4rpx;
    display: inline-block;
  }
}

/* ===== 个股列表（Card 提供 bg/border/shadow，仅保留间距） ===== */
.stocks-card {
  margin-bottom: 20rpx;
}

/* 分组标题（带圆点） */
.stock-group-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
  padding-bottom: 8rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.group-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  flex-shrink: 0;

  &.dot-main { background: #dc2626; }
  &.dot-up { background: #d97706; }
  &.dot-down { background: #16a34a; }
}

/* 表格 */
.stock-table {
  width: 100%;
}

.stock-thead {
  display: grid;
  grid-template-columns: 1.2fr 1.5fr 1fr 1fr 2fr;
  gap: 8rpx;
  padding: 8rpx 4rpx;
  color: #9ca3af;
  font-size: 20rpx;
  font-weight: 500;
  border-bottom: 1rpx solid #f0f2f5;
}

.stock-trow {
  display: grid;
  grid-template-columns: 1.2fr 1.5fr 1fr 1fr 2fr;
  gap: 8rpx;
  padding: 12rpx 4rpx;
  border-bottom: 1rpx solid #f8f8f8;
  font-size: 22rpx;
  align-items: center;

  &:active { background: #f9fafb; }
}

.td-name {
  color: #111827;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-industry {
  display: flex;
  align-items: center;
  gap: 4rpx;
  overflow: hidden;
}

.th-price, .td-price {
  text-align: right;
}

.td-price {
  color: $ink;
  font-weight: 500;
}

.th-pnl, .td-pnl {
  text-align: center;
}

.td-pnl {
  font-weight: 500;

  &.pnl-up { color: #dc2626; }
  &.pnl-down { color: #16a34a; }
  &.pnl-flat { color: #9ca3af; }
}

/* 理由列：整列可点击（view 块级占满单元格，含空理由/空白区域），点击弹出完整理由弹窗 */
.td-reason {
  min-width: 0;
  color: $ink-soft;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  min-height: 32rpx;
  transition: background $t-fast;

  &:active {
    background: $bg-soft;
  }
}

.td-reason-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 理由详情弹窗 ===== */
.stock-detail-modal {
  display: flex;
  flex-direction: column;
}

.modal-row {
  display: flex;
  align-items: flex-start;
  padding: 16rpx 0;
  border-bottom: 2rpx solid $line-soft;

  &:last-child {
    border-bottom: 0;
  }
}

.modal-label {
  flex-shrink: 0;
  width: 96rpx;
  font-size: $font-size-sm;
  color: $ink-mute;
  line-height: 1.5;
}

.modal-value {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.modal-stock-name {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink;
}

.modal-code {
  font-size: $font-size-xs;
  color: $ink-mute;
  background: $bg-soft;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}

.modal-price {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink;
  font-family: $font-mono;
}

.modal-change {
  font-size: $font-size-xs;
  font-weight: 600;
  font-family: $font-mono;

  &.up { color: #dc2626; }
  &.down { color: #16a34a; }
}

.modal-placeholder {
  font-size: $font-size-sm;
  color: $ink-mute;
}

/* 理由为重点展示：完整换行显示 */
.modal-reason-row {
  align-items: flex-start;
}

.modal-reason {
  flex: 1;
  font-size: $font-size-sm;
  color: $ink;
  line-height: 1.6;
  word-break: break-all;
}
</style>
