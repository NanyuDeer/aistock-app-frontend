# rhythm 模块（节奏大师）

## 模块职责

节奏大师状态卡详情页 + 60 交易日热力图日历总览：展示"节奏大师"报告（`report_type=rhythm_master`）的三时点版本（收盘后 / 早盘 / 午盘），渲染状态卡（`rhythm_card`）与对应分时点结论；日历页按交易日展示每日收盘基准档位（冷→热热力图）。前端只读消费，不产生修改动作。

## 页面 / 组件清单

| 文件 | 说明 |
|------|------|
| `pages/index.vue` | 节奏大师详情页（状态卡 + 三时点版本切换 + 头部"日历"入口） |
| `pages/calendar.vue` | 节奏日历热力图总览（近 N 交易日，点格跳详情） |
| `components/RhythmCard.vue` | 状态卡组件（主档位 / 情绪周期 / 分支 / 事件日历 / 数据缺失） |

## 数据源

- `agentApi.getRhythmMaster(date)`（`src/shared/api/modules/agent.ts`）：GET `/agent/rhythm-master/:date`，返回 `{ date, versions: [{ refresh_slot, created_at, content }] }`
- `agentApi.getRhythmMasterCalendar(days)`：GET `/agent/rhythm-master/calendar?days=N`（N 默认 60，≤60 交易日），返回 `{ days: [{ date, refresh_slot, level, score, basis_date }] }`，恒取 after_close 收盘基准行（三时点 level 恒等）
- 三时点标识 `refresh_slot`：`'after_close' | 'morning' | 'midday'`
- 报告体类型：`RhythmMasterReport` / `RhythmMasterContent` / `RhythmCard`

## 渲染契约（rhythm_card 字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| `score` / `level` | number? / string? | 状态评分与档位 |
| `position_band` | `{ min?, max?, text }` | 仓位区间（min/max 缺失=无区间语义，text 必须展示；`conflict=true` 时隐藏，G2 背离纪律） |
| `phase` / `phase_evidence` | string? / record? | 阶段判定与证据 |
| `temperature_series` | `{ date, score }[]` | 温度序列（分时点状态卡趋势） |
| `event_window` | `RhythmEvent[]` | 事件窗口（delivery/earnings/seed/macro） |
| `event_source_missing` | boolean? | 事件源缺失标记（缺失时展示缺源提示） |
| `event_high_hint` | string? | 高影响事件提示文案 |
| `next_event_anchor` | `{ title, event_date, days_until, note }?` | 下一重大事件锚点（窗口内首条 high 事件 + 距运行日自然日差；`note` ∈ 今日/明日/N 天后；无锚点整块不渲染） |
| `conflict` / `conflict_detail` | boolean / string? | 多空冲突标记与详情 |
| `branches` | `RhythmBranch[]` | 条件分支（interval/enum 条件 → 结论 direction/range/validity） |
| `data_missing` | string[]? | 缺失数据项清单 |

## 分支语义（design-debate A1 裁决，2026-08-30）

- `condition.label` = **触发条件**（如"收盘站上 3994 压力位"），`conclusion.range` = **目标参考区间**（触发后的目标空间，非触发条件本身）
- range 由 engine 锚定突破后空间：bullish `[P, P+Δ]` / bearish `[S-Δ, S]` / neutral `[S, P]`（Δ=半通道宽），触发值=区间边界
- 点位来源脚注：支撑位=近 20 日最低价与 20 日均线×0.97 取较大者；压力位=近 20 日最高价与 20 日均线×1.03 取较小者
- 事件分支（enum）公布前 range 为空 → 显示"结果待公布"占位

## 日历页契约（契约 #7）

- 网格按交易日（服务端展开，前端不依赖交易日历），默认近 60 交易日
- 独立五档色板（不复用卡片 chip 色）：ice 紫灰 `#8a6fae` / low 青 `#2f9e9e` / normal 主蓝 / active 橙 / euphoria 红；灰格 `#eceef1`（行缺失或 level=null）
- `level=null` = 灰格（行缺失 / 沿用前值），如实展示不伪造
- 点格 `navigateTo` 详情页带 `date` 参数；H5 直开兜底（`getCurrentPages()` 深度=1 → `reLaunch` 首页）

## 约束

- 所有字段缺失按可选处理，页面必须容忍 `rhythm_card` 缺失（报告可能处于降级态）。
- 分支结论 `direction`：`'bullish' | 'bearish' | 'neutral'`；`validity` 为结论有效天数（number）。
