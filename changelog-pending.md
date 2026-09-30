# 待提交修改记录

## 2026-09-30 — 低置信度归因不展示异动卡片

- `src/modules/favorites/components/insightCards.ts`：`TraceEventLike` 新增可选字段 `confidence_level?: 'low' | 'medium' | 'high' | null`；`isUnattributableMovement` 在 `analysis_status === 'unavailable'` 判据之后、`!== 'completed'` 之前新增 `if (m.confidence_level === 'low') return true`。**降级保护**：字段缺失（老 app-api 未升级）或 `null`（无归因结果）时**不隐藏** —— 若按"非 high 即隐藏"会把卡片全部误杀。
- `src/modules/favorites/components/insightCards.spec.ts`：新增 describe「isUnattributableMovement 低置信不展示口径」5 例（low→隐藏 / medium→展示 / high→展示 / 字段缺失→不隐藏 / null→不隐藏）→ 54 pass / 0 fail。
- `src/shared/api/modules/stockTrace.ts`：`StockTraceEvent` 新增 `confidence_level?: 'low' | 'medium' | 'high' | null`（与 app-api 列表字段对齐）。
- `src/modules/favorites/AGENTS.md`：新增「低置信不展示」章节。
- **生效范围（三处统一）**：`pages/monitor.vue`（自选股异动）、`pages/insight.vue`（洞察列表）、`components/AlertContent.vue`（首页洞察块）——三处均复用 `isUnattributableMovement` 过滤，逻辑单点改动即三处生效。
- **验证**：`npx vue-tsc --noEmit` exit 0；H5 浏览器实测（mxfff 账号）监控页与洞察列表页各 **6 张**卡片（改前 10 张），逐条核对：保留均为 medium 归因、已隐藏均为 low、无「归因中」、无 09-30 卡片。
- **涨跌幅口径已核实（非缺陷）**：黄河旋风 600172 09-29 页面显示 **-8%**，而"最新事件"是 -9.7%。经查该日共 6 条事件，`window_end_at` 最新的一条（15:05 打点，-9.70%）归因 `confidence_level='low'` → **被本次新规则隐藏**，`dedupeDailyMovements` 遂取次新的 -8.00%（medium）→ 页面 -8% 是**新口径下的正确结果**，非数据/展示错误。
- **依赖**：app-api 侧 `confidence_level` 需先透出（见 aistock-app-api changelog）；缺失时前端不隐藏，故两仓发布顺序不敏感。

## 2026-09-27 — 宿迁联盛 2026-09-24 归因硬失败事故：定位、临时隐藏、恢复后回退（前端最终仅文档改动）

- `src/modules/favorites/AGENTS.md`：文末新增「宿迁联盛 2026-09-24 归因硬失败事故（2026-09-27 定位并处置，前端最终零改动）」章节（现象 / 跨仓契约根因 / 临时措施已回退 / 最终可见性 / 发布顺序约束 / 另一处独立缺陷）。
- **代码零改动**：定位当天曾在 `insightCards.ts` 加过 `SUPPRESSED_EVENT_IDS` + `isVisibleMovement` 硬编码隐藏该日两条事件；**归因用修复后的代码代跑成功（result `completed`）后已整体回退**，三处消费者（`monitor.vue` / `insight.vue` / `AlertContent.vue`）与 `insightCards.spec.ts` 均回到改动前状态。
- **最终可见性**：恢复出的主因是「证据不足，异动原因未明」→ 命中既有「无结论不展示」规则 → 该日两条都按正常规则不展示（卡片仍不显示，但原因已是"归因完成但无有效结论"，不再是"归因卡住"）。
- 数据层：未改 `stock_trace_events` / `jobs` / `snapshots` 的结构；仅通过 app-api 的 `/internal/stock-trace/results/external` 新增了 1 条真实 result + artifact（等价于生产重投的产出），并把该 job 由 `dead_letter` 置为 `completed`。
- 护栏：`insightCards.spec.ts` 现有用例已覆盖该判定（`completed 无 view + 证据不足 → true`）。
