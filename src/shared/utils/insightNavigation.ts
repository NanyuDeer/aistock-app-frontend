/**
 * 洞察详情导航：按事件类型分流到独立详情页
 * 涨停雷达（limit_up_radar）→ insight-detail（原始来源）
 * 价格异动（midday/close price_move）→ movement-detail（stocktrace 完整链路）
 * 供列表页/监控页/提醒组件统一调用，避免跳转逻辑在三处漂移。
 */
export function navigateToInsightDetail(eventId: string, eventType?: string): void {
  // 涨停雷达保持 insight-detail；价格异动改道 movement-detail（2026-08-15 迁移）
  if (eventType === 'limit_up_radar') {
    uni.navigateTo({ url: `/modules/favorites/pages/insight-detail?event_id=${encodeURIComponent(eventId)}` })
  } else {
    uni.navigateTo({ url: `/modules/favorites/pages/movement-detail?event_id=${encodeURIComponent(eventId)}` })
  }
}