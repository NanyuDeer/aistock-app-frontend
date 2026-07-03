# Chat 模块 - AI 对话

## 功能范围
AI 对话模块提供智能投顾对话功能，支持行情查询、资金流向查询、龙头股查询等 Skill，以及流式输出。

## 页面
- `pages/index.vue` - AI 对话主页面

## 组件
- `components/ChatBubble.vue` - 对话气泡
- `components/SkillButton.vue` - Skill 快捷按钮
- `components/SkillCard.vue` - Skill 结果卡片
- `components/StreamingText.vue` - 流式文本输出

## Hooks
（暂无模块专属 hooks，使用 shared/utils 中的 useStreamingChat 等）

## 对外暴露的接口
- 子包路径: `/pages-sub-app/chat/index`
- 模块内路径: `/modules/chat/pages/index`

## 依赖的 shared/ 中的类型
- `@/shared/store/modules/chat` - 对话状态管理
- `@/shared/api/modules/agent` - AI Agent API 及 ChatMessage/SkillResult 类型
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- App 端推荐使用 WebSocket 流式输出（useStreamingChat）
- 非 App 端使用非流式降级方案（chatStore.sendMessage）
