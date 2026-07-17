# Task 1 Report: 创建 useBriefingCard composable

## Status: DONE_WITH_CONCERNS

## 实施概要

创建 `src/shared/utils/useBriefingCard.ts`，封装晨报/晚报卡片的时间判断、API 调用、双层报告解析和状态管理。

## 文件变更

- 新建：`src/shared/utils/useBriefingCard.ts`（136 行）

## 与任务简报的偏差（按 dispatch 指令）

1. **移除 `watch`**：按 dispatch 指令"do not use watch"，删除了 `watch` 的 import 和 `if (fixedDate === undefined) { watch(date, fetchData) }` 代码块。
2. **返回 `date` 可写 ref**：按 dispatch 指令"return date as a writable ref so the detail page can update it"，在 `BriefingCardState` 接口和返回对象中新增了 `date: Ref<string>` 字段。
3. **接口类型修正**：brief 中使用 `ReturnType<typeof computed<string>>` 会导致 TS2741 错误（Vue 的 `computed` 重载解析为 `WritableComputedRef`，而实际 `computed(() => ...)` 返回只读 `ComputedRef`）。改为直接使用 `Ref<T>` 和 `ComputedRef<T>` 类型，更清晰且类型安全。

## 验证证据

### 类型检查

```
npx vue-tsc --noEmit
```

结果：本文件 **0 个新增错误**。剩余 6 个错误全部为 `src/modules/chat/event/components/EventTransmissionGraph.vue` 的历史遗留问题（与本次改动无关）。

## Commit

- `787e0a0` feat: add useBriefingCard composable for morning/review briefing data（分支 `changer`）

## 自检清单

- [x] 文件路径正确：`src/shared/utils/useBriefingCard.ts`
- [x] 使用 `@/` 前缀导入（uni-app 兼容）
- [x] 未使用 `watch`
- [x] 返回 `date` 可写 ref
- [x] 未使用 `any`，全部用 `unknown` + 类型收窄
- [x] parseReport 兼容 schema 2.0（display_report）和 schema 1.0（text）
- [x] fetchData 防御性兼容两种响应格式
- [x] try/catch 错误处理设置 status='error'
- [x] 遵循现有 composable 模式（参考 useAuth.ts）
- [x] 在 `changer` 分支提交

## Concerns

1. **无自动获取**：由于移除了 `watch`，composable 不会在 `date` 变化时自动重新请求。详情页切换日期后需手动调用 `refresh()`。同时 composable 也不在挂载时自动请求，消费方（MorningContent.vue / briefing-detail）需在 `onMounted` 中调用 `refresh()`。这是符合 dispatch 指令的设计。
2. **API 响应拦截器兼容性**：项目 `request.ts` 的响应拦截器仅放行 `code === 200 || code === undefined`，而 context 描述 API 返回 `code: 0`。若实际返回 `code: 0` 会被拦截器 reject，composable 的 catch 会将 status 置为 'error'。此为 request 拦截器与 API 契约的潜在不一致，属既有问题，不在本任务范围内，但下游消费方需注意。
3. **接口类型偏离 brief**：`BriefingCardState` 用 `Ref<T>`/`ComputedRef<T>` 替代了 brief 中的 `ReturnType<typeof ...>` 写法（修复类型错误必需），语义等价。

## 报告文件

`D:\ai_stock_app\aistock-app-frontend\.superpowers\sdd\task-1-report.md`
