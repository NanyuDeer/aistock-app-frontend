# 大盘溯源报告页重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 `traceability.vue` 页面，从后端 schema 2.0 完整提取结构化字段（主因果链/候选/已排除/板块/证据/缺失证据），按用户指定顺序重排展示，区分成功态与证据不足态，并完成手机端+平板端+华为双折叠适配。

**Architecture:** 前端做规则提取（不调 LLM、纯字段映射+文本拼接+重排）。`agent.ts` 扩展 `MarketTraceReviewRecord.content.market_trace` 完整类型树；`marketTraceReview.ts` 新增 `toMarketTracePresentation()` 提取函数；新增 7 个 `MarketTrace*.vue` 子组件；`traceability.vue` 切换到新 ViewModel 并删除 markdown rich-text 主渲染（保留折叠兜底）；新增 `useResponsive.ts` + `breakpoints.scss` 做跨端适配。

**Tech Stack:** uni-app + Vue 3 + TypeScript + SCSS；测试用 `node:test` + `node:assert/strict` + tsx（参照现有 `briefingDetail.spec.ts` 风格）；不引入新依赖。

## Global Constraints

- 仓库：`d:\ai_stock_app\aistock-app-frontend`；分支：`changer`（不直接提交 master）
- 测试运行命令：`pnpm test:node`（用 `node --import tsx --test "src/**/*.spec.ts"`），新 spec 文件命名 `*.spec.ts`
- 类型检查命令：`pnpm type-check`（vue-tsc --noEmit）；禁 `any`，用 `unknown`
- 颜色：必须用 `src/shared/styles/variables.scss` 变量；红涨绿跌 `$up:#e54d5e` / `$down:#18a058`
- 单位：rpx（750rpx = 屏幕宽度）；`position:fixed` 不用 100vh
- 禁 emoji，用 `SvgIcon`
- 测试框架：`node:test`（不是 vitest），import 用 `import { test } from 'node:test'` + `import assert from 'node:assert/strict'`
- H5 不做宽屏特殊适配（仅手机+平板+折叠）
- TDD：先写失败测试 → 跑测试看失败 → 写最小实现 → 跑测试看通过 → commit

---

## 文件结构

| 文件 | 操作 | 责任 |
|------|------|------|
| `src/shared/api/modules/agent.ts` | 修改 | 扩展 `MarketTraceReviewRecord.content.market_trace` 类型树 |
| `src/shared/api/modules/agent.spec.ts` | 不动 | 现有测试不破坏 |
| `src/modules/analytics/utils/marketTraceReview.ts` | 修改 | 新增 `MarketTracePresentation` 类型树 + `toMarketTracePresentation()` + 中文标签映射 |
| `src/modules/analytics/utils/marketTraceReview.spec.ts` | 新增 | 单元测试（成功态/证据不足态/边界） |
| `src/modules/analytics/utils/__fixtures__/market-trace-2026-07-23.json` | 新增 | 7-23 fixture（手工从 .md 反推） |
| `src/modules/analytics/utils/__fixtures__/market-trace-2026-07-31.json` | 新增 | 7-31 fixture（手工从 .md 反推） |
| `src/shared/styles/breakpoints.scss` | 新增 | 统一断点变量 `$bp-sm/md/lg` |
| `src/shared/utils/useResponsive.ts` | 新增 | 响应式断点 hook |
| `src/shared/utils/useResponsive.spec.ts` | 新增 | useResponsive 单元测试 |
| `src/modules/analytics/components/MarketTraceHeader.vue` | 新增 | 元信息卡片 |
| `src/modules/analytics/components/MarketTracePendingRisks.vue` | 新增 | 待验证风险列表 |
| `src/modules/analytics/components/MarketTracePhenomenon.vue` | 新增 | 核心现象卡片 |
| `src/modules/analytics/components/MarketTraceTimeline.vue` | 新增 | 主因时间线（vertical/horizontal prop） |
| `src/modules/analytics/components/MarketTraceAlternatives.vue` | 新增 | 候选解释列表 |
| `src/modules/analytics/components/MarketTraceRejected.vue` | 新增 | 已排除/证据不足列表 |
| `src/modules/analytics/components/MarketTraceSectors.vue` | 新增 | 板块排序 |
| `src/modules/analytics/pages/traceability.vue` | 重构 | 组装新组件，删除 markdown rich-text 主渲染，加跨端 SCSS |

---

## Task 1: 扩展 agent.ts 类型树

**Files:**
- Modify: `src/shared/api/modules/agent.ts:56-82`（MarketTraceReviewDisplayReport + MarketTraceReviewRecord）

**Interfaces:**
- Produces: `MarketTraceReviewRecord.content.market_trace.trace.candidates[]` / `trace.primary_chain_id` / `trace.alternative_chain_id` / `trace.attribution_status` / `snapshot.phenomenon_discovery.primary` / `snapshot.a_share.sectors` / `snapshot.sources` / `snapshot.missing_fields` / `snapshot.trade_date` 等完整类型，供 Task 3 的 `toMarketTracePresentation` 消费

- [ ] **Step 1: 扩展类型定义**

在 `src/shared/api/modules/agent.ts` 第 56-82 行（现有 `MarketTraceReviewDisplayReport` + `MarketTraceReviewRecord`）位置替换为：

```typescript
export interface MarketTraceReviewDisplayReport {
  summary?: unknown
  details?: unknown
  sectors?: unknown
  risks?: unknown
}

/* ===== 大盘溯源 schema 2.0 完整类型树（前端只读消费，字段对齐后端 pydantic models） ===== */

export type MarketTraceConfidence = 'high' | 'medium' | 'low'
export type MarketTraceAttributionStatus = 'confirmed' | 'hypothesis' | 'insufficient' | 'not_applicable'
export type MarketTraceCandidateStatus = 'supported' | 'weak' | 'rejected' | 'insufficient'
export type MarketTraceCandidateCategory =
  | 'global_risk_liquidity'
  | 'domestic_macro_policy'
  | 'industry_technology_supply'
  | 'market_positioning_liquidity'
export type MarketTraceCausalStage =
  | 'structural_root'
  | 'trigger'
  | 'transmission'
  | 'exposure'
  | 'repricing'
  | 'observable_result'
export type MarketTracePhenomenonKind =
  | 'broad_rally'
  | 'broad_decline'
  | 'style_divergence'
  | 'sector_concentration'
  | 'sentiment_extreme'
export type MarketTraceSeverity = 'low' | 'medium' | 'high'

export interface MarketTraceCausalNode {
  stage: MarketTraceCausalStage
  claim: string
  evidence_ids?: unknown
}

export interface MarketTraceCausalChain {
  nodes: MarketTraceCausalNode[]
}

export interface MarketTraceCandidateExplanation {
  id: string
  category: MarketTraceCandidateCategory
  status: MarketTraceCandidateStatus
  verdict: string
  chain?: MarketTraceCausalChain | null
  supporting_evidence_ids?: unknown
  counter_evidence_ids?: unknown
}

export interface MarketTraceTrace {
  schema_version?: string
  attribution_status?: MarketTraceAttributionStatus
  candidates?: MarketTraceCandidateExplanation[]
  primary_chain_id?: string | null
  alternative_chain_id?: string | null
  confidence?: MarketTraceConfidence
  unresolved_questions?: unknown
}

export interface MarketTraceDetectedPhenomenon {
  kind?: MarketTracePhenomenonKind
  summary?: string
  severity?: MarketTraceSeverity
  fact_ids?: unknown
  tags?: unknown
}

export interface MarketTracePhenomenonDiscovery {
  status?: 'detected' | 'no_phenomenon' | 'insufficient_data'
  primary?: MarketTraceDetectedPhenomenon | null
}

export interface MarketTraceSectorItem {
  name?: unknown
  pct_change?: unknown
  net_amount?: unknown
}

export interface MarketTraceAShareSectors {
  top_gainers?: MarketTraceSectorItem[]
  top_losers?: MarketTraceSectorItem[]
  top_inflows?: MarketTraceSectorItem[]
  top_outflows?: MarketTraceSectorItem[]
}

export interface MarketTraceAShare {
  indexes?: unknown
  breadth?: unknown
  turnover?: unknown
  limits?: unknown
  main_force?: unknown
  sectors?: MarketTraceAShareSectors
}

export interface MarketTraceSourceRecord {
  source_id?: string
  kind?: 'market_fact' | 'event_evidence'
  provider?: string
  title?: string
  content?: string
  url?: string | null
  occurred_at?: string | null
  captured_at?: string
  source_level?: 'primary' | 'reporting' | 'market_data'
}

export interface MarketTraceSnapshot {
  snapshot_id?: string
  trade_date?: string
  captured_at?: string
  a_share?: MarketTraceAShare
  sources?: Record<string, MarketTraceSourceRecord>
  missing_fields?: unknown
  phenomenon_discovery?: MarketTracePhenomenonDiscovery
}

export interface MarketTraceArtifact {
  snapshot?: MarketTraceSnapshot
  trace?: MarketTraceTrace
}

export interface MarketTraceReviewRecord {
  report_type: string
  report_date: string
  status?: string
  data_source?: string | null
  created_at?: string
  content: {
    schema_version?: string
    snapshot_id?: string
    display_report?: MarketTraceReviewDisplayReport
    market_trace?: MarketTraceArtifact
  }
}
```

注意：移除旧的 `MarketTraceConfidence` 短别名定义（在第 54 行），新定义在类型树中包含；移除旧 `market_trace.snapshot.captured_at` + `market_trace.trace.confidence` 简化结构。

- [ ] **Step 2: 跑类型检查验证**

Run: `pnpm type-check`
Expected: PASS（现有 `marketTraceReview.ts` 用 `record.content.market_trace?.trace?.confidence` + `record.content.market_trace?.snapshot?.captured_at` 仍兼容，因新类型仍是 optional 字段）

- [ ] **Step 3: 跑现有测试验证不破坏**

Run: `pnpm test:node`
Expected: PASS（现有 `agent.spec.ts` 不依赖被删字段）

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/modules/agent.ts
git commit -m "feat(agent): 扩展 MarketTraceReviewRecord 类型树覆盖 schema 2.0 完整字段"
```

---

## Task 2: 准备测试 fixture（7-23 + 7-31）

**Files:**
- Create: `src/modules/analytics/utils/__fixtures__/market-trace-2026-07-23.json`
- Create: `src/modules/analytics/utils/__fixtures__/market-trace-2026-07-31.json`

**Interfaces:**
- Produces: 两份 schema 2.0 JSON fixture，供 Task 3 单元测试 import

**说明：** 后端 `MarketTraceReviewRecord` JSON 结构。fixture 是从 7-23/7-31 两份 .md 报告反推的最小可用 schema 2.0 数据，字段对齐 Task 1 类型树。

- [ ] **Step 1: 写 7-23 成功态 fixture**

创建 `src/modules/analytics/utils/__fixtures__/market-trace-2026-07-23.json`：

```json
{
  "report_type": "review_full",
  "report_date": "2026-07-23",
  "status": "completed",
  "data_source": "review_agent_full",
  "created_at": "2026-07-23T16:05:00+08:00",
  "content": {
    "schema_version": "2.0",
    "snapshot_id": "snap-2026-07-23",
    "display_report": {
      "summary": "概念板块集中异动，与大盘方向相反",
      "details": "# 2026-07-23 A股收盘溯源\n\n（完整 markdown 兜底）",
      "sectors": ["兵装重组概念", "可燃冰"],
      "risks": ["兵装重组概念大涨无明确公开消息源"]
    },
    "market_trace": {
      "snapshot": {
        "snapshot_id": "snap-2026-07-23",
        "trade_date": "2026-07-23",
        "captured_at": "2026-07-23T15:30:00+08:00",
        "a_share": {
          "indexes": [
            { "name": "上证指数", "pct_change": 0.25 },
            { "name": "深证成指", "pct_change": 0.31 },
            { "name": "中证1000", "pct_change": 0.78 }
          ],
          "sectors": {
            "top_gainers": [
              { "name": "兵装重组概念", "pct_change": 6.39 },
              { "name": "可燃冰", "pct_change": 5.67 },
              { "name": "柔性直流输电", "pct_change": 4.12 },
              { "name": "赛马概念", "pct_change": 3.85 },
              { "name": "金属锌", "pct_change": 3.21 }
            ],
            "top_losers": [
              { "name": "国家大基金持股", "pct_change": -3.36 },
              { "name": "存储芯片", "pct_change": -1.59 },
              { "name": "汽车芯片", "pct_change": -1.42 },
              { "name": "MCU芯片", "pct_change": -1.18 },
              { "name": "中芯国际概念", "pct_change": -0.95 }
            ]
          }
        },
        "sources": {
          "SEARCH_007": {
            "source_id": "SEARCH_007",
            "kind": "event_evidence",
            "provider": "tavily",
            "title": "中东紧张局势推高油价",
            "url": "https://example.com/news/007",
            "occurred_at": "2026-07-23T08:00:00+08:00",
            "captured_at": "2026-07-23T15:30:00+08:00",
            "source_level": "reporting"
          },
          "SECTORS_ALL": {
            "source_id": "SECTORS_ALL",
            "kind": "market_fact",
            "provider": "tushare:sectors",
            "title": "全市场板块涨跌幅",
            "url": null,
            "occurred_at": null,
            "captured_at": "2026-07-23T15:30:00+08:00",
            "source_level": "market_data"
          }
        },
        "missing_fields": [],
        "phenomenon_discovery": {
          "status": "detected",
          "primary": {
            "kind": "sector_concentration",
            "summary": "概念板块集中异动，与大盘方向相反",
            "severity": "medium",
            "fact_ids": ["SECTORS_ALL"],
            "tags": ["sector_divergence"]
          }
        }
      },
      "trace": {
        "schema_version": "1.1",
        "attribution_status": "confirmed",
        "primary_chain_id": "industry_technology_supply",
        "alternative_chain_id": "market_positioning_liquidity",
        "confidence": "medium",
        "unresolved_questions": [
          "兵装重组概念大涨无明确公开消息源，触发因素未证实",
          "全球市场数据缺失，无法评估外部流动性冲击",
          "主力资金明细缺失，资金流向验证不完整"
        ],
        "candidates": [
          {
            "id": "industry_technology_supply",
            "category": "industry_technology_supply",
            "status": "supported",
            "verdict": "能源板块受益油价高企、军工重组概念异动，与芯片板块获利回吐形成鲜明的板块分化，是今日市场结构性异动的主因。",
            "chain": {
              "nodes": [
                { "stage": "structural_root", "claim": "全球能源供给偏紧，地缘风险溢价上行", "evidence_ids": ["SEARCH_007"] },
                { "stage": "trigger", "claim": "中东紧张局势推高布伦特原油至98美元上方，分析师警告能源市场脆弱可能破百；同时兵装重组概念成为市场新热点。", "evidence_ids": ["SEARCH_007", "SEARCH_008"] },
                { "stage": "transmission", "claim": "高油价提升可燃冰、金属锌等能源相关公司盈利预期；军工重组预期吸引短线资金；前期涨幅较大的芯片概念获利了结。", "evidence_ids": ["SECTORS_ALL"] },
                { "stage": "exposure", "claim": "能源板块与军工概念仓位集中，芯片板块前期持仓较高", "evidence_ids": [] },
                { "stage": "repricing", "claim": "能源板块盈利预期上调推动估值修复，芯片板块因资金撤出和前期估值压力导致风险溢价上升，部分品种被重新定价。", "evidence_ids": [] },
                { "stage": "observable_result", "claim": "大盘指数微涨但板块冷热悬殊。", "evidence_ids": ["SECTORS_ALL"] }
              ]
            },
            "supporting_evidence_ids": ["SEARCH_007", "SEARCH_008", "SECTORS_ALL"],
            "counter_evidence_ids": []
          },
          {
            "id": "market_positioning_liquidity",
            "category": "market_positioning_liquidity",
            "status": "weak",
            "verdict": "缩量环境下资金轮动明显，芯片等科技板块主力资金流出与概念板块流入对应，但因主力资金明细缺失，证据较弱。",
            "chain": {
              "nodes": [
                { "stage": "structural_root", "claim": "市场存量博弈", "evidence_ids": [] },
                { "stage": "trigger", "claim": "成交额较前日萎缩17%", "evidence_ids": [] },
                { "stage": "transmission", "claim": "资金从芯片、汽车电子等板块净流出，流入锂电池、国企改革、固态电池等概念。", "evidence_ids": ["SECTORS_ALL"] },
                { "stage": "exposure", "claim": "", "evidence_ids": [] },
                { "stage": "repricing", "claim": "", "evidence_ids": [] },
                { "stage": "observable_result", "claim": "", "evidence_ids": [] }
              ]
            },
            "supporting_evidence_ids": ["SECTORS_ALL"],
            "counter_evidence_ids": ["MAIN_FORCE_ALL"]
          },
          {
            "id": "global_risk_liquidity",
            "category": "global_risk_liquidity",
            "status": "rejected",
            "verdict": "全球风险事件未能压制A股，大盘温和上涨且广度极佳，与风险厌恶逻辑相悖，故排除。",
            "chain": null,
            "supporting_evidence_ids": [],
            "counter_evidence_ids": ["SECTORS_ALL"]
          },
          {
            "id": "domestic_macro_policy",
            "category": "domestic_macro_policy",
            "status": "weak",
            "verdict": "中美互减关税征询意见带来宏观利好，可解释大盘温和上涨，但无法解释芯片等板块的大幅分化下跌，故不作为主因。",
            "chain": null,
            "supporting_evidence_ids": [],
            "counter_evidence_ids": ["SECTORS_ALL"]
          }
        ]
      }
    }
  }
}
```

- [ ] **Step 2: 写 7-31 证据不足态 fixture**

创建 `src/modules/analytics/utils/__fixtures__/market-trace-2026-07-31.json`：

```json
{
  "report_type": "review_full",
  "report_date": "2026-07-31",
  "status": "completed",
  "data_source": "review_agent_full",
  "created_at": "2026-07-31T16:10:00+08:00",
  "content": {
    "schema_version": "2.0",
    "snapshot_id": "snap-2026-07-31",
    "display_report": {
      "summary": "多个核心指数同步上涨，市场广度偏强",
      "details": "# 2026-07-31 A股收盘溯源\n\n（完整 markdown 兜底）",
      "sectors": ["AI视频", "快手概念"],
      "risks": ["7月30日政治局会议新闻的具体报道与市场接收时间无法通过occurred_at字段确认"]
    },
    "market_trace": {
      "snapshot": {
        "snapshot_id": "snap-2026-07-31",
        "trade_date": "2026-07-31",
        "captured_at": "2026-07-31T15:35:00+08:00",
        "a_share": {
          "indexes": [
            { "name": "创业板指", "pct_change": 3.06 },
            { "name": "深证成指", "pct_change": 2.21 }
          ],
          "sectors": {
            "top_gainers": [
              { "name": "AI视频", "pct_change": 7.12 },
              { "name": "快手概念", "pct_change": 6.45 },
              { "name": "智谱AI", "pct_change": 5.88 },
              { "name": "AI语料", "pct_change": 5.21 },
              { "name": "MLOps概念", "pct_change": 4.67 }
            ],
            "top_losers": []
          }
        },
        "sources": {
          "NEWS_001": {
            "source_id": "NEWS_001",
            "kind": "event_evidence",
            "provider": "cls",
            "title": "政治局会议新闻",
            "url": "https://example.com/news/001",
            "occurred_at": null,
            "captured_at": "2026-07-31T15:35:00+08:00",
            "source_level": "reporting"
          }
        },
        "missing_fields": [
          "a_share.main_force.large_and_extra_large_net_yuan",
          "global_markets"
        ],
        "phenomenon_discovery": {
          "status": "detected",
          "primary": {
            "kind": "broad_rally",
            "summary": "多个核心指数同步上涨，市场广度偏强",
            "severity": "medium",
            "fact_ids": ["INDEX_DAILY"],
            "tags": ["broad_rally"]
          }
        }
      },
      "trace": {
        "schema_version": "1.1",
        "attribution_status": "insufficient",
        "primary_chain_id": null,
        "alternative_chain_id": null,
        "confidence": "low",
        "unresolved_questions": [
          "7月30日政治局会议新闻的具体报道与市场接收时间无法通过occurred_at字段确认，触发时机不精确",
          "缺乏北向资金和主力资金流向数据，无法验证外部流动性或外资推动作用",
          "全球市场整体表现缺失，无法全面评估外部风险溢价的传导及其与A股的因果关系",
          "美股科技股大涨的驱动因素（如微软财报超预期）与A股板块的映射机制未获直接证据证实"
        ],
        "candidates": [
          {
            "id": "global_risk_liquidity",
            "category": "global_risk_liquidity",
            "status": "weak",
            "verdict": "美股科技股大涨提振全球风险偏好，A股科技板块跟随，但传导证据不足，缺少北向资金和全球市场整体数据。",
            "chain": {
              "nodes": [
                { "stage": "structural_root", "claim": "全球科技股风险偏好上升", "evidence_ids": [] },
                { "stage": "trigger", "claim": "7月30日美股科技股大涨，微软涨超15%，纳斯达克指数上涨2.78%。", "evidence_ids": ["NEWS_002"] },
                { "stage": "transmission", "claim": "A股科技板块跟随上涨", "evidence_ids": [] },
                { "stage": "exposure", "claim": "", "evidence_ids": [] },
                { "stage": "repricing", "claim": "", "evidence_ids": [] },
                { "stage": "observable_result", "claim": "", "evidence_ids": [] }
              ]
            },
            "supporting_evidence_ids": ["NEWS_002"],
            "counter_evidence_ids": ["a_share.main_force.large_and_extra_large_net_yuan", "global_markets"]
          },
          {
            "id": "domestic_macro_policy",
            "category": "domestic_macro_policy",
            "status": "weak",
            "verdict": "政治局会议释放资本市场改革与逆周期调节信号，提振投资者信心，但触发时间未能精确确定。",
            "chain": {
              "nodes": [
                { "stage": "structural_root", "claim": "", "evidence_ids": [] },
                { "stage": "trigger", "claim": "7月30日政治局会议", "evidence_ids": ["NEWS_001"] },
                { "stage": "transmission", "claim": "政策信号提振投资者信心", "evidence_ids": [] },
                { "stage": "exposure", "claim": "", "evidence_ids": [] },
                { "stage": "repricing", "claim": "", "evidence_ids": [] },
                { "stage": "observable_result", "claim": "", "evidence_ids": [] }
              ]
            },
            "supporting_evidence_ids": ["NEWS_001"],
            "counter_evidence_ids": []
          },
          {
            "id": "industry_technology_supply",
            "category": "industry_technology_supply",
            "status": "insufficient",
            "verdict": "无明确产业政策、技术突破或供应冲击，无法解释市场广度普涨",
            "chain": null,
            "supporting_evidence_ids": [],
            "counter_evidence_ids": []
          },
          {
            "id": "market_positioning_liquidity",
            "category": "market_positioning_liquidity",
            "status": "insufficient",
            "verdict": "主力资金数据缺失，个股回购增持公告规模不足以驱动系统性上涨",
            "chain": null,
            "supporting_evidence_ids": [],
            "counter_evidence_ids": ["a_share.main_force.large_and_extra_large_net_yuan"]
          }
        ]
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/analytics/utils/__fixtures__/
git commit -m "test(analytics): 添加 7-23 与 7-31 大盘溯源 schema 2.0 fixture"
```

---

## Task 3: 实现 toMarketTracePresentation 提取函数

**Files:**
- Modify: `src/modules/analytics/utils/marketTraceReview.ts`
- Test: `src/modules/analytics/utils/marketTraceReview.spec.ts`

**Interfaces:**
- Consumes: Task 1 的 `MarketTraceReviewRecord` 完整类型树
- Produces: `MarketTracePresentation` 类型 + `toMarketTracePresentation(record, requestedDate)` 函数，供 Task 8 的 `traceability.vue` 消费

- [ ] **Step 1: 写失败测试（成功态 7-23）**

创建 `src/modules/analytics/utils/marketTraceReview.spec.ts`：

```typescript
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toMarketTracePresentation } from './marketTraceReview'
import type { MarketTraceReviewRecord } from '@/shared/api/modules/agent'
import record0723 from './__fixtures__/market-trace-2026-07-23.json' with { type: 'json' }
import record0731 from './__fixtures__/market-trace-2026-07-31.json' with { type: 'json' }

test('7-23 成功态：提取完整结构化 ViewModel', () => {
  const presentation = toMarketTracePresentation(
    record0723 as unknown as MarketTraceReviewRecord,
    '2026-07-23',
  )
  assert.ok(presentation, 'presentation 不应为 null')

  // 元信息
  assert.equal(presentation!.reportTitle, '2026-07-23 A股收盘溯源')
  assert.equal(presentation!.reportDate, '2026-07-23')
  assert.equal(presentation!.attributionStatus, 'confirmed')
  assert.equal(presentation!.confidence, 'medium')
  assert.equal(presentation!.isFallback, false)

  // 待验证风险
  assert.equal(presentation!.pendingRisks.openQuestions.length, 3)
  assert.equal(presentation!.pendingRisks.missingEvidence.length, 0)

  // 核心现象
  assert.equal(presentation!.phenomenon.kind, 'sector_concentration')
  assert.equal(presentation!.phenomenon.kindLabel, '板块集中异动')
  assert.equal(presentation!.phenomenon.severity, 'medium')
  assert.equal(presentation!.phenomenon.severityLabel, '中')
  assert.equal(presentation!.phenomenon.topGainers.length, 5)
  assert.equal(presentation!.phenomenon.topGainers[0]!.name, '兵装重组概念')
  assert.equal(presentation!.phenomenon.topGainers[0]!.pctChange, 6.39)
  assert.equal(presentation!.phenomenon.topLosers.length, 5)
  assert.equal(presentation!.phenomenon.topLosers[0]!.name, '国家大基金持股')
  assert.equal(presentation!.phenomenon.topLosers[0]!.pctChange, -3.36)

  // 主因
  assert.ok(presentation!.primaryCause, 'primaryCause 不应为 null')
  assert.equal(presentation!.primaryCause!.categoryId, 'industry_technology_supply')
  assert.equal(presentation!.primaryCause!.categoryLabel, '产业技术与供应')
  assert.ok(presentation!.primaryCause!.trigger.includes('中东紧张局势'))
  assert.ok(presentation!.primaryCause!.transmission.includes('高油价提升可燃冰'))
  assert.ok(presentation!.primaryCause!.result.includes('估值修复'))
  assert.deepEqual(presentation!.primaryCause!.supportingEvidence, ['SEARCH_007', 'SEARCH_008', 'SECTORS_ALL'])

  // 候选解释（alternative_chain_id 指向 market_positioning_liquidity）
  assert.equal(presentation!.alternatives.length, 1)
  assert.equal(presentation!.alternatives[0]!.categoryId, 'market_positioning_liquidity')
  assert.equal(presentation!.alternatives[0]!.categoryLabel, '市场定位与流动性')
  assert.ok(presentation!.alternatives[0]!.transmission.includes('资金从芯片'))
  assert.deepEqual(presentation!.alternatives[0]!.counterEvidence, ['MAIN_FORCE_ALL'])

  // 已排除（global_risk_liquidity rejected + domestic_macro_policy weak 未被 alternative 指向）
  assert.equal(presentation!.rejected.length, 2)
  const rejectedGlobal = presentation!.rejected.find(r => r.categoryId === 'global_risk_liquidity')!
  assert.equal(rejectedGlobal.status, 'rejected')
  assert.ok(rejectedGlobal.reason.length > 0)
  const rejectedPolicy = presentation!.rejected.find(r => r.categoryId === 'domestic_macro_policy')!
  assert.equal(rejectedPolicy.status, 'weak')
  assert.ok(rejectedPolicy.reason.length > 0)

  // 板块排序
  assert.equal(presentation!.sectorRanking.topGainers.length, 5)
  assert.equal(presentation!.sectorRanking.topLosers.length, 5)
})
```

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm test:node`
Expected: FAIL，错误 `toMarketTracePresentation is not a function` 或类型未定义

- [ ] **Step 3: 写失败测试（证据不足态 7-31）**

追加到 `src/modules/analytics/utils/marketTraceReview.spec.ts`：

```typescript
test('7-31 证据不足态：primaryCause 为 null，weak 归 alternatives，insufficient 归 rejected', () => {
  const presentation = toMarketTracePresentation(
    record0731 as unknown as MarketTraceReviewRecord,
    '2026-07-31',
  )
  assert.ok(presentation)

  assert.equal(presentation!.attributionStatus, 'insufficient')
  assert.equal(presentation!.primaryCause, null)

  // 两条 weak 候选归入 alternatives
  assert.equal(presentation!.alternatives.length, 2)
  assert.equal(presentation!.alternatives[0]!.categoryId, 'global_risk_liquidity')
  assert.equal(presentation!.alternatives[1]!.categoryId, 'domestic_macro_policy')

  // 两条 insufficient 归入 rejected
  assert.equal(presentation!.rejected.length, 2)
  assert.equal(presentation!.rejected[0]!.status, 'insufficient')
  assert.equal(presentation!.rejected[1]!.status, 'insufficient')

  // 缺失证据
  assert.ok(presentation!.pendingRisks.missingEvidence.length > 0)
  assert.ok(presentation!.pendingRisks.missingEvidence.includes('a_share.main_force.large_and_extra_large_net_yuan'))
  assert.ok(presentation!.pendingRisks.missingEvidence.includes('global_markets'))

  // 板块领跌为空（普涨日）
  assert.equal(presentation!.sectorRanking.topLosers.length, 0)
})
```

- [ ] **Step 4: 写失败测试（边界）**

追加到 `src/modules/analytics/utils/marketTraceReview.spec.ts`：

```typescript
test('record.status 非 completed 返回 null', () => {
  const record = { ...record0723, status: 'queued' } as unknown as MarketTraceReviewRecord
  assert.equal(toMarketTracePresentation(record, '2026-07-23'), null)
})

test('content.schema_version 非 2.0 返回 null', () => {
  const record = {
    ...record0723,
    content: { ...record0723.content, schema_version: '1.0' },
  } as unknown as MarketTraceReviewRecord
  assert.equal(toMarketTracePresentation(record, '2026-07-23'), null)
})

test('report_date 与 requestedDate 不一致时 isFallback=true', () => {
  const presentation = toMarketTracePresentation(
    record0723 as unknown as MarketTraceReviewRecord,
    '2026-07-24',
  )
  assert.ok(presentation)
  assert.equal(presentation!.isFallback, true)
})

test('candidates 缺 chain.nodes 时 trigger/transmission/result 返回空字符串', () => {
  const record = JSON.parse(JSON.stringify(record0723)) as unknown as MarketTraceReviewRecord
  const candidate = (record.content.market_trace!.trace!.candidates![0])
  candidate.chain = null
  const presentation = toMarketTracePresentation(record, '2026-07-23')
  assert.ok(presentation)
  assert.equal(presentation!.primaryCause!.trigger, '')
  assert.equal(presentation!.primaryCause!.transmission, '')
  assert.equal(presentation!.primaryCause!.result, '')
})
```

- [ ] **Step 5: 跑测试验证失败**

Run: `pnpm test:node`
Expected: FAIL，4 个 test 全失败（函数未实现）

- [ ] **Step 6: 写最小实现**

在 `src/modules/analytics/utils/marketTraceReview.ts` 末尾追加（保留现有 `MarketTraceViewModel` + `toMarketTraceViewModel` 不动）：

```typescript
/* ===== 新增：结构化展示 ViewModel（基于 schema 2.0 字段提取，不调 LLM） ===== */

import type {
  MarketTraceAttributionStatus,
  MarketTraceCandidateCategory,
  MarketTraceCandidateStatus,
  MarketTraceConfidence,
  MarketTraceCausalChain,
  MarketTraceCausalNode,
  MarketTraceCausalStage,
  MarketTraceCandidateExplanation,
  MarketTracePhenomenonKind,
  MarketTraceSeverity,
} from '@/shared/api/modules/agent'

export interface MarketTraceIndexPerf {
  name: string
  pctChange: number | null
}

export interface MarketTraceSectorItemView {
  name: string
  pctChange: number | null
}

export interface MarketTracePrimaryCauseView {
  categoryId: string
  categoryLabel: string
  conclusion: string
  trigger: string
  transmission: string
  result: string
  supportingEvidence: string[]
}

export interface MarketTraceAlternativeView {
  categoryId: string
  categoryLabel: string
  conclusion: string
  transmission: string
  counterEvidence: string[]
}

export interface MarketTraceRejectedView {
  categoryId: string
  categoryLabel: string
  status: 'rejected' | 'insufficient' | 'weak'
  conclusion: string
  reason: string
}

export interface MarketTracePresentation {
  reportTitle: string
  reportDate: string
  generatedAt: string
  snapshotId: string
  attributionStatus: MarketTraceAttributionStatus
  confidence: MarketTraceConfidence | null
  isFallback: boolean

  pendingRisks: {
    openQuestions: string[]
    missingEvidence: string[]
  }

  phenomenon: {
    kind: string
    kindLabel: string
    summary: string
    severity: MarketTraceSeverity | null
    severityLabel: string
    factIds: string[]
    indexPerformance: MarketTraceIndexPerf[]
    topGainers: MarketTraceSectorItemView[]
    topLosers: MarketTraceSectorItemView[]
  }

  primaryCause: MarketTracePrimaryCauseView | null
  alternatives: MarketTraceAlternativeView[]
  rejected: MarketTraceRejectedView[]

  sectorRanking: {
    topGainers: MarketTraceSectorItemView[]
    topLosers: MarketTraceSectorItemView[]
  }

  markdownDetails: string
}

const CATEGORY_LABELS: Record<MarketTraceCandidateCategory, string> = {
  global_risk_liquidity: '全球风险与流动性',
  domestic_macro_policy: '国内宏观政策',
  industry_technology_supply: '产业技术与供应',
  market_positioning_liquidity: '市场定位与流动性',
}

const PHENOMENON_KIND_LABELS: Record<MarketTracePhenomenonKind, string> = {
  broad_rally: '普涨',
  broad_decline: '普跌',
  style_divergence: '风格分化',
  sector_concentration: '板块集中异动',
  sentiment_extreme: '情绪极端',
}

const SEVERITY_LABELS: Record<MarketTraceSeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function findNodeByStage(chain: MarketTraceCausalChain | null | undefined, stage: MarketTraceCausalStage): MarketTraceCausalNode | null {
  if (!chain?.nodes) return null
  return chain.nodes.find(n => n.stage === stage) ?? null
}

function sectorItemsFromUnknown(value: unknown): MarketTraceSectorItemView[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 5).map((item) => {
    const obj = (item ?? {}) as Record<string, unknown>
    return {
      name: asString(obj.name),
      pctChange: asNumber(obj.pct_change),
    }
  }).filter(item => item.name.length > 0)
}

function indexPerfFromUnknown(value: unknown): MarketTraceIndexPerf[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const obj = (item ?? {}) as Record<string, unknown>
    return {
      name: asString(obj.name),
      pctChange: asNumber(obj.pct_change),
    }
  }).filter(item => item.name.length > 0)
}

function buildRejectedReason(candidate: MarketTraceCandidateExplanation): string {
  const counterIds = asStringList(candidate.counter_evidence_ids)
  if (candidate.status === 'rejected') {
    if (counterIds.length > 0) return `存在反证：${counterIds.join('、')}`
    return '与市场观测相悖，已排除'
  }
  if (candidate.status === 'insufficient') {
    if (counterIds.length > 0) return `证据不足，缺失：${counterIds.join('、')}`
    return '证据不足，无法确认'
  }
  // weak 但未被 alternative_chain_id 指向
  if (counterIds.length > 0) return `证据较弱，反证：${counterIds.join('、')}`
  return '证据较弱，未作为主因'
}

export function toMarketTracePresentation(
  record: MarketTraceReviewRecord,
  requestedDate: string,
): MarketTracePresentation | null {
  if (record.status !== 'completed') return null
  if (record.content.schema_version !== '2.0') return null

  const marketTrace = record.content.market_trace
  const snapshot = marketTrace?.snapshot
  const trace = marketTrace?.trace
  if (!snapshot || !trace) return null

  const display = record.content.display_report
  const summary = asString(display?.summary)
  const details = asString(display?.details)
  if (!summary || !details) return null

  const tradeDate = asString(snapshot.trade_date) || record.report_date
  const candidates = Array.isArray(trace.candidates) ? trace.candidates : []

  // 按 primary_chain_id / alternative_chain_id 指针分类
  const primaryId = trace.primary_chain_id ?? null
  const alternativeId = trace.alternative_chain_id ?? null

  let primaryCandidate: MarketTraceCandidateExplanation | null = null
  const alternatives: MarketTraceAlternativeView[] = []
  const rejected: MarketTraceRejectedView[] = []

  for (const candidate of candidates) {
    if (candidate.id === primaryId) {
      primaryCandidate = candidate
      continue
    }
    if (candidate.id === alternativeId) {
      alternatives.push({
        categoryId: candidate.id,
        categoryLabel: CATEGORY_LABELS[candidate.category] ?? candidate.category,
        conclusion: asString(candidate.verdict),
        transmission: asString(findNodeByStage(candidate.chain, 'transmission')?.claim),
        counterEvidence: asStringList(candidate.counter_evidence_ids),
      })
      continue
    }
    // 证据不足态：primaryId=null 时，所有 weak 归入 alternatives
    if (primaryId === null && candidate.status === 'weak') {
      alternatives.push({
        categoryId: candidate.id,
        categoryLabel: CATEGORY_LABELS[candidate.category] ?? candidate.category,
        conclusion: asString(candidate.verdict),
        transmission: asString(findNodeByStage(candidate.chain, 'transmission')?.claim),
        counterEvidence: asStringList(candidate.counter_evidence_ids),
      })
      continue
    }
    // 其余归入 rejected（含 rejected/insufficient/未被 alternative 指向的 weak）
    rejected.push({
      categoryId: candidate.id,
      categoryLabel: CATEGORY_LABELS[candidate.category] ?? candidate.category,
      status: candidate.status === 'weak' ? 'weak' : candidate.status,
      conclusion: asString(candidate.verdict),
      reason: buildRejectedReason(candidate),
    })
  }

  // 主因
  let primaryCause: MarketTracePrimaryCauseView | null = null
  if (primaryCandidate) {
    const repricing = findNodeByStage(primaryCandidate.chain, 'repricing')?.claim ?? ''
    const observable = findNodeByStage(primaryCandidate.chain, 'observable_result')?.claim ?? ''
    primaryCause = {
      categoryId: primaryCandidate.id,
      categoryLabel: CATEGORY_LABELS[primaryCandidate.category] ?? primaryCandidate.category,
      conclusion: asString(primaryCandidate.verdict),
      trigger: asString(findNodeByStage(primaryCandidate.chain, 'trigger')?.claim),
      transmission: asString(findNodeByStage(primaryCandidate.chain, 'transmission')?.claim),
      result: [repricing, observable].filter(Boolean).join(' '),
      supportingEvidence: asStringList(primaryCandidate.supporting_evidence_ids),
    }
  }

  // 现象
  const primary = snapshot.phenomenon_discovery?.primary
  const kind = primary?.kind ?? 'sector_concentration'
  const severity = primary?.severity ?? null
  const sectorsData = snapshot.a_share?.sectors

  const phenomenon = {
    kind,
    kindLabel: PHENOMENON_KIND_LABELS[kind] ?? kind,
    summary: asString(primary?.summary) || summary,
    severity,
    severityLabel: severity ? SEVERITY_LABELS[severity] : '--',
    factIds: asStringList(primary?.fact_ids),
    indexPerformance: indexPerfFromUnknown(snapshot.a_share?.indexes),
    topGainers: sectorItemsFromUnknown(sectorsData?.top_gainers),
    topLosers: sectorItemsFromUnknown(sectorsData?.top_losers),
  }

  return {
    reportTitle: `${tradeDate} A股收盘溯源`,
    reportDate: tradeDate,
    generatedAt: record.created_at || asString(snapshot.captured_at) || '',
    snapshotId: asString(record.content.snapshot_id) || asString(snapshot.snapshot_id),
    attributionStatus: trace.attribution_status ?? 'not_applicable',
    confidence: trace.confidence ?? null,
    isFallback: record.report_date !== requestedDate,
    pendingRisks: {
      openQuestions: asStringList(trace.unresolved_questions),
      missingEvidence: asStringList(snapshot.missing_fields),
    },
    phenomenon,
    primaryCause,
    alternatives,
    rejected,
    sectorRanking: {
      topGainers: phenomenon.topGainers,
      topLosers: phenomenon.topLosers,
    },
    markdownDetails: details,
  }
}
```

- [ ] **Step 7: 跑测试验证通过**

Run: `pnpm test:node`
Expected: PASS（4 个 test 全通过）

- [ ] **Step 8: 跑类型检查**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/modules/analytics/utils/marketTraceReview.ts src/modules/analytics/utils/marketTraceReview.spec.ts
git commit -m "feat(analytics): 新增 toMarketTracePresentation 从 schema 2.0 提取结构化展示字段"
```

---

## Task 4: 新增 breakpoints.scss + useResponsive hook

**Files:**
- Create: `src/shared/styles/breakpoints.scss`
- Create: `src/shared/utils/useResponsive.ts`
- Test: `src/shared/utils/useResponsive.spec.ts`

**Interfaces:**
- Produces: `useResponsive()` composable + `$bp-sm/md/lg` SCSS 变量，供 Task 5-7 子组件和 Task 8 页面消费

- [ ] **Step 1: 写失败测试**

创建 `src/shared/utils/useResponsive.spec.ts`：

```typescript
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('getWindowWidthBreakpoint 根据 windowWidth 返回 sm/md/lg', async () => {
  const { getWindowWidthBreakpoint } = await import('./useResponsive')
  assert.equal(getWindowWidthBreakpoint(375), 'sm')
  assert.equal(getWindowWidthBreakpoint(414), 'sm')
  assert.equal(getWindowWidthBreakpoint(479), 'sm')
  assert.equal(getWindowWidthBreakpoint(480), 'md')
  assert.equal(getWindowWidthBreakpoint(600), 'md')
  assert.equal(getWindowWidthBreakpoint(767), 'md')
  assert.equal(getWindowWidthBreakpoint(768), 'lg')
  assert.equal(getWindowWidthBreakpoint(820), 'lg')
  assert.equal(getWindowWidthBreakpoint(1024), 'lg')
  assert.equal(getWindowWidthBreakpoint(1500), 'lg')
})

test('getWindowWidthBreakpoint 对 0 或负数返回 sm 作为兜底', async () => {
  const { getWindowWidthBreakpoint } = await import('./useResponsive')
  assert.equal(getWindowWidthBreakpoint(0), 'sm')
  assert.equal(getWindowWidthBreakpoint(-1), 'sm')
})
```

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm test:node`
Expected: FAIL，`Cannot find module './useResponsive'`

- [ ] **Step 3: 创建 breakpoints.scss**

创建 `src/shared/styles/breakpoints.scss`：

```scss
/**
 * 跨端断点变量
 * 范围定义：
 *   sm < 480px       手机竖屏 / Mate X 折叠态外屏
 *   md 480-768px     手机横屏 / 小平板
 *   lg >= 768px      iPad 竖屏 / Mate X 展开态内屏
 * 注意：H5 不做 xl 宽屏特殊适配，按手机端布局自然渲染
 */
$bp-sm: 480px;
$bp-md: 768px;
$bp-lg: 1024px;

@mixin respond-to-md {
  @media (min-width: $bp-sm) {
    @content;
  }
}

@mixin respond-to-lg {
  @media (min-width: $bp-md) {
    @content;
  }
}
```

- [ ] **Step 4: 创建 useResponsive.ts**

创建 `src/shared/utils/useResponsive.ts`：

```typescript
/**
 * 响应式断点 hook
 * 范围：sm < 480 / md 480-768 / lg >= 768
 * App 端无 resize 事件，初始化时一次性判断；H5 监听 resize。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

export type Breakpoint = 'sm' | 'md' | 'lg'

export const BP_SM = 480
export const BP_MD = 768

export function getWindowWidthBreakpoint(windowWidth: number): Breakpoint {
  if (!windowWidth || windowWidth <= 0) return 'sm'
  if (windowWidth < BP_SM) return 'sm'
  if (windowWidth < BP_MD) return 'md'
  return 'lg'
}

export function useResponsive() {
  const breakpoint = ref<Breakpoint>('sm')

  function update() {
    try {
      const info = uni.getSystemInfoSync()
      breakpoint.value = getWindowWidthBreakpoint(info.windowWidth || 0)
    } catch {
      breakpoint.value = 'sm'
    }
  }

  let resizeHandler: (() => void) | null = null

  onMounted(() => {
    update()
    // H5 监听 resize
    // #ifdef H5
    if (typeof window !== 'undefined') {
      resizeHandler = () => update()
      window.addEventListener('resize', resizeHandler)
    }
    // #endif
  })

  onUnmounted(() => {
    // #ifdef H5
    if (resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
    // #endif
  })

  return {
    breakpoint,
    isMobile: computed(() => breakpoint.value === 'sm'),
    isTablet: computed(() => breakpoint.value === 'lg'),
    isSmall: computed(() => breakpoint.value === 'sm' || breakpoint.value === 'md'),
  }
}
```

- [ ] **Step 5: 跑测试验证通过**

Run: `pnpm test:node`
Expected: PASS（2 个 test 通过）

- [ ] **Step 6: 跑类型检查**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/styles/breakpoints.scss src/shared/utils/useResponsive.ts src/shared/utils/useResponsive.spec.ts
git commit -m "feat(shared): 新增 breakpoints.scss 与 useResponsive 响应式断点 hook"
```

---

## Task 5: 实现 MarketTraceHeader + PendingRisks + Phenomenon + Sectors 子组件

**Files:**
- Create: `src/modules/analytics/components/MarketTraceHeader.vue`
- Create: `src/modules/analytics/components/MarketTracePendingRisks.vue`
- Create: `src/modules/analytics/components/MarketTracePhenomenon.vue`
- Create: `src/modules/analytics/components/MarketTraceSectors.vue`

**Interfaces:**
- Consumes: Task 3 的 `MarketTracePresentation`（部分字段）
- Produces: 4 个展示型子组件，供 Task 8 的 `traceability.vue` 消费

**说明：** 这 4 个组件无状态、纯展示，无独立测试（视觉验证在 Task 8 浏览器多视口截图完成）。

- [ ] **Step 1: 创建 MarketTraceHeader.vue**

```vue
<template>
  <Card class="trace-header">
    <view class="header-top">
      <view class="header-icon">
        <SvgIcon name="bar-chart-line" size="32rpx" color="#ffffff" />
      </view>
      <view class="header-text">
        <text class="header-title">{{ presentation.reportTitle }}</text>
        <text class="header-desc">基于已完成的收盘复盘报告</text>
      </view>
      <Badge :type="statusBadgeType">{{ statusText }}</Badge>
    </view>
    <view class="header-body">
      <view class="header-row">
        <text class="row-label">报告日期</text>
        <text class="row-value">{{ presentation.reportDate || '--' }}</text>
      </view>
      <view class="header-row">
        <text class="row-label">生成时间</text>
        <text class="row-value">{{ generatedAtText }}</text>
      </view>
      <view class="header-row">
        <text class="row-label">归因状态</text>
        <text class="row-value">{{ attributionLabel }}</text>
      </view>
      <view class="header-row">
        <text class="row-label">置信度</text>
        <text class="row-value">{{ confidenceLabel }}</text>
      </view>
      <text v-if="presentation.isFallback" class="fallback-notice">
        当日报告尚未生成，当前显示最近可用报告（{{ presentation.reportDate }}）
      </text>
    </view>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Badge from '@/shared/components/Badge.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { formatShanghaiDateTime } from '@/shared/utils/datetime'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const generatedAtText = computed(() => {
  const t = props.presentation.generatedAt
  return t ? formatShanghaiDateTime(t) || t : '--'
})

const attributionLabel = computed(() => {
  const map: Record<string, string> = {
    confirmed: '已确认',
    hypothesis: '假设',
    insufficient: '证据不足',
    not_applicable: '不适用',
  }
  return map[props.presentation.attributionStatus] ?? '--'
})

const confidenceLabel = computed(() => {
  const c = props.presentation.confidence
  if (!c) return '未提供'
  return { high: '高', medium: '中', low: '低' }[c] ?? '--'
})

const statusBadgeType = computed<'success' | 'warning' | 'danger' | 'info'>(() => {
  if (props.presentation.isFallback) return 'warning'
  if (props.presentation.attributionStatus === 'insufficient') return 'warning'
  if (props.presentation.attributionStatus === 'not_applicable') return 'info'
  return 'success'
})

const statusText = computed(() => {
  if (props.presentation.isFallback) return '回退显示'
  if (props.presentation.attributionStatus === 'insufficient') return '证据不足'
  if (props.presentation.attributionStatus === 'not_applicable') return '不适用'
  return '已更新'
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.trace-header { margin: $spacing-base; }
.header-top { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-base; }
.header-icon {
  width: 60rpx; height: 60rpx; border-radius: 14rpx;
  background: $brand-gradient;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}
.header-text { flex: 1; }
.header-title { font-size: 30rpx; font-weight: 600; color: $text-color-title; display: block; }
.header-desc { font-size: 22rpx; color: $text-color-secondary; margin-top: 4rpx; display: block; }
.header-body { display: flex; flex-direction: column; gap: $spacing-sm; }
.header-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12rpx 0; border-bottom: 1rpx solid $line-soft;
  &:last-child { border-bottom: none; }
}
.row-label { font-size: 24rpx; color: $text-color-secondary; }
.row-value { font-size: 24rpx; color: $text-color-title; font-weight: 500; }
.fallback-notice { padding-top: $spacing-sm; color: $warning; font-size: 22rpx; line-height: 1.5; }
</style>
```

注意：`$text-color-title` / `$text-color-secondary` / `$line-soft` / `$spacing-base` / `$spacing-sm` / `$warning` / `$brand-gradient` 必须是 variables.scss 中已有的变量；若不存在，改用 `$ink` / `$ink-soft` / `$line` / `$s-3` / `$s-2` / `$warning`。

- [ ] **Step 2: 创建 MarketTracePendingRisks.vue**

```vue
<template>
  <view class="pending-risks-section" v-if="hasRisks">
    <view class="section-title">
      <text class="title-text">待验证风险</text>
    </view>
    <Card class="risks-card">
      <view v-for="(risk, idx) in presentation.pendingRisks.openQuestions" :key="`q-${idx}`" class="risk-item">
        <text class="risk-dot">·</text>
        <text class="risk-text">{{ risk }}</text>
      </view>
      <view v-if="presentation.pendingRisks.missingEvidence.length" class="missing-block">
        <text class="missing-label">缺失数据：</text>
        <text class="missing-text">{{ presentation.pendingRisks.missingEvidence.join('、') }}</text>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const hasRisks = computed(() => {
  const r = props.presentation.pendingRisks
  return r.openQuestions.length > 0 || r.missingEvidence.length > 0
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.pending-risks-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; padding: 0; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.risks-card { margin: 0; }
.risk-item { display: flex; align-items: flex-start; gap: 8rpx; margin-top: 8rpx; }
.risk-item:first-child { margin-top: 0; }
.risk-dot { color: $warning; font-size: 28rpx; line-height: 1.4; }
.risk-text { flex: 1; color: $text-color; font-size: 24rpx; line-height: 1.5; }
.missing-block {
  margin-top: $spacing-sm; padding-top: $spacing-sm;
  border-top: 1rpx solid $line-soft;
  display: flex; align-items: flex-start; gap: 8rpx; flex-wrap: wrap;
}
.missing-label { font-size: 22rpx; color: $warning; font-weight: 600; }
.missing-text { font-size: 22rpx; color: $text-color-secondary; line-height: 1.5; }
</style>
```

- [ ] **Step 3: 创建 MarketTracePhenomenon.vue**

```vue
<template>
  <view class="phenomenon-section">
    <view class="section-title">
      <text class="title-text">核心现象</text>
      <Tag type="warning" size="sm">{{ presentation.phenomenon.kindLabel }}</Tag>
      <Tag type="neutral" size="sm">严重度：{{ presentation.phenomenon.severityLabel }}</Tag>
    </view>
    <Card class="phenomenon-card">
      <text class="phenomenon-summary">{{ presentation.phenomenon.summary }}</text>

      <view v-if="presentation.phenomenon.indexPerformance.length" class="perf-block">
        <text class="block-label">指数表现</text>
        <view class="perf-list">
          <view v-for="idx in presentation.phenomenon.indexPerformance" :key="idx.name" class="perf-item">
            <text class="perf-name">{{ idx.name }}</text>
            <text class="perf-change" :class="changeClass(idx.pctChange)">{{ formatPct(idx.pctChange) }}</text>
          </view>
        </view>
      </view>

      <view v-if="presentation.phenomenon.topGainers.length" class="sector-block">
        <text class="block-label">领涨</text>
        <view class="sector-list">
          <view v-for="s in presentation.phenomenon.topGainers" :key="`g-${s.name}`" class="sector-item">
            <text class="sector-name">{{ s.name }}</text>
            <text class="sector-pct up">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>

      <view v-if="presentation.phenomenon.topLosers.length" class="sector-block">
        <text class="block-label">领跌</text>
        <view class="sector-list">
          <view v-for="s in presentation.phenomenon.topLosers" :key="`l-${s.name}`" class="sector-item">
            <text class="sector-name">{{ s.name }}</text>
            <text class="sector-pct down">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

defineProps<{ presentation: MarketTracePresentation }>()

function formatPct(v: number | null): string {
  if (v === null) return '--'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function changeClass(v: number | null): string {
  if (v === null) return 'flat'
  return v >= 0 ? 'up' : 'down'
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.phenomenon-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; gap: $spacing-sm; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.phenomenon-card { margin: 0; }
.phenomenon-summary { display: block; color: $text-color-title; font-size: 26rpx; line-height: 1.6; margin-bottom: $spacing-sm; }
.perf-block, .sector-block { margin-top: $spacing-sm; }
.block-label { display: block; font-size: 22rpx; color: $text-color-secondary; margin-bottom: $spacing-xs; }

.perf-list, .sector-list {
  display: flex; flex-wrap: wrap; gap: 8rpx;
  @include bp.respond-to-lg { gap: 12rpx; }
}
.perf-item, .sector-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 8rpx 16rpx; border-radius: $r-md;
  background: $bg-soft; min-width: 200rpx;
}
.perf-name, .sector-name { font-size: 22rpx; color: $text-color; flex: 1; }
.perf-change, .sector-pct { font-size: 24rpx; font-weight: 600; font-family: $font-mono; }
.up, .perf-change.up { color: $up; }
.down, .perf-change.down { color: $down; }
.flat { color: $text-color-secondary; }
</style>
```

- [ ] **Step 4: 创建 MarketTraceSectors.vue**

```vue
<template>
  <view class="sectors-section" v-if="hasData">
    <view class="section-title">
      <text class="title-text">板块强弱</text>
    </view>
    <Card class="sectors-card">
      <view v-if="ranking.topGainers.length" class="rank-block">
        <text class="block-label">领涨</text>
        <view class="rank-list">
          <view v-for="s in ranking.topGainers" :key="`g-${s.name}`" class="rank-item">
            <text class="rank-name">{{ s.name }}</text>
            <text class="rank-pct up">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>
      <view v-if="ranking.topLosers.length" class="rank-block">
        <text class="block-label">领跌</text>
        <view class="rank-list">
          <view v-for="s in ranking.topLosers" :key="`l-${s.name}`" class="rank-item">
            <text class="rank-name">{{ s.name }}</text>
            <text class="rank-pct down">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>
      <view v-if="!ranking.topGainers.length && !ranking.topLosers.length" class="empty">
        <text class="empty-text">本日板块数据暂无</text>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const ranking = computed(() => props.presentation.sectorRanking)
const hasData = computed(() => ranking.value.topGainers.length > 0 || ranking.value.topLosers.length > 0)

function formatPct(v: number | null): string {
  if (v === null) return '--'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.sectors-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.sectors-card { margin: 0; }
.rank-block { margin-bottom: $spacing-sm; &:last-child { margin-bottom: 0; } }
.block-label { display: block; font-size: 22rpx; color: $text-color-secondary; margin-bottom: $spacing-xs; }
.rank-list {
  display: grid; grid-template-columns: 1fr; gap: 8rpx;
  @include bp.respond-to-md { grid-template-columns: 1fr 1fr; }
  @include bp.respond-to-lg { grid-template-columns: repeat(3, 1fr); }
}
.rank-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8rpx 16rpx; border-radius: $r-md; background: $bg-soft;
}
.rank-name { font-size: 22rpx; color: $text-color; flex: 1; }
.rank-pct { font-size: 24rpx; font-weight: 600; font-family: $font-mono; }
.up { color: $up; }
.down { color: $down; }
.empty { padding: $spacing-base 0; text-align: center; }
.empty-text { font-size: 24rpx; color: $text-color-secondary; }
</style>
```

- [ ] **Step 5: 跑类型检查**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/analytics/components/MarketTraceHeader.vue src/modules/analytics/components/MarketTracePendingRisks.vue src/modules/analytics/components/MarketTracePhenomenon.vue src/modules/analytics/components/MarketTraceSectors.vue
git commit -m "feat(analytics): 新增 Header/PendingRisks/Phenomenon/Sectors 子组件"
```

---

## Task 6: 实现 MarketTraceTimeline 子组件

**Files:**
- Create: `src/modules/analytics/components/MarketTraceTimeline.vue`

**Interfaces:**
- Consumes: Task 3 的 `MarketTracePresentation.primaryCause`（或 null）+ Task 4 的 `useResponsive` breakpoint
- Produces: 主因时间线组件（vertical/horizontal 自适应），支持「证据不足，未确认主因」空态

- [ ] **Step 1: 创建 MarketTraceTimeline.vue**

```vue
<template>
  <view class="timeline-section">
    <view class="section-title">
      <text class="title-text">{{ titleText }}</text>
    </view>

    <!-- 证据不足态：主因缺失提示卡片 -->
    <Card v-if="!primaryCause" class="insufficient-card">
      <view class="insufficient-icon">
        <SvgIcon name="error-warning-line" size="32rpx" color="#f0a020" />
      </view>
      <view class="insufficient-text">
        <text class="insufficient-title">证据不足，未确认主因</text>
        <text class="insufficient-desc">未能从当前可用证据中确认主导因果链。请参考下方候选解释与缺失证据。</text>
      </view>
    </Card>

    <!-- 成功态：主因时间线 -->
    <Card v-else class="timeline-card">
      <view class="primary-conclusion">
        <text class="conclusion-label">主因</text>
        <text class="conclusion-text">{{ primaryCause.conclusion }}</text>
      </view>

      <view class="timeline-steps" :class="`is-${layout}`">
        <view v-if="primaryCause.trigger" class="step-item">
          <view class="step-rail">
            <view class="step-dot" />
            <view class="step-line" />
          </view>
          <view class="step-body">
            <text class="step-label">触发</text>
            <text class="step-text">{{ primaryCause.trigger }}</text>
          </view>
        </view>
        <view v-if="primaryCause.transmission" class="step-item">
          <view class="step-rail">
            <view class="step-dot" />
            <view class="step-line" />
          </view>
          <view class="step-body">
            <text class="step-label">传导</text>
            <text class="step-text">{{ primaryCause.transmission }}</text>
          </view>
        </view>
        <view v-if="primaryCause.result" class="step-item">
          <view class="step-rail">
            <view class="step-dot" />
          </view>
          <view class="step-body">
            <text class="step-label">结果</text>
            <text class="step-text">{{ primaryCause.result }}</text>
          </view>
        </view>
      </view>

      <view v-if="primaryCause.supportingEvidence.length" class="evidence-block">
        <text class="evidence-label">参考来源：</text>
        <text class="evidence-text">{{ primaryCause.supportingEvidence.join('、') }}</text>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{
  presentation: MarketTracePresentation
  layout: 'vertical' | 'horizontal'
}>()

const primaryCause = computed(() => props.presentation.primaryCause)

const titleText = computed(() => {
  if (!props.presentation.primaryCause) return '主因'
  return '主因'
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.timeline-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }

/* 证据不足提示卡片 */
.insufficient-card { margin: 0; display: flex; align-items: flex-start; gap: $spacing-sm; }
.insufficient-icon { width: 60rpx; height: 60rpx; border-radius: $r-full; background: $warning-soft; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insufficient-text { flex: 1; }
.insufficient-title { display: block; font-size: 28rpx; font-weight: 600; color: $warning; margin-bottom: 4rpx; }
.insufficient-desc { display: block; font-size: 24rpx; color: $text-color-secondary; line-height: 1.5; }

/* 成功态时间线卡片 */
.timeline-card { margin: 0; }
.primary-conclusion { margin-bottom: $spacing-base; padding-bottom: $spacing-sm; border-bottom: 1rpx solid $line-soft; }
.conclusion-label { display: block; font-size: 22rpx; color: $text-color-secondary; margin-bottom: 4rpx; }
.conclusion-text { display: block; font-size: 26rpx; color: $text-color-title; line-height: 1.6; font-weight: 500; }

/* 时间线步骤 */
.timeline-steps { display: flex; }
.timeline-steps.is-vertical { flex-direction: column; gap: $spacing-sm; }
.timeline-steps.is-horizontal { flex-direction: row; gap: $spacing-xs; align-items: stretch; }

.step-item { position: relative; display: flex; flex: 1; }
.timeline-steps.is-vertical .step-item { padding-left: 40rpx; }
.timeline-steps.is-horizontal .step-item { flex-direction: column; padding-top: 40rpx; }

.step-rail { position: absolute; }
.timeline-steps.is-vertical .step-rail { left: 0; top: 0; width: 32rpx; height: 100%; }
.timeline-steps.is-horizontal .step-rail { left: 0; top: 0; width: 100%; height: 32rpx; }

.step-dot {
  width: 20rpx; height: 20rpx; border-radius: $r-full;
  background: $primary; box-shadow: 0 0 0 6rpx rgba(11, 95, 255, 0.15);
  position: absolute;
}
.timeline-steps.is-vertical .step-dot { top: 8rpx; left: 50%; transform: translateX(-50%); }
.timeline-steps.is-horizontal .step-dot { top: 6rpx; left: 0; }

.step-line { background: $line-soft; position: absolute; }
.timeline-steps.is-vertical .step-line { top: 28rpx; bottom: -1 * ($spacing-sm + 8rpx); left: 50%; transform: translateX(-50%); width: 2rpx; }
.timeline-steps.is-horizontal .step-line { top: 16rpx; left: 20rpx; right: 0; height: 2rpx; }

.step-body { flex: 1; }
.timeline-steps.is-horizontal .step-body { padding-top: 8rpx; }
.step-label { display: block; font-size: 22rpx; color: $primary; font-weight: 600; margin-bottom: 4rpx; }
.step-text { display: block; font-size: 24rpx; color: $text-color; line-height: 1.5; }

.evidence-block { margin-top: $spacing-base; padding-top: $spacing-sm; border-top: 1rpx solid $line-soft; }
.evidence-label { font-size: 22rpx; color: $text-color-secondary; }
.evidence-text { font-size: 22rpx; color: $text-color; font-family: $font-mono; }
</style>
```

- [ ] **Step 2: 跑类型检查**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/analytics/components/MarketTraceTimeline.vue
git commit -m "feat(analytics): 新增 MarketTraceTimeline 主因时间线组件支持 vertical/horizontal"
```

---

## Task 7: 实现 MarketTraceAlternatives + Rejected 子组件

**Files:**
- Create: `src/modules/analytics/components/MarketTraceAlternatives.vue`
- Create: `src/modules/analytics/components/MarketTraceRejected.vue`

**Interfaces:**
- Consumes: Task 3 的 `MarketTracePresentation.alternatives` + `rejected` + `attributionStatus`（标题差异化）

- [ ] **Step 1: 创建 MarketTraceAlternatives.vue**

```vue
<template>
  <view class="alternatives-section" v-if="presentation.alternatives.length">
    <view class="section-title">
      <text class="title-text">{{ titleText }}</text>
    </view>
    <view class="alt-list">
      <Card v-for="alt in presentation.alternatives" :key="alt.categoryId" class="alt-card">
        <view class="alt-header">
          <text class="alt-label">{{ alt.categoryLabel }}</text>
          <Tag type="warning" size="sm">弱支持</Tag>
        </view>
        <text class="alt-conclusion">{{ alt.conclusion }}</text>
        <view v-if="alt.transmission" class="alt-transmission">
          <text class="trans-label">传导：</text>
          <text class="trans-text">{{ alt.transmission }}</text>
        </view>
        <view v-if="alt.counterEvidence.length" class="alt-counter">
          <text class="counter-label">反证：</text>
          <text class="counter-text">{{ alt.counterEvidence.join('、') }}</text>
        </view>
      </Card>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const titleText = computed(() => {
  return props.presentation.attributionStatus === 'insufficient' ? '候选解释' : '备选解释'
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.alternatives-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.alt-list {
  display: grid; grid-template-columns: 1fr; gap: $spacing-sm;
  @include bp.respond-to-lg { grid-template-columns: 1fr 1fr; }
}
.alt-card { margin: 0; }
.alt-header { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-xs; }
.alt-label { font-size: 24rpx; font-weight: 600; color: $text-color-title; flex: 1; }
.alt-conclusion { display: block; font-size: 24rpx; color: $text-color; line-height: 1.5; }
.alt-transmission, .alt-counter { margin-top: $spacing-xs; display: flex; align-items: flex-start; gap: 4rpx; }
.trans-label, .counter-label { font-size: 22rpx; color: $text-color-secondary; flex-shrink: 0; }
.trans-text, .counter-text { font-size: 22rpx; color: $text-color; line-height: 1.5; flex: 1; }
.counter-text { font-family: $font-mono; }
</style>
```

- [ ] **Step 2: 创建 MarketTraceRejected.vue**

```vue
<template>
  <view class="rejected-section" v-if="presentation.rejected.length">
    <view class="section-title">
      <text class="title-text">{{ titleText }}</text>
    </view>
    <view class="rej-list">
      <Card v-for="rej in presentation.rejected" :key="rej.categoryId" class="rej-card">
        <view class="rej-header">
          <text class="rej-label">{{ rej.categoryLabel }}</text>
          <Tag :type="tagType(rej.status)" size="sm">{{ tagText(rej.status) }}</Tag>
        </view>
        <text class="rej-conclusion">{{ rej.conclusion }}</text>
        <text class="rej-reason">{{ rej.reason }}</text>
      </Card>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const titleText = computed(() => {
  return props.presentation.attributionStatus === 'insufficient' ? '证据不足的解释' : '已排除的解释'
})

function tagType(status: 'rejected' | 'insufficient' | 'weak'): 'neutral' | 'warning' {
  return status === 'insufficient' ? 'warning' : 'neutral'
}

function tagText(status: 'rejected' | 'insufficient' | 'weak'): string {
  if (status === 'rejected') return '已排除'
  if (status === 'insufficient') return '证据不足'
  return '弱支持'
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.rejected-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.rej-list {
  display: grid; grid-template-columns: 1fr; gap: $spacing-sm;
  @include bp.respond-to-lg { grid-template-columns: 1fr 1fr; }
}
.rej-card { margin: 0; }
.rej-header { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-xs; }
.rej-label { font-size: 24rpx; font-weight: 600; color: $text-color-title; flex: 1; }
.rej-conclusion { display: block; font-size: 24rpx; color: $text-color; line-height: 1.5; }
.rej-reason { display: block; margin-top: $spacing-xs; font-size: 22rpx; color: $text-color-secondary; line-height: 1.5; }
</style>
```

- [ ] **Step 3: 跑类型检查**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/analytics/components/MarketTraceAlternatives.vue src/modules/analytics/components/MarketTraceRejected.vue
git commit -m "feat(analytics): 新增 Alternatives/Rejected 子组件支持候选解释与已排除展示"
```

---

## Task 8: 重构 traceability.vue 组装新组件 + 跨端适配

**Files:**
- Modify: `src/modules/analytics/pages/traceability.vue`（全量重写 template + script，保留页面外壳）

**Interfaces:**
- Consumes: Task 3 的 `toMarketTracePresentation` + Task 4 的 `useResponsive` + Task 5-7 的 7 个子组件

- [ ] **Step 1: 重写 traceability.vue**

全量替换 `src/modules/analytics/pages/traceability.vue` 内容为：

```vue
<template>
  <view class="page-traceability">
    <SubPageCard title="大盘溯源">
      <LoadingState v-if="loading" />

      <Card v-else-if="error" class="error-state">
        <EmptyState title="复盘报告暂不可用" description="报告内容不完整或服务暂时不可用，请稍后重试" icon="cloud-off-line">
          <Button size="sm" @click="retry">重试</Button>
        </EmptyState>
      </Card>

      <EmptyState
        v-else-if="reportAvailability === 'pending'"
        title="复盘报告生成中"
        description="报告生成完成后将在此展示"
      />

      <EmptyState
        v-else-if="reportAvailability === 'failed'"
        title="暂无可用的复盘报告"
        description="当前最新复盘报告未能完成，请等待后续报告"
      />

      <EmptyState v-else-if="!presentation" text="当日暂无已完成复盘报告" />

      <view v-else class="report-content">
        <MarketTraceHeader :presentation="presentation" />
        <MarketTracePendingRisks :presentation="presentation" />
        <MarketTracePhenomenon :presentation="presentation" />
        <MarketTraceTimeline :presentation="presentation" :layout="timelineLayout" />
        <MarketTraceAlternatives :presentation="presentation" />
        <MarketTraceRejected :presentation="presentation" />
        <MarketTraceSectors :presentation="presentation" />

        <!-- 折叠兜底：完整 markdown -->
        <view class="markdown-section">
          <view class="section-title" @tap="toggleMarkdown">
            <text class="title-text">完整报告（原始）</text>
            <text class="toggle-icon" :class="{ 'is-open': showMarkdown }">▾</text>
          </view>
          <view v-if="showMarkdown" class="markdown-card">
            <rich-text :nodes="markdownHtml" class="report-html" />
          </view>
        </view>
      </view>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Button, Card } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import { markdownToHtml } from '@/shared/utils/markdown'
import { useResponsive } from '@/shared/utils/useResponsive'
import { toMarketTracePresentation, type MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'
import MarketTraceHeader from '@/modules/analytics/components/MarketTraceHeader.vue'
import MarketTracePendingRisks from '@/modules/analytics/components/MarketTracePendingRisks.vue'
import MarketTracePhenomenon from '@/modules/analytics/components/MarketTracePhenomenon.vue'
import MarketTraceTimeline from '@/modules/analytics/components/MarketTraceTimeline.vue'
import MarketTraceAlternatives from '@/modules/analytics/components/MarketTraceAlternatives.vue'
import MarketTraceRejected from '@/modules/analytics/components/MarketTraceRejected.vue'
import MarketTraceSectors from '@/modules/analytics/components/MarketTraceSectors.vue'

const loading = ref(false)
const error = ref(false)
const presentation = ref<MarketTracePresentation | null>(null)
const reportAvailability = ref<'pending' | 'failed' | null>(null)
const showMarkdown = ref(false)

const { breakpoint } = useResponsive()
const timelineLayout = computed<'vertical' | 'horizontal'>(() => {
  return breakpoint.value === 'sm' ? 'vertical' : 'horizontal'
})

const markdownHtml = computed(() => {
  return presentation.value ? markdownToHtml(presentation.value.markdownDetails) : ''
})

async function fetchData() {
  loading.value = true
  error.value = false
  presentation.value = null
  reportAvailability.value = null
  const requestedDate = shanghaiDateString()

  try {
    const record = await agentApi.getMarketTraceReview(requestedDate)
    if (record && record.status !== 'completed') {
      reportAvailability.value = record.status === 'queued' || record.status === 'processing'
        ? 'pending'
        : 'failed'
      return
    }
    presentation.value = record ? toMarketTracePresentation(record, requestedDate) : null
    if (record && !presentation.value) {
      throw new Error('复盘报告字段不完整')
    }
  } catch (err: unknown) {
    console.error('Failed to fetch market trace review:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function retry() {
  void fetchData()
}

function toggleMarkdown() {
  showMarkdown.value = !showMarkdown.value
}

onShow(() => {
  void fetchData()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-traceability { height: 100%; }
.report-content { display: flex; flex-direction: column; gap: 0; padding: 0 0 $spacing-base 0; }
.error-state { margin: $spacing-base; }

.markdown-section { padding: 0 $spacing-base; margin-top: $spacing-base; }
.markdown-section .section-title {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-sm; background: $bg-soft; border-radius: $r-md;
}
.title-text { font-size: 26rpx; font-weight: 500; color: $text-color-title; }
.toggle-icon { font-size: 24rpx; color: $text-color-secondary; transition: transform 0.2s; }
.toggle-icon.is-open { transform: rotate(180deg); }
.markdown-card {
  margin-top: $spacing-sm; padding: $spacing-base;
  background: $bg-card; border-radius: $r-md; box-shadow: $shadow-card;
}
.report-html { display: block; color: $text-color; font-size: 24rpx; line-height: 1.7; }
.report-html :deep(.md-h2) { margin: 12rpx 0; color: $text-color-title; font-size: 28rpx; font-weight: 600; }
.report-html :deep(.md-h1) { margin: 12rpx 0; color: $text-color-title; font-size: 30rpx; font-weight: 600; }
.report-html :deep(.md-h3) { margin: 10rpx 0; color: $text-color-title; font-size: 26rpx; font-weight: 600; }
</style>
```

- [ ] **Step 2: 跑类型检查**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: 跑现有测试不破坏**

Run: `pnpm test:node`
Expected: PASS（无新增失败）

- [ ] **Step 4: 启动 H5 dev server 验证渲染**

Run: `pnpm dev:h5`（后台）
等 10 秒，浏览器打开 `http://localhost:5173/#/modules/analytics/pages/traceability`

Expected：页面正常渲染，看到 7 个章节按顺序展示（或证据不足态差异化提示）

- [ ] **Step 5: 多视口截图验证**

用浏览器 devtools 切换视口：
- 375x812（手机端）：单列布局，时间线垂直
- 768x1024（平板端）：双列布局，时间线水平
- 820x1180（折叠展开）：与平板端一致

确认：布局无崩溃、时间线方向切换正确、双列网格生效

- [ ] **Step 6: Commit**

```bash
git add src/modules/analytics/pages/traceability.vue
git commit -m "feat(analytics): 重构 traceability.vue 用结构化组件替换 markdown rich-text 渲染"
```

---

## Task 9: 最终验证 + 文档更新

**Files:**
- 仅运行验证命令（无文件修改，除非发现 bug）

- [ ] **Step 1: 跑全部测试**

Run: `pnpm test:node`
Expected: PASS（所有 spec 通过，包括新增的 marketTraceReview.spec.ts + useResponsive.spec.ts）

- [ ] **Step 2: 跑类型检查**

Run: `pnpm type-check`
Expected: PASS，无 any 类型警告

- [ ] **Step 3: 检查 aistock-app-frontend 的 README 是否需更新**

读 `d:\ai_stock_app\aistock-app-frontend\README.md`，检查是否提到 traceability 页面或大盘溯源功能。若有，更新功能描述反映新结构化展示。若无，跳过。

- [ ] **Step 4: 检查 changelog-pending.md**

读 `d:\ai_stock_app\aistock-app-frontend\changelog-pending.md`（若存在），追加本次变更记录：
- 重构 traceability.vue 用结构化组件替换 markdown rich-text
- 新增 7 个 MarketTrace*.vue 子组件
- 新增 toMarketTracePresentation 提取函数
- 新增 useResponsive hook + breakpoints.scss
- 适配手机端+平板端+折叠端

- [ ] **Step 5: 最终浏览器视觉验证**

Run: `pnpm dev:h5`（后台）
浏览器打开 traceability 页面，三视口截图（375/768/820）对比：
- 7-23 数据：主因时间线完整展示「触发→传导→结果」+ 参考来源
- 7-31 数据：主因位置显示「证据不足，未确认主因」黄色提示
- 红涨绿跌颜色正确（#e54d5e / #18a058）
- 折叠 markdown 兜底可展开

确认所有验收标准满足后，进入用户验收阶段。

---

## Self-Review 自审

**1. Spec coverage 检查：**

| Spec 章节 | 实现 Task |
|---|---|
| 1. 背景目标 | Task 8 重构 |
| 2. 字段提取规则 | Task 3（toMarketTracePresentation） |
| 3. ViewModel 字段定义 | Task 3 |
| 4.1 UI 章节顺序（成功态） | Task 5-7 + Task 8 组装 |
| 4.2 UI 章节顺序（证据不足态） | Task 3（指针分叉）+ Task 6（空态卡片）+ Task 7（标题差异化） |
| 4.3 状态映射 | Task 3 attributionStatus 判定 + Task 5 Header Badge |
| 5.1 跨端范围（手机+平板+折叠，H5 不管） | Task 4 useResponsive |
| 5.2 断点系统 sm/md/lg | Task 4 breakpoints.scss |
| 5.3 章节级布局策略 | Task 5-7 SCSS @include respond-to-md/lg |
| 5.4 实现方式（rpx+SCSS+useResponsive+Timeline prop） | Task 4-8 |
| 5.5 华为双折叠适配 | Task 4（按 windowWidth 运行时判断） |
| 6. 文件清单 | Task 1-8 全覆盖 |
| 7. 实现顺序 | Task 1→8 顺序一致 |
| 8. 测试策略 | Task 3 单元测试 + Task 9 视觉验证 |
| 9.1-9.2 后端依赖 + scoring | Task 1 类型 + Task 3 用 severity 替代 scoring |
| 9.3 Fixture 数据 | Task 2 手工反推 fixture |
| 10. 验收标准 | Task 9 最终验证 |
| 11. 风险与降级 | Task 3（optional chaining + 默认空值） |
| 12. 不在范围 | 全部遵守 |

**2. Placeholder 扫描：** 无 TBD/TODO/"appropriate error handling" 等。所有代码块完整。

**3. Type consistency：**
- `MarketTracePresentation` 在 Task 3 定义，Task 5-8 消费，字段名一致（`primaryCause` / `alternatives` / `rejected` / `pendingRisks` / `phenomenon` / `sectorRanking`）
- `toMarketTracePresentation` 函数名在 Task 3 定义，Task 8 引用一致
- `useResponsive` 在 Task 4 定义，Task 8 引用一致
- `layout: 'vertical' | 'horizontal'` prop 在 Task 6 定义，Task 8 传入 `timelineLayout` computed 一致

自审通过，无遗漏。
