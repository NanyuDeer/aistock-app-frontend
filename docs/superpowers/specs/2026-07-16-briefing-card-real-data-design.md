# 晨报/晚报卡片接入真实数据 - 设计文档

> 日期：2026-07-16
> 模块：aistock-app-frontend / modules/home
> 方案：Composable + 详情页

## 1. 背景与目标

首页 `MorningContent.vue` 的 briefing-card 区域当前全部为硬编码静态数据。目标是接入 morning agent（晨报）和 review agent（晚报/复盘）的真实报告数据，并新建详情页展示完整报告。

### 改造范围

仅改造 briefing-card 区域。下方的功能入口（长线风口、异动捕手、事件传导、AI分析）和重磅事件跟踪保持 mock 不变。

## 2. 数据来源

### API

`GET /api/agent/report/:intent/:date`

- intent: `morning`（晨报）| `review`（晚报/复盘）
- date: `YYYY-MM-DD`
- 响应: `{ code: 0, data: { report_type, report_date, content } | null }`

### content 字段结构（schema_version 2.0 双层输出）

```json
{
  "display_report": {
    "summary": "结论一句话",
    "details": "完整分析内容（Markdown）",
    "stocks": ["601857", "600028"],
    "risks": ["风险提示1", "风险提示2"]
  },
  "podcast_brief": "150-200字播报摘要",
  "schema_version": "2.0"
}
```

### 时间切换规则

| 时间段 | 类型 | intent |
|--------|------|--------|
| 00:00 ~ 15:29 | 晨报 | `morning` |
| 15:30 ~ 23:59 | 晚报 | `review` |

## 3. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/shared/utils/useBriefingCard.ts` | 新建 | Composable，封装数据获取与状态管理 |
| `src/modules/home/components/MorningContent.vue` | 修改 | 替换 briefing-card 模板和脚本（仅卡片部分） |
| `src/pages-sub-app/briefing-detail/index.vue` | 新建 | 晨报/晚报详情页 |
| `src/pages.json` | 修改 | 注册详情页路由 |

## 4. useBriefingCard Composable

### 接口定义

```typescript
interface BriefingReport {
  summary: string
  details: string
  stocks: string[]
  risks: string[]
  podcast_brief: string
  schema_version: string
}

interface BriefingCardState {
  type: Ref<'morning' | 'review'>
  typeLabel: ComputedRef<string>           // '晨报' | '晚报'
  summary: Ref<string>                      // display_report.summary
  report: Ref<BriefingReport | null>        // 完整报告
  loading: Ref<boolean>
  status: Ref<'idle' | 'loading' | 'ready' | 'empty' | 'error'>
  refresh: () => Promise<void>
}

function useBriefingCard(
  type?: 'morning' | 'review',  // 不传则按时间自动判断
  date?: string                  // 不传则默认今天
): BriefingCardState
```

### 核心逻辑

1. **类型判断**：未传入 type 时，`getHours() < 15 || (getHours() === 15 && getMinutes() < 30)` -> morning，否则 review
2. **API 调用**：`agentApi.getReport(type, date)` -> 解析 `content` 字段
3. **数据解析**：从 content JSONB 中提取 display_report 和 podcast_brief
4. **状态管理**：
   - `data: null` -> status = 'empty'（报告未生成）
   - API 超时/异常 -> status = 'error'
   - 正常返回 -> status = 'ready'

### 使用示例

```typescript
// 卡片（自动判断类型）
const { typeLabel, summary, status, loading } = useBriefingCard()

// 详情页（指定类型和日期）
const { report, status, loading, refresh } = useBriefingCard(type, date)
```

## 5. 卡片 UI 改造

### 模板变化

| 区域 | 现状（硬编码） | 改造后 |
|------|---------------|--------|
| `briefing-tag` | "今日专属" | 不变 |
| `briefing-period` | "晚报 ⌄" | `{{ typeLabel }}`（晨报/晚报，去掉下拉箭头） |
| `highlight-prefix` | "重点看" | status=ready 时显示 |
| `highlight-stock` | "山西焦化" | status=ready 时显示 `summary` |
| `highlight-reason` | "获主力抢筹" | 移除（summary 本身是完整结论） |
| `briefing-desc` | "或存反弹机会" | empty: "生成中，9:00 后查看" / error: "暂不可用" |
| `briefing-btn` | "专属播报" | 仅 podcast_brief 存在时显示，跳转双人播报页 |
| `briefing-right` | 耳机图标 | loading 时加旋转动画 |

### 点击行为

- `status === 'ready'` -> `navigateTo briefing-detail?type=morning|review`
- `status === 'empty'` -> toast 提示生成中，不跳转
- `status === 'error'` -> 触发 refresh，不跳转

## 6. 详情页设计

### 路由

```
pages-sub-app/briefing-detail/index?type=morning&date=2026-07-16
```

注册到 `pages.json` 的 `subPackages` -> `pages-sub-app`。

### 布局

```
┌─────────────────────────────────┐
│  ← 晨报 / 晚报    2026-07-16    │  顶部标题栏（渐变背景）
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ ◉ 收听播报                 │  │  播报入口（置顶，podcast_brief 存在时）
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ summary 一句话结论         │  │  摘要卡片
│  └───────────────────────────┘  │
│                                 │
│  完整分析（mp-html 渲染）        │  details Markdown 内容
│  ...                            │
│                                 │
│  关联股票                        │  stocks 列表（点击跳转个股详情）
│  风险提示                        │  risks 列表
│                                 │
│  ‹ 前一天        后一天 ›       │  日期切换
└─────────────────────────────────┘
```

### 技术要点

- Markdown 渲染使用 `mp-html`（项目已安装）
- 详情页使用 `useBriefingCard(type, date)` 获取数据，type 和 date 从页面参数读取
- 日期切换：前一天/后一天，重新调用 composable 的 refresh
- 空状态：显示"报告尚未生成"提示
- 播报入口：跳转 `pages-sub-app/briefing/index`（现有双人播报页）

## 7. 错误处理

| 场景 | 卡片行为 | 详情页行为 |
|------|---------|-----------|
| 报告未生成 (data: null) | 显示"生成中，X:XX 后查看" | 显示"报告尚未生成"空状态 |
| API 超时/错误 | 显示"暂不可用" | 显示错误提示 + 重试按钮 |
| content 解析失败 | 降级为 status=error | 同上 |
| 网络断开 | 同 API 错误 | 同上 |

## 8. 约束遵循

- 遵循 AGENTS.md 模块依赖规则：composable 放 `shared/utils/`，模块只读引用
- 使用 Design Token 变量（`$brand-color` 等），禁止硬编码颜色
- 使用 `position: fixed` 布局，禁止 `100vh`
- 使用 SCSS + rpx 单位
- 禁止 emoji，用 SvgIcon 组件
- 禁止 `any`，用 `unknown` 或具体类型
