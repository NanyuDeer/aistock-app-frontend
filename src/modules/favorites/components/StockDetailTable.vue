/**
 * StockDetailTable 股票详情表格
 * 视觉层：基于组件库 DataTable（同步时间：2026-07-28）
 * 保留业务逻辑：多格式值渲染（price/percent/volume/amount/raw）由 DataTable 内置实现，
 * 这里仅做 props 透传，保持本模块对外 props 契约（data/title/columns）不变。
 *
 * 字段映射：data 行结构（label/value/unit/trend/formatter）与 DataTable 的 DataRow 完全一致，直接透传。
 */
<template>
  <DataTable :data="data" :title="title" :columns="columns" />
</template>

<script setup lang="ts">
import DataTable from '@/shared/components/DataTable.vue'

interface TableRow {
  label: string
  value: number | string | null
  unit?: string
  trend?: boolean
  formatter?: 'price' | 'percent' | 'volume' | 'amount' | 'raw'
}

withDefaults(defineProps<{
  data: Array<TableRow>
  title?: string
  columns?: number
}>(), {
  title: '',
  columns: 3
})
</script>
