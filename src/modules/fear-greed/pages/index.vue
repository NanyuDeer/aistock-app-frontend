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
      <!-- v-else-if="dashboard" 显式收窄 dashboard 非空，满足 TS 类型检查 -->
      <template v-else-if="dashboard">
        <!-- 当前情绪 + 更新时间 -->
        <view class="fg-hero">
          <view class="fg-hero__left">
            <text class="fg-hero__value" :style="{ color: zone.color }">{{ dashboard.currentIndex }}</text>
            <text class="fg-hero__label" :style="{ color: zone.color }">{{ zone.label }} · {{ zone.subLabel }}</text>
          </view>
          <view class="fg-hero__right">
            <text class="fg-hero__time">更新时间 {{ dashboard.updateTime }}</text>
          </view>
        </view>

        <!-- 情绪仪表盘（半圆表盘） -->
        <view class="fg-card">
          <text class="fg-card__title">当前情绪</text>
          <view class="fg-gauge">
            <!-- 极端情绪呼吸光圈 -->
            <view
              v-if="zone.isExtreme"
              class="fg-gauge__pulse"
              :style="{ '--pulse-color': zone.pulseColor }"
            />
            <!-- 半圆仪表盘 SVG -->
            <image class="fg-gauge__img" :src="gaugeImgSrc" mode="aspectFit" />
          </view>
        </view>

        <!-- 历史走势（近 3 个月，单线 + K线式当日区间 + 五色色带 + 交互 tooltip） -->
        <view v-if="historyChartSrc" class="fg-card">
          <text class="fg-card__title">历史走势 <text class="fg-card__sub">近 3 个月 · 滑动查看每日</text></text>
          <!-- 交互热区容器：覆盖整个图表，用于捕捉 hover/tap 事件 -->
          <view class="fg-chart__hotzone-container">
            <image class="fg-chart__img" :src="historyChartSrc" mode="widthFix" />
            <!-- 每日透明热区：横向定位对齐 SVG 点位 -->
            <view
              v-for="zone in chartHotzones"
              :key="zone.idx"
              class="fg-chart__hotzone"
              :class="{ 'fg-chart__hotzone--active': effectiveDayIdx === zone.idx }"
              :style="{ left: zone.leftPct + '%', width: zone.widthPct + '%' }"
              @tap="selectDay(zone.idx)"
              @mousemove="selectDay(zone.idx)"
              @touchstart="selectDay(zone.idx)"
            />
            <!-- 选中日 tooltip：显示日期 + 当日综合指数 -->
            <view
              v-if="activeDayData"
              class="fg-chart__tooltip"
              :class="{ 'fg-chart__tooltip--right': activeDayLeftPct > 60, 'fg-chart__tooltip--left': activeDayLeftPct < 30 }"
              :style="{ left: activeDayLeftPct + '%' }"
            >
              <view class="fg-chart__tooltip-content">
                <text class="fg-chart__tooltip-date">{{ activeDayData.date }}</text>
                <view class="fg-chart__tooltip-row">
                  <text class="fg-chart__tooltip-label">恐贪指数</text>
                  <text class="fg-chart__tooltip-value">{{ activeDayData.composite != null ? activeDayData.composite + '%' : '--' }}</text>
                </view>
              </view>
            </view>
          </view>
          <!-- 图例 -->
          <view class="fg-chart__legend">
            <view class="fg-chart__legend-item">
              <view class="fg-chart__line-short" />
              <text class="fg-chart__legend-text">恐贪指数</text>
            </view>
            <view v-if="icePointStats" class="fg-chart__legend-item">
              <view class="fg-chart__legend-dot" />
              <text class="fg-chart__legend-text">冰点日</text>
            </view>
            <!-- 沸点日图例常显（红点），出现 >=80 数据时图中自动标红 -->
            <view class="fg-chart__legend-item">
              <view class="fg-chart__legend-dot fg-chart__legend-dot--hot" />
              <text class="fg-chart__legend-text">沸点日</text>
            </view>
          </view>
          <!-- 均线数值 -->
          <view v-if="movingAverages" class="fg-chart__ma">
            <view class="fg-chart__ma-item">
              <text class="fg-chart__ma-label">5日均线</text>
              <text
                class="fg-chart__ma-value"
                :style="{ color: maColor(movingAverages.ma5) }"
              >{{ movingAverages.ma5 != null ? movingAverages.ma5.toFixed(0) + '%' : '--' }}</text>
            </view>
            <view class="fg-chart__ma-item">
              <text class="fg-chart__ma-label">20日均线</text>
              <text
                class="fg-chart__ma-value"
                :style="{ color: maColor(movingAverages.ma20) }"
              >{{ movingAverages.ma20 != null ? movingAverages.ma20.toFixed(0) + '%' : '--' }}</text>
            </view>
            <view class="fg-chart__ma-item">
              <text class="fg-chart__ma-label">60日均线</text>
              <text
                class="fg-chart__ma-value"
                :style="{ color: maColor(movingAverages.ma60) }"
              >{{ movingAverages.ma60 != null ? movingAverages.ma60.toFixed(0) + '%' : '--' }}</text>
            </view>
          </view>
        </view>

        <!-- AI 情绪洞见 -->
        <view class="fg-card">
          <text class="fg-card__title">AI 情绪洞见</text>
          <!-- AI 洞见：为什么 + 后续预判（基于历史走势图数据） -->
          <text v-if="aiInsight" class="fg-insight">{{ aiInsight }}</text>
          <!-- 冰点反弹统计 -->
          <view v-if="icePointStats" class="fg-rebound">
            <view class="fg-rebound__header">
              <text class="fg-rebound__title">冰点反弹统计</text>
              <text class="fg-rebound__period">近 3 个月</text>
            </view>
            <view class="fg-rebound__stats">
              <view class="fg-rebound__stat">
                <text class="fg-rebound__num">{{ icePointStats.iceCount }}</text>
                <text class="fg-rebound__label">冰点次数</text>
              </view>
              <view class="fg-rebound__divider" />
              <view class="fg-rebound__stat">
                <text
                  class="fg-rebound__num"
                  :style="{ color: icePointStats.reboundRate >= 60 ? '#18a058' : '#FF9500' }"
                >{{ icePointStats.reboundRate }}%</text>
                <text class="fg-rebound__label">次日反弹概率</text>
              </view>
              <view class="fg-rebound__divider" />
              <view class="fg-rebound__stat">
                <text class="fg-rebound__num">+{{ icePointStats.avgRebound }}</text>
                <text class="fg-rebound__label">平均反弹幅度</text>
              </view>
            </view>
            <text class="fg-rebound__desc">{{ icePointInsight }}</text>
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
                <text class="fg-position__value">{{ positionRange.min }}% - {{ positionRange.max }}%</text>
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
                  v-for="s in adviceCards.sectorTags"
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
                v-for="(a, i) in adviceCards.actions"
                :key="i"
                class="fg-actions__item"
              >
                <view class="fg-actions__dot" :style="{ background: zone.color }" />
                <text class="fg-actions__text">{{ a }}</text>
              </view>
            </view>
            <text class="fg-advice">{{ adviceCards.advice }}</text>
          </view>
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
import { fearGreedApi, type FearGreedDashboard, type FgSectorBoard } from '@/shared/api/modules/fear-greed'
import { buildSectorTags, buildActions, buildAdvice, buildDriversSentence } from '../utils/fgAdvice'

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
  /** 情绪总结话语（AI 洞见"为什么"部分） */
  summary: string
  /** 建议仓位下限（%）——动态仓位曲线的锚点 */
  positionMin: number
  /** 建议仓位上限（%）——动态仓位曲线的锚点 */
  positionMax: number
  /** 配置方向标签（含弹窗解释） */
  sectors: { name: string; desc: string }[]
  /** 操作要点 */
  actions: string[]
}

const ZONES: ZoneDef[] = [
  {
    min: 0, max: 20, label: '冰点', subLabel: '极度恐惧', color: '#00C853',
    start: '#00C853', end: '#5AFF8F', pulseColor: 'rgba(0, 200, 83, 0.5)', isExtreme: true,
    advice: '市场恐慌情绪降至冰点，优质资产或被错杀。建议保持耐心，可分批关注超跌的优质标的，等待企稳信号后再加大仓位。',
    summary: '市场情绪处于冰点，恐慌性抛售主导盘面，避险情绪浓厚',
    positionMin: 20, positionMax: 35,
    sectors: [
      { name: '超跌反弹', desc: '股价短期跌幅远超基本面，存在技术性修复机会。关注缩量企稳、主力回流的标的。' },
      { name: '高股息红利', desc: '分红收益率高、现金流稳定的蓝筹股（如银行、公用事业），防御属性强，熊市中提供安全垫。' },
      { name: '消费白马', desc: '行业龙头消费股，长期盈利稳定，当前估值已回落至合理区间，适合中长期布局。' },
    ],
    actions: ['分批建仓，控制节奏', '设好止损，严守纪律', '等待放量企稳信号'],
  },
  {
    min: 20, max: 45, label: '寒冷', subLabel: '恐惧', color: '#FF9500',
    start: '#FF9500', end: '#FFB84D', pulseColor: 'rgba(255, 149, 0, 0)', isExtreme: false,
    advice: '市场情绪偏谨慎，建议控制仓位，优先配置业绩确定性高的防御性板块，耐心等待情绪修复。',
    summary: '市场情绪偏谨慎，投资者信心不足、交易活跃度偏低',
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
    summary: '市场情绪平稳，多空力量均衡，观望气氛浓厚',
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
    summary: '市场情绪升温，资金参与意愿增强，赚钱效应显现',
    positionMin: 40, positionMax: 60,
    sectors: [
      { name: '逢高止盈', desc: '已有盈利的持仓分批卖出，锁定收益。不必等最高点，分批撤退降低回撤风险。' },
      { name: '低位补涨', desc: '相对滞涨的板块有轮动补涨需求，关注资金从高位向低位迁移的方向。' },
      { name: '题材轮动', desc: '市场题材活跃，关注政策/事件驱动的短线机会，注意节奏快、持续性有限。' },
    ],
    actions: ['分批止盈，锁定收益', '注意追高风险', '警惕高位放量滞涨信号'],
  },
  {
    min: 80, max: 100, label: '沸点', subLabel: '极度贪婪', color: '#FF3B30',
    start: '#FF3B30', end: '#FF6B60', pulseColor: 'rgba(255, 59, 48, 0.5)', isExtreme: true,
    advice: '市场情绪已至沸点，追涨情绪浓烈，风险收益比显著下降。建议降低仓位、落袋为安，避免盲目追高。',
    summary: '市场情绪过热，非理性追涨主导，追高风险加大',
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
/** 当日板块行情（建议引擎输入；失败静默置 null 走 fallback） */
const sectorBoard = ref<FgSectorBoard | null>(null)
/** 当前点击的配置方向弹窗（null = 关闭） */
const activeSector = ref<{ name: string; desc: string } | null>(null)

/** 当前分档（颜色 / 标签 / 建议 / 情绪总结 / 是否极端） */
const zone = computed<ZoneDef>(() => {
  const v = dashboard.value?.currentIndex ?? 50
  return ZONES.find((z) => v >= z.min && v < z.max) ?? ZONES[ZONES.length - 1]
})

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

/**
 * 历史走势图共享数据（图表 + 交互热区 + tooltip 共用）
 * 取最近 60 个交易日（约 3 个月）；每日一个数据点（当天恐贪指数）：
 * - 优先使用 calculator 计算的 history.scores（有 ~500 天历史，覆盖 3 个月）
 * - historySnapshots 仅用于 intraday 粒度（当前图表为日级，不需要）
 */
const chartData = computed(() => {
  const allScores = dashboard.value?.history?.scores ?? []
  const allDates = dashboard.value?.history?.dates ?? []

  if (allScores.length < 2) return null

  // history.scores 是倒序（[0]=最新），取最近 60 天并反转为升序
  const nDays = Math.min(60, allScores.length)
  const dates = allDates.slice(0, nDays).reverse()
  const composite = allScores.slice(0, nDays).reverse()

  // SVG 坐标常量（与 historyChartSrc 一致）
  const W = 340, H = 190
  const padL = 26, padR = 8, padT = 8, padB = 26
  const plotW = W - padL - padR
  const dayW = nDays > 1 ? plotW / nDays : plotW

  return { nDays, dates, composite, W, H, padL, padR, plotW, dayW }
})

/** 选中日的索引（null = 未选中，默认显示最新日） */
const activeDayIdx = ref<number | null>(null)

/** 当前生效的日索引（未选中时默认最新日 = nDays - 1） */
const effectiveDayIdx = computed(() => {
  if (activeDayIdx.value != null) return activeDayIdx.value
  const cd = chartData.value
  return cd ? cd.nDays - 1 : 0
})

/** 交互热区：每日一列透明 view，百分比定位对齐 SVG 点位 */
const chartHotzones = computed(() => {
  const cd = chartData.value
  if (!cd) return []
  const { nDays, W, padL, plotW, dayW } = cd
  const zones: { leftPct: number; widthPct: number; idx: number }[] = []
  for (let i = 0; i < nDays; i++) {
    const xStart = padL + i * dayW
    zones.push({
      idx: i,
      leftPct: (xStart / W) * 100,
      widthPct: (dayW / W) * 100,
    })
  }
  return zones
})

/** 当前选中日的完整数据（供 tooltip 显示） */
const activeDayData = computed(() => {
  const cd = chartData.value
  if (!cd) return null
  const idx = effectiveDayIdx.value
  if (idx < 0 || idx >= cd.nDays) return null
  const date = cd.dates[idx] ?? ''
  const composite = cd.composite[idx] ?? null
  return {
    date,
    composite: composite != null ? Math.round(composite * 100) / 100 : null,
  }
})

/** 选中日热区 left%（tooltip 横向定位用） */
const activeDayLeftPct = computed(() => {
  const cd = chartData.value
  if (!cd) return 50
  const idx = effectiveDayIdx.value
  const { W, padL, dayW } = cd
  const xCenter = padL + (idx + 0.5) * dayW
  return Math.max(8, Math.min(92, (xCenter / W) * 100))
})

function selectDay(idx: number) {
  activeDayIdx.value = idx
}

/**
 * 历史走势图 SVG（近 3 个月，每日单点折线）
 * - 主线（蓝）：连接每日恐贪指数（当天数据，一个点/日）
 * - 冰点日（恐贪<20）绿点、沸点日（恐贪>=80）红点
 * 数据源：DB 快照日均值优先，回退 history.scores 日级序列
 */
const historyChartSrc = computed(() => {
  const cd = chartData.value
  if (!cd) return ''
  const { nDays, dates, composite, W, H, padL, padR, plotW, dayW } = cd
  const padT = 8, padB = 26
  const plotH = H - padT - padB
  const yScale = (v: number) => padT + (1 - v / 100) * plotH
  const xDay = (i: number) => padL + i * dayW + dayW / 2

  // 20/80 分割线（虚线，区分冰点/沸点区域）
  const thresholdLines = [20, 80]
    .map((v) => `<line x1="${padL}" y1="${yScale(v).toFixed(1)}" x2="${W - padR}" y2="${yScale(v).toFixed(1)}" stroke="rgba(11,95,255,0.15)" stroke-width="0.6" stroke-dasharray="3 2"/>`)
    .join('')

  // 中线（50，更淡）
  const midLine = `<line x1="${padL}" y1="${yScale(50).toFixed(1)}" x2="${W - padR}" y2="${yScale(50).toFixed(1)}" stroke="rgba(11,95,255,0.06)" stroke-width="0.5" stroke-dasharray="2 2"/>`

  // Y 轴标签（0/20/50/80/100）
  const yLabels = [0, 20, 50, 80, 100]
    .map((v) => `<text x="${padL - 3}" y="${(yScale(v) + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(11,95,255,0.35)">${v}</text>`)
    .join('')

  // 主线：连接每日恐贪指数（当天数据，一个点/日）
  let mainPath = ''
  for (let i = 0; i < nDays; i++) {
    const cmd = i === 0 ? 'M' : 'L'
    mainPath += `${cmd} ${xDay(i).toFixed(1)} ${yScale(composite[i]).toFixed(1)} `
  }
  mainPath = mainPath.trim()

  // 选中日竖向十字线（交互高亮）
  const activeIdx = effectiveDayIdx.value
  const cursor = (activeIdx >= 0 && activeIdx < nDays)
    ? `<line x1="${xDay(activeIdx).toFixed(1)}" y1="${padT}" x2="${xDay(activeIdx).toFixed(1)}" y2="${H - padB}" stroke="rgba(11,95,255,0.3)" stroke-width="0.8" stroke-dasharray="2 2"/><circle cx="${xDay(activeIdx).toFixed(1)}" cy="${yScale(composite[activeIdx] ?? 50).toFixed(1)}" r="3" fill="#0b5fff" stroke="#fff" stroke-width="1"/>`
    : ''

  // 冰点/沸点标记：冰点日（恐贪<20，超卖机会区）绿点，沸点日（恐贪>=80，超买风险区）红点
  // （A股习惯绿=低吸机会/红=过热风险，与均线 maColor 档位一致）
  const iceDots = composite
    .map((s, i) => {
      if (s >= 20) return ''
      return `<circle cx="${xDay(i).toFixed(1)}" cy="${yScale(s).toFixed(1)}" r="2.5" fill="#00C853" stroke="#fff" stroke-width="0.8"/>`
    })
    .join('')
  const boilDots = composite
    .map((s, i) => {
      if (s < 80) return ''
      return `<circle cx="${xDay(i).toFixed(1)}" cy="${yScale(s).toFixed(1)}" r="2.5" fill="#FF3B30" stroke="#fff" stroke-width="0.8"/>`
    })
    .join('')

  // X 轴日期标签（首/中/尾）
  const dateLabel = (idx: number) => {
    const d = dates[idx]
    if (!d) return ''
    const clean = d.replace(/-/g, '')
    return `${clean.slice(4, 6)}/${clean.slice(6, 8)}`
  }
  const xLabels = [
    { idx: 0, anchor: 'start' as const },
    { idx: Math.floor((nDays - 1) / 2), anchor: 'middle' as const },
    { idx: nDays - 1, anchor: 'end' as const },
  ]
    .map(({ idx, anchor }) => `<text x="${xDay(idx).toFixed(1)}" y="${H - 5}" text-anchor="${anchor}" font-size="7" fill="rgba(11,95,255,0.35)">${dateLabel(idx)}</text>`)
    .join('')

  // 影线在底层，主线在上层，十字线最上层
  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${thresholdLines}${midLine}${yLabels}<path d="${mainPath}" fill="none" stroke="#0b5fff" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>${iceDots}${boilDots}${cursor}${xLabels}</svg>`

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
})

/**
 * 均线数值（5日/20日/60日）
 * 使用 history.scores（calculator 计算的日级 composite，倒序：[0]=最新）
 */
const movingAverages = computed(() => {
  const compositeArr = dashboard.value?.history?.scores ?? []
  if (compositeArr.length < 2) return null
  // compositeArr 倒序：[0]=最新
  const recentDesc = compositeArr
  const calc = (period: number) => {
    if (recentDesc.length < period) return null
    let sum = 0
    for (let i = 0; i < period; i++) sum += recentDesc[i]
    return Math.round((sum / period) * 100) / 100
  }
  return {
    ma5: calc(5),
    ma20: calc(20),
    ma60: calc(60),
  }
})

/** 均线值对应的颜色（绿<20冰点 / 橙<45 / 黄<55 / 绿<80 / 红≥80沸点） */
function maColor(v: number | null): string {
  if (v == null) return '#999'
  if (v < 20) return '#00C853'
  if (v < 45) return '#FF9500'
  if (v < 55) return '#FFCC00'
  if (v < 80) return '#34C759'
  return '#FF3B30'
}

/**
 * 冰点反弹统计：从历史数据计算"冰点→次日反弹"概率
 * 数据源优先 historySnapshots.composite（与图表口径一致），回退 history.scores
 */
const icePointStats = computed(() => {
  const compositeArr = dashboard.value?.history?.scores ?? []
  if (compositeArr.length < 2) return null
  // compositeArr 倒序：[0]=最新
  const recentDesc = compositeArr

  // 取近 3 个月（recentDesc[0]=最新）
  const n = Math.min(60, recentDesc.length)
  const recent = recentDesc.slice(0, n)

  let iceCount = 0
  let reboundCount = 0
  let reboundTotal = 0

  // recent[i]=i天前的冰点，recent[i-1]=(i-1)天前=次日
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] < 20) {
      iceCount++
      const nextDay = recent[i - 1]
      const diff = nextDay - recent[i]
      if (diff > 0) {
        reboundCount++
        reboundTotal += diff
      }
    }
  }

  if (iceCount === 0) return null

  return {
    iceCount,
    reboundCount,
    reboundRate: Math.round((reboundCount / iceCount) * 100),
    avgRebound: reboundCount > 0 ? Math.round((reboundTotal / reboundCount) * 10) / 10 : 0,
  }
})

/**
 * AI 情绪洞见：一句话/两句话格式 —— 为什么 + 后续预判
 * - 为什么：市场情绪总结（档位 + summary）+ 数据依据（5/20日均线关系）
 * - 后续预判：基于历史走势图数据（冰点反弹概率优先，其次均线排列）的趋势判断
 */
const aiInsight = computed(() => {
  const cur = dashboard.value?.currentIndex
  if (cur == null) return ''
  const z = zone.value
  const ma = movingAverages.value
  const ice = icePointStats.value

  // —— 为什么：今日主因（指标驱动）+ 档位总览 ——
  const driversSentence = buildDriversSentence({ composite: cur, indicators: dashboard.value?.indicators ?? [] })
  const whyParts: string[] = [`${driversSentence}，当前市场情绪${z.label}（恐贪指数 ${cur.toFixed(0)}%）`]
  if (ma?.ma5 != null && ma?.ma20 != null) {
    if (ma.ma5 > ma.ma20) {
      whyParts.push(`5日均线 ${ma.ma5.toFixed(0)}% 高于20日均线 ${ma.ma20.toFixed(0)}%，短期情绪正在回暖`)
    } else {
      whyParts.push(`5日均线 ${ma.ma5.toFixed(0)}% 低于20日均线 ${ma.ma20.toFixed(0)}%，短期情绪仍在走弱`)
    }
  }

  // —— 后续预判：冰点反弹概率优先，其次均线趋势 ——
  let forecast = ''
  if (ice && ice.iceCount > 0) {
    if (ice.reboundRate >= 70) {
      forecast = `历史上冰点后次日反弹概率高达 ${ice.reboundRate}%，短期有望超跌反弹，可关注企稳信号`
    } else if (ice.reboundRate >= 50) {
      forecast = `历史上冰点后次日反弹概率 ${ice.reboundRate}%，存在反弹可能，但需警惕连冰点极端行情`
    } else {
      forecast = `历史上冰点后次日反弹概率仅 ${ice.reboundRate}%，当前下行趋势较强，反弹或需等待`
    }
  } else if (ma?.ma5 != null && ma?.ma20 != null && ma.ma60 != null) {
    if (ma.ma5 > ma.ma20 && ma.ma20 > ma.ma60) {
      forecast = '均线多头排列，情绪修复趋势有望延续，但需留意高位过热回调风险'
    } else if (ma.ma5 < ma.ma20 && ma.ma20 < ma.ma60) {
      forecast = '均线空头排列，情绪或延续弱势，等待放量企稳信号'
    } else {
      forecast = '短期均线纠缠，情绪方向待选择，建议观望为主'
    }
  } else {
    forecast = '建议维持当前节奏，等待方向进一步明朗'
  }

  // 两句话拼接（不写"为什么/后续预判"字样，仅按此结构输出）
  return `${whyParts.join('，')}。${forecast}。`
})

/** 冰点反弹洞见文字 */
const icePointInsight = computed(() => {
  const s = icePointStats.value
  if (!s) return '近 3 个月未出现冰点区域（恐贪<20），市场情绪整体处于非极端水平。'
  if (s.reboundRate >= 70) {
    return `历史数据显示，冰点后次日反弹概率高达 ${s.reboundRate}%，平均反弹 ${s.avgRebound} 点。冰点区域往往是中长期布局窗口，但需结合基本面确认非趋势性下跌。`
  }
  if (s.reboundRate >= 50) {
    return `冰点后次日反弹概率 ${s.reboundRate}%，平均反弹 ${s.avgRebound} 点。反弹概率偏高但不绝对，需警惕"冰点连冰点"的极端行情。`
  }
  return `冰点后次日反弹概率仅 ${s.reboundRate}%，说明当前下行趋势较强，冰点不一定意味着立即反弹，需谨慎对待。`
})

/**
 * 数据驱动的动态建议仓位（替代原静态分档区间）
 * 1) 基准曲线：按当前恐贪指数在「各温度档锚点」间线性插值（锚点 = 各档预设区间中心）
 *    指数越接近中性(50)仓位越高，两端（冰点/沸点）防守低仓，随指数连续变化、无跳档
 * 2) 动态修正：
 *    - 冰点区域(<25) 且历史冰点次日反弹概率 ≥70% → 加 8%（超跌布局机会）
 *    - 短期趋势：5日均线 > 20日均线（回暖）+3，反之 -3
 * 3) 钳制：区间下限 ≥10、上限 ≤90
 */
const positionRange = computed(() => {
  const v = dashboard.value?.currentIndex ?? 50

  // 各温度档锚点：档位中心指数 & 建议仓位中心值 / 区间半宽
  const anchors = ZONES.map((zz) => ({
    idx: (zz.min + zz.max) / 2,
    center: (zz.positionMin + zz.positionMax) / 2,
    half: (zz.positionMax - zz.positionMin) / 2,
  }))

  // 相邻锚点间线性插值 → 基准仓位中心 + 区间半宽
  let base: number
  let half: number
  if (v <= anchors[0].idx) {
    base = anchors[0].center
    half = anchors[0].half
  } else if (v >= anchors[anchors.length - 1].idx) {
    base = anchors[anchors.length - 1].center
    half = anchors[anchors.length - 1].half
  } else {
    let i = 0
    while (i < anchors.length - 2 && v > anchors[i + 1].idx) i++
    const a = anchors[i]
    const b = anchors[i + 1]
    const t = (v - a.idx) / (b.idx - a.idx)
    base = a.center + (b.center - a.center) * t
    half = a.half + (b.half - a.half) * t
  }

  // 动态修正
  let adj = 0
  if (v < 20) {
    const ice = icePointStats.value
    if (ice && ice.iceCount > 0 && ice.reboundRate >= 70) adj += 8
  }
  const ma = movingAverages.value
  if (ma?.ma5 != null && ma?.ma20 != null) {
    adj += ma.ma5 > ma.ma20 ? 3 : -3
  }

  const center = Math.max(15, Math.min(80, Math.round(base + adj)))
  const min = Math.max(10, center - Math.round(half))
  const max = Math.min(90, center + Math.round(half))
  return { min, max }
})

/** 仓位条样式：动态建议仓位区间在 0-100% 条上的位置 */
const positionBarStyle = computed(() => {
  const { min, max } = positionRange.value
  return {
    left: min + '%',
    width: (max - min) + '%',
    background: `linear-gradient(to right, ${zone.value.start}, ${zone.value.end})`,
  }
})

/** 仪表盘 SVG（半圆表盘 + 指针 + 精致刻度，颜色跟随情绪区间） */
const gaugeImgSrc = computed(() => {
  const v = Math.max(0, Math.min(100, dashboard.value?.currentIndex ?? 0))
  const angle = ((v - 50) * 1.8).toFixed(1)
  const arcLen = (Math.PI * 85).toFixed(2)
  const dashLen = ((v / 100) * Math.PI * 85).toFixed(2)
  const z = zone.value

  // 主刻度（0/25/50/75/100）+ 细刻度（每10），精致风格
  const ticksArr = []
  for (let i = 0; i <= 100; i += 10) {
    const rot = (i * 1.8 - 90).toFixed(1)
    const major = i % 25 === 0
    if (major) {
      // 弧上圆点 + 刻度线 + 弧外数字
      ticksArr.push(`<g transform="rotate(${rot} 110 110)"><circle cx="110" cy="33" r="2.5" fill="rgba(11,95,255,0.3)"/><line x1="110" y1="33" x2="110" y2="42" stroke="rgba(11,95,255,0.12)" stroke-width="1.5" stroke-linecap="round"/><text x="110" y="16" text-anchor="middle" font-size="7" fill="rgba(11,95,255,0.35)" font-weight="600" letter-spacing="0.5">${i}</text></g>`)
    } else {
      ticksArr.push(`<g transform="rotate(${rot} 110 110)"><circle cx="110" cy="33" r="1" fill="rgba(11,95,255,0.15)"/></g>`)
    }
  }

  const svg = `<svg viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg"><path d="M 25 110 A 85 85 0 0 1 195 110" fill="none" stroke="rgba(11,95,255,0.06)" stroke-width="14" stroke-linecap="round"/><path d="M 25 110 A 85 85 0 0 1 195 110" fill="none" stroke="${z.color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${dashLen} ${arcLen}"/>${ticksArr.join('')}<g transform="rotate(${angle} 110 110)"><line x1="110" y1="110" x2="110" y2="40" stroke="${z.color}" stroke-width="3" stroke-linecap="round"/><circle cx="110" cy="40" r="5" fill="${z.color}"/></g><circle cx="110" cy="110" r="9" fill="#ffffff" stroke="${z.color}" stroke-width="3"/><circle cx="110" cy="110" r="4" fill="${z.color}"/><text x="25" y="142" text-anchor="middle" font-size="10" font-weight="700" fill="#00C853">冰点</text><text x="110" y="142" text-anchor="middle" font-size="9" fill="rgba(11,95,255,0.4)">常温</text><text x="195" y="142" text-anchor="middle" font-size="10" font-weight="700" fill="#FF3B30">沸点</text></svg>`

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
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
    // 板块行情独立拉取：失败不影响主数据（引擎侧回退静态档位内容）
    fearGreedApi.getSectors().then((b) => { sectorBoard.value = b }).catch(() => { sectorBoard.value = null })
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

/* ===== 情绪仪表盘（半圆表盘） ===== */
.fg-gauge {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $s-2 0;
}

/* 极端情绪呼吸光圈 */
.fg-gauge__pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  animation: fg-pulse 1.6s ease-out infinite;
  pointer-events: none;
}

@keyframes fg-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--pulse-color);
  }
  100% {
    box-shadow: 0 0 0 36rpx rgba(0, 0, 0, 0);
  }
}

.fg-gauge__img {
  width: 460rpx;
  height: 314rpx;
}

/* ===== 历史走势图 ===== */
.fg-card__sub {
  font-size: $font-size-xs;
  font-weight: 400;
  color: $ink-mute;
}

.fg-chart__img {
  width: 100%;
}

/* 交互热区容器：包裹 image，让热区/tooltip 相对它定位 */
.fg-chart__hotzone-container {
  position: relative;
  width: 100%;
  /* 触发 native scroll 阻止，避免热区 tap 时触发页面滚动 */
  touch-action: none;
}

/* 每日透明热区：横向定位对齐 SVG 中对应日的点位 */
.fg-chart__hotzone {
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: pointer;
  /* 轻微背景以便 active 时高亮 */
  background: transparent;
  transition: background 0.15s ease;
}

/* active 状态：很淡的蓝色背景，让用户感知当前 hover 的列 */
.fg-chart__hotzone--active {
  background: rgba(11, 95, 255, 0.05);
}

/* 选中日 tooltip：浮在图表上方，默认居中定位 */
.fg-chart__tooltip {
  position: absolute;
  top: 4rpx;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  /* 防止 tooltip 超出容器 */
  max-width: 220rpx;
}

/* tooltip 太靠右时，向左对齐避免溢出 */
.fg-chart__tooltip--right {
  transform: translateX(-85%);
}

/* tooltip 太靠左时，向右对齐避免溢出 */
.fg-chart__tooltip--left {
  transform: translateX(-15%);
}

.fg-chart__tooltip-content {
  padding: 12rpx 18rpx;
  border-radius: $r-md;
  background: rgba(11, 95, 255, 0.92);
  box-shadow: 0 8rpx 24rpx rgba(11, 95, 255, 0.25);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 160rpx;
}

.fg-chart__tooltip-date {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
  text-align: center;
  padding-bottom: 6rpx;
  margin-bottom: 4rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.2);
}

.fg-chart__tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.fg-chart__tooltip-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.75);
}

.fg-chart__tooltip-value {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.fg-chart__legend {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-top: $s-2;
}

.fg-chart__legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.fg-chart__legend-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #00C853;
  border: 2rpx solid #fff;
  box-shadow: 0 0 0 1rpx rgba(0, 200, 83, 0.3);
}

/* 沸点日：过热风险区，红色圆点（与图内沸点标记同色） */
.fg-chart__legend-dot--hot {
  background: #FF3B30;
  box-shadow: 0 0 0 1rpx rgba(255, 59, 48, 0.3);
}

.fg-chart__legend-text {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-chart__line-short {
  width: 20rpx;
  height: 4rpx;
  background: #0b5fff;
  border-radius: 2rpx;
}

.fg-chart__legend-hint {
  font-size: $font-size-xs;
  color: $ink-mute;
  opacity: 0.7;
}

/* 均线数值 */
.fg-chart__ma {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-top: $s-2;
  padding: $s-2 0;
  border-top: 1rpx solid rgba(11, 95, 255, 0.06);
}

.fg-chart__ma-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.fg-chart__ma-label {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-chart__ma-value {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.1;
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
/* 洞见正文：与卡片正文（投资建议等段落）同字号同色，保持页面协调 */
.fg-insight {
  font-size: $font-size-sm;
  line-height: 1.7;
  color: $ink-soft;
}

/* ===== 冰点反弹统计 ===== */
.fg-rebound {
  margin-top: $s-2;
  padding: $s-2;
  border-radius: $r-md;
  background: rgba(0, 200, 83, 0.04);
}

.fg-rebound__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $s-2;
}

.fg-rebound__title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink;
}

.fg-rebound__period {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-rebound__stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.fg-rebound__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.fg-rebound__num {
  font-size: 40rpx;
  font-weight: 800;
  color: #00C853;
  line-height: 1.1;
}

.fg-rebound__label {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fg-rebound__divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(11, 95, 255, 0.08);
}

.fg-rebound__desc {
  margin-top: $s-2;
  font-size: $font-size-xs;
  line-height: 1.6;
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
