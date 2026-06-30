/**
 * 认证组合式 Hook
 * 封装 user store 常用操作，便于在组件中使用
 */
import { computed } from 'vue'
import { useUserStore } from '@/store/modules/user'

export function useAuth() {
  const userStore = useUserStore()

  const isLoggedIn = computed(() => userStore.isLoggedIn())
  const token = computed(() => userStore.token)
  const userInfo = computed(() => userStore.userInfo)
  const username = computed(() => userStore.userInfo?.nickname || '')

  async function login(params: { username?: string; password?: string; code?: string }) {
    await userStore.login(params)
  }

  async function wxLogin(code: string) {
    await userStore.wxLogin(code)
  }

  function logout() {
    userStore.logout()
  }

  /** 要求登录才能继续，未登录则跳转登录页 */
  function requireLogin(redirectBack = true): boolean {
    if (isLoggedIn.value) return true
    const url = redirectBack ? '/pages/user/login' : '/pages/user/login'
    uni.navigateTo({ url })
    return false
  }

  return {
    isLoggedIn,
    token,
    userInfo,
    username,
    login,
    wxLogin,
    logout,
    requireLogin
  }
}
