# rhythm 模块（节奏大师）

## 模块职责

节奏大师状态卡详情页：展示"节奏大师"报告（`report_type=rhythm_master`）的三时点版本（收盘后 / 早盘 / 午盘），渲染状态卡（`rhythm_card`）与对应分时点结论。前端只读消费，不产生修改动作。

## 页面 / 组件清单

| 文件 | 说明 |
|------|------|
| `pages/index.vue` | 节奏大师详情页（状态卡 + 三时点版本切换） |

## 数据源

- `agentApi.getRhythmMaster(date)`（`src/shared/api/modules/agent.ts`）：GET `/agent/rhythm-master/:date`，返回 `{ date, versions: [{ refresh_slot, created_at, content }] }`
- 三时点标识 `refresh_slot`：`'after_close' | 'morning' | 'midday'`
- 报告体类型：`RhythmMasterReport` / `RhythmMasterContent` / `RhythmCard`

## 渲染契约（rhythm_card 字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| `score` / `level` | number? / string? | 状态评分与档位 |
| `position_band` | `{ min?, max?, text }` | 仓位区间（min/max 缺失=无区间语义，text 必须展示） |
| `phase` / `phase_evidence` | string? / record? | 阶段判定与证据 |
| `temperature_series` | `{ date, score }[]` | 温度序列（分时点状态卡趋势） |
| `event_window` | `RhythmEvent[]` | 事件窗口（delivery/earnings/seed/macro） |
| `event_source_missing` | boolean? | 事件源缺失标记（缺失时展示缺源提示） |
| `event_high_hint` | string? | 高影响事件提示文案 |
| `conflict` / `conflict_detail` | boolean / string? | 多空冲突标记与详情 |
| `branches` | `RhythmBranch[]` | 条件分支（interval/enum 条件 → 结论 direction/range/validity） |
| `data_missing` | string[]? | 缺失数据项清单 |

## 约束

- 所有字段缺失按可选处理，页面必须容忍 `rhythm_card` 缺失（报告可能处于降级态）。
- 分支结论 `direction`：`'bullish' | 'bearish' | 'neutral'`；`validity` 为结论有效天数（number）。
