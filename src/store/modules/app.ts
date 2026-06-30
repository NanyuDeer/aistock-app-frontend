/**
 * 全局应用配置状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage, STORAGE_KEYS } from '@/utils/storage'

export interface AppConfig {
  /** 是否开启异动推送 */
  pushEnabled: boolean
  /** 是否开启盘中提醒 */
  alertEnabled: boolean
  /** 首次启动标记 */
  firstLaunch: boolean
  /** 主题（预留） */
  theme: 'light'
}

const DEFAULT_CONFIG: AppConfig = {
  pushEnabled: true,
  alertEnabled: true,
  firstLaunch: true,
  theme: 'light'
}

export const useAppStore = defineStore('app', () => {
  const config = ref<AppConfig>(storage.get<AppConfig>(STORAGE_KEYS.APP_CONFIG) || { ...DEFAULT_CONFIG })

  function update(patch: Partial<AppConfig>) {
    config.value = { ...config.value, ...patch }
    storage.set(STORAGE_KEYS.APP_CONFIG, config.value)
  }

  /** 标记已完成首次启动引导 */
  function markLaunched() {
    if (config.value.firstLaunch) {
      update({ firstLaunch: false })
    }
  }

  return {
    config,
    update,
    markLaunched
  }
})
