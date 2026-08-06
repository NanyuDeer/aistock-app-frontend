# 会话列表 Token 用量徽标 + 单轮用量进气泡 — 设计文档

> 日期：2026-08-06
> 范围：aistock-app-frontend（纯前端改动）
> 状态：已获用户批准（方案 A：本地优先 + 服务端补足；范围：徽标 + 单轮用量进气泡）

## 1. 背景与根因

### 1.1 需求

1. 会话列表（sessions.vue）登录后每行显示「N tokens」用量徽标。
2. 聊天页每条 AI 回复底部显示**单轮用量**，与「深度分析」按钮同一行，灰色弱化。
3. 用量统计保持**综合返回后生成**（DONE 事件一次性带出 `token_usage`），不做实时累加推送。

### 1.2 现状与根因（为什么当前看不到用量）

- [sessions.vue](file:///d:/ai_stock_app/aistock-app-frontend/src/pages-sub-app/chat/sessions.vue#L58-L77) 徽标数据源**只有服务端** `getChatSessionUsage()`（聚合 `chat_token_usage` 表）。
- 当前环境 WS 服务端未实现 → 前端走 HTTP 降级 → agent-py 的 HTTP/SSE 路径**只展示不落库**（见 aistock-agent-py CHANGELOG：SSE DONE 仅展示不落库）→ `chat_token_usage` 表为空 → 徽标不显示。
- 前端本地其实已有可靠数据：chatStore `sessionUsage` 在每次 DONE 时自动累加（`appendMessage` → `accumulateSessionUsage`），按 session_id 分桶并持久化到 `CHAT_SESSION_USAGE`，但 sessions.vue **未使用**。

### 1.3 顺带发现的缺陷

- `deleteSession` 只清理 `messagesBySession` 与 `sessions`，**不清 `sessionUsage[id]`** → 删除会话后本地残留幽灵用量。

## 2. 数据流（生成时机不变）

```
DONE 事件 → useChatStream 解析 token_usage
  → appendMessage({ ..., tokenUsage })
    → chatStore.accumulateSessionUsage(sid)   # 本地 sessionUsage 累加（持久化 CHAT_SESSION_USAGE）
    → 气泡底部显示单轮用量（msg.tokenUsage.total_tokens）
    → 会话列表徽标（本地 sessionUsage 全覆盖 + 服务端 items 补足）
```

## 3. 改动清单（全部前端，共 4 项）

### 3.1 会话列表徽标：本地优先 + 服务端补足（sessions.vue）

- `usageBySession` 构建逻辑改为两步：
  1. 先遍历 `chatStore.sessionUsage`（本地），全部进入 Map（未登录也显示）。
  2. 登录后拉服务端 `getChatSessionUsage()` items，仅补「本地没有的 session_id」。
- 合并逻辑抽成纯函数 `mergeUsageBySession(local, server): Record<string, SessionUsageItem>`，放独立工具文件便于单测。
- `onShow` 调整：本地部分立即构建；服务端请求保留在 `userStore.isLoggedIn()` 分支内。
- 徽标样式不动（数字 primary 强调 + 单位 ink-mute 弱化，现有 P10 线 6 样式）。

### 3.2 修复 deleteSession 残留（chat store）

- `deleteSession(id)` 中删除会话时，同步删除 `sessionUsage[id]` 并持久化 `CHAT_SESSION_USAGE`。

### 3.3 单轮用量进气泡（chat/index.vue）

- bubble 底部原「深度分析」按钮行改为 footer 行：
  - 左侧：单轮用量 `{{ msg.tokenUsage.total_tokens }} tokens`（20rpx、`$ink-mute` 灰色弱化）。
  - 右侧：保留「深度分析」按钮（显示条件不变：非 deep / 非错误回复）。
- 仅 `msg.tokenUsage` 存在时显示用量（HTTP 降级/旧协议缺失 `undefined` 时不渲染）。

### 3.4 删除聊天页底部 UsageBar

- 移除 `index.vue` 中 `<UsageBar />` 及 import。
- 删除 `UsageBar.vue` 与 `UsageBar.spec.ts`。
- 影响说明：
  - 「本次 N token」由会话列表徽标承接。
  - 「累计 N token」（用户级总计，`getTokenUsageSummary`）本次无替代展示位，**记入遗留项**（后续可放用户中心）。

## 4. 测试与验证

### 4.1 单元测试

- `chat.spec.ts`：新增 `deleteSession` 清 `sessionUsage` 回归用例（删除后 `getCurrentSessionUsage` 返回 null / 残留键不存在）。
- 合并函数单测（4 场景）：本地优先、服务端补足、本地空、服务端空。

### 4.2 验证命令

| 检查 | 命令 |
|------|------|
| 单测 | `npx vitest run`（chat 相关全绿） |
| 类型检查 | `npx vue-tsc --noEmit` |
| 构建 | `npm run build:h5` |

### 4.3 浏览器实测（HTTP 降级路径）

1. 启动 app-api + frontend h5。
2. 发一条消息 → 气泡底部出现单轮用量「N tokens」。
3. 返回会话列表 → 对应会话行出现徽标（即使服务端聚合为空，本地数据兜底）。
4. 删除会话 → 徽标消失（无幽灵数据）。

## 5. 非目标 / 遗留项

- 用户级 token 总计的展示位（原 UsageBar「累计」部分）：本次不实现，记入遗留项。
- 实时用量统计（usage_delta 事件推送）：不做，保持综合返回后生成。
- 后端 `GET /api/chat/usage/sessions` 无改动；`chat_token_usage` 落库时机（HTTP/SSE 不落库）不在本次范围。
