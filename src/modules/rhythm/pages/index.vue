<template>
  <SubPageCard2 title="节奏大师" :subtitle="navSubtitle" back-url="/modules/home/pages/index">
    <view class="body">
      <!-- 顶部可折叠双模式日历面板（仓位/事件；折叠=近 7 日紧凑条、展开=60 日周网格） -->
      <RhythmCalendarPanel :target-date="targetDate" @pick="onPanelPick" />

      <view class="fallback" v-if="pendingHint">{{ pendingHint }}</view>
      <view class="insight-wrap" v-if="insightCard">
        <InsightCard
          type="market"
          tag-text="节奏洞见"
          :title="insightCard.title"
          :trace="insightCard.trace ?? ''"
          :structured="insightCard.structured ?? null"
          :time="insightCard.time"
          :time-note="insightCard.timeNote"
        />
      </view>
      <RhythmCard
        v-if="content"
        :card="content.rhythm_card!"
        :title="cardTitle"
        :slot="content.refresh_slot"
        :target-date="content.target_date"
        :basis-date="content.basis_date"
        :refresh-slot="content.refresh_slot"
      />
      <EmptyState v-else title="节奏状态暂不可用" />
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { EmptyState, InsightCard } from '@/shared/components'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import RhythmCard from '../components/RhythmCard.vue'
import RhythmCalendarPanel from '../components/RhythmCalendarPanel.vue'
import { toRhythmInsight } from '../utils/rhythmInsight'
import type { RhythmInsightCard } from '../utils/rhythmInsight'
import { agentApi } from '@/shared/api/modules/agent'
import type { RhythmMasterContent } from '@/shared/api/modules/agent'

interface RhythmMasterVersion {
  refresh_slot: string
  created_at?: string
  content?: RhythmMasterContent
}

const versions = ref<RhythmMasterVersion[]>([])
const targetDate = ref('')
const isFallback = ref(false)

/** 用户面板点选的原始日期（提示行用；回退后与 targetDate 分离，spec §4.3） */
const requestedDate = ref('')

const SLOT_LABEL: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }
function slotLabel(s: string) { return SLOT_LABEL[s] ?? s }

/** v3 极简版本选取（spec §4.2）：今日 = created_at 最新；历史日 = after_close 优先（缺失降级最新，时间行如实标注实际版本） */
function pickVersion(
  versions: RhythmMasterVersion[],
  targetDate: string,
  today: string,
): RhythmMasterVersion | undefined {
  if (!versions.length) return undefined
  const latest = [...versions].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
  if (targetDate >= today) return latest
  return versions.find((v) => v.refresh_slot === 'after_close') ?? latest
}

const activeVersion = computed(() => pickVersion(versions.value, targetDate.value, shanghaiDateString()))

/** 当前展示版本的 created_at（timeNote 灰字，B7 恒真展示） */
const activeCreatedAt = computed(() => activeVersion.value?.created_at)

const content = computed<RhythmMasterContent | undefined>(() => activeVersion.value?.content)

/** 摘要洞见卡入参：仓位/档位/interval 分支上移，mapper 不可拼装时整卡不渲染（去重：RhythmCard 不再重复这些单元） */
const insightCard = computed<RhythmInsightCard | null>(() =>
  content.value
    ? toRhythmInsight(content.value.rhythm_card, activeVersion.value?.refresh_slot ?? '', targetDate.value, activeCreatedAt.value)
    : null,
)

const pageTitle = computed(() => (targetDate.value ? `节奏（${targetDate.value}）` : '节奏大师'))
const cardTitle = computed(() => pageTitle.value)
const basisLabel = computed(() => content.value?.basis_date ?? '')

/** 回退提示行三态（spec §4.3）：未来日（尚未生成）/ 无报告（沿用前值）/ 正常（空） */
const pendingHint = computed(() => {
  if (requestedDate.value && requestedDate.value > shanghaiDateString() && requestedDate.value !== targetDate.value) {
    return `${requestedDate.value} 节奏尚未生成，当前展示 ${targetDate.value} 数据`
  }
  if (isFallback.value) {
    return `非交易日/当日无报告，沿用前值（${basisLabel.value}）`
  }
  return ''
})

const navSubtitle = computed(() => {
  const parts: string[] = []
  if (targetDate.value) parts.push(`目标日 ${targetDate.value}`)
  if (isFallback.value && basisLabel.value) parts.push(`沿用前值 ${basisLabel.value}`)
  else if (activeVersion.value) parts.push(slotLabel(activeVersion.value.refresh_slot))
  return parts.join(' · ')
})

let initialized = false

onLoad(async (options) => {
  const date = String(options?.date ?? '')
  if (date) requestedDate.value = date
  targetDate.value = date
  await loadVersions(date || undefined)
  initialized = true
})

// v3：onShow 重拉数据（16:05 后回前台自动切新收盘基准）；onLoad 紧随的首个 onShow 跳过防双拉
onShow(() => {
  if (!initialized) return
  if (targetDate.value) void loadVersions(targetDate.value)
})

/** 面板点格切日：记录原始点击日期（requestedDate 供提示行），重拉该日版本 */
async function onPanelPick(date: string) {
  if (date === targetDate.value) return
  requestedDate.value = date
  targetDate.value = date
  await loadVersions(date)
}

function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function loadVersions(date?: string) {
  const d = date || (await fallbackDate())
  if (!d) { isFallback.value = true; return }
  let res: unknown
  try {
    res = await agentApi.getRhythmMaster(d)
  } catch {
    // F2：网络/服务错误不抛 unhandled rejection，保持空态（EmptyState）
    return
  }
  // 响应拦截器（shared/api/request.ts）已解包 {code,data} 信封：code===0 时直接 return data，
  // 故 getRhythmMaster 的解析值即 {date, versions}，没有 .data 字段，这里直接取 .versions。
  const list = (res as { date?: string; versions?: RhythmMasterVersion[] }).versions ?? []
  if (!list.length) {
    if (isFallback.value) return
    isFallback.value = true
    // 回退取"严格早于 d"的前一交易日：getRecentTradingDays 含当天（若当天为交易日），
    // 当日无报告时 prev===d 会导致回退失效，故改用 getPreviousTradingDay。
    const prev = await previousTradingDay(d)
    if (prev && prev !== d) return loadVersions(prev)
    return
  }
  isFallback.value = false // 回退后切回正常日时清除残留提示
  versions.value = list
  targetDate.value = d
}

/** 未指定日期时：取今天（若为交易日）否则最近交易日 */
async function fallbackDate(): Promise<string | undefined> {
  try {
    const t = await agentApi.getRecentTradingDays(todayStr(), 1)
    return t?.[0]
  } catch { return undefined }
}

/** 严格早于指定日期的前一个交易日（回退取前值用，避免 getRecentTradingDays 含当天导致 prev===d） */
async function previousTradingDay(date: string): Promise<string | undefined> {
  try {
    return await agentApi.getPreviousTradingDay(date)
  } catch { return undefined }
}

</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
.body { padding: 24rpx 32rpx; }
.insight-wrap { margin-bottom: 20rpx; }

.fallback { margin-bottom: 16rpx; font-size: 24rpx; color: $warning; }
</style>
