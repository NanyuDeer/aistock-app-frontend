<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { usePushNotification } from '@/shared/utils/usePushNotification'
import { useUserStore } from '@/shared/store/modules/user'
import { useFavoritesStore } from '@/shared/store/modules/favorites'

onLaunch(() => {
  console.log('App Launch - AI Stock')
  // #ifdef APP-PLUS
  // App 端初始化推送
  usePushNotification()
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
