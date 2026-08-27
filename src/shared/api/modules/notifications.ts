import request from '../request'

export type NotificationCategory = 'price_movement' | 'insight' | 'stock_info' | 'forecast' | 'performance_report'

export interface UserNotification {
  id: string
  category: NotificationCategory
  symbol: string | null
  stockName: string | null
  title: string
  summary: string
  targetPath: string
  payload: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export interface NotificationPage {
  items: UserNotification[]
  nextCursor: string | null
  unreadCount: number
}

export const notificationApi = {
  list(params: { limit?: number; cursor?: string } = {}) {
    return request.get<NotificationPage>('/users/me/notifications', { params })
  },
  markRead(ids: string[]) {
    return request.post<{ ids: string[] }>('/users/me/notifications/read', { ids })
  }
}
