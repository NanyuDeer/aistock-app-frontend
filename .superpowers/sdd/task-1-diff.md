# Task 1 Review Package

**Base:** 0252bc1
**Head:** 340f5cf

## Commit List

```
340f5cf feat(api): add getPushHistory method
```

## Stat Summary

```
 src/shared/api/modules/stock.ts | 17 +++++++++++++++++
 1 file changed, 17 insertions(+)
```

## Full Diff

```diff
diff --git a/src/shared/api/modules/stock.ts b/src/shared/api/modules/stock.ts
index 03339d5..d84ff1e 10066
--- a/src/shared/api/modules/stock.ts
+++ b/src/shared/api/modules/stock.ts
@@ -143,12 +143,29 @@ export const stockApi = {
   },

   /** 添加自选股 */
   addFavorites(symbols: string[]) {
     return request.post('/users/me/favorites', { symbols })
   },

   /** 删除自选股 */
   removeFavorites(symbols: string[]) {
     return request.delete('/users/me/favorites', { data: { symbols } })
+  },
+
+  /** 获取推送历史 */
+  getPushHistory(params?: { date?: string }) {
+    return request.get<{ items: PushHistoryItem[] }>('/potential-stocks/push-history', { params }).then((res: any) => res)
   }
 }

+export interface PushHistoryItem {
+  push_date: string
+  stock_name: string
+  stock_code: string
+  push_price: number | null
+  realtime_price?: number | null
+  latest_price?: number | null
+  return_pct?: number | null
+  realtime_return_pct?: number | null
+  realtime_time?: string
+}
```