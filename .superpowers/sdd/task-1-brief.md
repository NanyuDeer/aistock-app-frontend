### Task 1: 鍒涘缓 useBriefingCard composable

**Files:**
- Create: `src/shared/utils/useBriefingCard.ts`

**Interfaces:**
- Consumes: `agentApi.getReport(intent: string, date: string)` from `@/shared/api/modules/agent`
- Produces: `useBriefingCard(type?, date?)` returning `{ type, typeLabel, summary, report, loading, status, refresh }`

- [ ] **Step 1: 鍒涘缓 composable 鏂囦欢**

鍒涘缓 `src/shared/utils/useBriefingCard.ts`锛?
```typescript
/**
 * 鏅ㄦ姤/鏅氭姤鍗＄墖缁勫悎寮?Hook
 * 灏佽鏃堕棿鍒ゆ柇銆丄PI 璋冪敤銆佹暟鎹В鏋愬拰鐘舵€佺鐞? */
import { ref, computed, watch } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'

/** 鍙屽眰鎶ュ憡缁撴瀯锛坰chema_version 2.0锛?*/
export interface BriefingReport {
  summary: string
  details: string
  stocks: string[]
  risks: string[]
  podcast_brief: string
  schema_version: string
}

export type BriefingType = 'morning' | 'review'
export type BriefingStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export interface BriefingCardState {
  type: ReturnType<typeof ref<BriefingType>>
  typeLabel: ReturnType<typeof computed<string>>
  summary: ReturnType<typeof ref<string>>
  report: ReturnType<typeof ref<BriefingReport | null>>
  loading: ReturnType<typeof ref<boolean>>
  status: ReturnType<typeof ref<BriefingStatus>>
  refresh: () => Promise<void>
}

/** 鏍规嵁褰撳墠鏃堕棿鍒ゆ柇鎶ュ憡绫诲瀷锛?5:30 鍓嶄负鏅ㄦ姤锛屼箣鍚庝负鏅氭姤 */
function autoDetectType(): BriefingType {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  if (hour < 15 || (hour === 15 && minute < 30)) {
    return 'morning'
  }
  return 'review'
}

/** 浠?API 鍝嶅簲涓В鏋愬弻灞傛姤鍛?*/
function parseReport(content: unknown): BriefingReport | null {
  if (!content || typeof content !== 'object') return null

  const obj = content as Record<string, unknown>
  const display = obj.display_report
  if (!display || typeof display !== 'object') {
    // 鍏煎 schema 1.0 绾枃鏈?    const text = typeof obj.text === 'string' ? obj.text : ''
    if (!text) return null
    return {
      summary: '',
      details: text,
      stocks: [],
      risks: [],
      podcast_brief: '',
      schema_version: '1.0',
    }
  }

  const d = display as Record<string, unknown>
  return {
    summary: typeof d.summary === 'string' ? d.summary : '',
    details: typeof d.details === 'string' ? d.details : '',
    stocks: Array.isArray(d.stocks) ? d.stocks.filter((s): s is string => typeof s === 'string') : [],
    risks: Array.isArray(d.risks) ? d.risks.filter((r): r is string => typeof r === 'string') : [],
    podcast_brief: typeof obj.podcast_brief === 'string' ? obj.podcast_brief : '',
    schema_version: typeof obj.schema_version === 'string' ? obj.schema_version : '2.0',
  }
}

/** 鑾峰彇浠婂ぉ鏃ユ湡瀛楃涓?YYYY-MM-DD */
function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function useBriefingCard(
  fixedType?: BriefingType,
  fixedDate?: string,
): BriefingCardState {
  const type = ref<BriefingType>(fixedType ?? autoDetectType())
  const date = ref<string>(fixedDate ?? todayStr())
  const summary = ref('')
  const report = ref<BriefingReport | null>(null)
  const loading = ref(false)
  const status = ref<BriefingStatus>('idle')

  const typeLabel = computed(() => (type.value === 'morning' ? '鏅ㄦ姤' : '鏅氭姤'))

  async function fetchData() {
    loading.value = true
    status.value = 'loading'
    try {
      const res: unknown = await agentApi.getReport(type.value, date.value)
      // 鍏煎涓ょ鍝嶅簲鏍煎紡锛歿 data: { content } } 鎴?{ content }
      const data = (res as Record<string, unknown>)?.data ?? res
      if (!data) {
        status.value = 'empty'
        summary.value = ''
        report.value = null
        return
      }
      const record = data as Record<string, unknown>
      const content = record.content
      const parsed = parseReport(content)
      if (!parsed) {
        status.value = 'empty'
        summary.value = ''
        report.value = null
        return
      }
      report.value = parsed
      summary.value = parsed.summary
      status.value = 'ready'
    } catch {
      status.value = 'error'
      summary.value = ''
      report.value = null
    } finally {
      loading.value = false
    }
  }

  // 褰?date 鎴?type 鍙樺寲鏃堕噸鏂拌幏鍙栵紙璇︽儏椤垫棩鏈熷垏鎹㈢敤锛?  if (fixedDate === undefined) {
    watch(date, fetchData)
  }

  return {
    type,
    typeLabel,
    summary,
    report,
    loading,
    status,
    refresh: fetchData,
  }
}
```

- [ ] **Step 2: 绫诲瀷妫€鏌?*

Run: `cd d:\ai_stock_app\aistock-app-frontend && npx vue-tsc --noEmit`
Expected: 鏃犳柊澧為敊璇紙鍙兘鏈夊巻鍙查仐鐣欓敊璇紝纭涓嶅紩鍏ユ柊閿欒鍗冲彲锛?
- [ ] **Step 3: Commit**

```bash
cd d:\ai_stock_app\aistock-app-frontend
git add src/shared/utils/useBriefingCard.ts
git commit -m "feat: add useBriefingCard composable for morning/review briefing data"
```

---

