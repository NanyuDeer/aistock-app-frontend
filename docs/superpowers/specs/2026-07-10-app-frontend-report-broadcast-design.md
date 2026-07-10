# App 前端分析报告入口 + 双人播报页面设计

**日期**：2026-07-10
**仓库**：aistock-app-frontend（主）、aistock-agent-py（补充持久化）、aistock-app-api（音频文件服务）
**状态**：待用户审查

---

## 1. 背景与目标

### 背景
- App 前端 `hot-burst.vue`（机构调研）已设计"查看今日分析报告"引导卡片，点击跳转到 `agent-report` 页面
- 但 `agent-report` 页面**尚未创建**，跳转目标不存在
- `leaders.vue`（长线风口）**没有**分析报告入口
- `briefing/index.vue`（双人播报）是纯占位页面
- 后端 `/internal/analysis-reports/:type/:date` API 已存在（Phase 1 完成）
- **broadcast agent 没有持久化逻辑**，`dialogue_text` 和 `audio_path` 不会存入数据库

### 目标
1. 创建通用 `agent-report` 页面，支持通过 `intent` 参数查看不同类型的分析报告
2. `leaders.vue` 增加分析报告引导卡片
3. 设计双人播报页面，包含音频播放按钮和对话文本展示
4. 给 broadcast agent 增加持久化逻辑，使播报内容可被前端读取

---

## 2. 子项目 A：分析报告查看

### 2.1 新建 agent-report.vue

**路径**：`src/modules/chat/pages/agent-report.vue`

**功能**：
- 通过 URL 参数 `intent` 和 `date` 读取对应类型的分析报告
- 支持的 intent 值：`morning`、`wind_leader`、`hot_burst`、`broadcast`
- 展示报告文本内容
- 无报告时显示"今日报告尚未生成，请在 9:10 后查看"

**数据流**：
```
用户点击引导卡片
  → uni.navigateTo({ url: '/modules/chat/pages/agent-report?intent=xxx&date=xxx' })
  → agent-report.vue onLoad 读取 intent 和 date 参数
  → 调用 agentApi.getReport(intent, date)
  → GET /api/agent/report/:intent/:date
  → Node.js 反代到 /internal/analysis-reports/:type/:date
  → 返回 { content: { text: "..." } }
  → 页面渲染报告文本
```

**API 契约**：
- 请求：`GET /api/agent/report/:intent/:date`
- 响应（有报告）：
  ```json
  {
    "code": 0,
    "data": {
      "report_type": "wind_leader",
      "report_date": "2026-07-10",
      "content": { "text": "..." }
    }
  }
  ```
- 响应（无报告）：`{ "code": 0, "data": null }`

### 2.2 修改 leaders.vue

**路径**：`src/modules/market/pages/leaders.vue`

**修改内容**：
- 在 `<SubPageCard>` 内部、`leaders-content` 顶部添加 `report-guide-card` 引导卡片
- 样式复用 hot-burst.vue 的 `.report-guide-card` 样式
- 点击跳转：`uni.navigateTo({ url: '/modules/chat/pages/agent-report?intent=wind_leader&date=${today}' })`
- 需要导入 `SvgIcon` 组件（leaders.vue 当前未导入）

### 2.3 路由配置

**路径**：`src/pages.json`

**修改内容**：
- 在 chat 模块分包（`pages-sub-app` 或 `modules/chat`）中注册 `agent-report` 页面
- 需要确认 chat 模块属于哪个分包

---

## 3. 子项目 B：双人播报页面

### 3.1 前置：broadcast agent 增加持久化

**仓库**：aistock-agent-py
**文件**：`src/aistock_agent/agents/workers/broadcast.py`

**修改内容**：
在 `run()` 函数末尾、`return` 之前增加持久化逻辑：
```python
# 持久化到数据库（scheduler 触发时）
if state.get("trigger_source") == "scheduler":
    report_date = state.get("report_date") or datetime.now().strftime("%Y-%m-%d")
    await node_api.save_analysis_report(
        report_type="broadcast",
        report_date=report_date,
        content={
            "text": dialogue_text,
            "audio_path": audio_path,
        },
    )
```

### 3.2 前置：音频文件 HTTP 服务

**问题**：`audio_path` 是服务器本地路径（如 `/home/aistock/aistock-agent-py/data/audio/xxx.mp3`），前端无法直接访问。

**方案**：Node.js（aistock-app-api）新增音频文件服务路由

**仓库**：aistock-app-api
**路由**：`GET /api/agent/audio/:filename`

**实现**：
- 从 `aistock-agent-py/data/audio/` 目录读取音频文件
- 返回 `audio/mpeg` 类型的文件流
- 文件不存在时返回 404

**环境变量**：需在 aistock-app-api 的 .env 中配置 `AGENT_AUDIO_DIR=/home/aistock/aistock-agent-py/data/audio`

### 3.3 修改 briefing/index.vue

**路径**：`src/pages-sub-app/briefing/index.vue`

**页面结构**：
```
┌─────────────────────────────────┐
│  双人对话播报                    │
│  2026-07-10                     │
├─────────────────────────────────┤
│  ┌─────────┐  ┌──────────────┐  │
│  │ ▶ 播放  │  │ 进度条       │  │
│  └─────────┘  └──────────────┘  │
│  [host] 主持人音色              │
│  [analyst] 分析师音色           │
├─────────────────────────────────┤
│  📝 对话文本                    │
│  ┌─────────────────────────┐    │
│  │ 主持人：今天市场...      │    │
│  │ 分析师：从板块来看...    │    │
│  │ 主持人：重点关注...      │    │
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  ◀ 2026-07-09  2026-07-10 ▶    │
└─────────────────────────────────┘
```

**数据流**：
```
页面加载
  → 读取今天日期
  → 调用 agentApi.getReport('broadcast', today)
  → GET /api/agent/report/broadcast/:date
  → 返回 { content: { text: "...", audio_path: "/home/.../xxx.mp3" } }
  → 解析对话文本（按行分割 host/analyst）
  → audio_path 存在 → 显示播放按钮，音频 URL 为 /api/agent/audio/xxx.mp3
  → audio_path 为空 → 隐藏播放按钮，提示"语音生成中"
  → 无报告 → 显示占位"今日播报尚未生成，请在 9:10 后查看"
```

**音频播放**：
- 使用 uni-app 内置 `uni.createInnerAudioContext`
- 音频 URL：`{API_BASE}/api/agent/audio/{filename}`
- 播放/暂停按钮切换状态
- 进度条可选（MVP 可不做）

**对话文本解析**：
- broadcast agent 生成的对话文本格式需确认（是否有 host/analyst 标记）
- 按行分割，根据前缀（如"主持人："、"分析师："）区分说话人
- 不同说话人用不同样式（头像 + 气泡）

---

## 4. 子项目 C：Agent 接入（明天规划）

暂不设计，明天用 brainstorming 重新规划：
- 将 aistock-agent-py 中各种 agent 接入 aistock-app-frontend
- 接入智能投顾助手
- 注意：aistock-app-frontend 不放在云服务器上，其他库都在云服务器上

---

## 5. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 报告未生成（API 返回 null） | 显示"今日报告尚未生成，请在 9:10 后查看" |
| API 请求失败 | 显示"网络异常，请稍后重试" + 重试按钮 |
| 音频文件不存在（404） | 隐藏播放按钮，提示"语音生成中" |
| 音频播放失败 | Toast 提示"音频播放失败" |
| 日期切换查看历史播报 | 无报告时显示"该日无播报记录" |

---

## 6. 实施顺序

1. **后端**：aistock-agent-py broadcast.py 增加持久化逻辑
2. **后端**：aistock-app-api 新增 `/api/agent/audio/:filename` 路由
3. **后端**：aistock-app-api 新增 `/api/agent/report/:intent/:date` 反代路由（如不存在）
4. **前端**：新建 agent-report.vue 通用页面
5. **前端**：修改 leaders.vue 添加引导卡片
6. **前端**：修改 briefing/index.vue 双人播报页面
7. **前端**：pages.json 注册新页面路由

---

## 7. 测试策略

- **后端**：broadcast 持久化逻辑 — 手动触发 broadcast agent，确认 DB 有记录
- **后端**：音频文件服务 — curl 测试 `/api/agent/audio/:filename`
- **前端**：agent-report.vue — 各 intent 参数都能正确展示报告
- **前端**：leaders.vue — 引导卡片点击跳转正确
- **前端**：briefing/index.vue — 有音频时播放按钮可用，无音频时隐藏

---

## 8. 已确认的设计决策

1. **对话文本格式**：broadcast prompt 要求生成 JSON 数组格式 `[{"role": "host", "content": "...", "tone": "neutral"}, {"role": "analyst", "content": "...", "tone": "positive"}]`。前端需尝试 JSON.parse，失败时降级为纯文本展示。

2. **公开 API 路由**：aistock-app-api 仅有 `/internal/analysis-reports/:type/:date` 内部路由，**需新增** `/api/agent/report/:intent/:date` 公开路由给前端调用（反代到内部路由）。

3. **页面注册位置**：`modules/chat/pages/agent-report.vue` 在 pages.json 主包 `pages` 数组中注册（与 `modules/market/pages/hot-burst` 同级）。

4. **音频文件服务**：aistock-app-api 新增 `GET /api/agent/audio/:filename` 路由，从 `AGENT_AUDIO_DIR` 环境变量指定的目录读取音频文件返回。
