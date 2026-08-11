# CHANGELOG.md — aistock-app-frontend 变更记录

## [changer] 2026-08-11 — P0 身份鉴权（Phase 1a）
**开发者**: 37588

### 改进
- `src/shared/api/modules/agent.ts`：`createAgentWebSocket` URL 追加 `?token=`（app-api 桥接握手鉴权）；`sendMessage` 删除 user_id 字段（服务端注入）；删除未使用的 useUserStore import
- `src/shared/utils/useChatStream.ts`：`send` 删除 user_id 字段；新增断连结算（4401/连接断开时结算挂起 send，走错误提示，不挂起 streaming）

### 文档
- AGENTS.md / src/modules/chat/AGENTS.md：user_id 服务端注入约束更新

> 发版约束：须在 Caddy 切换（/api/agent/ws/* 已指向 app-api）之后发布；此前前端 WS 仍直连 agent-py，删除 user_id 会导致登录态 WS 不落库不计费。
