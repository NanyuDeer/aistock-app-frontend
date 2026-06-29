import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()

  // 持久化插件（基于 uni.setStorageSync）
  // import piniaPluginUnistorage from 'pinia-plugin-unistorage'
  // pinia.use(piniaPluginUnistorage)

  app.use(pinia)
  return { app, pinia }
}
