# 大盘溯源报告页重构 - 设计文档

> 日期：2026-08-01
> 模块：aistock-app-frontend / modules/analytics
> 路径：`modules/analytics/pages/traceability`（标题「大盘溯源」）
> 数据源：后端 `GET /api/agent/report/review/:date`（schema_version 2.0）
> 参考样本：`aistock-agent-py/docs/outputs/溯源/2026-07-23-review.md`（成功态）、`2026-07-31-review.md`（证据不足态）

## 1. 背景与目标

### 现状

`traceability.vue` 通过 `agentApi.getMarketTraceReview(date)` 拉取后端 schema 2.0 工件，但 `toMarketTraceViewModel()` 仅从 `display_report` 取 `summary / details(markdown) / sectors / risks` 四个字段，用 `rich-text` 把 markdown 转 HTML 简单渲染。结果：

- 主因果链 6 步骤（structural_root → trigger → transmission → exposure → repricing → observable_result）丢失结构化展示
- 备选解释、已排除解释、证据索引、未解问题、缺失证据等章节全部坍缩进 markdown
- 成功态（有 supported 候选）与证据不足态（无 supported）无差异化提示
- 板块排序仅展示板块名 tag，丢失涨跌幅

### 目标

**前端做规则提取**（不调 LLM、纯字段映射 + 文本拼接 + 重排 + 剔除），从 schema 2.0 的 `market_trace.snapshot` + `market_trace.trace` 完整提取结构化字段，按用户指定的展示顺序重排，剔除冗余章节，区分成功态与证据不足态。

### 改造范围

仅重构 `traceability.vue` 页面及其依赖的 `marketTraceReview.ts` 工具、`agent.ts` 类型定义、`modules/analytics/components/` 子组件。不修改后端、不影响其他页面。

### 不在范围

- H5 宽屏（xl ≥ 1024px）特殊适配：用户明确「H5 不用管」，H5 在 PC 浏览器中按手机端布局自然渲染即可
- 后端 schema 字段补全（除 scoring 字段外，其他都是字段名/路径差异，前端自行处理）
- 其他页面的跨端适配（本 spec 仅针对 traceability 页面）

## 2. 字段提取规则

### 输入

后端 `MarketTraceReviewRecord.content`（schema_version = "2.0"）的完整字段树：

```
content
├── display_report.{summary, details, stocks, sectors, risks}   # 旧展示层（仅 sectors 用作 fallback name list）
├── podcast_brief                                                 # 恒为 ""
├── schema_version: "2.0"
├── snapshot_id: string
└── market_trace
    ├── snapshot: MarketTraceSnapshot
    │   ├── snapshot_id / trade_date / captured_at
    │   ├── a_share.{indexes, breadth, turnover, limits, main_force, sectors}
    │   │   └── sectors: { top_gainers, top_losers, top_inflows, top_outflows }  # 每个 list[dict]，含 name/pct_change/net_amount
    │   ├── sources: dict[str, SourceRecord]                                     # dict，需 Object.values() 转 list
    │   │   └── SourceRecord: { source_id, kind, provider, title, content, url, occurred_at, captured_at, source_level }
    │   ├── missing_fields: list[str]                                            # 如 a_share.main_force.large_and_extra_large_net_yuan
    │   └── phenomenon_discovery
    │       ├── status / primary / concurrent_phenomena / data_readiness / diagnostics
    │       └── primary: { kind, summary, severity, fact_ids, tags }
    └── trace: MarketTraceResult
        ├── schema_version: "1.1"
        ├── attribution_status: "confirmed" | "hypothesis" | "insufficient" | "not_applicable"
        ├── candidates: list[CandidateExplanation]
        │   └── CandidateExplanation
        │       ├── id: str                          # = category（4 选 1）
        │       ├── category: "global_risk_liquidity" | "domestic_macro_policy" | "industry_technology_supply" | "market_positioning_liquidity"
        │       ├── status: "supported" | "weak" | "rejected" | "insufficient"
        │       ├── verdict: str                     # 结论文本
        │       ├── chain: CausalChain | None
        │       │   └── nodes: list[CausalNode]      # 按 6 阶段顺序
        │       │       └── CausalNode: { stage, claim, evidence_ids[] }
        │       ├── supporting_evidence_ids: list[str]
        │       └── counter_evidence_ids: list[str]
        ├── primary_chain_id: str | None
        ├── alternative_chain_id: str | None
        ├── confidence: "high" | "medium" | "low"
        └── unresolved_questions: list[str]
```

### 输出展示规则

按以下顺序提取并展示（参考用户给出的 7-23 样例输出反推）：

| # | 输出字段 | 来源路径 | 提取规则 |
|---|---------|---------|---------|
| 1 | `reportTitle` | `snapshot.trade_date` | 模板 `${trade_date} A股收盘溯源` |
| 2 | `pendingRisks` | `trace.unresolved_questions` + `snapshot.missing_fields` | 合并展示：未解问题 1:1 列出原句；缺失证据以「缺失数据：xxx」格式追加在末尾 |
| 3 | `phenomenon.summary` | `snapshot.phenomenon_discovery.primary.summary` | 直接取 |
| 3a | `phenomenon.severity` | `snapshot.phenomenon_discovery.primary.severity` | low / medium / high |
| 3b | `phenomenon.indexPerformance` | `snapshot.a_share.indexes` | 抽取关键指数（上证/深证/创业板/沪深300/中证500/中证1000）+ 涨跌幅 |
| 3c | `phenomenon.topGainers` | `snapshot.a_share.sectors.top_gainers[:5]` | 领涨前 5 板块名 + 涨跌幅 |
| 3d | `phenomenon.topLosers` | `snapshot.a_share.sectors.top_losers[:5]` | 领跌前 5 板块名 + 涨跌幅 |
| 4 | `primaryCause` | `primary_chain_id` 指向的候选（通常是 supported，但以指针为准而非 status） | 取 `verdict`（结论）+ `chain.nodes[trigger].claim`（触发）+ `chain.nodes[transmission].claim`（传导）+ 拼接 `repricing.claim + observable_result.claim`（结果）+ `supporting_evidence_ids`（参考来源） |
| 5 | `alternatives[]` | `alternative_chain_id` 指向的候选（通常 1 条 weak，作为弱支持主因的备选）；若 `alternative_chain_id=null` 且无 supported（证据不足态），则所有 weak 候选都归入 | 每条：`verdict` + `chain.nodes[transmission].claim` + `counter_evidence_ids` |
| 6 | `rejected[]` | 其他未被 primary/alternative 指向的候选（含 rejected / insufficient / 未被 alternative_chain_id 指向的 weak，如 7-23 的 domestic_macro_policy weak） | 每条：`verdict` + 排除原因（基于 `counter_evidence_ids` + `status` 推断一句简短描述） |
| 7 | `sectorRanking` | 与 3c/3d 同源 | 单独章节呈现：领涨 5 + 领跌 5 |

### 剔除内容

- 元数据（frontmatter：generated_at / finished_at / duration_seconds / trading_day / agent / report_date）
- 内部证据索引（整章剔除，不展示给用户；如需查看证据详情，进入折叠兜底的 markdown）
- 重复展开（structural_root / exposure 通常并入结果或忽略）
- 弱解释冗长段落（仅保留 verdict + transmission + counter_evidence 三段）

### 状态分叉

判定以 `trace.primary_chain_id` 是否为 null 为准（与后端 `attribution_status` 对齐）：

| 状态 | 判定条件 | 展示差异 |
|------|---------|---------|
| **成功态**（7-23） | `trace.primary_chain_id` 不为 null | `primaryCause` = primary_chain_id 指向的候选；`alternatives` = alternative_chain_id 指向的候选（通常 1 条 weak）；`rejected` = 其他候选 |
| **证据不足态**（7-31） | `trace.primary_chain_id` 为 null | `primaryCause` 显示「证据不足，未确认主因」提示卡片；`alternatives` = 所有 weak 候选（无 alternative_chain_id 指向也归入）；`rejected` = 所有 rejected + insufficient 候选；`pendingRisks` 顶部追加 missing_fields |

**关键**：候选归类以 `primary_chain_id` / `alternative_chain_id` 指针为准，而非纯 `status` 字段。7-23 的 `domestic_macro_policy` 虽然 status="weak"，但未被 `alternative_chain_id` 指向，归入 `rejected`。

## 3. ViewModel 字段定义

`src/modules/analytics/utils/marketTraceReview.ts` 扩展：

```typescript
// 新增类型树
export interface MarketTracePresentation {
  // 元信息
  reportTitle: string                 // `${trade_date} A股收盘溯源`
  reportDate: string                  // snapshot.trade_date
  generatedAt: string                 // snapshot.captured_at
  snapshotId: string                  // content.snapshot_id
  attributionStatus: 'confirmed' | 'hypothesis' | 'insufficient' | 'not_applicable'
  confidence: 'high' | 'medium' | 'low'
  isFallback: boolean                 // report_date !== requestedDate

  // 1. 待验证风险
  pendingRisks: {
    openQuestions: string[]           // trace.unresolved_questions
    missingEvidence: string[]         // snapshot.missing_fields
  }

  // 2. 核心现象
  phenomenon: {
    kind: string                      // primary.kind
    kindLabel: string                 // 中文标签映射（broad_rally→「普涨」/ sector_concentration→「板块集中异动」/ ...）
    summary: string                   // primary.summary
    severity: 'low' | 'medium' | 'high'
    severityLabel: string             // 中文（低/中/高）
    factIds: string[]                 // primary.fact_ids
    indexPerformance: IndexPerf[]    // snapshot.a_share.indexes 提取（数据结构待实现时确认：可能是 list[{name, pct_change}] 或 dict，提取函数对两种格式做兼容）
    topGainers: SectorItem[]          // top_gainers[:5]
    topLosers: SectorItem[]           // top_losers[:5]
  }

  // 3. 主因（无 supported 候选时为 null）
  primaryCause: PrimaryCause | null
  // 4. 候选解释（weak 候选）
  alternatives: Alternative[]
  // 5. 已排除/证据不足（rejected + insufficient 候选）
  rejected: RejectedItem[]

  // 6. 板块排序（与 phenomenon.topGainers/topLosers 同源，单独章节呈现）
  sectorRanking: {
    topGainers: SectorItem[]
    topLosers: SectorItem[]
  }

  // 兜底
  markdownDetails: string             // content.display_report.details（折叠展示）
}

export interface PrimaryCause {
  categoryId: string                  // candidate.id（如 industry_technology_supply）
  categoryLabel: string               // 中文标签映射
  conclusion: string                  // candidate.verdict
  trigger: string                     // chain.nodes[trigger]?.claim
  transmission: string                // chain.nodes[transmission]?.claim
  result: string                      // chain.nodes[repricing].claim + chain.nodes[observable_result].claim 拼接
  supportingEvidence: string[]        // candidate.supporting_evidence_ids
}

export interface Alternative {
  categoryId: string
  categoryLabel: string
  conclusion: string                  // verdict
  transmission: string
  counterEvidence: string[]           // counter_evidence_ids
}

export interface RejectedItem {
  categoryId: string
  categoryLabel: string
  status: 'rejected' | 'insufficient'
  conclusion: string                  // verdict
  reason: string                      // 基于 counter_evidence + status 推断一句
}

export interface SectorItem {
  name: string
  pctChange: number | null
}

export interface IndexPerf {
  name: string
  pctChange: number | null
}

// 提取函数签名
export function toMarketTracePresentation(
  record: MarketTraceReviewRecord,
  requestedDate: string,
): MarketTracePresentation | null
```

**保留旧 `MarketTraceViewModel` + `toMarketTraceViewModel` 不删除**（避免破坏现有调用），新函数 `toMarketTracePresentation` 并行存在。`traceability.vue` 切换到新函数后，可在后续 PR 清理旧函数。

## 4. UI 设计

### 4.1 章节顺序（成功态，7-23）

```
┌─ MarketTraceHeader（元信息卡片）
│  - 标题：2026-07-23 A股收盘溯源
│  - 报告日期 / 生成时间 / 数据来源 / 归因可信度
│  - 状态 Badge（已更新/生成中/不可用/失败）
│
├─ MarketTracePendingRisks（待验证风险）
│  - 兵装重组概念大涨无明确公开消息源，触发因素未证实。
│  - 全球市场数据缺失，无法评估外部流动性冲击。
│  - 主力资金明细缺失，资金流向验证不完整。
│
├─ MarketTracePhenomenon（核心现象）
│  - 类型：板块集中异动（sector_concentration）
│  - 摘要：概念板块集中异动，与大盘方向相反
│  - 严重度：中（medium）
│  - 指数表现：上证 +0.25% / 深证成指 / 创业板指 / 沪深300 / 中证500 / 中证1000
│  - 领涨：兵装重组概念 +6.39% / 可燃冰 +5.67% / ...
│  - 领跌：国家大基金持股 -3.36% / 存储芯片 -1.59% / ...
│
├─ MarketTraceTimeline（主因 - 时间线）
│  - 主因：能源板块受益油价高企、军工重组概念异动...
│  - 触发 → 传导 → 结果（3 段精简，6 步骤合并）
│  - 参考来源：SEARCH_007, SEARCH_008, SECTORS_ALL
│
├─ MarketTraceAlternatives（备选解释）
│  - 资金轮动（弱支持）
│    缩量环境下资金轮动明显...
│    反证：MAIN_FORCE_ALL
│
├─ MarketTraceRejected（已排除的解释）
│  - 全球风险事件：未能压制A股，大盘温和上涨且广度极佳，与风险厌恶逻辑相悖
│  - 中美互减关税：可解释大盘温和上涨，但无法解释芯片板块大幅分化下跌
│
├─ MarketTraceSectors（板块强弱）
│  - 领涨：兵装重组概念、可燃冰、柔性直流输电、赛马概念、金属锌
│  - 领跌：国家大基金持股、存储芯片、汽车芯片、MCU芯片、中芯国际概念
│
└─ 折叠：完整 Markdown 报告（兜底）
   - 展开后显示 display_report.details
```

### 4.2 章节顺序（证据不足态，7-31）

差异点：
- `MarketTracePendingRisks` 顶部追加「缺失数据：a_share.main_force..., global_markets」
- `MarketTraceTimeline` 替换为「证据不足，未确认主因」提示卡片（黄色警示样式，无时间线）
- `MarketTraceAlternatives` 标题改为「候选解释」（弱支持的 weak 候选）
- `MarketTraceRejected` 标题改为「证据不足的解释」（含 insufficient 候选）

### 4.3 状态映射

| 后端 attribution_status | 前端展示 |
|---|---|
| `confirmed` | 成功态，主因时间线完整 |
| `hypothesis` | 成功态，但主因 Badge 标注「假设」 |
| `insufficient` | 证据不足态，无主因 |
| `not_applicable` | 证据不足态，无主因 |

## 5. 跨端适配

### 5.1 范围

仅适配：
- ✅ 手机端（sm < 480px，含华为双折叠折叠态外屏）
- ✅ 平板端（md/lg 480-1024px，含华为双折叠展开态内屏、iPad）
- ❌ H5 宽屏（xl ≥ 1024px）：用户明确「H5 不用管」，PC 浏览器中按手机端布局自然渲染（不做宽屏特殊处理）

### 5.2 断点系统

| 断点 | 范围 | 设备 |
|------|------|------|
| sm | < 480px | 手机竖屏 / Mate X 折叠态外屏 |
| md | 480-768px | 手机横屏 / 小平板 |
| lg | 768-1024px | iPad 竖屏 / Mate X 展开态内屏 |

### 5.3 章节级布局策略

| 章节 | sm（手机） | md+ | lg+ |
|------|----------|-----|------|
| Header 元信息卡片 | 单列 | 单列 | 单列 |
| PendingRisks 待验证风险 | 单列 | 单列 | 单列 |
| Phenomenon 核心现象 | 单列；指数/板块上下堆叠 | 双列（指数 \| 板块） | 双列 |
| Timeline 主因时间线 | **垂直**时间线（步骤纵向连线） | 水平时间线 | 水平 + 双列 |
| Alternatives / Rejected | 单列 | 双列 | 双列 |
| Sectors 板块强弱 | 横滚 tag | 网格（4 列） | 网格（5 列） |
| 折叠 Markdown | 单列 | 单列 | 单列 |

### 5.4 实现方式

- **样式单位**：rpx（已有约束，750rpx = 屏幕宽度）
- **断点检测**：新增 `shared/utils/useResponsive.ts` hook，基于 `uni.getSystemInfoSync().windowWidth` + 监听 resize（H5）；App 端无 resize，初始化时一次性判断
- **断点变量**：新增 `shared/styles/breakpoints.scss`，定义 `$bp-sm: 480px / $bp-md: 768px / $bp-lg: 1024px`
- **媒体查询**：组件内用 `@media (min-width: $bp-md) { ... }` 覆盖 sm 默认样式
- **Timeline 组件**：`MarketTraceTimeline.vue` 接受 `layout: 'vertical' | 'horizontal'` prop，由父组件根据断点传入

### 5.5 华为双折叠适配

- **折叠态**（外屏 ~6.45"，CSS 像素类似手机 375x812）：按 sm 断点处理
- **展开态**（内屏 ~7.9"，CSS 像素约 768+）：按 lg 断点处理（与 iPad 一致）
- **关键**：折叠/展开切换时，App 端无 resize 事件，但用户重新进入页面时会重新读 `uni.getSystemInfoSync()`，自然适配

## 6. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/shared/api/modules/agent.ts` | 修改 | 扩展 `MarketTraceReviewRecord.content.market_trace` 类型树（补全 `trace.candidates[]` + `trace.attribution_status` + `snapshot.phenomenon_discovery` + `snapshot.a_share.sectors` + `snapshot.sources` + `snapshot.missing_fields` 等完整字段） |
| `src/modules/analytics/utils/marketTraceReview.ts` | 修改 | 新增 `toMarketTracePresentation()` 提取函数 + `MarketTracePresentation` 类型树；保留旧 `MarketTraceViewModel` 兼容；新增中文标签映射常量（CATEGORY_LABELS / PHENOMENON_KIND_LABELS / SEVERITY_LABELS） |
| `src/modules/analytics/components/MarketTraceHeader.vue` | 新增 | 元信息卡片（标题 + 日期 + 状态 Badge + 置信度） |
| `src/modules/analytics/components/MarketTracePendingRisks.vue` | 新增 | 待验证风险列表（未解问题 + 缺失证据） |
| `src/modules/analytics/components/MarketTracePhenomenon.vue` | 新增 | 核心现象卡片（类型 + 摘要 + 严重度 + 指数 + 领涨领跌） |
| `src/modules/analytics/components/MarketTraceTimeline.vue` | 新增 | 主因时间线（vertical / horizontal prop） |
| `src/modules/analytics/components/MarketTraceAlternatives.vue` | 新增 | 候选解释列表 |
| `src/modules/analytics/components/MarketTraceRejected.vue` | 新增 | 已排除 / 证据不足列表 |
| `src/modules/analytics/components/MarketTraceSectors.vue` | 新增 | 板块排序（领涨 5 + 领跌 5） |
| `src/modules/analytics/pages/traceability.vue` | 重构 | 组装新组件，删除 markdown rich-text 主渲染（保留折叠兜底），加跨端 SCSS |
| `src/shared/utils/useResponsive.ts` | 新增 | 响应式断点 hook |
| `src/shared/styles/breakpoints.scss` | 新增 | 统一断点变量 |

## 7. 实现顺序

1. **类型扩展**：`agent.ts` 补全 `market_trace.trace.candidates[]` + `market_trace.snapshot.phenomenon_discovery` + `market_trace.snapshot.a_share.sectors` 等字段类型
2. **提取函数**：`marketTraceReview.ts` 新增 `toMarketTracePresentation()`，从后端 schema 2.0 字段路径提取并重排为 `MarketTracePresentation`；写中文标签映射常量
3. **单元测试**：`marketTraceReview.spec.ts`，用 7-23（成功态）+ 7-31（证据不足态）两份报告的 schema 2.0 fixture 作为输入，断言输出 ViewModel 字段映射正确
4. **响应式 hook**：`useResponsive.ts` + `breakpoints.scss`
5. **子组件**：按 4.1/4.2 章节顺序实现 7 个子组件
6. **页面重构**：`traceability.vue` 切换到 `MarketTracePresentation`，组装子组件，加跨端 SCSS
7. **验证**：`pnpm type-check` + `pnpm test` + 浏览器多视口截图

## 8. 测试策略

### 8.1 单元测试

`src/modules/analytics/utils/marketTraceReview.spec.ts`：

- **Fixture 来源**：从后端 DB 导出 7-23 和 7-31 的 `analysis_reports.content` JSON（schema 2.0），存为 `src/modules/analytics/utils/__fixtures__/market-trace-2026-07-23.json` + `market-trace-2026-07-31.json`
- **测试用例**：
  - 7-23 成功态：断言 `primaryCause` 不为 null，包含 trigger/transmission/result/supportingEvidence
  - 7-23 成功态：断言 `alternatives` 有 1 条（market_positioning_liquidity weak）
  - 7-23 成功态：断言 `rejected` 有 2 条（global_risk_liquidity rejected + domestic_macro_policy weak）
  - 7-31 证据不足态：断言 `primaryCause` 为 null
  - 7-31 证据不足态：断言 `alternatives` 有 2 条（global_risk_liquidity + domestic_macro_policy weak）
  - 7-31 证据不足态：断言 `rejected` 有 2 条（industry_technology_supply + market_positioning_liquidity insufficient）
  - 7-31 证据不足态：断言 `pendingRisks.missingEvidence` 含 `a_share.main_force.large_and_extra_large_net_yuan` + `global_markets`
  - 边界：record.status != 'completed' 时返回 null
  - 边界：content.schema_version != '2.0' 时返回 null

### 8.2 组件测试

- 每个子组件给定 props 渲染快照（vitest + @vue/test-utils）
- 重点测 `MarketTraceTimeline` 的 vertical/horizontal 两种布局
- 重点测 `MarketTracePhenomenon` 的 topGainers/topLosers 红涨绿跌颜色（#f43f5e / #22c55e）

### 8.3 E2E 视觉验证

- H5 dev server 启动后，浏览器打开 `/modules/analytics/pages/traceability`
- 视口 1：375x812（iPhone X，手机端 sm）
- 视口 2：768x1024（iPad 竖屏，平板 lg）
- 视口 3：820x1180（华为双折叠展开态近似）
- 三视口截图对比，确认布局无崩溃、时间线方向切换正确、双列布局生效

## 9. 后端依赖

### 9.1 字段完整性

- ✅ `trace.candidates[]`：完整（id/category/status/verdict/chain.nodes/supporting_evidence_ids/counter_evidence_ids）
- ✅ `trace.primary_chain_id` / `alternative_chain_id`：完整（可能为 null）
- ✅ `trace.attribution_status` / `trace.confidence` / `trace.unresolved_questions`：完整
- ✅ `snapshot.phenomenon_discovery.primary`：完整（kind/summary/severity/fact_ids/tags）
- ✅ `snapshot.a_share.sectors.{top_gainers, top_losers}`：完整（含 name/pct_change）
- ✅ `snapshot.sources`：完整（dict，前端 `Object.values()` 转换）
- ✅ `snapshot.missing_fields`：完整

### 9.2 唯一缺失：scoring 字段

后端 schema 无数字评分字段，只有 `severity` (low/medium/high)。7-23 报告 markdown 中的「评分：2」是旧版渲染输出（`phenomenon_discovery.py._score_rules()` 内部计算 int 分数但未暴露到 schema）。

**处理方案**：前端用 `severity` 文本（low/medium/high → 低/中/高）替代数字评分，与 7-31 新版报告一致。如未来需要数字评分，再要求后端在 `DetectedPhenomenon` 加 `score: int` 字段并修改 `phenomenon_discovery.py`。

### 9.3 Fixture 数据获取

- 单元测试 fixture：从后端 DB 导出 `analysis_reports` 表 7-23 和 7-31 的 content JSON
- 导出命令（在后端服务器执行）：`docker exec -i pg psql -U root -d aistock -c "SELECT content FROM analysis_reports WHERE report_date IN ('2026-07-23', '2026-07-31') AND report_type = 'review_full';" > fixtures.json`
- 或通过 API 拉取：`curl http://localhost:56790/api/agent/report/review/2026-07-23`

## 10. 验收标准

### 10.1 功能验收

- [ ] 7-23 报告渲染：主因时间线完整展示「触发 → 传导 → 结果」+ 参考来源
- [ ] 7-23 报告渲染：备选解释展示 1 条（资金轮动 weak）
- [ ] 7-23 报告渲染：已排除展示 2 条
- [ ] 7-23 报告渲染：板块强弱展示领涨 5 + 领跌 5
- [ ] 7-31 报告渲染：主因位置显示「证据不足，未确认主因」提示
- [ ] 7-31 报告渲染：候选解释展示 2 条 weak
- [ ] 7-31 报告渲染：证据不足的解释展示 2 条 insufficient
- [ ] 7-31 报告渲染：待验证风险顶部含缺失数据列表
- [ ] 红涨绿跌颜色正确（#f43f5e / #22c55e）
- [ ] 折叠 markdown 兜底可展开查看完整报告

### 10.2 跨端验收

- [ ] 手机端（375x812）：单列垂直布局，时间线垂直
- [ ] 平板端（768x1024）：双列布局，时间线水平
- [ ] 华为双折叠展开态（820x1180）：与平板端一致
- [ ] H5 在 PC 浏览器宽屏：能正常渲染（不做宽屏特殊处理，按手机端布局自然显示）

### 10.3 工程验收

- [ ] `pnpm type-check` 通过
- [ ] `pnpm test` 通过（含新增 spec）
- [ ] 无新增 any 类型（用 unknown）
- [ ] 颜色全部用 variables.scss 变量
- [ ] 单位用 rpx
- [ ] 禁用 emoji（用 SvgIcon）

## 11. 风险与降级

| 风险 | 影响 | 降级方案 |
|------|------|---------|
| 后端 schema 2.0 字段实际不完整（如某些 candidates 缺 chain.nodes） | 提取函数返回部分字段为空 | 提取函数对每个字段做 optional chaining + 默认空值；空字段对应 UI 区块隐藏（v-if） |
| `snapshot.a_share.sectors.top_gainers` 数据为空 | 板块强弱章节无内容 | 显示「本日板块数据暂无」空状态 |
| 后端返回 schema_version != "2.0"（旧数据） | 提取失败 | 回退到旧 `toMarketTraceViewModel` + markdown 渲染（保留兼容路径） |
| 单元测试 fixture 无法从后端导出 | 测试无法运行 | 手工从 7-23/7-31 .md 反推 schema 2.0 fixture（耗时但可行） |
| 华为双折叠展开态 CSS 像素实际与预期不符 | 布局错位 | 用 `useResponsive` hook 运行时检测，按实际 windowWidth 选断点 |

## 12. 不在本 spec 范围

- 后端 review agent 字段补全（除 scoring 外其他无需后端改）
- 其他页面（首页「早点听」入口卡片、晨报等）的跨端适配
- H5 宽屏特殊适配
- 历史报告列表 / 日期切换器（traceability.vue 仍只展示当日 / 最近回退报告）
- 证据索引详情抽屉（仅折叠 markdown 兜底，不做结构化证据详情展示）
