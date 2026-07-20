<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { usePushNotification } from '@/shared/utils/usePushNotification'
import { useUserStore } from '@/shared/store/modules/user'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { initH5Scale } from '@/shared/utils/h5-scale'

onLaunch(() => {
  console.log('App Launch - AI Stock')
  // #ifdef APP-PLUS
  // App 端初始化推送
  usePushNotification()
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
