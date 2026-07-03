# News 模块 - 资讯

## 功能范围
资讯模块提供资讯详情展示。

## 页面
- `pages/detail.vue` - 资讯详情页

## 组件
（暂无模块专属组件）

## Hooks
（暂无模块专属 hooks）

## 对外暴露的接口
- 其他模块通过 navigateTo 跳转到资讯详情页

## 依赖的 shared/ 中的类型
- `@/shared/api/modules/stock` - 股票 API（含 getNewsDetail）
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 资讯内容支持 rich-text 渲染
- 无 ID 时降级到 mock 数据
