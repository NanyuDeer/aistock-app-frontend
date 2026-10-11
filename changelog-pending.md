# 待提交修改（aistock-app-frontend）

## 2026-10-11 — 风口两档默认改短线 + 首页风口洞见卡改短线口径

### 变更文件

- `src/modules/market/pages/leaders.vue`
  - 两档切换项顺序调整：`CYCLE_OPTIONS` 由「长线风口榜 → 短线风口榜」改为「短线风口榜 → 长线风口榜」（仅展示顺序，取数与分档过滤逻辑未动）。
  - 默认档位由长线改为短线：`activeCycle` 初值 `'long'` → `'short'`，首屏即渲染短线风口数据（泡泡图标题/空态文案本已随 `activeCycle` 变化，自洽）。
  - 加载失败文案去档位指向：`'长线风口数据加载失败'` → `'风口数据加载失败'`（该加载同时服务两档，非长线专属）。
- `src/modules/home/components/MorningContent.vue`
  - 「风口洞见」卡改为真正的短线口径：`loadLeaderSectors` 改取 `getWindLeaders(20)`（控制器上限，确保排在长线榜之后的短线榜板块也在列），再按后端短线榜口径 `cycle ∈ short/both` + `freq20` 降序（同值按 `short_heat` 降序）重建排序取前 3。
  - 修正上一版错误：`getWindLeaders(8)` 返回的只是双榜合并数组（`applyDualRankings`）的前 8 项 = 长线榜，在其上做 `cycle` 过滤实为「既长又短」的子集，并非短线榜前 3。
  - `extractSectorPreview` 不再按 `score` 重排（改为保留调用方传入的榜单顺序）；相关注释与错误日志文案由「长线风口」改为「短线风口」。
- `src/modules/market/AGENTS.md` — `pages/leaders.vue` 条目同步为「短线风口榜在前、长线在后 + 默认展示短线档」。
- `src/modules/home/AGENTS.md` — 功能范围中「长线风口预览」同步为「短线风口预览」并注明 `cycle` short/both 口径。

### 验证

- `npx vue-tsc --noEmit`：EXITCODE=0，无本次改动引入的类型错误。
- `npx vitest run tests/WindLeaderBubble.test.ts`：14 passed。
- `npm run test:node`：实际 284/284/0，与仓库基线 `EXPECTED_BASELINE=284/284/0` 一致（未因本次改动漂移；相关 node:test spec 为 `MorningContent.spec.ts`，未断言档位顺序/默认档/取数口径，无需同步断言）。
