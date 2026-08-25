// 必须作为第一条 import（dev/H5 场景依赖 import 顺序）：在任何第三方模块求值前注入缺失的
// 全局对象（如 TextEncoder），否则 fast-png 在模块顶层 `new TextEncoder()` 会触发
// ReferenceError 导致白屏。发行打包场景由 vite.config 的 prependGlobalPolyfill 插件保障。
import '@/shared/utils/global-polyfills'
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
