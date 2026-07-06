### Task 1: 添加 API 方法

**Files:**
- Modify: `src/shared/api/modules/stock.ts`

**Interfaces:**
- Produces: `stockApi.getPushHistory(params?: { date?: string }) => Promise<{ items: PushHistoryItem[] }>`
- Used by: Task 3 (push-history.vue 页面调用此方法)

**类型定义：**

```typescript
interface PushHistoryItem {
  push_date: string
  stock_name: string
  stock_code: string
  push_price: number | null
  realtime_price?: number | null
  latest_price?: number | null
  return_pct?: number | null
  realtime_return_pct?: number | null
  realtime_time?: string
}
```

- [ ] **Step 1: 定义接口类型**

在 `src/shared/api/modules/stock.ts` 文件末尾添加类型定义：

```typescript
export interface PushHistoryItem {
  push_date: string
  stock_name: string
  stock_code: string
  push_price: number | null
  realtime_price?: number | null
  latest_price?: number | null
  return_pct?: number | null
  realtime_return_pct?: number | null
  realtime_time?: string
}
```

- [ ] **Step 2: 添加 getPushHistory 方法**

在 `stockApi` 对象中添加新方法（在 `removeFavorites` 方法之后）：

```typescript
/** 获取推送历史 */
getPushHistory(params?: { date?: string }) {
  return request.get<{ items: PushHistoryItem[] }>('/potential-stocks/push-history', { params }).then((res: any) => res)
}
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run type-check`
Expected: PASS（无类型错误）

- [ ] **Step 4: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/shared/api/modules/stock.ts
git commit -m "feat(api): add getPushHistory method"
```