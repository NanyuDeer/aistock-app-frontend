<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { usePushNotification } from '@/shared/utils/usePushNotification'
import { checkAppUpdate } from '@/shared/utils/useAppUpdate'
import { useUserStore } from '@/shared/store/modules/user'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { initH5Scale } from '@/shared/utils/h5-scale'

onLaunch(() => {
  console.log('App Launch - 洞见')
  // #ifdef APP-PLUS
  // App 端初始化推送
  usePushNotification()
  // 启动时静默检查版本更新（非 Android App 环境自动跳过；24h 节流）
  setTimeout(() => {
    checkAppUpdate()
  }, 3000)
  // #endif
  // #ifdef H5
  // H5 端初始化等比缩放，保持 9:16 长宽比并适应浏览器视口
  initH5Scale()
  // #endif
})

onShow(async () => {
  console.log('App Show')
  const userStore = useUserStore()
  const favoritesStore = useFavoritesStore()
  const authenticated = await userStore.restoreSession()
  if (authenticated) {
    await favoritesStore.fetchFavorites({ silent: true })
  }
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
@import '@/shared/styles/global.scss';
</style>
