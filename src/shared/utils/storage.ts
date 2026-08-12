/**
 * 本地存储工具 - 封装 uni.setStorageSync，提供类型安全的 API
 */
export const storage = {
  get<T = any>(key: string): T | null {
    try {
      const value = uni.getStorageSync(key)
      return value === '' ? null : (value as T)
    } catch {
      return null
    }
  },

  set(key: string, value: any): void {
    try {
      uni.setStorageSync(key, value)
    } catch (e) {
      console.error('[storage] set failed:', key, e)
    }
  },

  remove(key: string): void {
    try {
      uni.removeStorageSync(key)
    } catch (e) {
      console.error('[storage] remove failed:', key, e)
    }
  },

  clear(): void {
    try {
      uni.clearStorageSync()
    } catch (e) {
      console.error('[storage] clear failed:', e)
    }
  }
}

// 存储键名常量
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_INFO: 'user_info',
  FAVORITES: 'favorites',
  APP_CONFIG: 'app_config',
  CHAT_HISTORY: 'chat_history',
  // P5-fix（问题 14）：对话 session_id 持久化（刷新后多轮上下文不丢）
  CHAT_SESSION_ID: 'chat_session_id',
  // P9 会话管理：会话元数据列表镜像 + 按会话分桶的消息
  CHAT_SESSIONS: 'chat_sessions',
  CHAT_HISTORY_BY_SESSION: 'chat_history_by_session',
  // P11 T2：会话维度 token 本地累加（key=session_id → TokenUsage）
  CHAT_SESSION_USAGE: 'chat_session_usage',
  // Phase 4-2 Task 3：消息赞/踩反馈记录（key=message_id → ChatFeedbackRecord，v1 纯前端本地不落库）
  CHAT_FEEDBACK: 'chat_feedback',
  THEME: 'theme',
  // 播报连续播放开关（持久化；true=连续排队，false/缺省=互斥）
  PODCAST_CONTINUOUS: 'podcast_continuous'
} as const
