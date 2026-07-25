<template>
  <MainTabs ref="mainTabsRef" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import MainTabs from '@/shared/components/MainTabs.vue'

const mainTabsRef = ref<InstanceType<typeof MainTabs> | null>(null)

onLoad((query: Record<string, string> | undefined) => {
  // 支持 URL 参数指定初始 Tab，如 ?tab=stock 或 ?tab=alert
  const tab = query?.tab
  if (tab && mainTabsRef.value) {
    mainTabsRef.value.setActiveTab(tab)
  }
})

// onLoad 可能在组件 ref 绑定前执行，用 onMounted 兜底
onMounted(() => {
  // 从当前页面实例获取参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const tab = currentPage?.$page?.options?.tab || currentPage?.options?.tab
  if (tab && mainTabsRef.value) {
    mainTabsRef.value.setActiveTab(tab)
  }
})
</script>
