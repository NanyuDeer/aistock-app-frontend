<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { usePushNotification } from '@/hooks/usePushNotification'

onLaunch(() => {
  console.log('App Launch - AI Stock')
  // #ifdef APP-PLUS
  // App 端初始化推送
  usePushNotification()
  // #endif
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
@import '@/styles/global.scss';
</style>
