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

  const isLoggedIn = () => !!token.value || !!userInfo.value?.id

  function clearSession() {
    token.value = ''
    userInfo.value = null
    settings.value = {}
    storage.remove(STORAGE_KEYS.TOKEN)
    storage.remove(STORAGE_KEYS.USER_INFO)
    storage.remove(STORAGE_KEYS.FAVORITES)
  }

  /** 账号密码登录（保留兼容） */
  async function login(params: { username?: string; password?: string; code?: string }) {
    const result: any = await authApi.login(params)
    token.value = result.token
    storage.set(STORAGE_KEYS.TOKEN, result.token)
    await fetchUserInfo()
  }

  /** 微信登录（App 端 uni.login → code → 后端换取 token + 用户信息） */
  async function wxLogin(code: string) {
    const result: any = await authApi.wxLogin(code)
    token.value = result.token
    storage.set(STORAGE_KEYS.TOKEN, result.token)
    // 后端直接返回用户信息，优先使用
    if (result.userInfo) {
      userInfo.value = {
        id: 0,
        openid: result.userInfo.openid,
        nickname: result.userInfo.nickname,
        avatar: result.userInfo.avatar,
      }
      storage.set(STORAGE_KEYS.USER_INFO, userInfo.value)
    }
    // 再调 getUserInfo 获取完整信息（id, createdAt 等）
    await fetchUserInfo()
  }

  /** 手机号 + 短信验证码登录（无账户自动创建；dev 验证码 123456） */
  async function smsLogin(phone: string, code: string) {
    const result: any = await authApi.smsLogin(phone, code)
    token.value = result.token
    storage.set(STORAGE_KEYS.TOKEN, result.token)
    if (result.userInfo) {
      userInfo.value = {
        id: result.userInfo.id,
        openid: result.userInfo.openid || '',
        phone: result.userInfo.phone || '',
        nickname: result.userInfo.nickname || '',
        avatar: result.userInfo.avatar || result.userInfo.avatar_url || '',
      }
      storage.set(STORAGE_KEYS.USER_INFO, userInfo.value)
    }
    await fetchUserInfo()
    return userInfo.value
  }

  /** 扫码登录成功后，存储 token 并获取用户信息 */
  async function handleScanLoginSuccess(scanData?: { token?: string; openid?: string }) {
    try {
      // 后端在 poll 响应中返回 JWT token，存储后后续请求用 Authorization 头认证
      if (scanData?.token) {
        token.value = scanData.token
        storage.set(STORAGE_KEYS.TOKEN, scanData.token)
      }
      await fetchUserInfo()
      return true
    } catch (e) {
      console.error('[user] scan login verify failed:', e)
      return false
    }
  }

  async function fetchUserInfo() {
    const info = await authApi.getUserInfo()
    // is_vip 归一化为 isVip（2026-08-24 报告导出会员解锁；后端未升级缺省按非会员）
    userInfo.value = {
      ...info,
      isVip: !!info.is_vip || !!info.isVip,
    }
    storage.set(STORAGE_KEYS.USER_INFO, userInfo.value)
    return userInfo.value
  }

  async function restoreSession() {
    try {
      await fetchUserInfo()
      return true
    } catch (e) {
      const statusCode = (e as { statusCode?: number })?.statusCode
      if (statusCode === 401) clearSession()
      return false
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
    clearSession()
  }

  return {
    token,
    userInfo,
    settings,
    isLoggedIn,
    login,
    wxLogin,
    smsLogin,
    handleScanLoginSuccess,
    fetchUserInfo,
    restoreSession,
    fetchSettings,
    updateSetting,
    logout,
    clearSession
  }
})
