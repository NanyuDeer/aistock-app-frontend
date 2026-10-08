# Home 模块 - 首页

## 功能范围
首页模块是用户进入应用后的第一个页面，展示今日专属晨报/晚报入口、长线风口预览、自选股洞察预览（涨停雷达 + 价格异动融合）和重磅事件跟踪。

## 页面
- `pages/index.vue` - 首页主页面

## 组件
- `components/DualHostPlayer.vue` - 双人对话播报播放器
- `components/MorningCard.vue` - 晨报卡片
- `components/MorningContent.vue` - 首页晨报内容容器（四宫格「洞见」入口 + 时段动态洞见卡）
- `components/DynamicInsightCard.vue` - 时段动态洞见卡（方案D：头条焦点 + 3条跨模块次要 + 四入口条带）；时段徽标实心主色底且模块标签同行（无顶部横条，徽标前带洞见字标），洞见卡同款渐变分隔线，小字详情＝洞见一句话结论，各模块带独有内容（风口序号+涨跌幅 / 消息影响板块↑红↓绿 / 市场日期+更新时间 / 节奏档位色标+基准日）；**次卡尾部标签与四宫格统一**（风口/市场用组件库 `Tag` sm+语义 type，节奏用档位色块 `.dyn-sec__rhythm`）；头条链接文案「详情 →」；盘后头条市场↔节奏每5s轮播；置于四宫格上方，暂不替换既有卡片
- `components/StockContent.vue` - 「选股」主 Tab 内容容器，子 Tab 四个：AI帮我选 / 趋势股 / 机构热门股 / 业绩预测（页面标题已表明场景，子 Tab 不带「洞见」后缀）
- `components/AiPickContent.vue` - AI帮我选列表；行内自选按钮为**双向切换**（未自选 → 加入自选，已自选 → 移除自选）

## Hooks
（暂无模块专属 hooks）

## 对外暴露的接口
- 无直接对外暴露的接口，首页为入口页面

## 依赖的 shared/ 中的类型
- `@/shared/components/PageCard.vue` - 页面布局容器
- `@/shared/components/AppBottomBar.vue` - 底部导航栏
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 首页数据目前使用 mock，后续需接入 API
- 导航跳转路径已更新为模块化路径
