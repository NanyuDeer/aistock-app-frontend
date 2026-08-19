<template>
  <SubPageCard title="恐贪指数" :no-chat-bar="true">
    <view class="fg-page">
      <!-- 加载 / 错误态 -->
      <view v-if="loading" class="fg-state">
        <text class="fg-state__text">加载中...</text>
      </view>
      <view v-else-if="errorMsg" class="fg-state">
        <text class="fg-state__text">{{ errorMsg }}</text>
        <view class="fg-retry" @tap="load">重试</view>
      </view>

      <!-- 主面板：只展示恐贪指数一个页面，无六指标/无折线图 -->
      <template v-else>
        <!-- 当前情绪 + 更新时间 -->
        <view class="fg-hero">
          <view class="fg-hero__left">
            <text class="fg-hero__value" :style="{ color: zone.color }">{{ dashboard.currentIndex }}</text>
            <text class="fg-hero__label" :style="{ color: zone.color }">{{ zone.label }} · {{ zone.subLabel }}</text>
          </view>
          <view class="fg-hero__right">
            <text class="fg-hero__name">{{ dashboard.indexName }}</text>
            <text class="fg-hero__time">更新时间 {{ dashboard.updateTime }}</text>
          </view>
        </view>

        <!-- 情绪温度计（沸点/冰点） -->
        <view class="fg-card">
          <text class="fg-card__title">当前情绪</text>
          <view class="fg-thermo">
            <!-- 温度计管：垂直圆柱体 -->
            <view class="fg-thermo__tube">
              <!-- 呼吸灯外圈：冰点/沸点极端情绪时提醒风险 -->
              <view
                v-if="zone.isExtreme"
                class="fg-thermo__pulse"
                :style="{ '--pulse-color': zone.pulseColor }"
              />
              <!-- 刻度：0 / 25 / 50 / 75 / 100 -->
              <view class="fg-thermo__scale">
                <view
                  v-for="mark in scaleMarks"
                  :key="mark"
                  class="fg-thermo__scale-item"
                  :style="{ bottom: mark + '%' }"
                >
                  <view class="fg-thermo__tick" />
                  <text class="fg-thermo__num">{{ mark }}</text>
                </view>
              </view>
              <!-- 水银柱：高度随情绪变化，头部半圆凸起 -->
              <view class="fg-thermo__mercury" :style="mercuryStyle">
                <view class="fg-thermo__mercury-head" :style="{ background: zone.end }" />
              </view>
            </view>
            <!-- 沸点/冰点标注 -->
            <view class="fg-thermo__side">
              <text class="fg-thermo__side-hot">沸点</text>
              <text class="fg-thermo__side-mid">常温</text>
              <text class="fg-thermo__side-cold">冰点</text>
            </view>
          </view>
        </view>

        <!-- 投资建议 -->
        <view class="fg-card">
          <text class="fg-card__title">投资建议</text>
          <view class="fg-card__body">
            <view class="fg-badge" :style="badgeStyle">{{ zone.label }}</view>
            <!-- 仓位建议条 -->
            <view class="fg-position">
              <view class="fg-position__header">
                <text class="fg-position__label">建议总仓位</text>
                <text class="fg-position__value">{{ zone.positionMin }}% - {{ zone.positionMax }}%</text>
              </view>
              <view class="fg-position__bar">
                <view class="fg-position__track" />
                <view class="fg-position__fill" :style="positionBarStyle" />
              </view>
            </view>
            <!-- 配置方向标签 -->
            <view class="fg-sectors">
              <text class="fg-sectors__label">配置方向<text class="fg-sectors__hint">（点击查看解释）</text></text>
              <view class="fg-sectors__tags">
                <view
                  v-for="s in zone.sectors"
                  :key="s.name"
                  class="fg-tag"
                  :style="{ borderColor: zone.color, color: zone.color }"
                  @tap="activeSector = s"
                >{{ s.name }}</view>
              </view>
            </view>
            <!-- 操作要点 -->
            <view class="fg-actions">
              <text class="fg-actions__label">操作要点</text>
              <view
                v-for="(a, i) in zone.actions"
                :key="i"
                class="fg-actions__item"
              >
                <view class="fg-actions__dot" :style="{ background: zone.color }" />
                <text class="fg-actions__text">{{ a }}</text>
              </view>
            </view>
            <text class="fg-advice">{{ zone.advice }}</text>
          </view>
        </view>

        <!-- AI 情绪洞见 -->
        <view class="fg-card">
          <text class="fg-card__title">AI 情绪洞见</text>
          <!-- 趋势对比 -->
          <view v-if="trend" class="fg-trend">
            <view class="fg-trend__item">
              <text class="fg-trend__cap">较昨日</text>
              <view class="fg-trend__row">
                <text
                  class="fg-trend__num"
                  :style="{ color: (trend.vsYesterday ?? 0) >= 0 ? '#e54d5e' : '#18a058' }"
                >{{ trend.vsYesterday != null ? (trend.vsYesterday >= 0 ? '+' : '') + trend.vsYesterday.toFixed(1) : '--' }}</text>
                <text class="fg-trend__arrow" :style="{ color: (trend.vsYesterday ?? 0) >= 0 ? '#e54d5e' : '#18a058' }">{{ (trend.vsYesterday ?? 0) >= 0 ? '↑' : '↓' }}</text>
              </view>
            </view>
            <view class="fg-trend__divider" />
            <view class="fg-trend__item">
              <text class="fg-trend__cap">较上周</text>
              <view class="fg-trend__row">
                <text
                  class="fg-trend__num"
                  :style="{ color: (trend.vsLastWeek ?? 0) >= 0 ? '#e54d5e' : '#18a058' }"
                >{{ trend.vsLastWeek != null ? (trend.vsLastWeek >= 0 ? '+' : '') + trend.vsLastWeek.toFixed(1) : '--' }}</text>
                <text class="fg-trend__arrow" :style="{ color: (trend.vsLastWeek ?? 0) >= 0 ? '#e54d5e' : '#18a058' }">{{ (trend.vsLastWeek ?? 0) >= 0 ? '↑' : '↓' }}</text>
              </view>
            </view>
            <view class="fg-trend__divider" />
            <view class="fg-trend__item" v-if="zoneStats">
              <text class="fg-trend__cap">近30天同区间</text>
              <view class="fg-trend__row">
                <text class="fg-trend__num">{{ zoneStats.daysInZone30 }}天</text>
              </view>
            </view>
          </view>
          <!-- 历史参照 -->
          <view v-if="zoneStats && zoneStats.lastHitDays > 0" class="fg-ref">
            <text class="fg-ref__text">上次到达当前水平约 {{ zoneStats.lastHitDays }} 天前</text>
          </view>
          <!-- 关键信号 -->
          <view v-if="keySignals.length" class="fg-signals">
            <text class="fg-signals__label">关键信号</text>
            <view class="fg-signals__grid">
              <view
                v-for="sig in keySignals"
                :key="sig.name"
                class="fg-signal"
              >
                <text class="fg-signal__name">{{ sig.name }}</text>
                <text
                  class="fg-signal__score"
                  :style="{ color: sig.score < 30 ? '#FF3B30' : sig.score < 50 ? '#FF9500' : sig.score < 70 ? '#FFCC00' : '#34C759' }"
                >{{ sig.score.toFixed(0) }}</text>
                <text class="fg-signal__label">{{ sig.label }}</text>
              </view>
            </view>
          </view>
          <!-- 洞见解读 -->
          <text class="fg-insight">{{ zone.insight }}</text>
        </view>
      </template>
    </view>

    <!-- 配置方向弹窗 -->
    <view v-if="activeSector" class="fg-overlay" @tap="activeSector = null">
      <view class="fg-popup" @tap.stop>
        <text class="fg-popup__title" :style="{ color: zone.color }">{{ activeSector.name }}</text>
        <text class="fg-popup__desc">{{ activeSector.desc }}</text>
        <view class="fg-popup__close" @tap="activeSector = null">知道了</view>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { fearGreedApi, type FearGreedDashboard } from '@/shared/api/modules/fear-greed'

/**
 * 情绪分档（沸点/冰点生活化表述，去专业术语）。
 * 颜色沿用恐贪指数国际标准色：红=冰点（恐惧）、橙=寒冷、黄=常温、绿=温热、深绿=沸点。
 */
interface ZoneDef {
  min: number
  max: number
  /** 生活化主标签（沸点/冰点） */
  label: string
  /** 通俗副标签 */
  subLabel: string
  /** 主色（数值文字色） */
  color: string
  /** 渐变起始色（深） */
  start: string
  /** 渐变结束色（浅） */
  end: string
  /** 呼吸灯颜色（rgba） */
  pulseColor: string
  /** 是否极端档（冰点/沸点），触发呼吸灯 */
  isExtreme: boolean
  /** 投资建议 */
  advice: string
  /** 情绪洞见解读 */
  insight: string
  /** 建议仓位下限（%） */
  positionMin: number
  /** 建议仓位上限（%） */
  positionMax: number
  /** 配置方向标签（含弹窗解释） */
  sectors: { name: string; desc: string }[]
  /** 操作要点 */
  actions: string[]
}

const ZONES: ZoneDef[] = [
  {
    min: 0, max: 25, label: '冰点', subLabel: '极度恐惧', color: '#FF3B30',
    start: '#FF3B30', end: '#FF6B60', pulseColor: 'rgba(255, 59, 48, 0.5)', isExtreme: true,
    advice: '市场恐慌情绪降至冰点，优质资产或被错杀。建议保持耐心，可分批关注超跌的优质标的，等待企稳信号后再加大仓位。',
    insight: '当前市场情绪已至冰点，恐慌性抛售主导盘面，投资者避险情绪浓厚。历史经验表明，情绪极值区域往往对应中长期的布局区间，但短期仍可能继续震荡，需控制仓位、避免一次性满仓。',
    positionMin: 20, positionMax: 35,
    sectors: [
      { name: '超跌反弹', desc: '股价短期跌幅远超基本面，存在技术性修复机会。关注缩量企稳、主力回流的标的。' },
      { name: '高股息红利', desc: '分红收益率高、现金流稳定的蓝筹股（如银行、公用事业），防御属性强，熊市中提供安全垫。' },
      { name: '消费白马', desc: '行业龙头消费股，长期盈利稳定，当前估值已回落至合理区间，适合中长期布局。' },
    ],
    actions: ['分批建仓，控制节奏', '设好止损，严守纪律', '等待放量企稳信号'],
  },
  {
    min: 25, max: 45, label: '寒冷', subLabel: '恐惧', color: '#FF9500',
    start: '#FF9500', end: '#FFB84D', pulseColor: 'rgba(255, 149, 0, 0)', isExtreme: false,
    advice: '市场情绪偏谨慎，建议控制仓位，优先配置业绩确定性高的防御性板块，耐心等待情绪修复。',
    insight: '市场处于寒冷区间，投资者信心不足、交易活跃度偏低，情绪修复需要时间。此时不宜激进追涨，可关注政策与业绩催化带来的结构性机会。',
    positionMin: 30, positionMax: 50,
    sectors: [
      { name: '防御性消费', desc: '食品饮料、超市等刚需消费板块，受经济周期影响小，业绩确定性高。' },
      { name: '医药生物', desc: '创新药、医疗器械等，需求刚性，人口老龄化长期趋势支撑，政策催化空间大。' },
      { name: '公用事业', desc: '电力、水务、燃气等，现金流稳定、分红率高，具有类债券属性，适合防御配置。' },
    ],
    actions: ['控制仓位，不宜满仓', '关注业绩确定性高的标的', '耐心等待情绪修复信号'],
  },
  {
    min: 45, max: 55, label: '常温', subLabel: '中性', color: '#FFCC00',
    start: '#FFCC00', end: '#FFE066', pulseColor: 'rgba(255, 204, 0, 0)', isExtreme: false,
    advice: '市场情绪平稳，多空力量均衡。建议维持现有仓位，多看少动，等待方向明朗后再做决策。',
    insight: '市场处于观望期，多空博弈胶着，成交量可能趋于平淡。方向的选择需要新的催化剂，情绪波动收窄，宜以静制动。',
    positionMin: 50, positionMax: 60,
    sectors: [
      { name: '均衡配置', desc: '股债均衡、风格均衡，不偏押单一方向，通过分散降低组合波动。' },
      { name: '景气度向上', desc: '行业景气拐点向上、业绩增速加快的板块，如新能源、半导体等成长方向。' },
      { name: '低估值修复', desc: '估值处于历史低分位、有政策催化或基本面改善预期的品种，具备安全边际。' },
    ],
    actions: ['维持现有仓位', '多看少动，等待方向', '关注新催化剂出现'],
  },
  {
    min: 55, max: 80, label: '温热', subLabel: '贪婪', color: '#34C759',
    start: '#34C759', end: '#6AE07A', pulseColor: 'rgba(52, 199, 89, 0)', isExtreme: false,
    advice: '市场情绪偏乐观，赚钱效应显现。建议注意追高风险，可考虑逢高分批止盈，锁定已有收益。',
    insight: '市场情绪升温，资金参与意愿增强，趋势品种表现活跃。但情绪过热往往孕育回调风险，需警惕高位放量滞涨的信号。',
    positionMin: 40, positionMax: 60,
    sectors: [
      { name: '逢高止盈', desc: '已有盈利的持仓分批卖出，锁定收益。不必等最高点，分批撤退降低回撤风险。' },
      { name: '低位补涨', desc: '相对滞涨的板块有轮动补涨需求，关注资金从高位向低位迁移的方向。' },
      { name: '题材轮动', desc: '市场题材活跃，关注政策/事件驱动的短线机会，注意节奏快、持续性有限。' },
    ],
    actions: ['分批止盈，锁定收益', '注意追高风险', '警惕高位放量滞涨信号'],
  },
  {
    min: 80, max: 100, label: '沸点', subLabel: '极度贪婪', color: '#00C853',
    start: '#00C853', end: '#5AFF8F', pulseColor: 'rgba(0, 200, 83, 0.5)', isExtreme: true,
    advice: '市场情绪已至沸点，追涨情绪浓烈，风险收益比显著下降。建议降低仓位、落袋为安，避免盲目追高。',
    insight: '市场情绪过热，非理性追涨主导，历史上该区间往往对应阶段性高点。此时安全边际收窄，建议保持冷静，以防守为主。',
    positionMin: 20, positionMax: 40,
    sectors: [
      { name: '落袋为安', desc: '将浮盈兑现为现金，降低组合风险。高位不贪，保住利润比追求收益更重要。' },
      { name: '防守为主', desc: '以低波动、低Beta品种为核心配置，减少权益仓位，增加固收类资产。' },
      { name: '低风险品种', desc: '债券基金、货币基金、银行理财等避险资产，优先保本，等待情绪回落后再进攻。' },
    ],
    actions: ['降低仓位，落袋为安', '避免盲目追高', '以防守为主，保住利润'],
  },
]

const loading = ref(true)
const errorMsg = ref('')
const dashboard = ref<FearGreedDashboard | null>(null)
/** 当前点击的配置方向弹窗（null = 关闭） */
const activeSector = ref<{ name: string; desc: string } | null>(null)

/** 当前分档（颜色 / 标签 / 建议 / 洞见 / 是否极端） */
const zone = computed<ZoneDef>(() => {
  const v = dashboard.value?.currentIndex ?? 50
  return ZONES.find((z) => v >= z.min && v < z.max) ?? ZONES[ZONES.length - 1]
})

/** 情绪趋势：较昨日 / 较上周变化 */
const trend = computed(() => {
  const cur = dashboard.value?.currentIndex
  if (cur == null) return null
  const bars = dashboard.value?.barData ?? []
  // barData: [1日前, 1周前, 1月前, 1年前]
  const yesterday = bars[0]?.value
  const lastWeek = bars[1]?.value
  return {
    vsYesterday: yesterday != null ? cur - yesterday : null,
    vsLastWeek: lastWeek != null ? cur - lastWeek : null,
  }
})

/** 历史区间统计：过去30天处于当前区间天数 + 上次到达当前水平的天数 */
const zoneStats = computed(() => {
  const scores = dashboard.value?.history?.scores ?? []
  if (scores.length === 0) return null
  const cur = dashboard.value?.currentIndex ?? 50
  const z = zone.value
  // 最近30天在当前区间内的天数
  const recent30 = scores.slice(0, 30)
  const daysInZone = recent30.filter((s) => s >= z.min && s < z.max).length
  // 上次到达当前水平附近(±3)的天数
  const lastHitIdx = scores.slice(1).findIndex((s) => Math.abs(s - cur) <= 3)
  const lastHitDays = lastHitIdx >= 0 ? lastHitIdx + 1 : -1
  return {
    daysInZone30: daysInZone,
    lastHitDays,
  }
})

/** 关键信号：从子指标中提取（排除 excluded 项），按偏离度排序取前4 */
const keySignals = computed(() => {
  const indicators = dashboard.value?.indicators ?? []
  return indicators
    .filter((i) => !i.excluded)
    .map((i) => ({
      name: i.name,
      score: i.score,
      label: i.label,
      // 偏离中性50的程度
      deviation: Math.abs(i.score - 50),
    }))
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 4)
})

/** 仓位条样式：建议仓位区间在 0-100% 条上的位置 */
const positionBarStyle = computed(() => {
  const z = zone.value
  return {
    left: z.positionMin + '%',
    width: (z.positionMax - z.positionMin) + '%',
    background: `linear-gradient(to right, ${z.start}, ${z.end})`,
  }
})

/** 水银柱高度 + 渐变颜色 */
const mercuryStyle = computed(() => {
  const v = Math.max(0, Math.min(100, dashboard.value?.currentIndex ?? 0))
  return {
    height: v + '%',
    background: `linear-gradient(to top, ${zone.value.start} 0%, ${zone.value.end} 100%)`,
  }
})

/** 分档徽章样式 */
const badgeStyle = computed(() => {
  const c = zone.value.color
  return { background: `${c}1a`, color: c }
})

/** 温度计刻度 */
const scaleMarks = [0, 25, 50, 75, 100]

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    dashboard.value = await fearGreedApi.getDashboard('jq')
  } catch (e: unknown) {
    errorMsg.value = (e as { message?: string })?.message || '请稍后重试'
  } finally {
    loading.value = false
  }
}

onShow(() => {
  if (!dashboard.value) load()
})
</script>

<style lang="scss" scoped>
.fg-page {
  padding: $s-3;
  display: flex;
  flex-direction: column;
  gap: $s-3;
}

.fg-state {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.fg-state__text {
  color: $ink-mute;
  font-size: $font-size-sm;
}

.fg-retry {
  padding: 12rpx 40rpx;
  border-radius: $r-full;
  background: $primary;
  color: #fff;
  font-size: $font-size-sm;
}

/* ===== 当前情绪 hero ===== */
.fg-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 8rpx;
}

.fg-hero__left {
  display: flex;
  flex-direction: column;
}

.fg-hero__value {
  font-size: 88rpx;
  font-weight: 800;
  line-height: 1;
}

.fg-hero__label {
  margin-top: 8rpx;
  font-size: $font-size-md;
  font-weight: 600;
}

.fg-hero__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.fg-hero__name {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
}

.fg-hero__time {
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== 卡片 ===== */
.fg-card {
  padding: $s-3;
  border-radius: $r-lg;
  background: $bg-card;
  box-shadow: $shadow-sm;
}

.fg-card__title {
  display: block;
  margin-bottom: $s-3;
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
}

.fg-card__body {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

/* ===== 情绪温度计（垂直圆柱体，沸点/冰点） ===== */
.fg-thermo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $s-4;
  padding: $s-2 0;
}

.fg-thermo__tube {
  position: relative;
  width: 120rpx;
  height: 520rpx;
  border-radius: 60rpx;
  background: rgba(255, 255, 255, 0.6);
  border: 3rpx solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 12rpx 32rpx rgba(11, 95, 255, 0.14), inset 0 3rpx 8rpx rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(8rpx);
  overflow: visible;
}

/* 呼吸灯外圈：冰点/沸点时提醒风险 */
.fg-thermo__pulse {
  position: absolute;
  top: -10rpx;
  left: -10rpx;
  right: -10rpx;
  bottom: -10rpx;
  border-radius: 70rpx;
  animation: fg-pulse 1.6s ease-out infinite;
}

@keyframes fg-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--pulse-color);
  }
  100% {
    box-shadow: 0 0 0 36rpx rgba(0, 0, 0, 0);
  }
}

/* 刻度：0/25/50/75/100，置于管内左侧 */
.fg-thermo__scale {
  position: absolute;
  top: 24rpx;
  bottom: 24rpx;
  left: 18rpx;
  width: 28rpx;
}

.fg-thermo__scale-item {
  position: absolute;
  left: 0;
  transform: translateY(50%);
  display: flex;
  align-items: center;
}

.fg-thermo__tick {
  width: 14rpx;
  height: 3rpx;
  background: $ink-faint;
  flex-shrink: 0;
}

.fg-thermo__num {
  font-size: 18rpx;
  color: $ink-mute;
  margin-left: 4rpx;
  line-height: 1;
  transform: scale(0.9);
}

/* 水银柱：从底部升起，顶部半圆凸起 */
.fg-thermo__mercury {
  position: absolute;
  bottom: 12rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 56rpx;
  border-radius: 18rpx 18rpx 6rpx 6rpx;
  transition: height 0.6s ease-in-out;
}

/* 水银柱头部：半圆形凸起（略宽于柱体） */
.fg-thermo__mercury-head {
  position: absolute;
  top: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  box-shadow: 0 0 14rpx rgba(255, 255, 255, 0.6) inset;
}

/* 沸点/冰点标注 */
.fg-thermo__side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 520rpx;
  padding: 10rpx 0;
}

.fg-thermo__side-hot {
  font-size: $font-size-sm;
  font-weight: 700;
  color: #00c853;
}

.fg-thermo__side-mid {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-thermo__side-cold {
  font-size: $font-size-sm;
  font-weight: 700;
  color: #ff3b30;
}

/* ===== 投资建议 ===== */
.fg-badge {
  align-self: flex-start;
  padding: 6rpx 24rpx;
  border-radius: $r-full;
  font-size: $font-size-sm;
  font-weight: 700;
}

/* 仓位建议条 */
.fg-position {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.fg-position__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fg-position__label {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-position__value {
  font-size: $font-size-sm;
  font-weight: 700;
  color: $ink;
}

.fg-position__bar {
  position: relative;
  height: 16rpx;
  border-radius: $r-full;
  overflow: visible;
}

.fg-position__track {
  position: absolute;
  inset: 0;
  border-radius: $r-full;
  background: $ink-faint;
}

.fg-position__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: $r-full;
  opacity: 0.85;
}

/* 配置方向标签 */
.fg-sectors {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.fg-sectors__label {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-sectors__hint {
  font-size: 20rpx;
  color: $ink-faint;
}

.fg-sectors__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.fg-tag {
  padding: 6rpx 20rpx;
  border: 2rpx solid;
  border-radius: $r-full;
  font-size: $font-size-xs;
  font-weight: 600;
}

/* 操作要点 */
.fg-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.fg-actions__label {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-actions__item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.fg-actions__dot {
  flex-shrink: 0;
  width: 12rpx;
  height: 12rpx;
  margin-top: 10rpx;
  border-radius: 50%;
}

.fg-actions__text {
  font-size: $font-size-sm;
  line-height: 1.6;
  color: $ink-soft;
}

.fg-advice {
  font-size: $font-size-sm;
  line-height: 1.7;
  color: $ink-soft;
}

/* ===== AI 情绪洞见 ===== */
/* 趋势对比 */
.fg-trend {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 20rpx 0;
}

.fg-trend__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.fg-trend__cap {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-trend__row {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.fg-trend__num {
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1;
}

.fg-trend__arrow {
  font-size: 28rpx;
  font-weight: 700;
}

.fg-trend__divider {
  width: 2rpx;
  height: 48rpx;
  background: $ink-faint;
  flex-shrink: 0;
}

/* 历史参照 */
.fg-ref {
  padding: 12rpx 20rpx;
  border-radius: $r-md;
  background: rgba(255, 204, 0, 0.08);
}

.fg-ref__text {
  font-size: $font-size-xs;
  color: $ink-soft;
}

/* 关键信号 */
.fg-signals {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.fg-signals__label {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-signals__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.fg-signal {
  flex: 1;
  min-width: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 12rpx;
  border-radius: $r-md;
  background: rgba(0, 0, 0, 0.03);
}

.fg-signal__name {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-signal__score {
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1.2;
}

.fg-signal__label {
  font-size: 20rpx;
  color: $ink-mute;
}

.fg-insight {
  font-size: $font-size-sm;
  line-height: 1.7;
  color: $ink-soft;
}

/* ===== 配置方向弹窗 ===== */
.fg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.fg-popup {
  width: 560rpx;
  padding: 40rpx 32rpx 32rpx;
  border-radius: $r-lg;
  background: $bg-card;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.fg-popup__title {
  font-size: 36rpx;
  font-weight: 800;
}

.fg-popup__desc {
  font-size: $font-size-sm;
  line-height: 1.7;
  color: $ink-soft;
  text-align: center;
}

.fg-popup__close {
  margin-top: 8rpx;
  padding: 16rpx 64rpx;
  border-radius: $r-full;
  background: $primary;
  color: #fff;
  font-size: $font-size-sm;
  font-weight: 600;
}
</style>
