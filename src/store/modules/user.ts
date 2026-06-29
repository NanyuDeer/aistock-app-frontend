/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type UserInfo } from '@/api/modules/auth'
import { storage, STORAGE_KEYS } from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(storage.get(STORAGE_KEYS.TOKEN) || '')
  const userInfo = ref<UserInfo | null>(storage.get(STORAGE_KEYS.USER_INFO))

  const isLoggedIn = () => !!token.value

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

  async function fetchUserInfo() {
    try {
      const info = await authApi.getUserInfo()
      userInfo.value = info
      storage.set(STORAGE_KEYS.USER_INFO, info)
    } catch (e) {
      console.error('[user] fetchUserInfo failed:', e)
    }
  }

  function logout() {
    authApi.logout().catch(() => {})
    token.value = ''
    userInfo.value = null
    storage.remove(STORAGE_KEYS.TOKEN)
    storage.remove(STORAGE_KEYS.USER_INFO)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    wxLogin,
    fetchUserInfo,
    logout
  }
})
