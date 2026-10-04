/**
 * 洞察详情导航：按事件类型分流到详情页
 * 涨停雷达（limit_up_radar）→ insight-detail（原始来源）
 * 价格异动（midday/close price_move / stocktrace mv）→ insight-detail-move（stocktrace 五层归因）
 * 供列表页/监控页/提醒组件统一调用，避免跳转逻辑在三处漂移。
 */
export function navigateToInsightDetail(
  eventId: string,
  eventType?: string,
  query?: Record<string, string>,
): void {
  const extra = query
    ? Object.entries(query).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('')
    : ''
  const page = eventType === 'limit_up_radar' ? 'insight-detail' : 'insight-detail-move'
  uni.navigateTo({
    url: `/modules/favorites/pages/${page}?event_id=${encodeURIComponent(eventId)}${extra}`,
  })
}
