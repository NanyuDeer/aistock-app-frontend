# Favorites 模块 - 自选股

## 功能范围
自选股模块管理用户关注的股票，包括自选股列表、个股详情、搜索、异动监控和特别提醒。

## 页面
- `pages/index.vue` - 特别提醒（堆叠卡片式异动时间线）
- `pages/favorites.vue` - 自选股列表
- `pages/detail.vue` - 个股详情页
- `pages/search.vue` - 股票搜索
- `pages/monitor.vue` - 异动监控

## 组件
- `components/StockCard.vue` - 股票卡片
- `components/StockCardList.vue` - 股票列表
- `components/KLineChart.vue` - K 线图
- `components/StockDetailTable.vue` - 股票详情表格

## Hooks
（暂无模块专属 hooks，使用 shared/utils 中的 useFavorites 等）

## 对外暴露的接口
- 其他模块通过 navigateTo 跳转到个股详情页

## 依赖的 shared/ 中的类型
- `@/shared/store/modules/favorites` - 自选股状态管理
- `@/shared/store/modules/app` - 应用配置状态
- `@/shared/api/modules/stock` - 股票 API
- `@/shared/api/modules/portfolio` - 持仓 API
- `@/shared/utils/tradingTime` - 交易时间工具
- `@/shared/utils/datetime` - 日期时间格式化
- `@/shared/utils/stock` - 股票格式化工具
- `@/shared/components/SubPageCard.vue` - 子页面容器
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 自选股数据在未登录时使用 mock，登录后从后端获取
- 特别提醒页面使用堆叠卡片手势交互
