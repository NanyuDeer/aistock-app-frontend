# rhythm 模块（节奏大师）

## 模块职责

节奏大师详情页：展示"节奏大师"报告（`report_type=rhythm_master`）的三时点版本（收盘后 / 早盘 / 午盘），顶部为可折叠双模式节奏日历面板（仓位/事件，60 日热力网格内嵌于此），下方渲染节奏洞见摘要卡（InsightCard）与瘦身状态卡（`rhythm_card`）。前端只读消费，不产生修改动作。

**页面容器（2026-09-02 起）**：详情页已迁移到通用子页容器 `SubPageCard2`（白底导航 + 原生滚动 + 内置 GlobalChatBar 全局 AI 对话栏 + 自动返回兜底）。自绘 nav + `.page{height:100%}` 滚动方案已废弃——H5 固定 9:16 视口下非 fixed 布局滚动区高度链不可靠，易"翻不动"。

## 页面 / 组件清单

| 文件                          | 说明                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pages/index.vue`           | 节奏大师详情页（SubPageCard2 容器；内容流 = 顶部 **RhythmCalendarPanel**（折叠近 7 日紧凑条 / 展开 60 交易日周网格，仓位/事件 Segmented；事件模式 = macro 角标 + 选中日事件行）+ 三时点 pill / 沿用前值 fallback + **节奏洞见卡**（InsightCard 摘要：仓位/档位/interval 分支上移）→ RhythmCard（明细已去重瘦身）+ EmptyState 兜底）                          |
| `components/RhythmCalendarPanel.vue` | 顶部可折叠双模式日历面板（2026-09-03）：折叠 = 近 7 交易日紧凑条（左旧右新，点格切日）；展开 = 60 交易日自然周网格（默认展开，`rhythm.calendar.expanded` storage 记忆）；仓位/事件 Segmented 仅展开态；事件模式 = macro 角标（high 红点计数 / medium-low 灰点）+ 选中日事件行；点格以 `pick` 事件上抛切日（不导航） |
| `components/RhythmCard.vue` | 状态卡组件（瘦身后保留：score + 五档色带 / 情绪周期 chip / 温度曲线 / 事件日历 / conflict / data_missing；仓位长句、档位 chip、证据行、关键节点分支已上移洞见卡——**同屏去重**）                                                                                               |
| `utils/rhythmInsight.ts`    | 洞见卡映射（2026-09-03）：`toRhythmInsight(card, slot, date)` → `RhythmInsightCard`（结构化子集对齐 ConditionalForecastBlock/InsightCard 入参；不可拼装返回 null → 整卡不渲染）                                                                                    |

## 首页节奏卡（modules/home/components/MorningContent.vue）

- 首页"节奏大师"卡展示**近 5 个交易日摘要行**（`getRhythmMasterCalendar(5)` 一次取数）：每行 = MM-DD + 档位色 chip + 建议仓位文本；点行进该日详情（带 `?date=`），整卡点击仍进默认（最近交易日）详情。

- 摘要数据统一走日历聚合接口（含 `position_band`），**不**逐日 `getRhythmMaster`（避免放大首页 onShow 刷新成本）。

## 数据源

- `agentApi.getRhythmMaster(date)`（`src/shared/api/modules/agent.ts`）：GET `/agent/rhythm-master/:date`，返回 `{ date, versions: [{ refresh_slot, created_at, content }] }`

- `agentApi.getRhythmMasterCalendar(days)`：GET `/agent/rhythm-master/calendar?days=N`（N 默认 60，≤60 交易日），返回 `{ days: [{ date, refresh_slot, level, score, basis_date, position_band, events? }] }`，恒取 after\_close 收盘基准行（三时点 level 恒等）。**`position_band`（2026-09-02 扩展）：该日收盘基准建议仓位** **`{min?, max?, text?}`，行缺失/null = 无仓位语义（如实展示）**，供日历面板/详情页与首页近 5 日摘要使用。**`events`（2026-09-03 扩展）：该日 macro 事件行**（CN + US 隔夜按对外契约顺延；类型标可选 `events?` 以兼容缺省/降级响应——**后端恒下发，无事件 = `[]`**）

- **洞见卡映射与去重（2026-09-03）**：详情页 RhythmCard 前插入统一摘要洞见卡（InsightCard，type=market / tag-text=节奏洞见）；洞见卡映射规则（owner 表 + structured 规则）与 RhythmCard 去重清单指向 spec §10（docs/superpowers/specs/2026-09-03-rhythm-calendar-inline-panel-design.md）

- 三时点标识 `refresh_slot`：`'after_close' | 'morning' | 'midday'`

- 报告体类型：`RhythmMasterReport` / `RhythmMasterContent` / `RhythmCard`

## 渲染契约（rhythm\_card 字段）

| 字段                             | 类型                                         | 说明                                                              |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| `score` / `level`              | number? / string?                          | 状态评分与档位                                                         |
| `position_band`                | `{ min?, max?, text }`                     | 仓位区间（min/max 缺失=无区间语义，text 必须展示；`conflict=true` 时隐藏，G2 背离纪律）    |
| `phase` / `phase_evidence`     | string? / record?                          | 阶段判定与证据                                                         |
| `temperature_series`           | `{ date, score }[]`                        | 温度序列（分时点状态卡趋势）                                                  |
| `event_window`                 | `RhythmEvent[]`                            | 事件窗口（delivery/earnings/seed/macro）                              |
| `event_source_missing`         | boolean?                                   | 事件源缺失标记（缺失时展示缺源提示）                                              |
| `event_high_hint`              | string?                                    | 高影响事件提示文案                                                       |
| `next_event_anchor`            | `{ title, event_date, days_until, note }?` | 下一重大事件锚点（窗口内首条 high 事件 + 距运行日自然日差；`note` ∈ 今日/明日/N 天后；无锚点整块不渲染） |
| `conflict` / `conflict_detail` | boolean / string?                          | 多空冲突标记与详情                                                       |
| `branches`                     | `RhythmBranch[]`                           | 条件分支（interval/enum 条件 → 结论 direction/range/validity）            |
| `data_missing`                 | string\[]?                                 | 缺失数据项清单                                                         |

## 分支语义（design-debate A1 裁决，2026-08-30）

- `condition.label` = **触发条件**（如"收盘站上 3994 压力位"），`conclusion.range` = **目标参考区间**（触发后的目标空间，非触发条件本身）

- range 由 engine 锚定突破后空间：bullish `[P, P+Δ]` / bearish `[S-Δ, S]` / neutral `[S, P]`（Δ=半通道宽），触发值=区间边界

- 点位来源脚注：支撑位=近 20 日最低价与 20 日均线×0.97 取较大者；压力位=近 20 日最高价与 20 日均线×1.03 取较小者

- 事件分支（enum）公布前 range 为空 → 显示"结果待公布"占位

## 日历面板网格契约（契约 #7，2026-09-03 起内嵌详情页）

- 独立日历总览页已废弃（`pages/calendar.vue` 删除）；60 日热力网格内嵌为详情页顶部 `RhythmCalendarPanel`，一次 `getRhythmMasterCalendar(60)` 取全量（含 events），折叠态渲染最近 7 日、展开态渲染 60 日，不再逐日请求

- 网格按交易日（服务端展开，前端不依赖交易日历），展开态为自然周网格：周一列开头、周末列留空

- 独立五档色板（不复用卡片 chip 色）：ice 紫灰 `#8a6fae` / low 青 `#2f9e9e` / normal 主蓝 / active 橙 / euphoria 红；灰格 `#eceef1`（行缺失或 level=null）

- `level=null` = 灰格（行缺失 / 沿用前值），如实展示不伪造

- 展开态默认展开（`rhythm.calendar.expanded` storage 记忆）；仓位/事件 Segmented 仅展开态展示；事件模式 = macro 角标（high 红点+计数 / medium-low 灰点）+ 选中日事件行（影响度·时间·标题 / result 尾注 / US 隔夜角标），空日显示「当日无宏观事件」，不标点不填充

- 点格切日 = 面板 `pick` 事件上抛，详情页原地重拉该日三时点版本（无页面跳转）

## 约束

- 所有字段缺失按可选处理，页面必须容忍 `rhythm_card` 缺失（报告可能处于降级态）。

- 分支结论 `direction`：`'bullish' | 'bearish' | 'neutral'`；`validity` 为结论有效天数（number）。

