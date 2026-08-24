/**
 * 洞察详情导航：按事件类型分流到详情页
 * 涨停雷达（limit_up_radar）→ insight-detail（原始来源）
 * 价格异动（midday/close price_move / stocktrace mv）→ insight-detail-move（stocktrace 五层归因）
 * 供列表页/监控页/提醒组件统一调用，避免跳转逻辑在三处漂移。
 */
export function navigateToInsightDetail(eventId: string, eventType?: string): void {
  // 涨停雷达走 insight-detail；价格异动走 insight-detail-move（2026-08-15 迁移 stocktrace 链路后数据源已切换）
  if (eventType === 'limit_up_radar') {
    uni.navigateTo({ url: `/modules/favorites/pages/insight-detail?event_id=${encodeURIComponent(eventId)}` })
  } else {
    uni.navigateTo({ url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent(eventId)}` })
  }
}
