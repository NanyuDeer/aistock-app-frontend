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
  THEME: 'theme'
} as const
