/**
 * shared/components/index.ts
 * 统一导出所有共享组件，方便新页面按需引用
 *
 * 用法示例：
 *   import { Card, Button, Tag } from '@/shared/components'
 *
 * 注意：以下组件保留在各自文件中使用，不在 barrel 中导出：
 *   - AppBottomBar / MainTabs / PageCard / SubPageCard / SubPageCard2 / GlobalChatBar
 *     （Wrapper 组件，含业务逻辑，按原有路径引用）
 *   - SvgIcon（app 前端有独立实现，不通过 barrel 导出）
 *   - TheNavbar / TheFooter（旧名称兼容，新页面用 NavBar / Footer）
 */

// ===== 基础 UI 组件 =====
export { default as Avatar } from './Avatar.vue'
export { default as Button } from './Button.vue'
export { default as Card } from './Card.vue'
export { default as Input } from './Input.vue'
export { default as Switch } from './Switch.vue'
export { default as Tag } from './Tag.vue'
export { default as Badge } from './Badge.vue'
export { default as Rate } from './Rate.vue'
export { default as Progress } from './Progress.vue'
export { default as Steps } from './Steps.vue'
export { default as Segmented } from './Segmented.vue'
export { default as Collapse } from './Collapse.vue'
export { default as Skeleton } from './Skeleton.vue'
export { default as LoadingState } from './LoadingState.vue'
export { default as EmptyState } from './EmptyState.vue'

// ===== 反馈类组件 =====
export { default as Toast } from './Toast.vue'
export { default as Modal } from './Modal.vue'
export { default as ConfirmModal } from './ConfirmModal.vue'
export { default as ActionSheet } from './ActionSheet.vue'
export { default as BottomSheet } from './BottomSheet.vue'

// ===== 布局与导航 =====
export { default as NavBar } from './TheNavbar.vue'
export { default as Footer } from './TheFooter.vue'
export { default as ListCell } from './ListCell.vue'

// ===== 业务专用 =====
export { default as StockItem } from './StockItem.vue'
export { default as StatCard } from './StatCard.vue'
export { default as IndexCard } from './IndexCard.vue'
export { default as QuoteHeader } from './QuoteHeader.vue'
export { default as DataTable } from './DataTable.vue'
export { default as Timeline } from './Timeline.vue'
export { default as ChatBubble } from './ChatBubble.vue'
export { default as StreamingText } from './StreamingText.vue'
export { default as AudioPlayer } from './AudioPlayer.vue'
export { default as PodcastCard } from './PodcastCard.vue'
export { default as FloatingPodcast } from './FloatingPodcast.vue'
export { default as UpdateModal } from './UpdateModal.vue'
export { default as InsightListCard } from './InsightListCard.vue'
export { default as GuideCard } from './GuideCard.vue'
export { default as StatGrid } from './StatGrid.vue'

/**
 * InsightListItem 类型定义
 * 注意：不能从 .vue 文件 re-export type（TypeScript 的 *.vue shim 不支持命名导出），
 * 因此在此处直接定义，与 InsightListCard.vue 内部的 interface 保持结构一致。
 */
export interface InsightListItem {
  name: string
  tag?: string
  score?: string
  trend?: string
  trendType?: 'up' | 'down'
}

/**
 * StatGridItem 类型定义
 * 注意：不能从 .vue 文件 re-export type（TypeScript 的 *.vue shim 不支持命名导出），
 * 因此在此处直接定义，与 StatGrid.vue 内部的 interface 保持结构一致。
 */
export interface StatGridItem {
  label: string
  value: string | number
  unit?: string
  color?: 'brand' | 'up' | 'down' | 'warning'
  subtitle?: string
}

// ===== 图表与可视化 =====
export { default as Sparkline } from './Sparkline.vue'
export { default as Gauge } from './Gauge.vue'
export { default as RadarChart } from './RadarChart.vue'
export { default as RelationGraph } from './RelationGraph.vue'
export { default as KLineChart } from './KLineChart.vue'
