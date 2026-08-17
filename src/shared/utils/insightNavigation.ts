/**
 * 洞察详情导航：按事件类型分流到独立详情页
 * 涨停雷达（limit_up_radar）→ insight-detail（原始来源）
 * 价格异动（midday/close price_move）→ insight-detail-move（事件原因时间线）
 * 供列表页/监控页/提醒组件统一调用，避免跳转逻辑在三处漂移。
 */
export function navigateToInsightDetail(eventId: string, eventType?: string): void {
  const page = eventType === 'limit_up_radar' ? 'insight-detail' : 'insight-detail-move'
  uni.navigateTo({ url: `/modules/favorites/pages/${page}?event_id=${encodeURIComponent(eventId)}` })
}
