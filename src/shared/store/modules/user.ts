/**
 * 用户状态管理
 * 登录方式：微信扫码（H5）、微信 SDK（App/小程序）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type UserInfo, type UserSettings } from '@/shared/api/modules/auth'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(storage.get(STORAGE_KEYS.TOKEN) || '')
  const userInfo = ref<UserInfo | null>(storage.get(STORAGE_KEYS.USER_INFO))
  const settings = ref<UserSettings>({})

  const isLoggedIn = () => !!token.value

  /** 账号密码登录（保留兼容） */
  async function login(params: { username?: string; password?: string; code?: string }) {
    const result: any = await authApi.login(params)
    token.value = result.token
    storage.set(STORAGE_KEYS.TOKEN, result.token)
    await fetchUserInfo()
  }

  /** 微信登录（小程序） */
  async function wxLogin(code: string) {
    const result: any = await authApi.wxLogin(code)
    token.value = result.token
    storage.set(STORAGE_KEYS.TOKEN, result.token)
    await fetchUserInfo()
  }

  /** 扫码登录成功后，验证登录态并获取用户信息 */
  async function handleScanLoginSuccess() {
    try {
      await fetchUserInfo()
      return true
    } catch (e) {
      console.error('[user] scan login verify failed:', e)
      return false
    }
  }

  async function fetchUserInfo() {
    try {
      const info = await authApi.getUserInfo()
      userInfo.value = info
      storage.set(STORAGE_KEYS.USER_INFO, info)
    } catch (e) {
      console.error('[user] fetchUserInfo failed:', e)
    }
  }

  /** 获取用户推送设置 */
  async function fetchSettings() {
    if (!isLoggedIn()) return
    try {
      const s = await authApi.getSettings()
      settings.value = s || {}
    } catch (e) {
      console.error('[user] fetchSettings failed:', e)
    }
  }

  /** 更新单个推送设置 */
  async function updateSetting(key: keyof UserSettings, enabled: boolean) {
    try {
      await authApi.updateSettings(key, { enabled })
      settings.value[key] = enabled
    } catch (e) {
      console.error('[user] updateSetting failed:', e)
      uni.showToast({ title: '设置更新失败', icon: 'none' })
    }
  }

  function logout() {
    authApi.logout().catch(() => {})
    token.value = ''
    userInfo.value = null
    settings.value = {}
    storage.remove(STORAGE_KEYS.TOKEN)
    storage.remove(STORAGE_KEYS.USER_INFO)
  }

  return {
    token,
    userInfo,
    settings,
    isLoggedIn,
    login,
    wxLogin,
    handleScanLoginSuccess,
    fetchUserInfo,
    fetchSettings,
    updateSetting,
    logout
  }
})
