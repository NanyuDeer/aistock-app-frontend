# 恐贪指数「动态建议」设计（情绪 × 真实板块行情）

> 分支：feat/fear-greed-node ｜ 日期：2026-09-03 ｜ 状态：设计已确认（A/B 通过，C/D 无异议）

## 1. 背景与问题

恐贪指数页「投资建议」卡（配置方向板块标签 / 操作要点 / advice 文案）目前是**前端静态档位配置**（`index.vue` `ZONES`）：5 个温度档各绑一套固定内容。同一温度档下，无论当天是北向流出、炸板率高企还是宽度普跌，用户看到的建议完全相同（如寒冷档永远是"防御性消费/医药生物/公用事业"），显得死板、与当日盘面脱节。

目标：把建议卡改为**由"当日具体情绪结构 × 当日真实板块行情"驱动**：
- 真实板块数据源后端已具备（东财 push2 clist / 腾讯板块榜，均在项目现有快照链路使用），无需新数据源
- 前端已有 9 指标明细（dashboard `indicators`），可作为情绪结构输入

## 2. 范围

随具体情绪动态化的内容（用户确认全选）：
1. **配置方向板块标签**（3 个，含点击弹窗解释）
2. **操作要点**（3 条）
3. **策略文案 advice**（一句话）
4. **AI 情绪洞见**（句首补当日主导因子）

实现分工（用户选定"混合"方案）：
- **后端**：提供真实板块行情数据（结构化、低缓存）
- **前端**：用现有 9 指标 + 后端板块数据，经规则引擎生成全部文案

板块筛选逻辑（用户选定）：**情绪 × 行情** —— 恐惧期推荐"逆势净流入 + 抗跌"方向而非当日领涨题材；过热期转为防守提示。

## 3. 后端改动（aistock-app-api）

### 3.1 新端点 `GET /api/fear-greed/sectors`

返回当日 A 股板块事实行情（公开，与 `/api/fear-greed/dashboard` 同级），契约：

```ts
// 复用项目现有 SectorFact 形状（quote 模块）
interface SectorFactLite {
  name: string;          // 板块中文名（如 航运港口）
  pctChange: number;     // 当日涨跌幅 %（f3 / zdf）
  netAmount: number;     // 主力净流入（元，f62 / zljlr 对齐为元）
  leadStock?: string;    // 领涨股（如有）
}

interface SectorBoardResponse {
  availability: boolean;          // false = 行情不可用（前端降级）
  tradeDate: string;              // YYYY-MM-DD（最近可得交易日）
  source: 'eastmoney' | 'tencent' | 'last-close';
  sectors: {
    topGainers: SectorFactLite[];   // 涨幅 top5
    topInflows: SectorFactLite[];   // 主力净流入 top5（避险去处）
    topLosers: SectorFactLite[];
    topOutflows: SectorFactLite[];  // 主力净流出 top5（风险警示）
  };
}
```

- 数据源：主源 `EmSnapshotService.getConceptFlow()` / `getIndustryMainForce()`（push2 clist，f3 涨跌幅 + f62 主力净额，盘中实时）；失败回退腾讯板块榜 `fetchTencentBoardRank`；再失败 `availability:false`
- 盘前/无当日数据：返回最近交易日快照并标注 `source`；均失败 `availability:false`
- 独立内存缓存 TTL ≈ 10 分钟（与恐贪 dashboard 30min 缓存解耦，避免板块信息盘中过期）
- 挂载：恐贪 router（与 dashboard 同文件/同前缀），后端模块复用，几乎无新数据源代码

### 3.2 影响面
- 新增文件/函数：`FearGreedService.buildSectorBoard()`（+ router 挂载），引用 `quote/EmSnapshotService`、`quote/TencentSnapshotService` 现成导出
- `dashboard` 契约不变（不塞板块数据，避免放大 payload/缓存耦合）

## 4. 前端改动（aistock-app-frontend）

### 4.1 新增建议引擎（纯函数，可单测）

新文件：`src/modules/fear-greed/utils/fgAdvice.ts`

```ts
interface FgContext {
  composite: number;               // 当前恐贪指数
  indicators: FearGreedIndicator[];// dashboard.indicators（含 key/score/raw）
  sectorBoard?: SectorBoardResponse['sectors'];  // 后端板块榜；缺省=降级
}

interface SectorTag {
  name: string;
  desc: string;                    // 弹窗解释：今日数据 + 推荐理由
  kind: 'flow-in' | 'gain' | 'defensive' | 'warning' | 'fallback';
}

interface AdviceResult {
  sectorTags: SectorTag[];         // 3 个
  actions: string[];               // 3 条
  advice: string;                  // 一句话策略
  insightPrefix: string;           // AI 洞见句首"今日主因"
}
```

导出 4 个纯函数（内部共享取档/取驱动工具）：
- `buildSectorTags(ctx)` —— 板块选择规则（见 4.2）
- `buildActions(ctx)` —— 操作要点（见 4.3）
- `buildAdvice(ctx)` —— 策略文案
- `buildInsightPrefix(ctx)` —— AI 洞见增强

### 4.2 配置方向板块选择规则（情绪 × 行情）

档位以 composite 划分：冰点 <20 / 寒冷 20-45 / 常温 45-55 / 温热 55-80 / 沸点 ≥80。

| 档位 | 选取策略 | 兜底 |
|---|---|---|
| 冰点(<20)、寒冷(<45) | 从 `topInflows` 筛 `pctChange ≤ 5` 的避险方向，取 3；不足则补当日涨幅温和(≤3%)且净流入为正者 | fallback 静态档位标签 |
| 常温(45-55) | `topInflows` 前 2 + `topGainers` 中涨幅 ≤4% 的 1 个（均衡） | 同上 |
| 温热(55-80) | `topInflows` 取 1-2 低波方向 + 1 个"高位兑现"警示（取 topOutflows 中涨幅仍高的板块，标注不追） | 同上 |
| 沸点(≥80) | 转为防守：`topInflows` 中防御属性方向 2 + 1 个警示（不推荐当日大涨板块） | 同上 |

- 板块说明 `desc` 由真实数据生成：`「{name} 今日 {pct>=0?'+':''}{pct}%，主力净流入 {亿元}，{理由}」`；无行情（availability=false）时回退静态档位标签 + 文案不带行情数字
- 点击标签弹窗样式沿用现状（`fg-popup`），标题为板块名

### 4.3 操作要点与文案规则（指标驱动）

指标 key → 要点模板（示例，实施时可微调措辞）：
- `north_flow` score ≤ 20：`回避外资重仓，关注内资定价方向`
- `seal_rate` / `break_rate` 极端（炸板率高/封板率低）：`涨停接力风险大，短线少打板`
- `breadth` < 40：`普跌未止，勿急于接飞刀`
- `futures`（深贴水）：`股指贴水放大，对冲盘增多，注意下探`
- `equity_bond` 低：`风险偏好收缩，股弱债稳，均衡配置`
- 沸点档全局：`不追高、分批兑现`
- 兜底纪律条：`控制仓位，等待信号`

`buildActions`：取档位内命中的要点前 2 + 1 条兜底纪律 = 3 条。
`buildAdvice`：`{温度档语义}，{由主驱动形成的判断}。{行动指引}。`——主驱动取 indicators 中 score 最低（恐惧侧）与最高（贪婪侧）各至多 1 个命名（如"北向资金大幅流出"）。
`buildInsightPrefix`：`今日市场情绪主要由{驱动1}、{驱动2}主导，` + 现有冰点反弹概率/均线预判逻辑不变。

### 4.4 页面改造 `index.vue`
- 新增 `sectorBoard` 请求（`GET /fear-greed/sectors`，独立于 dashboard、低优先级；失败静默 availability=false）
- 建议卡区块改渲染 `fgAdvice` 引擎输出（`sectorTags` 替代 `zone.sectors`、`actions` 替代 `zone.actions`、`advice` 替代 `zone.advice`、AI 洞见句首加 `insightPrefix`）
- `ZONES` 收敛为纯 UI 元数据：保留 `min/max/label/subLabel/color/start/end/pulseColor/isExtreme/positionMin/positionMax/summary`；删除将被替代的静态 `advice/sectors/actions`；保留一套**降级用静态档位标签**（`fallbackSectors`，可复用现 sectors 文案）

### 4.5 降级汇总
| 场景 | 行为 |
|---|---|
| sectors 接口失败/慢 | 静默 availability=false；配置方向用 fallback 标签；advice/actions/AI 洞见照常 |
| 单板块行情数字缺失 | 对应 tag 文案省略行情数字，仅给理由 |
| dashboard 无数据 | 整卡不渲染（现状保持） |

## 5. 测试
- 前端 `fgAdvice` vitest：温度档 × 指标形态 × 虚构板块榜的矩阵用例——断言板块来源（flow-in/gain/…）、数量、actions 命中要点、advice 含主驱动名、availability=false 时回退标签
- 后端 sectors：mock EmSnapshotService/TencentSnapshotService → 断言响应形状 / source 切换 / availability=false / 缓存 TTL
- `vue-tsc --noEmit` 前端、`tsc --noEmit` 后端
- 浏览器预览：真数据下建议卡随档位/当日板块变化；降级（断网/关板块接口）可回退

## 6. 文档
- 两端 `CHANGELOG.md` 追加条目
- `aistock-app-frontend/src/modules/fear-greed/AGENTS.md`：补动态建议引擎与板块接口说明

## 7. 风险与取舍
- 板块数据为概念/行业口径（东财 t:3 概念榜为主），"配置方向"更接近题材/风格而非申万行业，符合现有 UI 语义
- 恐惧市推荐"逆势净流入"依赖当日避险资金方向，若榜内无正流入则自动回退 fallback
- 规则引擎非 LLM，文案为模板化拼装（确定性、可测）；未来如需自然语言再叠加 LLM，接口与数据层无需改动
