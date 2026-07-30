<template><view class="page-alerts"><AlertContent /><AppBottomBar current-tab="alert" /></view></template>
<script setup lang="ts">
import AlertContent from '@/modules/favorites/components/AlertContent.vue'
import AppBottomBar from '@/shared/components/AppBottomBar.vue'
</script>
<style lang="scss" scoped>.page-alerts { min-height: 100%; background: #f5f7fb; }</style>
