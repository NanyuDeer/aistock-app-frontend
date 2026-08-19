# Favorites 模块 - 自选股

## 功能范围
自选股模块管理用户关注的股票，包括自选股列表、个股详情、搜索、异动监控和特别提醒。

## 页面
- `pages/index.vue` - 特别提醒（堆叠卡片式异动时间线）
- `pages/favorites.vue` - 自选股列表（含编辑态：批量删除 + 拖拽排序）
- `pages/favorites-grid.vue` - 多股同列（2 列宫格卡片，每格含迷你 K 线 + 名称/最新价/涨跌幅/涨跌额，顶部周期切换）
- `pages/detail.vue` - 个股详情页
- `pages/search.vue` - 股票搜索
- `pages/monitor.vue` - 异动监控

## 组件
- `components/StockCard.vue` - 股票卡片
- `components/StockCardList.vue` - 股票列表
- `components/KLineChart.vue` - K 线图
- `components/MiniKLine.vue` - 迷你 K 线（多股同列宫格用；分时/五日为折线，日/周/月为蜡烛+成交量，纯 SVG 跨端）
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
- 编辑态：点击表头编辑图标进入，右上角"完成"退出；支持勾选批量删除与拖拽排序（点"完成"统一保存 `saveOrder`）
- 编辑态以自选股原始顺序（后端 sort_order）为基准展示，隐藏行情列；左滑删除仅普通态生效
- 多股同列（favorites-grid）：表头网格图标进入，行情复用 favoritesStore，K 线按周期全部加载 + 前端 Map 缓存
  （`klineCache` 以 `${period}:${symbol}` 为 key，切回周期不重新请求）；默认日K，顶部切换分时/五日/日K/周K/月K
- 分时/五日走分钟级 K 线（klt=1），`getKLine` 会自动带 `startDate`（分时近 3 自然日、五日近 9 自然日）避免拉全量历史分钟数据
- 特别提醒页面使用堆叠卡片手势交互
