# 恐贪指数「动态建议」实施计划（情绪 × 真实板块行情）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将恐贪指数页「投资建议」卡由静态温度档配置改为"当日情绪结构 × 当日真实板块行情"驱动的动态建议。

**Architecture:** 后端新增 `GET /api/fear-greed/sectors`（复用东财 `EmSnapshotService.getConceptFlow()`，腾讯 `fetchTencentSectors()` 兜底，返回 top 涨幅/净流入/跌幅/净流出榜，缓存 10 分钟，失败 `availability:false`）；前端新增纯函数引擎 `fgAdvice.ts`（板块选择 / 操作要点 / advice / AI 洞见主因），`index.vue` 建议卡改渲染引擎输出，`ZONES` 静态内容保留为板块行情不可用时的 fallback。

**Tech Stack:** Node/Express + tsx(node:test)（后端）；uni-app Vue3 + vitest（前端）。

## Global Constraints

- 板块行情数据源仅复用后端现有能力：`EmSnapshotService.getConceptFlow()` 主源、`TencentSnapshotService.fetchTencentSectors()` 兜底；禁止新造外部 HTTP 客户端
- 契约字段统一 camelCase（后端负责把 `SectorFact` snake_case 映射为 camel）；响应统一走 `createResponse`，前端 request 层已解包 `data`
- 板块接口失败绝不阻塞 dashboard；前端渲染层面 `availability:false` 时必须走 fallback，不允许抛错/白屏
- 前端不新增运行时依赖；规则文案为模板化拼装（确定性、可测），不用 LLM
- 测试命令：后端 `node --import tsx --test tests/fear-greed.sector-board.test.ts`；前端 `npx vitest run src/modules/fear-greed/utils/fgAdvice.spec.ts`
- 类型检查：后端 `npx tsc --noEmit`；前端 `npx vue-tsc --noEmit`

---

## 文件结构

**aistock-app-api（后端）**
- 新建 `src/modules/fear-greed/sectorBoard.ts` —— 板块榜数据组装（loaders 可注入，便于单测）
- 修改 `src/modules/fear-greed/FearGreedService.ts` —— 缓存管理 + 导出 `getSectorBoardData()` 门面
- 修改 `src/modules/fear-greed/controller.ts` —— 新增 `GET /sectors` handler + 路由
- 新建 `tests/fear-greed.sector-board.test.ts`

**aistock-app-frontend（前端）**
- 修改 `src/shared/api/modules/fear-greed.ts` —— 契约类型 + `getSectors()`
- 新建 `src/modules/fear-greed/utils/fgAdvice.ts` —— 建议引擎纯函数
- 新建 `src/modules/fear-greed/utils/fgAdvice.spec.ts`
- 修改 `src/modules/fear-greed/pages/index.vue` —— 拉取板块数据、建议卡改用引擎渲染
- 修改 `CHANGELOG.md`、`src/modules/fear-greed/AGENTS.md`（后端对应 CHANGELOG）

---

### Task 1: 后端板块榜数据组装（sectorBoard.ts）

**Files:**
- Create: `d:\aistock\aistock-app-api\src\modules\fear-greed\sectorBoard.ts`
- Test: `d:\aistock\aistock-app-api\tests\fear-greed.sector-board.test.ts`

**Interfaces:**
- Consumes: `EmSnapshotService.getConceptFlow()`（返回 `EmConceptFlowResult{gainers,losers,inflows,outflows: SectorFact[], availability:{state:'available'|'unavailable', reason?}}`）；`TencentSnapshotService.fetchTencentSectors()`（返回 `TencentBoardRankingResult{gainers,losers, availability}`）；`SectorFact` 字段 `{ts_code,name,pct_change,net_amount,lead_stock,company_num,trade_date}`（net_amount 单位元，trade_date 为 YYYYMMDD 或 ''）
- Produces: `buildSectorBoardData(loaders?)` 返回下列类型（Task 2 与 Task 3 依赖）：

```ts
export interface FgSectorFact {
  tsCode: string
  name: string
  pctChange: number
  netAmount: number
  leadStock: string
}
export interface FgSectorBoardData {
  availability: boolean
  tradeDate: string            // 'YYYY-MM-DD'
  source: 'eastmoney' | 'tencent' | ''
  sectors: {
    topGainers: FgSectorFact[]
    topInflows: FgSectorFact[]
    topLosers: FgSectorFact[]
    topOutflows: FgSectorFact[]
  }
}
export interface FgSectorLoaders {
  concept: () => Promise<{ gainers: SectorFact[]; losers: SectorFact[]; inflows: SectorFact[]; outflows: SectorFact[]; available: boolean }>
  tencent: () => Promise<{ gainers: SectorFact[]; losers: SectorFact[]; available: boolean }>
}
export const defaultLoaders: FgSectorLoaders
export const EMPTY_BOARD: FgSectorBoardData
export function buildSectorBoardData(loaders?: FgSectorLoaders): Promise<FgSectorBoardData>
```

- [ ] **Step 1: 写失败测试**

新建 `d:\aistock\aistock-app-api\tests\fear-greed.sector-board.test.ts`：

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildSectorBoardData,
    EMPTY_BOARD,
    type FgSectorLoaders,
} from '../src/modules/fear-greed/sectorBoard';

function fact(name: string, pct: number, net: number) {
    return { ts_code: 'BK0001', name, pct_change: pct, net_amount: net, lead_stock: 'X', company_num: 10, trade_date: '20260903' };
}

function loaders(over: Partial<FgSectorLoaders> = {}): FgSectorLoaders {
    return {
        concept: async () => ({
            gainers: [fact('A', 3, 1e8)],
            losers: [fact('B', -2, -1e8)],
            inflows: [fact('C', 1, 5e8)],
            outflows: [fact('D', 4, -5e8)],
            available: true,
        }),
        tencent: async () => ({ gainers: [fact('T1', 2, 0)], losers: [fact('T2', -1, 0)], available: true }),
        ...over,
    };
}

test('buildSectorBoardData: 东财主源返回四榜（camel 映射 + 元单位保留）', async () => {
    const out = await buildSectorBoardData(loaders());
    assert.equal(out.availability, true);
    assert.equal(out.source, 'eastmoney');
    assert.equal(out.tradeDate, '2026-09-03');
    assert.equal(out.sectors.topGainers[0].name, 'A');
    assert.equal(out.sectors.topGainers[0].pctChange, 3);
    assert.equal(out.sectors.topInflows[0].netAmount, 5e8);
    assert.equal(out.sectors.topOutflows[0].name, 'D');
});

test('buildSectorBoardData: 东财不可用时回退腾讯（只给涨跌幅榜，inflows 为空）', async () => {
    const out = await buildSectorBoardData(loaders({ concept: async () => ({ gainers: [], losers: [], inflows: [], outflows: [], available: false }) }));
    assert.equal(out.availability, true);
    assert.equal(out.source, 'tencent');
    assert.equal(out.sectors.topGainers[0].name, 'T1');
    assert.equal(out.sectors.topInflows.length, 0);
});

test('buildSectorBoardData: 双源都失败时 availability=false 空结构', async () => {
    const out = await buildSectorBoardData(loaders({
        concept: async () => ({ gainers: [], losers: [], inflows: [], outflows: [], available: false }),
        tencent: async () => ({ gainers: [], losers: [], available: false }),
    }));
    assert.deepEqual(out, { ...EMPTY_BOARD, tradeDate: out.tradeDate, source: '' });
    assert.equal(out.availability, false);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd d:\aistock\aistock-app-api && node --import tsx --test tests/fear-greed.sector-board.test.ts`
Expected: FAIL —— `Cannot find module '../src/modules/fear-greed/sectorBoard'`

- [ ] **Step 3: 实现 sectorBoard.ts**

新建 `d:\aistock\aistock-app-api\src\modules\fear-greed\sectorBoard.ts`：

```ts
/**
 * 恐贪指数「配置方向」的板块行情数据组装。
 * 主源：东财概念板块 clist（getConceptFlow，实时）；兜底：腾讯板块榜（fetchTencentSectors，仅涨跌幅榜）。
 * 纯函数 + 注入 loaders，便于单元测试；不依赖 PG/Redis。
 */
import { EmSnapshotService } from '../quote/EmSnapshotService';
import { TencentSnapshotService } from '../quote/TencentSnapshotService';
import type { SectorFact } from '../quote/MarketSnapshotService';

export interface FgSectorFact {
    tsCode: string;
    name: string;
    pctChange: number;
    netAmount: number;
    leadStock: string;
}

export interface FgSectorBoardData {
    availability: boolean;
    tradeDate: string; // YYYY-MM-DD
    source: 'eastmoney' | 'tencent' | '';
    sectors: {
        topGainers: FgSectorFact[];
        topInflows: FgSectorFact[];
        topLosers: FgSectorFact[];
        topOutflows: FgSectorFact[];
    };
}

export interface FgSectorLoaders {
    concept: () => Promise<{ gainers: SectorFact[]; losers: SectorFact[]; inflows: SectorFact[]; outflows: SectorFact[]; available: boolean }>;
    tencent: () => Promise<{ gainers: SectorFact[]; losers: SectorFact[]; available: boolean }>;
}

function toFact(f: SectorFact): FgSectorFact {
    return { tsCode: f.ts_code, name: f.name, pctChange: f.pct_change, netAmount: f.net_amount, leadStock: f.lead_stock };
}

function pickTradeDate(facts: SectorFact[]): string {
    const raw = facts.find((f) => f.trade_date && f.trade_date.length === 8);
    if (!raw) {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${m}-${day}`;
    }
    const t = raw.trade_date;
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
}

export const EMPTY_BOARD: FgSectorBoardData = {
    availability: false,
    tradeDate: '',
    source: '',
    sectors: { topGainers: [], topInflows: [], topLosers: [], topOutflows: [] },
};

/** 生产默认 loaders（包住现有快照服务的异常，避免整次组装抛错） */
export const defaultLoaders: FgSectorLoaders = {
    concept: async () => {
        try {
            const r = await EmSnapshotService.getConceptFlow();
            const available = r.availability.state === 'available'
                && (r.gainers.length > 0 || r.inflows.length > 0);
            return { gainers: r.gainers, losers: r.losers, inflows: r.inflows, outflows: r.outflows, available };
        } catch {
            return { gainers: [], losers: [], inflows: [], outflows: [], available: false };
        }
    },
    tencent: async () => {
        try {
            const r = await TencentSnapshotService.fetchTencentSectors();
            const available = r.availability.state === 'available'
                && (r.gainers.length > 0 || r.losers.length > 0);
            return { gainers: r.gainers, losers: r.losers, available };
        } catch {
            return { gainers: [], losers: [], available: false };
        }
    },
};

export async function buildSectorBoardData(loaders: FgSectorLoaders = defaultLoaders): Promise<FgSectorBoardData> {
    const em = await loaders.concept();
    if (em.available) {
        return {
            availability: true,
            tradeDate: pickTradeDate(em.gainers.length ? em.gainers : em.inflows),
            source: 'eastmoney',
            sectors: {
                topGainers: em.gainers.slice(0, 5).map(toFact),
                topInflows: em.inflows.slice(0, 5).map(toFact),
                topLosers: em.losers.slice(0, 5).map(toFact),
                topOutflows: em.outflows.slice(0, 5).map(toFact),
            },
        };
    }

    const ten = await loaders.tencent();
    if (ten.available) {
        return {
            availability: true,
            tradeDate: pickTradeDate(ten.gainers),
            source: 'tencent',
            sectors: {
                topGainers: ten.gainers.slice(0, 5).map(toFact),
                topInflows: [],
                topLosers: ten.losers.slice(0, 5).map(toFact),
                topOutflows: [],
            },
        };
    }

    return { ...EMPTY_BOARD, tradeDate: pickTradeDate([]) };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/fear-greed.sector-board.test.ts`
Expected: PASS（3/3）

- [ ] **Step 5: 类型检查 + 提交**

Run: `npx tsc --noEmit`
Expected: 无错误

```bash
git add src/modules/fear-greed/sectorBoard.ts tests/fear-greed.sector-board.test.ts
git commit -m "feat(fear-greed): 板块行情数据组装 sectorBoard（东财主源+腾讯兜底，可注入可测）"
```

---

### Task 2: 后端缓存门面 + `GET /api/fear-greed/sectors`

**Files:**
- Modify: `d:\aistock\aistock-app-api\src\modules\fear-greed\FearGreedService.ts`
- Modify: `d:\aistock\aistock-app-api\src\modules\fear-greed\controller.ts`

**Interfaces:**
- Consumes: `buildSectorBoardData` / `EMPTY_BOARD`（Task 1）
- Produces:
  - `export async function getSectorBoardData(): Promise<FgSectorBoardData>`（10 分钟内存缓存）
  - controller handler `sectors(req,res)` 与 `fearGreedRouter.get('/sectors', sectors)`，经 `createResponse(res, 200, 'success', data)` 返回 `data`

- [ ] **Step 1: FearGreedService 加缓存门面**

在 `d:\aistock\aistock-app-api\src\modules\fear-greed\FearGreedService.ts` 顶部 import 区追加：

```ts
import { buildSectorBoardData, EMPTY_BOARD, type FgSectorBoardData } from './sectorBoard';
```

在文件末尾（`getCachedFromRedis` 之后）追加：

```ts
const SECTOR_CACHE_TTL_SECONDS = 10 * 60; // 板块行情与恐贪 30min 缓存解耦，盘中更及时
let sectorBoardCache: { ts: number; data: FgSectorBoardData } | null = null;

/** 板块行情（10 分钟缓存；失败返回 availability:false，不抛错） */
export async function getSectorBoardData(): Promise<FgSectorBoardData> {
    const now = Date.now();
    if (sectorBoardCache && now - sectorBoardCache.ts < SECTOR_CACHE_TTL_SECONDS * 1000) {
        return sectorBoardCache.data;
    }
    try {
        const data = await buildSectorBoardData();
        sectorBoardCache = { ts: now, data };
        return data;
    } catch (err) {
        console.error('[FearGreed] sector board failed:', err instanceof Error ? err.message : String(err));
        return { ...EMPTY_BOARD, tradeDate: new Date().toISOString().slice(0, 10) };
    }
}
```

- [ ] **Step 2: controller 注册路由**

在 `d:\aistock\aistock-app-api\src\modules\fear-greed\controller.ts` 修改 import 与新增 handler、路由：

```ts
import { buildDashboard, getHistory, getLatestJq, getSectorBoardData, refreshJq } from './FearGreedService';
```

在 `refresh` handler 之后追加：

```ts
/** GET /api/fear-greed/sectors — 当日板块行情榜（配置方向数据源；失败返回 availability:false 不 500） */
export async function sectors(_req: Request, res: Response): Promise<void> {
    try {
        const data = await getSectorBoardData();
        createResponse(res, 200, 'success', data);
    } catch (err) {
        console.error('[FearGreed] sectors failed:', err instanceof Error ? err.message : String(err));
        createResponse(res, 200, 'success', { availability: false, tradeDate: '', source: '', sectors: { topGainers: [], topInflows: [], topLosers: [], topOutflows: [] } });
    }
}
```

路由追加：

```ts
fearGreedRouter.get('/sectors', sectors);
```

- [ ] **Step 3: 验证编译**

Run: `cd d:\aistock\aistock-app-api && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 启动本地验证（可选，若本地 3000 API 在跑则触发一次真实请求）**

Run: `curl -s "http://localhost:3000/api/fear-greed/sectors" | head -c 400`
Expected: 含 `"availability":true` 或 `false` 的 JSON；即使 `false` 也返回 200。

- [ ] **Step 5: 提交**

```bash
git add src/modules/fear-greed/FearGreedService.ts src/modules/fear-greed/controller.ts
git commit -m "feat(fear-greed): GET /api/fear-greed/sectors 板块行情接口（10min 缓存，失败降级）"
```

---

### Task 3: 前端契约类型 + API `getSectors`

**Files:**
- Modify: `d:\aistock\aistock-app-frontend\src\shared\api\modules\fear-greed.ts`

**Interfaces:**
- Consumes: 后端 `GET /api/fear-greed/sectors` 响应 `data` 体（camelCase，见 Task 1）
- Produces（Task 4/5 依赖）:

```ts
export interface FgSectorFact { tsCode: string; name: string; pctChange: number; netAmount: number; leadStock: string }
export interface FgSectorBoard {
  availability: boolean
  tradeDate: string
  source: 'eastmoney' | 'tencent' | ''
  sectors: {
    topGainers: FgSectorFact[]
    topInflows: FgSectorFact[]
    topLosers: FgSectorFact[]
    topOutflows: FgSectorFact[]
  }
}
export const fearGreedApi.getSectors: () => Promise<FgSectorBoard>
```

- [ ] **Step 1: 追加类型与方法**

在 `d:\aistock\aistock-app-frontend\src\shared\api\modules\fear-greed.ts` 的 `FearGreedDashboard` 定义之后、`fearGreedApi` 之前追加：

```ts
/** 后端 /api/fear-greed/sectors 返回的板块行情（camel 契约） */
export interface FgSectorFact {
  tsCode: string
  name: string
  pctChange: number
  netAmount: number
  leadStock: string
}

export interface FgSectorBoard {
  availability: boolean
  tradeDate: string
  source: 'eastmoney' | 'tencent' | ''
  sectors: {
    topGainers: FgSectorFact[]
    topInflows: FgSectorFact[]
    topLosers: FgSectorFact[]
    topOutflows: FgSectorFact[]
  }
}
```

`fearGreedApi` 内追加：

```ts
  /** 获取当日板块行情榜（配置方向数据源；availability=false 表示行情不可用） */
  getSectors() {
    return request.get<FgSectorBoard>('/fear-greed/sectors')
  },
```

- [ ] **Step 2: 提交**

```bash
git add src/shared/api/modules/fear-greed.ts
git commit -m "feat(fear-greed): 前端契约类型 + fearGreedApi.getSectors"
```

---

### Task 4: 前端建议引擎 fgAdvice（纯函数 + vitest）

**Files:**
- Create: `d:\aistock\aistock-app-frontend\src\modules\fear-greed\utils\fgAdvice.ts`
- Create: `d:\aistock\aistock-app-frontend\src\modules\fear-greed\utils\fgAdvice.spec.ts`

**Interfaces:**
- Consumes: `FearGreedIndicator`（key/score/name…）、`FgSectorBoard`（Task 3）
- Produces（Task 5 依赖）:

```ts
export interface FgContext {
  composite: number
  indicators: FearGreedIndicator[]
  board?: FgSectorBoard          // 缺省/availability=false => 板块走 fallback
}
export interface SectorTag { name: string; desc: string; kind: 'flow-in' | 'gain' | 'warning' | 'fallback' }
export interface AdviceResult {
  sectorTags: SectorTag[]        // 恒 3 个
  actions: string[]
  advice: string
}
export function zoneLabel(composite: number): string            // 冰点/寒冷/常温/温热/沸点
export function buildSectorTags(ctx: FgContext, fallback: { name: string; desc: string }[]): SectorTag[]
export function buildActions(ctx: FgContext): string[]
export function buildAdvice(ctx: FgContext): string
export function buildDriversSentence(ctx: FgContext): string   // AI 洞见"今日主因"
```

**候选板块规则（与 spec 4.2 一致）：**
- 冰点 <20 / 寒冷 <45：优先 `topInflows` 中 `pctChange <= 5` 且 `netAmount > 0` 的板块，依次取至 3 个；不足则从 `topGainers` 取 `0 < pctChange <= 3` 补齐；再不足用 fallback
- 常温 45-55：`topInflows` 前 2 + `topGainers` 中 `pctChange <= 4` 的 1 个
- 温热 55-80：`topInflows` 前 2 + 1 个 `warning`（从 `topOutflows` 取 `pctChange >= 3` 的首个，desc 标注"高位资金流出，勿追"）
- 沸点 ≥80：`topInflows` 中 `pctChange <= 3` 的方向取 2（防守）+ 1 个 `warning`（同上）
- 板块不可用（`board` 缺省或 `availability===false` 或所需榜为空）→ 返回 fallback 数组（kind='fallback'）
- `desc` 模板：有行情数据 `「{name} 今日 {±pct}%，主力净流入 {±亿} 元」+ reason`；fallback 直接用 fallback.desc

- [ ] **Step 1: 写失败测试**

新建 `d:\aistock\aistock-app-frontend\src\modules\fear-greed\utils\fgAdvice.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import {
  buildSectorTags, buildActions, buildAdvice, buildDriversSentence, zoneLabel,
  type FgContext,
} from './fgAdvice'
import type { FgSectorBoard } from '@/shared/api/modules/fear-greed'

function ind(key: string, name: string, score: number): FgContext['indicators'][number] {
  return { key, name, score, raw: 0, desc: '', label: '', history: { dates: [], scores: [] } }
}
const FALLBACK = [
  { name: '防御性消费', desc: '刚需消费，业绩确定性高。' },
  { name: '医药生物', desc: '需求刚性。' },
  { name: '公用事业', desc: '现金流稳定。' },
]
const BOARD: FgSectorBoard = {
  availability: true, tradeDate: '2026-09-03', source: 'eastmoney',
  sectors: {
    topGainers: [{ tsCode: '1', name: '航运港口', pctChange: 6, netAmount: 8e8, leadStock: '海通发展' }],
    topInflows: [
      { tsCode: '2', name: '保险', pctChange: 2.5, netAmount: 9e8, leadStock: '中国太保' },
      { tsCode: '3', name: '电力', pctChange: 1.2, netAmount: 6e8, leadStock: '长江电力' },
      { tsCode: '4', name: '银行', pctChange: 0.8, netAmount: 5e8, leadStock: '招商银行' },
    ],
    topLosers: [{ tsCode: '5', name: '半导体', pctChange: -3, netAmount: -5e8, leadStock: '' }],
    topOutflows: [{ tsCode: '6', name: '光伏', pctChange: 3.5, netAmount: -9e8, leadStock: '' }],
  },
}
function ctx(composite: number, list: { key: string; name: string; score: number }[]): FgContext {
  return { composite, indicators: list.map((i) => ind(i.key, i.name, i.score)), board: BOARD }
}

describe('zoneLabel', () => {
  it('五档划分', () => {
    expect(zoneLabel(10)).toBe('冰点')
    expect(zoneLabel(30)).toBe('寒冷')
    expect(zoneLabel(50)).toBe('常温')
    expect(zoneLabel(70)).toBe('温热')
    expect(zoneLabel(90)).toBe('沸点')
  })
})

describe('buildSectorTags', () => {
  it('寒冷档：从净流入榜选流入方向，不用涨幅榜', () => {
    const tags = buildSectorTags(ctx(30, []), FALLBACK)
    expect(tags.length).toBe(3)
    expect(tags.map((t) => t.name)).toEqual(['保险', '电力', '银行'])
    expect(tags.every((t) => t.kind === 'flow-in')).toBe(true)
    expect(tags[0].desc).toContain('保险')
    expect(tags[0].desc).toContain('9亿')
  })

  it('温热档：2 流入 + 1 高位流出警示', () => {
    const tags = buildSectorTags(ctx(70, []), FALLBACK)
    expect(tags.length).toBe(3)
    expect(tags.filter((t) => t.kind === 'flow-in').length).toBe(2)
    expect(tags.filter((t) => t.kind === 'warning').length).toBe(1)
    expect(tags.find((t) => t.kind === 'warning')?.name).toBe('光伏')
  })

  it('行情不可用：回退 fallback', () => {
    const noBoard: FgContext = { composite: 30, indicators: [], board: { ...BOARD, availability: false } }
    const tags = buildSectorTags(noBoard, FALLBACK)
    expect(tags.map((t) => t.name)).toEqual(['防御性消费', '医药生物', '公用事业'])
    expect(tags.every((t) => t.kind === 'fallback')).toBe(true)
  })
})

describe('buildActions / buildAdvice / buildDriversSentence', () => {
  it('北向大幅流出：actions 含外资要点，advice 提到主驱动，drivers 含指标中文名', () => {
    const c = ctx(30, [
      { key: 'north_flow', name: '北向资金', score: 8 },
      { key: 'seal_rate', name: '封板率', score: 60 },
      { key: 'breadth', name: '股价强度', score: 52 },
    ])
    const actions = buildActions(c)
    expect(actions.length).toBe(3)
    expect(actions.some((a) => a.includes('外资'))).toBe(true)
    expect(buildAdvice(c)).toContain('北向资金')
    expect(buildDriversSentence(c)).toContain('北向资金')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd d:\aistock\aistock-app-frontend && npx vitest run src/modules/fear-greed/utils/fgAdvice.spec.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 fgAdvice.ts**

新建 `d:\aistock\aistock-app-frontend\src\modules\fear-greed\utils\fgAdvice.ts`：

```ts
/**
 * 恐贪指数「投资建议」规则引擎（纯函数，无 IO）。
 * 输入：当前复合指数 + 9 指标 + 后端板块榜；输出：配置方向/操作要点/策略文案/AI 洞见主因。
 * 规则均为确定性模板，便于单测。
 */
import type { FearGreedIndicator, FgSectorBoard, FgSectorFact } from '@/shared/api/modules/fear-greed'

export interface FgContext {
  composite: number
  indicators: FearGreedIndicator[]
  /** 后端板块榜；缺省或 availability=false 时板块回退 fallback */
  board?: FgSectorBoard
}

export interface SectorTag {
  name: string
  desc: string
  kind: 'flow-in' | 'gain' | 'warning' | 'fallback'
}

export interface AdviceResult {
  sectorTags: SectorTag[]
  actions: string[]
  advice: string
}

export function zoneLabel(composite: number): string {
  if (composite < 20) return '冰点'
  if (composite < 45) return '寒冷'
  if (composite < 55) return '常温'
  if (composite < 80) return '温热'
  return '沸点'
}

const DECENT = 3 // 涨停/净流入数字格式化位数

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** 金额（元）→ "X亿"/"-X亿" */
function fmtYuan(v: number): string {
  const yi = v / 1e8
  const abs = Math.abs(yi) < 0.01 ? '0' : `${Math.round(Math.abs(yi) * 10) / 10}`
  return `${yi < 0 ? '-' : ''}${abs}亿`
}

/** 指定榜内可用事实（过滤非正净流入按需）；返回按 pct 温和优先排序的候选 */
function pickFrom(list: FgSectorFact[], opts: { maxPct?: number; netPositive?: boolean; count: number }): FgSectorFact[] {
  const arr = list.filter((f) => (opts.maxPct == null || f.pctChange <= opts.maxPct) && (opts.netPositive !== true || f.netAmount > 0))
  return arr.slice(0, opts.count)
}

function tagOf(f: FgSectorFact, kind: SectorTag['kind'], reason: string): SectorTag {
  const lead = f.leadStock ? `，领涨 ${f.leadStock}` : ''
  return { name: f.name, kind, desc: `${f.name} 今日 ${fmtPct(f.pctChange)}，主力净流入 ${fmtYuan(f.netAmount)}${lead}，${reason}` }
}

export function buildSectorTags(ctx: FgContext, fallback: { name: string; desc: string }[]): SectorTag[] {
  const board = ctx.board
  const available = board && board.availability
    && (board.sectors.topInflows.length > 0 || board.sectors.topGainers.length > 0)
  if (!available) {
    return fallback.slice(0, 3).map((f) => ({ name: f.name, desc: f.desc, kind: 'fallback' as const }))
  }
  const { topInflows, topGainers, topOutflows } = board!.sectors
  const c = ctx.composite
  const tags: SectorTag[] = []
  const addInflow = (n: number) => {
    const arr = pickFrom(topInflows, { maxPct: 5, netPositive: true, count: n })
    arr.forEach((f) => tags.push(tagOf(f, 'flow-in', '资金逆势流入、偏防御，情绪修复期相对抗跌')))
    return arr.length
  }

  if (c < 45) {
    let got = addInflow(3)
    if (got < 3) {
      for (const f of pickFrom(topGainers, { maxPct: 3, count: 3 - got })) {
        tags.push(tagOf(f, 'gain', '涨幅温和且有资金承接，具备修复弹性'))
      }
    }
  } else if (c < 55) {
    addInflow(2)
    for (const f of pickFrom(topGainers, { maxPct: 4, count: 1 })) {
      tags.push(tagOf(f, 'gain', '强势但有度，可小仓位均衡参与'))
    }
  } else if (c < 80) {
    addInflow(2)
    const warn = topOutflows.find((f) => f.pctChange >= 3) ?? topGainers.find((f) => f.pctChange >= 5)
    if (warn) tags.push(tagOf(warn, 'warning', '高位放量资金流出，追高风险大，建议兑现不宜加仓'))
    else addInflow(3)
  } else {
    addInflow(2)
    const warn = topOutflows.find((f) => f.pctChange >= 3)
    if (warn) tags.push(tagOf(warn, 'warning', '情绪过热、资金流出，勿追高'))
    else tags.push({ name: '低风险资产', kind: 'fallback', desc: '情绪过热，建议增配债券/货基等低风险品种，等待情绪回落' })
  }

  // 数量补齐到 3：用温和大涨里未超 5% 的补
  if (tags.length < 3) {
    for (const f of pickFrom(topInflows, { maxPct: 8, count: 3 - tags.length })) {
      if (!tags.some((t) => t.name === f.name)) tags.push(tagOf(f, 'flow-in', '资金面相对占优，可作配置补充'))
    }
  }
  if (tags.length < 3) {
    for (const f of pickFrom(topGainers, { maxPct: 8, count: 3 - tags.length })) {
      if (!tags.some((t) => t.name === f.name)) tags.push(tagOf(f, 'gain', '当日相对强势方向'))
    }
  }
  return tags.slice(0, 3)
}

/** 指标 key → 操作要点命中函数（返回匹配要点或 null） */
function actionFor(key: string, score: number, raw: number): string | null {
  switch (key) {
    case 'north_flow': return score <= 20 ? '回避外资重仓，关注内资定价方向' : null
    case 'break_rate': return score <= 25 ? '涨停炸板率高，接力情绪差，短线少打板' : null
    case 'seal_rate': return score <= 25 ? '封板力度弱，追涨易被套，等待放量封板信号' : null
    case 'breadth': return score < 40 ? '上涨家数占比低，普跌未止，勿急于接飞刀' : null
    case 'futures': return score <= 25 ? '股指期货深贴水，对冲盘增多，警惕继续下探' : null
    case 'equity_bond': return score <= 25 ? '股弱债稳、风险偏好收缩，均衡配置防守为先' : null
    case 'streak': return raw >= 7 ? '连板高度过高，短线情绪过热，谨防高位退潮' : null
    default: return null
  }
}

export function buildActions(ctx: FgContext): string[] {
  const hits: string[] = []
  for (const ind of ctx.indicators) {
    const hit = actionFor(ind.key, ind.score, ind.raw)
    if (hit) hits.push(hit)
  }
  const zone = zoneLabel(ctx.composite)
  if (zone === '沸点') hits.unshift('不追高，分批兑现浮盈')
  if (zone === '冰点' || zone === '寒冷') hits.unshift('控制仓位，分批布局，等待企稳信号')
  const uniq = [...new Set(hits)]
  const base: string[] = []
  if (!uniq.some((s) => s.includes('仓位'))) base.push('控制仓位，严格执行止损纪律')
  if (uniq.length === 0) base.unshift('多看少动，等待情绪方向明朗')
  return [...uniq, ...base].slice(0, 3)
}

/** 情绪两端驱动指标（score 最低的恐惧驱动、最高的贪婪驱动各取一个） */
function drivers(ctx: FgContext): { fear?: FearGreedIndicator; greed?: FearGreedIndicator } {
  const pool = ctx.indicators.filter((i) => !i.excluded)
  const fear = [...pool].sort((a, b) => a.score - b.score)[0]
  const greed = [...pool].sort((a, b) => b.score - a.score)[0]
  const pickFear = fear && fear.score <= 30 ? fear : undefined
  const pickGreed = greed && greed.score >= 70 ? greed : undefined
  return { fear: pickFear, greed: pickGreed }
}

export function buildDriversSentence(ctx: FgContext): string {
  const { fear, greed } = drivers(ctx)
  const parts: string[] = []
  if (fear) parts.push(`${fear.name}走弱（${fear.score.toFixed(0)} 分）拖累情绪`)
  if (greed) parts.push(`${greed.name}偏强（${greed.score.toFixed(0)} 分）提供局部支撑`)
  return parts.length ? `今日情绪主要由${parts.join('，')}驱动` : '今日各项指标均衡，无单一主导因素'
}

export function buildAdvice(ctx: FgContext): string {
  const zone = zoneLabel(ctx.composite)
  const d = buildDriversSentence(ctx)
  const tagNames = buildSectorTags(ctx, []).length ? '' : ''
  // tagNames 仅用于保持函数签名用途；真正的配置方向由调用方渲染
  void tagNames
  if (zone === '冰点' || zone === '寒冷') {
    return `${d}。市场情绪${zone}，建议控制仓位、分批布局超跌优质资产，优先资金逆势流入的防御方向，等待放量企稳。`
  }
  if (zone === '常温') {
    return `${d}。市场情绪中性、方向未明，维持现有仓位，均衡配置流入居前方向，不追高不杀跌。`
  }
  if (zone === '温热') {
    return `${d}。情绪偏热但已现分歧，建议逢高分批止盈，仓位向低位补涨与防御方向倾斜，警惕高位资金流出板块。`
  }
  return `${d}。市场情绪${zone}过热，风险收益比下降，建议大幅降仓、落袋为安，只保留低风险品种。`
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/modules/fear-greed/utils/fgAdvice.spec.ts`
Expected: PASS（5/5）

- [ ] **Step 5: 类型检查 + 提交**

Run: `npx vue-tsc --noEmit`
Expected: 无错误

```bash
git add src/modules/fear-greed/utils/fgAdvice.ts src/modules/fear-greed/utils/fgAdvice.spec.ts
git commit -m "feat(fear-greed): 建议引擎 fgAdvice（板块选择/操作要点/advice/AI洞见主因）+ 单测"
```

---

### Task 5: index.vue 接线（建议卡数据驱动 + 板块拉取 + AI 洞见主因）

**Files:**
- Modify: `d:\aistock\aistock-app-frontend\src\modules\fear-greed\pages\index.vue`

**Interfaces:**
- Consumes: `fearGreedApi.getSectors()`、`FgSectorBoard`（Task 3）；`buildSectorTags/buildActions/buildAdvice/buildDriversSentence/zoneLabel`（Task 4）；现有 `zone.value`（保留 color/label 等 UI 元数据）；`ZONES` 保留静态 `sectors` 作为 fallback
- Produces: `adviceCards` computed 驱动建议卡 UI

改动点（均为小步 SearchReplace）：

- [ ] **Step 1: 引入 API 方法与引擎**

在 `index.vue` script 的 import 区追加：

```ts
import { fearGreedApi, type FearGreedDashboard, type FgSectorBoard } from '@/shared/api/modules/fear-greed'
import { buildSectorTags, buildActions, buildAdvice, buildDriversSentence } from '../utils/fgAdvice'
```

- [ ] **Step 2: 新增板块状态与拉取**

在 `const dashboard = ref<FearGreedDashboard | null>(null)` 附近追加：

```ts
/** 当日板块行情（建议引擎输入；失败静默置 null 走 fallback） */
const sectorBoard = ref<FgSectorBoard | null>(null)
```

在 `async function load()` 内、`dashboard` 请求旁追加（板块失败不影响主数据）：

```ts
    fearGreedApi.getSectors().then((b) => { sectorBoard.value = b }).catch(() => { sectorBoard.value = null })
```

- [ ] **Step 3: 建议卡引擎 computed**

在 `zone` computed 之后追加：

```ts
/**
 * 动态建议（情绪结构 × 真实板块行情；板块不可用时回退 ZONES 静态档位内容）。
 * 温度档静态内容（ZONES）仅作 fallback 与 UI 元数据（色/标签/仓位锚点）。
 */
const fallbackSectors = computed(() => zone.value.sectors.map((s) => ({ name: s.name, desc: s.desc })))
const adviceCards = computed(() => {
  const c = dashboard.value?.currentIndex ?? 50
  const indicators = dashboard.value?.indicators ?? []
  const ctx = { composite: c, indicators, board: sectorBoard.value ?? undefined }
  return {
    sectorTags: buildSectorTags(ctx, fallbackSectors.value),
    actions: buildActions(ctx),
    advice: buildAdvice(ctx),
  }
})
```

- [ ] **Step 4: AI 洞见接入"今日主因"**

修改 `aiInsight` computed 的 `whyParts` 首句，把固定 `summary` 措辞替换为引擎驱动句开头：

```ts
  const driversSentence = buildDriversSentence({ composite: cur, indicators: dashboard.value?.indicators ?? [] })
  const whyParts: string[] = [`${driversSentence}，当前市场情绪${z.label}（恐贪指数 ${cur.toFixed(0)}%）`]
```

- [ ] **Step 5: 模板改渲染 adviceCards**

- 配置方向标签循环：`v-for="s in zone.sectors"` → `v-for="s in adviceCards.sectorTags"`（`:key` 改用 `s.name`，行为不变；`activeSector` 弹窗展示 `s.desc`）
- 操作要点：`v-for="(a, i) in zone.actions"` → `v-for="(a, i) in adviceCards.actions"`
- 建议文案：`{{ zone.advice }}` → `{{ adviceCards.advice }}`

模板三处 `SearchReplace` 的替换片段（其余不变）：

```html
<view class="fg-sectors__tags">
  <view
    v-for="s in adviceCards.sectorTags"
    :key="s.name"
    class="fg-tag"
    :style="{ borderColor: zone.color, color: zone.color }"
    @tap="activeSector = s"
  >{{ s.name }}</view>
</view>
```

```html
<view
  v-for="(a, i) in adviceCards.actions"
  :key="i"
  class="fg-actions__item"
>
  <view class="fg-actions__dot" :style="{ background: zone.color }" />
  <text class="fg-actions__text">{{ a }}</text>
</view>
```

```html
<text class="fg-advice">{{ adviceCards.advice }}</text>
```

> 注意：`ZoneDef.advice/sectors/actions` 字段与 `zone.summary` 保留（fallback/温度计 UI 仍引用 `zone.color/label/summary`；若 vue-tsc 报未使用字段不阻塞，因为 `ZONES` 为已声明结构数据）。`fg-advice`/标签样式类不变。

- [ ] **Step 6: 验证**

Run: `cd d:\aistock\aistock-app-frontend && npx vue-tsc --noEmit`
Expected: 无错误

浏览器手动验证：打开恐贪页，投资建议卡显示真实板块（保险/电力…）或 fallback；点击标签弹窗含行情数字与理由；AI 洞见首句含"今日情绪主要由…驱动"。

- [ ] **Step 7: 提交**

```bash
git add src/modules/fear-greed/pages/index.vue
git commit -m "feat(fear-greed): 建议卡改数据驱动（板块行情 + 情绪结构），AI 洞见加今日主因"
```

---

### Task 6: 文档与收尾

**Files:**
- Modify: `d:\aistock\aistock-app-api\CHANGELOG.md`、`d:\aistock\aistock-app-frontend\CHANGELOG.md`
- Modify: `d:\aistock\aistock-app-frontend\src\modules\fear-greed\AGENTS.md`

- [ ] **Step 1: 后端 CHANGELOG 顶部追加**

```markdown
## [feat/fear-greed-node] 2026-09-03 — 新增 GET /api/fear-greed/sectors（板块行情榜，配置方向数据源）

**开发者**: 林晓研

### 新增
- `GET /api/fear-greed/sectors`：返回当日板块 top 涨幅/主力净流入/跌幅/净流出榜（camel 契约）；主源东财概念板块 clist（`EmSnapshotService.getConceptFlow`），腾讯板块榜兜底（`TencentSnapshotService.fetchTencentSectors`），独立 10 分钟缓存；失败返回 `availability:false` 不阻塞主数据（`sectorBoard.ts` + `FearGreedService.getSectorBoardData` + `controller.sectors`）

### 测试
- `tests/fear-greed.sector-board.test.ts`：东财四榜/腾讯兜底/双源失败降级 3 用例
```

- [ ] **Step 2: 前端 CHANGELOG 顶部追加**

```markdown
## [feat/fear-greed-node] 2026-09-03 — 恐贪「投资建议」动态化：配置方向接真实板块行情 + 建议引擎

**开发者**: 林晓研

### 新增
- `utils/fgAdvice.ts` 建议引擎（纯函数 + vitest）：按"温度档 × 9 指标结构 × 当日板块榜"生成 配置方向(3)/操作要点(3)/advice/AI 洞见"今日主因"
- 配置方向板块来自当日真实净流入榜（恐惧期选逆势流入、过热期警示高位流出），行情不可用自动回退静态档位

### 改进
- 恐贪页建议卡由静态 ZONES 改数据驱动渲染；AI 洞见句首补当日主导因子
```

- [ ] **Step 3: 前端 fear-greed AGENTS.md 补契约行**

在 `aistock-app-frontend/src/modules/fear-greed/AGENTS.md` 接口表中追加一行（若无接口表则加小节）：

```markdown
- `GET /api/fear-greed/sectors`：当日板块行情榜（topGainers/topInflows/topLosers/topOutflows，camel），供建议引擎 `utils/fgAdvice.ts` 选取配置方向；availability=false 时回退静态档位。
```

- [ ] **Step 4: 提交（分仓库）**

```bash
# 后端
cd d:\aistock\aistock-app-api && git add CHANGELOG.md && git commit -m "docs(changelog): 恐贪 sectors 板块行情接口"
# 前端
cd d:\aistock\aistock-app-frontend && git add CHANGELOG.md src/modules/fear-greed/AGENTS.md && git commit -m "docs: 恐贪动态建议引擎变更记录"
```

---

## Self-Review（执行前对照）

- **Spec 覆盖**：sectors 接口（T1/T2）、前端契约（T3）、引擎四块（T4）、页面接线与 AI 洞见（T5）、降级（T4 测试 + T5 fallback）、文档/测试（T6）——全部有对应任务
- **类型一致性**：后端 `FgSectorBoardData` ↔ 前端 `FgSectorBoard` 字段一一对应（availability/tradeDate/source/sectors.topXxx）；`buildSectorTags(ctx, fallback)` 在 T5 以 `fallbackSectors.value` 调用与 T4 测试一致
- **无占位**：每步含可运行代码与命令；无 TBD
