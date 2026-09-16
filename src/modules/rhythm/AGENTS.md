# rhythm 模块（节奏大师）

## 模块职责

节奏大师详情页：展示"节奏大师"报告（`report_type=rhythm_master`）的三时点版本（收盘后 / 早盘 / 午盘），顶部为可折叠双模式节奏日历面板（仓位/事件，60 日热力网格内嵌于此），下方渲染节奏洞见摘要卡（InsightCard）与瘦身状态卡（`rhythm_card`）。前端只读消费，不产生修改动作。

**页面容器（2026-09-02 起）**：详情页已迁移到通用子页容器 `SubPageCard2`（白底导航 + 原生滚动 + 内置 GlobalChatBar 全局 AI 对话栏 + 自动返回兜底）。自绘 nav + `.page{height:100%}` 滚动方案已废弃——H5 固定 9:16 视口下非 fixed 布局滚动区高度链不可靠，易"翻不动"。

## 页面 / 组件清单

| 文件                                   | 说明                                                                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/index.vue`                    | 节奏大师详情页（SubPageCard2 容器；内容流 = 顶部 **RhythmCalendarPanel**（折叠近 7 日紧凑条 / 展开 60 交易日周网格，仓位/事件 Segmented；事件模式 = macro 角标 + 选中日事件行）+ 三时点 pill / 沿用前值 fallback + **节奏洞见卡**（InsightCard 摘要：仓位/档位/interval 分支上移）→ RhythmCard（明细已去重瘦身）+ EmptyState 兜底） |
| `components/RhythmCalendarPanel.vue` | 顶部可折叠双模式日历面板（2026-09-03）：折叠 = 近 7 交易日紧凑条（左旧右新，点格切日）；展开 = 60 交易日自然周网格（默认展开，`rhythm.calendar.expanded` storage 记忆）；仓位/事件 Segmented 仅展开态；事件模式 = macro 角标（high 红点计数 / medium-low 灰点）+ 选中日事件行；点格以 `pick` 事件上抛切日（不导航）                             |
| `components/RhythmCard.vue`          | 状态卡组件（瘦身后保留：score + 五档色带 / 情绪周期 chip / 温度曲线 / 事件日历 / conflict / data\_missing；仓位长句、档位 chip、证据行、关键节点分支已上移洞见卡——**同屏去重**）                                                                                                                      |
| `utils/rhythmInsight.ts`             | 洞见卡映射（2026-09-03）：`toRhythmInsight(card, slot, date)` → `RhythmInsightCard`（结构化子集对齐 ConditionalForecastBlock/InsightCard 入参；不可拼装返回 null → 整卡不渲染）                                                                                            |

## 首页节奏卡（modules/home/components/MorningContent.vue）

- 首页"节奏大师"卡展示**近 3 个交易日摘要行**（`getRhythmMasterCalendar(HOME_RHYTHM_DAYS)`，`HOME_RHYTHM_DAYS = 3`）：每行 = MM-DD + 档位色 chip + 建议仓位文本；点行进该日详情（带 `?date=`），整卡点击仍进默认（最近交易日）详情。

- 摘要数据统一走日历聚合接口（含 `position_band`），**不**逐日 `getRhythmMaster`（避免放大首页 onShow 刷新成本）。

## 恐贪页入口卡（modules/fear-greed/pages/index.vue，2026-09-15）

- 恐贪指数页顶部常驻「波段操作节奏」入口卡（消费方在 `modules/fear-greed`，跳转目标为本模块详情页），取数 `getRhythmMasterCalendar(2)`（**2 个交易日**，一次取数，不逐日 `getRhythmMaster`）。

- 摘要格式化走纯函数 `modules/fear-greed/utils/fgRhythmSummary.ts`（`formatRhythmSummary(days)` / `getRhythmUrl(date)` / `RhythmSummary`，由 `fgRhythmSummary.spec.ts` 覆盖）；档位色/短码**引用 `src/shared/utils/rhythmColors.ts` 唯一副本**，不得内联第二份。**注意**：`getRhythmUrl` 的入参是**该行 `date`**（详情页 `report_date`/`target_date` 键），**不是 `basis_date`**；`basis_date` = 证据日 = `date − 1 个交易日`，误用会落到前一张卡。

- 跳转本模块详情页 `modules/rhythm/pages/index`，**恒带 `?date=`**（取该行 `date`，即详情页 `report_date`/`target_date` 键；无有效行才不带参），不依赖详情页 fallback 链。**勿改用 `basis_date`**（= 证据日 = `date − 1 个交易日`，会落到前一张卡）。

- `RhythmCard.vue` 的五段 scale 是**刻意不同的主题变量色系**（`$primary` / `$warning` / `$up`，仅 `seg-low` 的 `#4d7cfe` 与唯一副本的 `normal` 同值），**明确豁免不迁移**，勿误判为漏迁移。

## 数据源

- `agentApi.getRhythmMaster(date)`（`src/shared/api/modules/agent.ts`）：GET `/agent/rhythm-master/:date`，返回 `{ date, versions: [{ refresh_slot, created_at, content }] }`

- `agentApi.getRhythmMasterCalendar(days)`：GET `/agent/rhythm-master/calendar?days=N`（N 默认 60，≤60 交易日），返回 `{ days: [{ date, refresh_slot, level, score, basis_date, position_band, events? }] }`，恒取 after\_close 收盘基准行（三时点 level 恒等）。**`position_band`（2026-09-02 扩展）：该日收盘基准建议仓位** **`{min?, max?, text?}`，行缺失/null = 无仓位语义（如实展示）**，供日历面板/详情页与首页近 5 日摘要使用。**`events`（2026-09-03 扩展）：该日 macro 事件行**（CN + US 隔夜按对外契约顺延；类型标可选 `events?` 以兼容缺省/降级响应——**后端恒下发，无事件 =** **`[]`**）

- **洞见卡映射与去重（2026-09-03）**：详情页 RhythmCard 前插入统一摘要洞见卡（InsightCard，type=market / tag-text=节奏洞见）；洞见卡映射规则（owner 表 + structured 规则）与 RhythmCard 去重清单见实施计划 docs/superpowers/plans/2026-09-03-rhythm-calendar-inline-panel.md（Task 4/6）与 `utils/rhythmInsight.ts`（toRhythmInsight）。**2026-09-04 扩展**：事件分支（`kind='enum'`）已纳入 structured——`condition = indicator + value`（如 `CPI 数据公布预期差超预期`，取 `value` 防 label 错位），`met` 透传用于点亮/置灰。

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
| `next_event_anchor`            | `{ title, event_date, days_until, note }?` | 下一重大事件锚点（窗口内首条 high 事件 + 距目标交易日**交易日差**，2026-09-14 由自然日改为交易日口径；`note` ∈ 今日/明日/N 天后；无锚点整块不渲染） |
| `conflict` / `conflict_detail` | boolean / string?                          | 多空冲突标记与详情                                                       |
| `branches`                     | `RhythmBranch[]`                           | 条件分支（interval/enum 条件 → 结论 direction/range/validity）            |
| `data_missing`                 | string\[]?                                 | 缺失数据项清单                                                         |

## 分支语义（design-debate A1 裁决，2026-08-30）

- `condition.label` = **触发条件**（如"收盘站上 3994 压力位"），`conclusion.range` = **目标参考区间**（触发后的目标空间，非触发条件本身）

- range 由 engine 锚定突破后空间：bullish `[P, P+Δ]` / bearish `[S-Δ, S]` / neutral `[S, P]`（Δ=半通道宽），触发值=区间边界

- 点位来源脚注：支撑位=近 20 日最低价与 20 日均线×0.97 取较大者；压力位=近 20 日最高价与 20 日均线×1.03 取较小者

- 事件分支（enum）公布前 range 为空 → 显示"结果待公布"占位

## 日历面板网格契约（契约 #7，2026-09-03 起内嵌详情页）

- 独立日历总览页已废弃（`pages/calendar.vue` 删除）；60 日热力网格内嵌为详情页顶部 `RhythmCalendarPanel`，**两条数据源分别取数**：折叠态近 7 交易日紧凑条走交易日数据源 `getRhythmMasterCalendar(60)`（days=60，仅交易日，不含周末/节假日）、展开态 60 日自然月网格走自然日数据源 `getRhythmMasterCalendar(60, 60)`（naturalDays=60，含周末），不再逐日请求

- 网格按交易日（服务端展开，前端不依赖交易日历），展开态为自然周网格：周一列开头、周末列留空

- 档位色板/短码唯一副本见 `src/shared/utils/rhythmColors.ts`（ice 紫灰 `#8a6fae` / low 青 `#2f9e9e` / normal 主蓝 `#4d7cfe` / active 橙 `#f59e0b` / euphoria 红 `#ef4444`；灰格 `#eceef1`），禁止组件内第二份副本

- `level=null` = 灰格（行缺失 / 沿用前值），如实展示不伪造

- 展开态默认展开（`rhythm.calendar.expanded` storage 记忆）；仓位/事件 Segmented 仅展开态展示；事件模式 = macro 角标（high 红点+计数 / medium-low 灰点）+ 选中日事件行（影响度·时间·标题 / result 尾注 / US 隔夜角标），空日显示「当日无宏观事件」，不标点不填充

- 点格切日 = 面板 `pick` 事件上抛，详情页原地重拉该日三时点版本（无页面跳转）

## 预判分支契约（RhythmBranch v2，2026-09-03）

- `branch` 结构新增 **`position_action`（结构化仓位动作，需求方核心）**：`{ direction: 'add'|'reduce'|'hold', change: string, band?: RhythmPositionBand|null }`——`change` 为成数文案（如 `"+2 成"`/`"-1 成"`/`"持仓不变"`），由后端确定性算法算，前端不臆断；`add`→加仓、`reduce`→减仓、`hold`→观望。

- 新增 **`anchor`（可验证锚点）**：`{ metric: 'index_close'|'close'|'high'|'low', threshold: string, direction: 'bullish'|'bearish'|'neutral' }`——供验证器机械判 hit/miss。

- 新增 **`touch_strength`（历史触碰强度）**：`number|null`，**非命中概率**，与 `validity`（有效天数）语义分离。

- `conclusion.range` 降级为辅助（scenario 参考），不再当主输出。

- `position_action` / `anchor` 为可选（`?`），旧报告无则回退展示。

- 新增 **`met`（事件分支公布后标记）**：`boolean|null`——公布后已实现 `true`（点亮）、未实现 `false`（置灰）、未公布 `null`（待观察）。事件分支（`kind='enum'`）公布前 `range=""`、`note="结果待公布，公布后按预期差落档"`、`met=null`；公布后命中预期差的分支 `met=true` 并回填 `range`（engine 确定性取），其余同事件分支 `met=false`。

## 日历面板数据源（2026-09-03）

- 展开态（iOS 日历样式）：`getRhythmMasterCalendar(60, 60)` 走 **`naturalDays=60`** 拉近 60 自然日（**含周末/节假日**），渲染完整自然月网格 + 翻页（上月/下月/今天）；周末/节假日格 `level=null` 灰格如实展示但**可 pick**（看该日 macro 事件）。

- 折叠态（近 7 交易日紧凑条）：`getRhythmMasterCalendar(60)` 走 **`days=60`（交易日）**，**只展示交易日**（周末不混入）——两数据源独立。

- 事件角标/模式（high 红点 / medium-low 灰点）语义不变。

## 约束

- 所有字段缺失按可选处理，页面必须容忍 `rhythm_card` 缺失（报告可能处于降级态）。

- 分支结论 `direction`：`'bullish' | 'bearish' | 'neutral'`；`validity` 为结论有效天数（number）。

