import type { StockTraceEvent } from '@/shared/api/modules/stockTrace'

export function formatStockTraceCause(event: StockTraceEvent): { text: string; label?: string } | undefined {
  const view = event.movement_view
  if (view?.status === 'insufficient') return { text: '暂无明确异动原因', label: '证据不足' }
  const cause = event.primary_cause || view?.primaryCandidate?.verdict
  if (!cause) return undefined
  if (view?.status === 'confirmed') return { text: cause, label: '主因' }
  if (view?.status === 'hypothesis') {
    const layer = view.primaryCandidate?.layer
    const label = layer === 'market' ? '大盘联动' : layer === 'sector' ? '板块联动' : '归因线索'
    return { text: cause, label }
  }
  return { text: cause }
}
