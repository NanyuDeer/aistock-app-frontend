<template>
  <SubPageCard2 :title="quote?.name || '个股详情'" :subtitle="symbol">
    <view class="page-detail">
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="quote">
      <!-- 1. 股票头部 -->
      <view class="stock-header">
        <view class="stock-name-row">
          <text class="stock-name">{{ quote.name }}</text>
          <text class="stock-code">{{ quote.symbol }}</text>
          <view
            class="favorite-toggle"
            :class="{ active: isFavorite, disabled: favoritesStore.isPending(quote.symbol) }"
            @tap="toggleFavorite"
          >
            <text>{{ isFavorite ? '已自选' : '加自选' }}</text>
          </view>
        </view>
        <view class="stock-price-row">
          <text :class="['stock-price', quote.changePercent >= 0 ? 'up' : 'down']">
            {{ quote.price.toFixed(2) }}
          </text>
          <view :class="['stock-change-box', quote.changePercent >= 0 ? 'up-bg' : 'down-bg']">
            <text :class="['stock-change-text', quote.changePercent >= 0 ? 'up' : 'down']">
              {{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }}
              ({{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent.toFixed(2) }}%)
            </text>
          </view>
        </view>
        <view class="stock-tags-row">
          <view v-if="stockInfo?.industry" class="stock-tag">
            <text class="tag-label">行业</text>
            <text class="tag-value">{{ stockInfo.industry }}</text>
          </view>
          <view v-if="stockInfo?.regionBoard" class="stock-tag">
            <text class="tag-label">地域</text>
            <text class="tag-value">{{ stockInfo.regionBoard }}</text>
          </view>
          <view class="stock-tag">
            <text class="tag-label">上市</text>
            <text class="tag-value">{{ stockInfo?.listingDate || '--' }}</text>
          </view>
        </view>
        <view class="limit-inline">
          <text class="limit-inline-label">涨停 <text class="up">{{ quote.limitUp.toFixed(2) }}</text></text>
          <text class="limit-inline-sep">|</text>
          <text class="limit-inline-label">跌停 <text class="down">{{ quote.limitDown.toFixed(2) }}</text></text>
          <text class="limit-inline-sep">|</text>
          <text class="limit-inline-label">均价 <text>{{ quote.avgPrice.toFixed(2) }}</text></text>
        </view>
      </view>

      <view class="decision-card">
        <view class="decision-head">
          <view>
            <text class="decision-kicker">综合决策</text>
          </view>
          <view class="decision-verdict">
            <text :class="['decision-status', overallDecision.statusClass]">{{ overallDecision.status }}</text>
            <text class="decision-period">{{ overallDecision.period }}</text>
          </view>
        </view>
        <text class="decision-summary">{{ overallDecision.summary }}</text>
        <view class="decision-next">
          <text class="next-label">下一步</text>
          <text class="next-text">{{ overallDecision.nextStep }}</text>
        </view>
        <view class="decision-points">
          <view v-if="overallDecision.opportunity" class="decision-point" @tap="toggleDecisionPoint('opportunity')">
            <text class="point-label">机会</text>
            <text :class="['point-text', { expanded: expandedDecisionPoint === 'opportunity' }]">{{ overallDecision.opportunity }}</text>
            <text class="point-more">{{ expandedDecisionPoint === 'opportunity' ? '收起' : '展开' }}</text>
          </view>
          <view v-if="overallDecision.risk" class="decision-point is-risk" @tap="toggleDecisionPoint('risk')">
            <text class="point-label">风险</text>
            <text :class="['point-text', { expanded: expandedDecisionPoint === 'risk' }]">{{ overallDecision.risk }}</text>
            <text class="point-more">{{ expandedDecisionPoint === 'risk' ? '收起' : '展开' }}</text>
          </view>
        </view>
      </view>

      <view v-if="isFavorite" class="major-event-alert" :class="{ 'is-muted': !latestMajorEvent }">
        <view class="major-event-head">
          <text class="decision-kicker">最新重大异动</text>
          <text v-if="latestMajorEvent" :class="['major-impact', majorEventImpactClass]">
            {{ latestMajorEvent.ai_impact || latestMajorEvent.level || latestMajorEvent.change_type_name }}
          </text>
        </view>
        <template v-if="latestMajorEvent">
          <text class="major-event-title">{{ latestMajorEvent.summary || latestMajorEvent.title || latestMajorEvent.change_type_name }}</text>
          <view class="major-event-meta">
            <text>{{ latestMajorEvent.ai_horizon || latestMajorEvent.cycle || '周期待判' }}</text>
            <text>{{ latestMajorEvent.change_type_name || latestMajorEvent.info_type || '资讯研判' }}</text>
            <text>{{ latestMajorEvent.event_time_display || formatEventTime(latestMajorEvent.event_time) }}</text>
          </view>
        </template>
        <template v-else>
          <text class="major-event-title">暂无数据</text>
          <view class="major-event-meta">
            <text>暂无真实异动来源</text>
          </view>
        </template>
      </view>

      <!-- 2. 个股异动 -->
      <view v-if="isFavorite && displayedStockEvents.length" class="section-card">
        <text class="section-title">个股异动</text>
        <view class="event-list">
          <view v-for="(evt, idx) in displayedStockEvents" :key="idx" class="event-item">
            <view class="event-dot" :class="evt.change_type || evt.cycle || 'default'"></view>
            <view class="event-content">
              <text class="event-title">{{ evt.title || evt.change_type_name || evt.summary || '异动' }}</text>
              <text v-if="evt.event_time || evt.event_time_display" class="event-time">{{ evt.event_time_display || formatEventTime(evt.event_time) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 3. 周期切换 Tabs -->
      <view class="view-tabs">
        <view
          v-for="tab in viewTabs"
          :key="tab.key"
          :class="['view-tab', { 'is-active': activeView === tab.key }]"
          @tap="selectActiveView(tab.key)"
        >
          <text class="tab-label">{{ tab.label }}</text>
          <text class="tab-desc">{{ tab.desc }}</text>
        </view>
      </view>

      <!-- 4. 短线视图 -->
      <view v-show="activeView === 'short'" class="view-content">
        <!-- AI 资讯分析 -->
        <view class="ai-analysis-card">
          <view class="card-header">
            <text class="card-title">AI 资讯分析</text>
            <view class="card-header-actions">
              <view class="ai-history-btn" @tap="openHistoryDialog">
                <text class="history-icon">历史</text>
              </view>
              <view v-if="!aiLoading" class="ai-refresh-btn" @tap="refreshAiAnalysis">
                <text class="refresh-icon">↻</text>
              </view>
            </view>
          </view>
          <view class="card-body">
            <view v-if="aiLoading" class="ai-loading">
              <text class="ai-loading-text">正在生成AI分析...</text>
            </view>
            <template v-else-if="aiAnalysis && aiAnalysis.conclusion">
              <view class="ai-conclusion">
                <text :class="['conclusion-badge', aiConclusionClass]">{{ aiAnalysis.conclusion }}</text>
                <text v-if="aiAnalysis.analysisDate" class="analysis-date">{{ formatAiDate(aiAnalysis.analysisDate) }}</text>
              </view>
              <view v-if="logicTags.length" class="ai-section">
                <text class="ai-section-title">核心逻辑</text>
                <view class="research-tags">
                  <view
                    v-for="(tag, i) in logicTags"
                    :key="'lg'+i"
                    :class="['research-tag', 'is-logic', { 'is-expanded': expandedTag === 'logic' && expandedTagIdx === i }]"
                    @tap="toggleTagExpand('logic', i)"
                  >
                    <text class="research-tag-text">{{ tag.tag }}</text>
                  </view>
                </view>
                <view v-if="expandedTag === 'logic'" class="tag-detail">
                  <text class="tag-detail-text">{{ logicTags[expandedTagIdx]?.full }}</text>
                </view>
              </view>
              <view v-if="riskTags.length" class="ai-section">
                <text class="ai-section-title risk">风险提示</text>
                <view class="research-tags">
                  <view
                    v-for="(tag, i) in riskTags"
                    :key="'rk'+i"
                    :class="['research-tag', 'is-risk', { 'is-expanded': expandedTag === 'risk' && expandedTagIdx === i }]"
                    @tap="toggleTagExpand('risk', i)"
                  >
                    <text class="research-tag-text">{{ tag.tag }}</text>
                  </view>
                </view>
                <view v-if="expandedTag === 'risk'" class="tag-detail risk">
                  <text class="tag-detail-text">{{ riskTags[expandedTagIdx]?.full }}</text>
                </view>
              </view>
            </template>
            <view v-else class="ai-empty">
              <text class="ai-empty-text">暂无 AI 资讯分析</text>
            </view>

            <view class="info-news-divider"></view>
            <view class="news-list">
              <view
                v-for="(news, idx) in visibleNewsList"
                :key="idx"
                class="news-item"
                @tap="openNews(news)"
              >
                <text class="news-title">{{ news.title }}</text>
                <view class="news-meta">
                  <text v-if="news.source" class="news-source">{{ news.source }}</text>
                  <text v-if="news.publishTime" class="news-time">{{ news.publishTime }}</text>
                </view>
              </view>
              <view v-if="newsList.length > 3" class="news-toggle" @tap="newsExpanded = !newsExpanded">
                <text class="news-toggle-text">
                  {{ newsExpanded ? '收起' : `查看全部 ${newsList.length} 条` }}
                </text>
              </view>
              <view v-if="!newsList.length" class="ai-empty">
                <text class="ai-empty-text">暂无相关资讯</text>
              </view>
          </view>
        </view>
        </view>
        <!-- K 线图 -->
        <view class="section-card">
          <text class="section-title">K线图</text>
          <KLineChart
            v-if="klineData.length || klineLoading"
            :kline-data="klineData"
            title="K线图"
            :period="klinePeriod"
            :loading="klineLoading"
            @period-change="handleKLinePeriodChange"
          />
          <view v-else class="ai-empty">
            <text class="ai-empty-text">暂无K线数据</text>
          </view>
        </view>

        <!-- 资金流向 -->
        <view v-if="capitalFlowInfo" class="section-card">
          <text class="section-title">资金流向</text>
          <!-- AI 增强标签 -->
          <view v-if="capitalFlowInfo.tag" class="cf-ai-tag-row">
            <text :class="['cf-ai-tag', capitalFlowInfo.tagClass || 'is-neutral']">{{ capitalFlowInfo.tag }}</text>
            <view class="cf-tags-inline">
              <text v-for="(t, i) in (capitalFlowInfo.tags || [])" :key="i" class="cf-tag-mini">{{ t }}</text>
            </view>
          </view>
          <!-- 主力净流入 -->
          <view class="cf-hero-card">
            <text class="cf-hero-label">主力净流入</text>
            <text :class="['cf-hero-card-value', (capitalFlowInfo.mainInflow ?? 0) >= 0 ? 'is-up' : 'is-down']">
              {{ formatFlowAmount(capitalFlowInfo.mainInflow) }}
            </text>
          </view>
          <CapitalFlowCharts
            :main-inflow="capitalFlowInfo.mainInflow"
            :ratio="capitalFlowInfo.ratio"
            :five-day="capitalFlowInfo.fiveDay"
            :streak="capitalFlowInfo.streak"
            :narrative="capitalFlowInfo.narrative"
            :risk="capitalFlowInfo.risk"
            :orders="capitalFlowInfo.orders || []"
            :trend="capitalFlowInfo.trend || []"
            :trend-dates="capitalFlowInfo.trendDates || []"
            :trend-badge="capitalFlowInfo.trendBadge"
          />
        </view>
        <view v-else class="section-card">
          <text class="section-title">资金流向</text>
          <view class="ai-empty">
            <text class="ai-empty-text">暂无资金流数据</text>
          </view>
        </view>

        <!-- 交易数据 -->
        <view class="section-card">
          <text class="section-title">交易数据</text>
          <view class="detail-grid">
            <view class="detail-item is-volume-item">
              <text class="detail-label">成交量</text>
              <view class="detail-value detail-volume">
                <text>{{ formatVolumeValue(quote.volume) }}</text>
                <text v-if="formatVolumeUnit(quote.volume)" class="detail-value-unit">({{ formatVolumeUnit(quote.volume) }})</text>
              </view>
            </view>
            <view class="detail-item">
              <text class="detail-label">成交额</text>
              <text class="detail-value">{{ formatAmount(quote.amount) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">换手率</text>
              <text class="detail-value">{{ quote.turnoverRate.toFixed(2) }}%</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">量比</text>
              <text class="detail-value">{{ (quote.volumeRatio ?? 0).toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">今开</text>
              <text :class="['detail-value', quote.open >= quote.prevClose ? 'up' : 'down']">{{ quote.open.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">最高</text>
              <text class="detail-value up">{{ quote.high.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">最低</text>
              <text class="detail-value down">{{ quote.low.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">昨收</text>
              <text class="detail-value">{{ quote.prevClose.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">振幅</text>
              <text class="detail-value">{{ quote.amplitude.toFixed(2) }}%</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">市盈率</text>
              <text class="detail-value">{{ quote.peRatio.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">市净率</text>
              <text class="detail-value">{{ quote.pbRatio.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">流通市值</text>
              <text class="detail-value">{{ formatMarketValue(stockInfo?.floatMarketCap) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 5. 中线视图 -->
      <view v-show="activeView === 'mid'" class="view-content">
        <!-- 中线 AI 研判 -->
        <view class="ai-analysis-card">
          <view class="card-header">
            <text class="card-title">中线AI研判</text>
          </view>
          <view class="card-body">
            <view class="ai-conclusion">
              <text :class="['conclusion-badge', midAiAnalysis.badgeClass]">{{ midAiAnalysis.conclusion }}</text>
            </view>
            <view class="ai-logic">
              <text class="ai-logic-text">{{ midAiAnalysis.logic }}</text>
            </view>
            <view class="ai-action-list">
              <view v-for="item in midActionItems" :key="item.label" class="ai-action-item">
                <text class="ai-action-label">{{ item.label }}</text>
                <text class="ai-action-text">{{ item.value }}</text>
              </view>
            </view>
            <view v-if="midBasisTags.length" class="ai-section">
              <text class="ai-section-title">研判依据</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in midBasisTags"
                  :key="'mb'+i"
                  :class="['research-tag', 'is-basis', { 'is-expanded': expandedTag === 'midBasis' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('midBasis', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'midBasis'" class="tag-detail basis">
                <text class="tag-detail-text">{{ midBasisTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
            <view v-if="midAdviceTags.length" class="ai-section">
              <text class="ai-section-title">投资建议</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in midAdviceTags"
                  :key="'ma'+i"
                  :class="['research-tag', 'is-advice', { 'is-expanded': expandedTag === 'midAdvice' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('midAdvice', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'midAdvice'" class="tag-detail advice">
                <text class="tag-detail-text">{{ midAdviceTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
            <view v-if="midRiskTags.length" class="ai-section">
              <text class="ai-section-title risk">风险提示</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in midRiskTags"
                  :key="'mr'+i"
                  :class="['research-tag', 'is-risk', { 'is-expanded': expandedTag === 'midRisk' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('midRisk', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'midRisk'" class="tag-detail risk">
                <text class="tag-detail-text">{{ midRiskTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 财报分析 -->
        <view class="section-card">
          <view class="section-header">
            <text class="section-title">财报分析</text>
            <text v-if="semiAnnualReport?.reports?.length" class="section-sub">
              {{ semiAnnualReport.reports[0]?.end_date?.slice(0, 4) }}年半年报
            </text>
          </view>
          <view v-if="semiAnnualReport" class="semi-grid">
            <view v-if="semiAnnualReport.reports?.length" class="semi-table">
              <view class="semi-row semi-header">
                <text class="semi-cell semi-cell-label">财务指标</text>
                <text class="semi-cell semi-cell-value">本期</text>
                <text class="semi-cell semi-cell-value">同比</text>
              </view>
              <view class="semi-row">
                <text class="semi-cell semi-cell-label">营业总收入</text>
                <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.total_revenue) }}</text>
                <text :class="['semi-cell', 'semi-cell-value', growthClass(semiAnnualReport.total_revenue_yoy)]">
                  {{ formatGrowth(semiAnnualReport.total_revenue_yoy) }}
                </text>
              </view>
              <view class="semi-row">
                <text class="semi-cell semi-cell-label">净利润</text>
                <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.n_income) }}</text>
                <text :class="['semi-cell', 'semi-cell-value', growthClass(semiAnnualReport.n_income_yoy)]">
                  {{ formatGrowth(semiAnnualReport.n_income_yoy) }}
                </text>
              </view>
              <view class="semi-row">
                <text class="semi-cell semi-cell-label">归母净利润</text>
                <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.n_income_attr_p) }}</text>
                <text :class="['semi-cell', 'semi-cell-value', growthClass(semiAnnualReport.n_income_attr_p_yoy)]">
                  {{ formatGrowth(semiAnnualReport.n_income_attr_p_yoy) }}
                </text>
              </view>
              <view class="semi-row">
                <text class="semi-cell semi-cell-label">基本每股收益</text>
                <text class="semi-cell semi-cell-value">--</text>
                <text class="semi-cell semi-cell-value">--</text>
              </view>
              <view class="semi-row">
                <text class="semi-cell semi-cell-label">研发费用</text>
                <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.rd_exp) }}</text>
                <text class="semi-cell semi-cell-value">--</text>
              </view>
            </view>
            <view v-else class="semi-empty">
              <text class="semi-empty-text">暂无半年报数据</text>
            </view>
            <view class="semi-footer">
              <text class="semi-link" @tap="openDisclosureUrl">查看完整公告 ></text>
            </view>
          </view>
          <view v-else-if="midMockData.finance.length" class="finance-grid">
            <view v-for="item in midMockData.finance" :key="item.label" class="finance-item">
              <text class="finance-label">{{ item.label }}</text>
              <text class="finance-value">{{ item.value }}</text>
              <text :class="['finance-change', item.type]">{{ item.change }}</text>
            </view>
          </view>
          <view v-else class="ai-empty">
            <text class="ai-empty-text">暂无财报数据</text>
          </view>
        </view>

        <!-- 业绩预测 -->
        <view class="section-card">
          <view class="section-header">
            <text class="section-title">业绩预测</text>
            <view v-if="!forecastLoading" class="ai-refresh-btn" @tap="loadForecast(true)">
              <text class="refresh-icon">↻</text>
            </view>
          </view>
          <view v-if="forecastLoading" class="ai-loading">
            <text class="ai-loading-text">加载中...</text>
          </view>
          <view v-else-if="forecastData && (forecastData.summary || (forecastData.predictions && forecastData.predictions.length))" class="forecast-content">
            <view v-if="forecastData.updateTime" class="forecast-update-time">
              <text class="forecast-update-label">更新时间：</text>
              <text class="forecast-update-value">{{ forecastData.updateTime }}</text>
            </view>
            <view v-if="forecastData.summary" class="forecast-summary">
              <text class="forecast-summary-text">{{ forecastData.summary }}</text>
            </view>
            <view v-if="forecastData.netProfitYoy != null" class="forecast-yoy">
              <text class="forecast-yoy-label">净利润同比</text>
              <text :class="['forecast-yoy-value', forecastData.netProfitYoy >= 0 ? 'up' : 'down']">
                {{ forecastData.netProfitYoy >= 0 ? '+' : '' }}{{ forecastData.netProfitYoy }}%
              </text>
            </view>
            <ForecastProfitChart
              v-if="forecastChartItems.length"
              :items="forecastChartItems"
              :visible="activeView === 'mid'"
            />
            <view v-if="forecastYearRows.length" class="forecast-year-panel">
              <view class="forecast-year-head">
                <text class="forecast-year-title">年度预测</text>
                <text class="forecast-year-unit">净利润 / 增长率</text>
              </view>
              <view class="forecast-year-list">
                <view v-for="row in forecastYearRows" :key="row.year" class="forecast-year-item">
                  <view class="forecast-year-main">
                    <view class="forecast-year-left">
                      <text class="forecast-year-label">{{ row.year }}</text>
                      <text :class="['forecast-year-kind', row.kindClass]">{{ row.kindText }}</text>
                    </view>
                    <view class="forecast-year-right">
                      <text class="forecast-year-value">{{ row.netProfit }}</text>
                      <text :class="['forecast-year-growth', row.growthClass]">{{ row.growthText }}</text>
                    </view>
                  </view>
                  <view class="forecast-progress-track">
                    <view
                      class="forecast-progress-fill"
                      :class="row.kindClass"
                      :style="{ width: `${row.progress}%` }"
                    ></view>
                  </view>
                </view>
              </view>
            </view>
            <view
              v-if="forecastData.detailIndicators && forecastData.detailIndicators.length"
              class="forecast-detail-toggle"
              @tap="forecastDetailExpanded = !forecastDetailExpanded"
            >
              <text class="forecast-detail-toggle-text">{{ forecastDetailExpanded ? '收起详细指标' : '查看详细指标' }}</text>
              <text class="forecast-detail-toggle-icon">{{ forecastDetailExpanded ? '−' : '+' }}</text>
            </view>
            <view v-if="forecastDetailExpanded && forecastData.detailIndicators && forecastData.detailIndicators.length" class="forecast-detail-table">
              <view class="forecast-detail-scroll">
                <view class="forecast-detail-row forecast-detail-head">
                  <text class="forecast-detail-cell forecast-detail-cell-name">指标</text>
                  <text
                    v-for="(key, kidx) in forecastDetailYearKeys"
                    :key="kidx"
                    class="forecast-detail-cell"
                  >{{ key }}</text>
                </view>
                <view
                  v-for="(row, ridx) in forecastData.detailIndicators.slice(0, 6)"
                  :key="ridx"
                  class="forecast-detail-row"
                >
                  <text class="forecast-detail-cell forecast-detail-cell-name">{{ row['预测指标'] || row.indicator || '' }}</text>
                  <text
                    v-for="(key, kidx) in forecastDetailYearKeys"
                    :key="kidx"
                    class="forecast-detail-cell"
                  >{{ row[key] || '--' }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="ai-empty">
            <text class="ai-empty-text">暂无业绩预测数据</text>
          </view>
        </view>

      </view>

      <!-- 6. 长线视图 -->
      <view v-show="activeView === 'long'" class="view-content">
        <!-- 长线 AI 研判 -->
        <view class="ai-analysis-card">
          <view class="card-header">
            <text class="card-title">长线AI研判</text>
          </view>
          <view class="card-body">
            <view class="ai-conclusion">
              <text :class="['conclusion-badge', longAiAnalysis.badgeClass]">{{ longAiAnalysis.conclusion }}</text>
            </view>
            <view class="ai-logic">
              <text class="ai-logic-text">{{ longAiAnalysis.logic }}</text>
            </view>
            <view class="ai-action-list">
              <view v-for="item in longActionItems" :key="item.label" class="ai-action-item">
                <text class="ai-action-label">{{ item.label }}</text>
                <text class="ai-action-text">{{ item.value }}</text>
              </view>
            </view>
            <view v-if="longBasisTags.length" class="ai-section">
              <text class="ai-section-title">研判依据</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in longBasisTags"
                  :key="'lb'+i"
                  :class="['research-tag', 'is-basis', { 'is-expanded': expandedTag === 'longBasis' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('longBasis', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'longBasis'" class="tag-detail basis">
                <text class="tag-detail-text">{{ longBasisTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
            <view v-if="longAdviceTags.length" class="ai-section">
              <text class="ai-section-title">投资建议</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in longAdviceTags"
                  :key="'la'+i"
                  :class="['research-tag', 'is-advice', { 'is-expanded': expandedTag === 'longAdvice' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('longAdvice', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'longAdvice'" class="tag-detail advice">
                <text class="tag-detail-text">{{ longAdviceTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
            <view v-if="longRiskTags.length" class="ai-section">
              <text class="ai-section-title risk">风险提示</text>
              <view class="research-tags">
                <view
                  v-for="(tag, i) in longRiskTags"
                  :key="'lr'+i"
                  :class="['research-tag', 'is-risk', { 'is-expanded': expandedTag === 'longRisk' && expandedTagIdx === i }]"
                  @tap="toggleTagExpand('longRisk', i)"
                >
                  <text class="research-tag-text">{{ tag.tag }}</text>
                </view>
              </view>
              <view v-if="expandedTag === 'longRisk'" class="tag-detail risk">
                <text class="tag-detail-text">{{ longRiskTags[expandedTagIdx]?.full }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 趋势股模型（四维） -->
        <view v-if="trendLoading || trendModel.hasModel || trendModel.isVetoed" class="section-card tenx-card">
          <view class="section-header">
            <text class="section-title">趋势股模型</text>
            <view v-if="trendModel.isReal" class="tenx-real-badge">
              <text class="tenx-real-text">实时数据</text>
            </view>
          </view>
          <!-- 加载中 -->
          <view v-if="trendLoading && !trendModel.hasModel && !trendModel.isVetoed" class="ai-loading">
            <text class="ai-loading-text">加载趋势股评分...</text>
          </view>
          <!-- 一票否决 -->
          <view v-else-if="trendModel.isVetoed" class="tenx-vetoed">
            <view class="tenx-vetoed-icon">
              <text class="tenx-vetoed-icon-text">!</text>
            </view>
            <text class="tenx-vetoed-title">一票否决</text>
            <text class="tenx-vetoed-desc">{{ trendModel.aiConclusion }}</text>
            <view v-if="trendVetoReasons.length" class="tenx-vetoed-reasons">
              <view v-for="(reason, ridx) in trendVetoReasons" :key="ridx" class="tenx-vetoed-reason-item">
                <text class="tenx-vetoed-reason-text">- {{ reason }}</text>
              </view>
            </view>
          </view>
          <!-- 正常评分 -->
          <view v-else>
            <view class="tenx-hero">
              <view class="tenx-score-wrap">
                <text :class="['tenx-score', tenxScoreClass(trendModel.score)]">{{ trendModel.score }}</text>
                <text class="tenx-score-label">综合评分</text>
                <text v-if="trendModel.expectedMultiple" class="tenx-multiple">期望 {{ trendModel.expectedMultiple }}</text>
              </view>
              <view class="tenx-verdict">
                <text v-if="trendModel.label" :class="['verdict-tag', tenxScoreClass(trendModel.score)]">{{ trendModel.label }}</text>
                <text v-else class="verdict-tag">{{ trendModel.verdict }}</text>
                <text v-if="trendModel.description" class="verdict-text">{{ trendModel.description }}</text>
              </view>
            </view>
            <!-- AI 结论 -->
            <view v-if="trendModel.aiConclusion" class="tenx-ai-conclusion">
              <view class="tenx-ai-conclusion-header">
                <text class="tenx-ai-conclusion-icon">AI</text>
                <text class="tenx-ai-conclusion-label">AI结论</text>
              </view>
              <text class="tenx-ai-conclusion-text">{{ trendModel.aiConclusion }}</text>
            </view>
            <!-- 四维因子详情 -->
            <view v-if="trendModel.dimensions && trendModel.dimensions.length" class="tenx-dim-header">
              <text class="tenx-dim-title">{{ trendModel.isReal ? '四维因子详情' : '因子详情' }}</text>
            </view>
            <view class="tenx-dimensions">
              <view
                v-for="(dim, idx) in trendModel.dimensions"
                :key="dim.name || idx"
                class="tenx-dim-item"
              >
                <view class="tenx-dim-head" @tap="toggleDimExpand(idx)">
                  <text class="tenx-dim-label">{{ dim.label || dim.name }}</text>
                  <text :class="['tenx-dim-score', tenxScoreClass(dim.score)]">{{ dim.score }}</text>
                  <text v-if="dim.weight" class="tenx-dim-weight">权重{{ dim.weight }}%</text>
                  <text class="tenx-dim-arrow">{{ expandedDims.has(idx) ? '收起' : '展开' }}</text>
                </view>
                <view class="tenx-dim-bar-wrap">
                  <view :class="['tenx-dim-bar', tenxScoreClass(dim.score)]" :style="{ width: dim.score + '%' }"></view>
                </view>
                <view v-if="expandedDims.has(idx)" class="tenx-dim-body">
                  <!-- 维度指标 -->
                  <view v-if="dim.indicators && dim.indicators.length" class="tenx-ind-list">
                    <view v-for="(ind, j) in dim.indicators" :key="j" class="tenx-ind-row">
                      <text class="tenx-ind-name">{{ ind.name }}</text>
                      <view class="tenx-ind-right">
                        <text class="tenx-ind-value">{{ ind.value }}</text>
                        <view class="tenx-ind-bar-track">
                          <view :class="['tenx-ind-bar-fill', tenxScoreClass(ind.score)]" :style="{ width: ind.score + '%' }"></view>
                        </view>
                        <text :class="['tenx-ind-score', tenxScoreClass(ind.score)]">{{ ind.score }}</text>
                      </view>
                    </view>
                  </view>
                  <!-- 基本面子维度 -->
                  <view v-if="dim.subDimensions && dim.subDimensions.length" class="tenx-sub-dims">
                    <text class="tenx-sub-dims-title">基本面子维度</text>
                    <view v-for="(sub, sidx) in dim.subDimensions" :key="sidx" class="tenx-sub-dim-item">
                      <view class="tenx-sub-dim-head">
                        <text class="tenx-sub-dim-name">{{ sub.name }}</text>
                        <text :class="['tenx-sub-dim-score', tenxScoreClass(sub.score)]">{{ sub.score }}</text>
                        <text v-if="sub.weight" class="tenx-sub-dim-weight">{{ sub.weight }}%</text>
                      </view>
                      <view v-if="sub.indicators && sub.indicators.length" class="tenx-ind-list">
                        <view v-for="(ind, k) in sub.indicators" :key="k" class="tenx-ind-row">
                          <text class="tenx-ind-name">{{ ind.name }}</text>
                          <view class="tenx-ind-right">
                            <text class="tenx-ind-value">{{ ind.value }}</text>
                            <view class="tenx-ind-bar-track">
                              <view :class="['tenx-ind-bar-fill', tenxScoreClass(ind.score)]" :style="{ width: ind.score + '%' }"></view>
                            </view>
                            <text :class="['tenx-ind-score', tenxScoreClass(ind.score)]">{{ ind.score }}</text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view v-if="trendModel.updatedAt || trendModel.scoreDate" class="tenx-data-source">
              <text class="tenx-source-text">更新时间：{{ trendModel.updatedAt || trendModel.scoreDate }}</text>
            </view>
          </view>
        </view>

        <!-- 行业政策 -->
        <view class="section-card">
          <text class="section-title">行业政策</text>
          <view v-if="visiblePolicyList.length" class="policy-list">
            <view v-for="(policy, idx) in visiblePolicyList" :key="idx" class="policy-item">
              <text v-if="policy.tag" :class="['policy-tag', policy.type]">{{ policy.tag }}</text>
              <text :class="['policy-text', { 'is-collapsed': !policyExpanded }]">{{ policy.text }}</text>
            </view>
          </view>
          <view v-else class="ai-empty">
            <text class="ai-empty-text">暂无数据</text>
          </view>
          <view v-if="policyNeedsExpand" class="news-toggle" @tap="policyExpanded = !policyExpanded">
            <text class="news-toggle-text">{{ policyExpanded ? '收起' : '查看完整' }}</text>
          </view>
        </view>

        <!-- 公司护城河 -->
        <view class="section-card">
          <text class="section-title">公司护城河</text>
          <view v-if="longMockData.moats.length" class="moat-grid">
            <view v-for="moat in longMockData.moats" :key="moat.title" class="moat-item">
              <view class="moat-icon">
                <text>{{ moat.icon }}</text>
              </view>
              <text class="moat-title">{{ moat.title }}</text>
              <text class="moat-desc">{{ moat.desc }}</text>
            </view>
          </view>
          <view v-else class="ai-empty">
            <text class="ai-empty-text">暂无数据</text>
          </view>
        </view>

        <!-- 年报对比 -->
        <view class="section-card">
          <text class="section-title">年报对比</text>
          <view v-if="longMockData.annual.length" class="annual-grid">
            <view v-for="item in longMockData.annual" :key="item.label" class="annual-item">
              <text class="annual-label">{{ item.label }}</text>
              <text class="annual-value">{{ item.value }}</text>
              <text :class="['annual-note', item.type]">{{ item.note }}</text>
            </view>
          </view>
          <view v-else class="ai-empty">
            <text class="ai-empty-text">暂无数据</text>
          </view>
        </view>
      </view>

      <!-- 6. AI 投顾入口（页面最底部） -->
      <view class="ai-card" @tap="goChat">
        <view class="ai-icon-wrap">
          <SvgIcon name="robot-line" size="36rpx" color="#ffffff" />
        </view>
        <view class="ai-content">
          <text class="ai-title">AI 智能投顾</text>
          <text class="ai-desc">询问 "{{ quote.name }}" 相关问题</text>
        </view>
        <text class="ai-arrow">></text>
      </view>
    </template>

    <!-- 历史 AI 评价弹窗 -->
    <view v-if="historyVisible" class="history-mask" @tap="closeHistoryDialog">
      <view class="history-dialog" @tap.stop>
        <view class="history-dialog-header">
          <text class="history-dialog-title">历史 AI 评价</text>
          <view class="history-dialog-close" @tap="closeHistoryDialog">
            <text class="close-icon">×</text>
          </view>
        </view>
        <view class="history-dialog-body">
          <!-- 详情视图 -->
          <view v-if="selectedHistoryRecord" class="history-detail">
            <view class="history-detail-back" @tap="selectedHistoryRecord = null">
              <text class="back-icon"><</text>
              <text class="back-text">返回列表</text>
            </view>
            <view class="history-detail-meta">
              <text class="history-detail-time">{{ selectedHistoryRecord.analysisTime }}</text>
              <text :class="['history-detail-conclusion', selectedHistoryRecord.conclusion.includes('买入') || selectedHistoryRecord.conclusion.includes('增持') ? 'is-bull' : selectedHistoryRecord.conclusion.includes('卖出') || selectedHistoryRecord.conclusion.includes('减持') ? 'is-bear' : 'is-hold']">
                {{ selectedHistoryRecord.conclusion }}
              </text>
            </view>
            <view v-if="selectedHistoryRecord.coreLogic" class="history-detail-section">
              <text class="history-detail-section-title">核心逻辑</text>
              <text class="history-detail-section-text">{{ selectedHistoryRecord.coreLogic }}</text>
            </view>
            <view v-if="selectedHistoryRecord.riskWarning" class="history-detail-section">
              <text class="history-detail-section-title risk">风险提示</text>
              <text class="history-detail-section-text">{{ selectedHistoryRecord.riskWarning }}</text>
            </view>
          </view>
          <!-- 列表视图 -->
          <view v-else>
            <view v-if="historyLoading" class="ai-loading">
              <text class="ai-loading-text">加载中...</text>
            </view>
            <view v-else-if="historyRecords.length" class="history-list">
              <view
                v-for="(record, idx) in historyRecords"
                :key="idx"
                class="history-item"
                @tap="openHistoryDetail(record)"
              >
                <view class="history-item-meta">
                  <text class="history-item-time">{{ record.analysisTime || record['分析时间'] || '--' }}</text>
                  <text :class="['history-item-conclusion', (record.conclusion || record['结论'] || '').includes('买入') || (record.conclusion || record['结论'] || '').includes('增持') ? 'is-bull' : (record.conclusion || record['结论'] || '').includes('卖出') || (record.conclusion || record['结论'] || '').includes('减持') ? 'is-bear' : 'is-hold']">
                    {{ record.conclusion || record['结论'] || '--' }}
                  </text>
                </view>
                <text class="history-item-logic">{{ (record.coreLogic || record['核心逻辑'] || '').substring(0, 60) }}...</text>
              </view>
            </view>
            <view v-else class="ai-empty">
              <text class="ai-empty-text">暂无历史评价</text>
            </view>
            <!-- 分页 -->
            <view v-if="historyPagination.totalPages > 1" class="history-pagination">
              <view
                :class="['history-page-btn', { disabled: historyPagination.page <= 1 }]"
                @tap="historyPagination.page > 1 && loadEvaluationHistory(historyPagination.page - 1)"
              >
                <text>上一页</text>
              </view>
              <text class="history-page-info">{{ historyPagination.page }}/{{ historyPagination.totalPages }}</text>
              <view
                :class="['history-page-btn', { disabled: historyPagination.page >= historyPagination.totalPages }]"
                @tap="historyPagination.page < historyPagination.totalPages && loadEvaluationHistory(historyPagination.page + 1)"
              >
                <text>下一页</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading && !quote" class="empty">
      <text class="empty-text">未找到股票数据</text>
    </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import KLineChart from '@/modules/favorites/components/KLineChart.vue'
import ForecastProfitChart from '@/modules/favorites/components/ForecastProfitChart.vue'
import CapitalFlowCharts from '@/modules/favorites/components/CapitalFlowCharts.vue'
import { useStockAiAnalysis, extractTagsFromText, extractTagsFromArray } from '@/modules/favorites/composables/useStockAiAnalysis'

const loading = ref(true)
const quote = ref<any>(null)
const stockInfo = ref<any>(null)
const capitalFlow = ref<any>(null)
const semiAnnualReport = ref<any>(null)
const disclosureUrl = ref('')
const symbol = ref('')
const aiAnalysis = ref<any>(null)
const aiLoading = ref(false)
const newsList = ref<any[]>([])
const newsExpanded = ref(false)
const stockEvents = ref<any[]>([])
const forecastData = ref<any>(null)
const forecastLoading = ref(false)
const forecastDetailExpanded = ref(false)
const klineData = ref<any[]>([])
type KLinePeriod = 'daily' | 'weekly' | 'monthly'
const klinePeriod = ref<KLinePeriod>('daily')
const klineLoading = ref(false)
const trendScoreData = ref<any>(null)
const trendLoading = ref(false)
// 历史 AI 评价
const historyVisible = ref(false)
const historyLoading = ref(false)
const historyRecords = ref<any[]>([])
const historyPagination = ref({ page: 1, pageSize: 10, total: 0, totalPages: 1 })
const selectedHistoryRecord = ref<any>(null)
const favoritesStore = useFavoritesStore()
const isFavorite = computed(() => favoritesStore.isFavorite(symbol.value))

// 周期切换
type ViewKey = 'short' | 'mid' | 'long'
const activeView = ref<ViewKey>('short')
const viewTabs: { key: ViewKey; label: string; desc: string }[] = [
  { key: 'short', label: '短线', desc: '日/周' },
  { key: 'mid', label: '中线', desc: '月/季' },
  { key: 'long', label: '长线', desc: '年' }
]
const expandedDecisionPoint = ref<'opportunity' | 'risk' | null>(null)
const policyExpanded = ref(false)

function selectActiveView(key: ViewKey) {
  activeView.value = key
}

// AI 研判 composable（接入真实 trend-score 数据）
const symbolRef = computed(() => symbol.value)
const quoteRef = computed(() => ({ name: quote.value?.name, industry: stockInfo.value?.industry || quote.value?.industry }))
const trendScoreDataRef = computed(() => trendScoreData.value)
const stockAiContextRef = computed(() => ({
  quote: quote.value,
  stockInfo: stockInfo.value,
  semiAnnualReport: semiAnnualReport.value,
  forecastData: forecastData.value,
}))
const {
  midAiAnalysis,
  longAiAnalysis,
  midMockData,
  longMockData,
  trendModel,
  trendVetoed,
  trendVetoReasons,
} = useStockAiAnalysis(symbolRef, quoteRef, trendScoreDataRef, stockAiContextRef)

const visibleNewsList = computed(() => newsExpanded.value ? newsList.value : newsList.value.slice(0, 3))
const visiblePolicyList = computed(() => policyExpanded.value ? longMockData.value.policies : longMockData.value.policies.slice(0, 2))
const policyNeedsExpand = computed(() => (
  longMockData.value.policies.length > 2
  || longMockData.value.policies.some((policy: any) => String(policy.text || '').length > 42)
))

// 资金流向归一化（对齐网页端 capitalFlowInfo）
const capitalFlowInfo = computed(() => {
  const source = capitalFlow.value
  if (!hasRealCapitalFlow(source)) return null
  const orders = (source.orders || []).map((item: any) => ({
    ...item,
    width: Math.max(8, Math.round((Math.abs(Number(item.value) || 0) / Math.max(0.01, ...(source.orders || []).map((o: any) => Math.abs(Number(o.value) || 0)))) * 88)),
  }))
  return {
    ...source,
    tags: [`占比 ${source.ratio}`, `5日 ${formatFlowAmount(source.fiveDay)}`, source.streak || '观察中'],
    orders,
  }
})

function hasRealCapitalFlow(source: any): boolean {
  if (!source || typeof source !== 'object') return false
  const hasNumber = ['mainInflow', 'fiveDay', 'ratio'].some(key => {
    const value = source[key]
    if (value === null || value === undefined || value === '' || value === '--') return false
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''))
    return Number.isFinite(parsed) && parsed !== 0
  })
  const hasList = ['orders', 'trend', 'trendDates'].some(key => Array.isArray(source[key]) && source[key].length > 0)
  const hasText = ['tag', 'streak', 'trendBadge', 'narrative', 'risk'].some(key => {
    const value = String(source[key] || '').trim()
    return value && value !== '--' && !/暂无|加载中|观察中/.test(value)
  })
  return hasNumber || hasList || hasText
}

// 业绩预测详表年份列
const forecastDetailYearKeys = computed<string[]>(() => {
  const details = forecastData.value?.detailIndicators
  if (!Array.isArray(details) || details.length === 0) return []
  const firstRow = details[0]
  return Object.keys(firstRow).filter(k => k.includes('实际值') || k.includes('平均')).sort()
})

const forecastChartItems = computed(() => {
  const predictions = buildForecastChartSource()
  if (!predictions.length) return []
  const parsed = predictions
    .map((item: any) => {
      const value = parseForecastProfit(item.netProfit)
      return {
        year: String(item.year || ''),
        value,
        label: value == null ? '--' : value.toFixed(2),
        kind: item.kind === 'actual' || item.kind === 'forecast' ? item.kind : undefined,
      }
    })
    .filter(item => item.year && item.value != null) as Array<{ year: string; value: number; label: string; kind?: 'actual' | 'forecast' }>
  if (!parsed.length) return []
  const max = Math.max(...parsed.map((item: any) => Math.abs(item.value)), 0.01)
  return parsed.map((item: any) => ({
    ...item,
    height: Math.max(14, Math.round((Math.abs(item.value) / max) * 100)),
  }))
})

const forecastYearRows = computed(() => {
  const rows = Array.isArray(forecastData.value?.predictions) ? forecastData.value.predictions : []
  if (!rows.length) return []
  const parsed = rows
    .slice(0, 3)
    .map((item: any) => {
      const value = parseForecastProfit(item.netProfit)
      return {
        year: String(item.year || ''),
        netProfit: item.netProfit || '--',
        growth: item.growth,
        value: value ?? 0,
        kindClass: item.growth === '--' || item.growth == null ? 'is-forecast' : item.growth >= 0 ? 'is-actual' : 'is-forecast',
        kindText: item.growth === '--' || item.growth == null ? '预测' : item.growth >= 0 ? '改善' : '承压',
        growthText: item.growth === '--' || item.growth == null ? '--' : `${item.growth >= 0 ? '+' : ''}${item.growth}%`,
        growthClass: item.growth === '--' || item.growth == null ? '' : item.growth >= 0 ? 'up' : 'down',
      }
    })
  const max = Math.max(...parsed.map((item: any) => Math.abs(item.value)), 0.01)
  return parsed.map((item: any) => ({
    ...item,
    progress: Math.max(18, Math.round((Math.abs(item.value) / max) * 100)),
  }))
})

const forecastYearKeys = computed(() => {
  const details = forecastData.value?.detailIndicators
  if (!Array.isArray(details) || details.length === 0) return []
  const firstRow = details[0]
  return Object.keys(firstRow)
    .map(key => {
      const actual = key.match(/^(\d{4})-实际值$/)
      if (actual) return { key, year: actual[1], kind: 'actual' }
      const forecast = key.match(/^预测(\d{4})-平均$/)
      if (forecast) return { key, year: forecast[1], kind: 'forecast' }
      return null
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Number(a.year) - Number(b.year)) as Array<{ key: string; year: string; kind: 'actual' | 'forecast' }>
})

function buildForecastChartSource(): Array<{ year: string; netProfit: any; kind?: 'actual' | 'forecast' }> {
  const predictions = forecastData.value?.predictions
  if (Array.isArray(predictions) && predictions.length > 0) {
    return predictions.map((item: any) => ({ year: String(item.year || ''), netProfit: item.netProfit }))
  }

  const details = forecastData.value?.detailIndicators
  if (!Array.isArray(details) || details.length === 0) return []
  const profitRow = details.find((row: any) => String(row['预测指标'] || row.indicator || '').includes('净利润'))
  if (!profitRow) return []
  return forecastYearKeys.value.map(item => ({
    year: item.year,
    netProfit: profitRow[item.key],
    kind: item.kind,
  }))
}

function parseForecastProfit(value: any): number | null {
  if (value === null || value === undefined || value === '--') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value).replace(/,/g, '').trim()
  if (!raw) return null
  const num = Number(raw.replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(num)) return null
  if (raw.includes('万')) return num / 10000
  return num
}

function parseForecastNumber(value: any): number | null {
  if (value === null || value === undefined || value === '--') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value).replace(/,/g, '').trim()
  if (!raw) return null
  const num = Number(raw.replace(/[^\d.-]/g, ''))
  return Number.isFinite(num) ? num : null
}

// 标签展开状态
const expandedTag = ref<string | null>(null)
const expandedTagIdx = ref(0)
function toggleTagExpand(type: string, idx: number) {
  if (expandedTag.value === type && expandedTagIdx.value === idx) {
    expandedTag.value = null
  } else {
    expandedTag.value = type
    expandedTagIdx.value = idx
  }
}

// 趋势股模型因子展开
const expandedDims = reactive(new Set<number>())
function toggleDimExpand(idx: number) {
  if (expandedDims.has(idx)) {
    expandedDims.delete(idx)
  } else {
    expandedDims.add(idx)
  }
}

// AI 分析标签
const aiConclusionClass = computed(() => {
  const c = aiAnalysis.value?.conclusion || ''
  if (c.includes('买入') || c.includes('增持') || c.includes('推荐')) return 'is-bull'
  if (c.includes('卖出') || c.includes('减持')) return 'is-bear'
  return 'is-hold'
})
const logicTags = computed(() => extractTagsFromText(aiAnalysis.value?.coreLogic || ''))
const riskTags = computed(() => extractTagsFromText(aiAnalysis.value?.riskWarning || ''))
const midBasisTags = computed(() => extractTagsFromArray(midAiAnalysis.value.basis))
const midAdviceTags = computed(() => extractTagsFromArray(midAiAnalysis.value.advice))
const midRiskTags = computed(() => extractTagsFromArray(midAiAnalysis.value.riskTips))
const longBasisTags = computed(() => extractTagsFromArray(longAiAnalysis.value.basis))
const longAdviceTags = computed(() => extractTagsFromArray(longAiAnalysis.value.advice))
const longRiskTags = computed(() => extractTagsFromArray(longAiAnalysis.value.riskTips))
const midActionItems = computed(() => {
  const conclusion = String(midAiAnalysis.value.conclusion || '')
  const hasRisk = midRiskTags.value.length > 0
  const isPositive = /看多|买入|增持|积极|继续/.test(conclusion)
  return [
    {
      label: '当前判断',
      value: isPositive
        ? '中线逻辑仍可跟踪，但需要继续等业绩和行业数据验证。'
        : '中线信号还不够强，先降低预期，等待更明确的基本面确认。',
    },
    {
      label: '下一步验证',
      value: '重点看业绩预期是否上修、行业景气是否延续，以及回调时成交量是否收缩。',
    },
    {
      label: '风险判断',
      value: hasRisk
        ? `如果 ${midRiskTags.value[0]?.tag} 开始兑现，中线逻辑就需要降级。`
        : '如果业绩预期下修、回调放量或行业热度降温，中线逻辑需要降级。',
    },
  ]
})
const longActionItems = computed(() => {
  const score = Number(trendModel.value?.score || 0)
  const hasVeto = Boolean(trendModel.value?.isVetoed)
  const risk = longRiskTags.value[0]?.tag
  return [
    {
      label: '长期判断',
      value: hasVeto
        ? '当前存在一票否决项，不适合直接放入长期核心池。'
        : score >= 75
          ? '具备长期观察价值，但仍要确认盈利质量和行业空间能否持续。'
          : '长期确定性还不充分，更适合作为观察池标的。',
    },
    {
      label: '长期跟踪',
      value: '重点跟踪 ROE、收入增速、利润率、竞争格局和估值消化情况。',
    },
    {
      label: '移出条件',
      value: risk
        ? `如果 ${risk} 兑现，或收入增速和利润率连续走弱，应降低长期关注级别。`
        : '如果增长放缓、利润率下滑、竞争格局恶化或估值明显透支，应降低长期关注级别。',
    },
  ]
})
const latestMajorEvent = computed(() => stockEvents.value[0] || null)
const displayedStockEvents = computed(() => {
  const latestKey = getEventIdentity(latestMajorEvent.value)
  return stockEvents.value.filter((event, index) => index !== 0 && getEventIdentity(event) !== latestKey)
})
const majorEventImpactClass = computed(() => {
  const impact = getEventImpact(latestMajorEvent.value)
  if (impact.includes('利好')) return 'is-positive'
  if (impact.includes('利空')) return 'is-negative'
  return 'is-neutral'
})

const legacyOverallDecision = computed(() => {
  const conclusion = String(aiAnalysis.value?.conclusion || '').trim()
  const changePercent = toDecisionNumber(quote.value?.changePercent)
  const score = Number(trendModel.value?.score || 0)
  const capital = capitalFlowInfo.value || {}
  const flow = Number(capital.mainInflow || 0)
  const fiveDayFlow = toDecisionNumber(capital.fiveDay)
  const flowText = [
    capital.tag,
    capital.tagClass,
    capital.streak,
    capital.trendBadge,
    capital.narrative,
    capital.risk,
  ].map(item => String(item || '')).join(' ')
  const isBearishFlow = flow < 0
    || (fiveDayFlow !== null && fiveDayFlow < 0)
    || /bear|流出|撤离|连卖|派发|减仓|接盘|承压|破位/.test(flowText)
  const isBullishFlow = flow > 0
    && !isBearishFlow
    && (changePercent === null || changePercent >= 0)
  const majorImpact = getEventImpact(latestMajorEvent.value)
  const majorSummary = String(latestMajorEvent.value?.summary || '')
  const isBearishEvent = majorImpact.includes('利空')
    || /骤降|下跌|走弱|回落|承压|破位|风险|利空|减仓|流出|撤离/.test(majorSummary)
  const hasBearSignal = majorImpact.includes('利空')
    || /看空|卖出|利空|回避/.test(conclusion)
    || isBearishEvent
    || isBearishFlow
    || (changePercent !== null && changePercent <= -5)
  const hasBullSignal = majorImpact.includes('利好')
    || /看多|买入|利好/.test(conclusion)
    || score >= 75
    || isBullishFlow

  let status = '等待确认'
  let statusClass = 'is-neutral'
  if (hasBearSignal) {
    status = '控制风险'
    statusClass = 'is-risk'
  } else if (hasBullSignal) {
    status = '继续跟踪'
    statusClass = 'is-positive'
  }

  const horizon = String(latestMajorEvent.value?.ai_horizon || latestMajorEvent.value?.cycle || '')
  let period = '中线跟踪'
  if (/短|short/i.test(horizon) || (changePercent !== null && Math.abs(changePercent) >= 5)) period = '短线观察'
  if (/长|long/i.test(horizon) || score >= 82) period = '长线观察'

  const hasMixedSignal = hasBearSignal && hasBullSignal
  const hasPositiveSignal = hasBullSignal
  const opportunitySource = hasPositiveSignal
    ? ((majorImpact.includes('利好') && getEventDecisionPoint(latestMajorEvent.value, '机会'))
      || (isBullishFlow && getFlowOpportunityPoint(capital))
      || logicTags.value[0]?.tag
      || (conclusion ? `短线资讯分析：${conclusion}` : '')
      || trendModel.value?.description)
    : ''
  const riskSource = (isBearishEvent && getEventDecisionPoint(latestMajorEvent.value, '风险'))
    || (isBearishFlow && getFlowDecisionPoint(capital))
    || riskTags.value[0]?.tag
    || capital.risk
    || '留意趋势破坏和消息兑现风险'

  let summary = '当前信号还不够明确，暂不急于操作，继续观察资金、趋势和消息变化。'
  let nextStep = '先观察资金承接和价格位置'
  if (hasBearSignal) {
    summary = hasMixedSignal && isBearishFlow
      ? '短线资讯或事件逻辑偏利好，但主力资金仍在流出，当前不能只按利好处理，先看资金是否回流承接。'
      : isBearishFlow
      ? '主力资金持续流出或出现派发迹象，当前先按风险处理，等待资金流出收敛后再判断。'
      : changePercent !== null && changePercent <= -5
      ? '跌幅已经偏大，短线先控制风险，等待价格企稳和资金回流后再判断。'
      : '出现利空或偏弱信号，当前不宜加仓，先观察风险是否继续扩散。'
    nextStep = hasMixedSignal && isBearishFlow
      ? '利好先看资金是否回流承接'
      : isBearishFlow
      ? '先看主力流出是否收敛'
      : changePercent !== null && changePercent <= -5
      ? '等价格企稳和资金回流'
      : '先看利空是否继续扩散'
  } else if (hasBullSignal) {
    summary = flow > 0
      ? '资金和趋势仍有支撑，可以继续跟踪，但买点需要等待回踩或放量确认。'
      : '逻辑上有积极信号，可以纳入观察，但是否介入仍要看价格位置。'
    nextStep = flow > 0
      ? '等回踩企稳或放量确认'
      : '先看价格位置和量能配合'
  }

  if (majorImpact.includes('利好')) {
    nextStep = '重点看利好后的资金承接'
  } else if (majorImpact.includes('利空')) {
    nextStep = '先确认利空影响是否扩散'
  } else if (!hasBearSignal && period.includes('长')) {
    nextStep = '跟踪模型评分和基本面变化'
  } else if (!hasBearSignal && period.includes('中')) {
    nextStep = '跟踪趋势延续和业绩预期'
  }

  return {
    status,
    statusClass,
    period,
    summary,
    nextStep,
    opportunity: opportunitySource ? toPlainDecisionPoint(opportunitySource, '') : '',
    risk: toPlainDecisionPoint(riskSource, '警惕冲高回落、趋势破位或利好兑现后的承接不足'),
  }
})

const overallDecision = computed(() => {
  const conclusion = String(aiAnalysis.value?.conclusion || '').trim()
  const changePercent = toDecisionNumber(quote.value?.changePercent)
  const capital = capitalFlowInfo.value
  const flow = capital ? Number(capital.mainInflow || 0) : 0
  const fiveDayFlow = capital ? toDecisionNumber(capital.fiveDay) : null
  const flowText = capital
    ? [
      capital.tag,
      capital.tagClass,
      capital.streak,
      capital.trendBadge,
      capital.narrative,
      capital.risk,
    ].map(item => String(item || '')).join(' ')
    : ''
  const hasUnconfirmedFlowSignal = /观察中|未确认|待确认|分歧|承接不足|承接偏弱|承压|转弱/.test(flowText)
  const hasBullishFlowSignal = Boolean(capital) && !hasUnconfirmedFlowSignal && (
    flow > 0
    || (fiveDayFlow !== null && fiveDayFlow > 0)
    || /bull|净流入|连买|增仓|加仓|吸筹|回流|承接改善/.test(flowText)
  )
  const isBearishFlow = Boolean(capital) && (
    flow < 0
    || (fiveDayFlow !== null && fiveDayFlow < 0)
    || /bear|净流出|流出|撤离|连卖|派发|减仓|破位|承接不足|承接偏弱|承压|转弱/.test(flowText)
  )
  const isBullishFlow = hasBullishFlowSignal && !isBearishFlow
  const majorImpact = getEventImpact(latestMajorEvent.value)
  const majorSummary = String(latestMajorEvent.value?.summary || latestMajorEvent.value?.title || '')
  const isBearishEvent = majorImpact.includes('利空')
    || /下跌|走弱|回落|承压|破位|风险|利空|减仓|流出|撤离|亏损|下修|处罚|问询/.test(majorSummary)
  const isBullishEvent = majorImpact.includes('利好')
    || /上涨|走强|突破|利好|增长|中标|订单|回购|增持|预增/.test(majorSummary)
  const forecastYoy = toDecisionNumber(forecastData.value?.netProfitYoy)
  const revenueYoy = toDecisionNumber(semiAnnualReport.value?.total_revenue_yoy)
  const profitYoy = toDecisionNumber(semiAnnualReport.value?.n_income_yoy ?? semiAnnualReport.value?.n_income_attr_p_yoy)
  const trend = trendModel.value || {}
  const trendScore = Number(trend.score || 0)
  const opportunitySignals: string[] = []
  const riskSignals: string[] = []
  const isBullishConclusion = /看多|买入|增持|利好|积极|推荐/.test(conclusion)
  const isBearishConclusion = /看空|卖出|减持|利空|回避|谨慎/.test(conclusion)
  const hasHardShortRisk = isBearishEvent || isBearishConclusion || (changePercent !== null && changePercent <= -5)
  const hasShortOpportunity = isBullishEvent || isBullishConclusion || isBullishFlow

  if (!hasHardShortRisk && isBullishEvent) opportunitySignals.push(buildPeriodSignal('短线', getEventDecisionPoint(latestMajorEvent.value, '机会')))
  if (!hasHardShortRisk && isBullishConclusion) opportunitySignals.push(buildPeriodSignal('短线', getConclusionDecisionPoint(conclusion, '机会')))
  if (!hasHardShortRisk && isBullishFlow) opportunitySignals.push(buildPeriodSignal('短线', getFlowOpportunityPoint(capital)))
  if (forecastYoy !== null && forecastYoy > 0) opportunitySignals.push(buildPeriodSignal('中线', `业绩预测净利润同比${formatSignedPercent(forecastYoy)}`))
  if (profitYoy !== null && profitYoy > 0) opportunitySignals.push(buildPeriodSignal('中线', `半年度利润同比${formatSignedPercent(profitYoy)}`))
  if (trend.isReal && !trend.isVetoed && trendScore >= 75) opportunitySignals.push(buildPeriodSignal('长线', trend.description || `趋势模型评分${trendScore}分`))

  if (isBearishEvent) riskSignals.push(buildPeriodSignal('短线', getEventDecisionPoint(latestMajorEvent.value, '风险')))
  if (isBearishConclusion) riskSignals.push(buildPeriodSignal('短线', getConclusionDecisionPoint(conclusion, '风险')))
  if (!hasShortOpportunity && isBearishFlow) riskSignals.push(buildPeriodSignal('短线', getFlowDecisionPoint(capital)))
  if (changePercent !== null && changePercent <= -5) riskSignals.push(buildPeriodSignal('短线', `股价单日跌幅${formatSignedPercent(changePercent)}，先防情绪扩散`))
  if (forecastYoy !== null && forecastYoy < 0) riskSignals.push(buildPeriodSignal('中线', `业绩预测净利润同比${formatSignedPercent(forecastYoy)}`))
  if (revenueYoy !== null && revenueYoy < 0) riskSignals.push(buildPeriodSignal('中线', `半年度营收同比${formatSignedPercent(revenueYoy)}`))
  if (profitYoy !== null && profitYoy < 0) riskSignals.push(buildPeriodSignal('中线', `半年度利润同比${formatSignedPercent(profitYoy)}`))
  if (trend.isVetoed || isBearishTrendSignal(trend)) riskSignals.push(buildPeriodSignal('长线', trend.aiConclusion || trend.description || '趋势模型提示需留意'))

  const opportunity = summarizeDecisionSignals(dedupeStrings(opportunitySignals))
  const risk = summarizeDecisionSignals(dedupeStrings(riskSignals))
  const hasBullSignal = Boolean(opportunity)
  const hasBearSignal = Boolean(risk)
  let status = '等待确认'
  let statusClass = 'is-neutral'
  if (hasBearSignal && !hasBullSignal) {
    status = '控制风险'
    statusClass = 'is-risk'
  } else if (hasBullSignal && !hasBearSignal) {
    status = '继续跟踪'
    statusClass = 'is-positive'
  }

  const summary = hasBullSignal && hasBearSignal
    ? '短中长线信号不完全一致，先按风险约束仓位，再看利好是否被资金和业绩继续验证。'
    : hasBearSignal
      ? '短中长线当前主要看到利空或走弱信号，先控制风险，等待风险收敛。'
      : hasBullSignal
        ? '短中长线当前有利好线索，可以继续跟踪，但仍要等价格和资金确认。'
        : '暂无可确认的短中长线利好或利空信号，先等待真实数据更新。'
  const nextStep = hasBearSignal
    ? '先看利空是否扩散、资金是否止流'
    : hasBullSignal
      ? '看利好后的资金承接和业绩验证'
      : '等待异动、资金、财报或趋势模型更新'

  const baseDecision = legacyOverallDecision.value
  return {
    status: baseDecision.status,
    statusClass: baseDecision.statusClass,
    period: baseDecision.period,
    summary: baseDecision.summary,
    nextStep: baseDecision.nextStep,
    opportunity,
    risk,
  }
})

function toggleDecisionPoint(type: 'opportunity' | 'risk') {
  expandedDecisionPoint.value = expandedDecisionPoint.value === type ? null : type
}

function getEventIdentity(event: any): string {
  if (!event) return ''
  return [
    event.id,
    event.event_id,
    event.title || event.summary || event.change_type_name,
    event.event_time || event.event_time_display,
  ].filter(Boolean).map(item => String(item).trim()).join('|')
}

function getEventDecisionPoint(event: any, type: '机会' | '风险'): string {
  if (!event) return ''
  const impact = getEventImpact(event) || event.change_type_name || ''
  const title = String(event.summary || event.title || event.change_type_name || '').trim()
  const summary = title ? `，${compactText(title, '', 42)}` : ''
  const direction = type === '机会' ? '利好' : '利空'
  const impactText = impact && impact !== direction ? `：${impact}` : ''
  return `最新异动偏${direction}${impactText}${summary}`
}

function getConclusionDecisionPoint(conclusion: string, type: '机会' | '风险'): string {
  const direction = type === '机会' ? '正面' : '负面'
  const text = compactText(conclusion, '', 24)
  if (!text || text === '利好' || text === '利空') return `资讯研判偏${direction}`
  return `资讯研判偏${direction}：${text}`
}

function getFlowDecisionPoint(capital: any): string {
  const tag = String(capital?.tag || '').trim()
  const streak = String(capital?.streak || '').trim()
  const text = [tag, streak, capital?.risk, capital?.narrative].map(item => String(item || '')).join(' ')
  const flow = toDecisionNumber(capital?.mainInflow)
  const fiveDayFlow = toDecisionNumber(capital?.fiveDay)
  if (flow !== null && flow < 0) return `主力资金净流出${formatAmount(Math.abs(flow))}`
  if (fiveDayFlow !== null && fiveDayFlow < 0) return `近5日资金净流出${formatAmount(Math.abs(fiveDayFlow))}`
  if (/承接不足|承接偏弱|承压|转弱/.test(text)) return '资金承接偏弱，短线先观察是否继续走弱'
  if (/流出|撤离|连卖|派发|减仓|破位/.test(text)) {
    return [tag, streak].filter(value => value && !/观察中|未确认|待确认/.test(value)).join('，') || '资金出现流出或派发迹象'
  }
  return ''
}

function getFlowOpportunityPoint(capital: any): string {
  const tag = String(capital?.tag || '').trim()
  const streak = String(capital?.streak || '').trim()
  const text = [tag, streak, capital?.risk, capital?.narrative].map(item => String(item || '')).join(' ')
  if (/观察中|未确认|待确认|分歧|承接不足|承接偏弱|承压|转弱/.test(text)) return ''
  const parts = [tag, streak].filter(value => value && !/观察中|未确认|待确认/.test(value)).join('、')
  return parts ? `资金面${parts}` : '资金面主力净流入为正'
}

function isBearishTrendSignal(trend: any): boolean {
  if (!trend?.isReal) return false
  const text = [
    trend.description,
    trend.aiConclusion,
    trend.recommendation,
    trend.risk,
    trend.riskTips,
  ].map(item => String(item || '')).join(' ')
  return /一票否决|利空|看空|走弱|下行|下滑|恶化|破位|低迷|退潮|衰退|不及预期|风险/.test(text)
}

function buildPeriodSignal(period: '短线' | '中线' | '长线', text: string): string {
  const plain = stripDecisionPunctuation(compactText(text, '', 42))
  return plain ? `${period}：${plain}` : ''
}

function stripDecisionPunctuation(text: string): string {
  return String(text || '').replace(/[。；;，,\s]+$/g, '').trim()
}

function summarizeDecisionSignals(items: string[]): string {
  const grouped = new Map<string, string[]>()
  items.filter(Boolean).forEach(item => {
    const matched = item.match(/^(短线|中线|长线)：(.+)$/)
    if (!matched) {
      const text = stripDecisionPunctuation(item)
      if (text) grouped.set(text, grouped.get(text) || [])
      return
    }
    const period = matched[1]
    const text = stripDecisionPunctuation(matched[2])
    if (text) grouped.set(period, [...(grouped.get(period) || []), text])
  })
  const clauses = [...grouped.entries()]
    .slice(0, 3)
    .map(([period, texts]) => {
      const text = texts.filter(Boolean).slice(0, 2).join('；')
      return text ? `${period}：${text}` : period
    })
    .filter(Boolean)
  return clauses.join('；')
}

function dedupeStrings(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function formatSignedPercent(value: number): string {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

function compactText(value: any, fallback = '--', maxLength = 72): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return fallback
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function toPlainDecisionPoint(value: any, fallback: string, maxLength = 72): string {
  const text = compactText(value, fallback, maxLength)
  return text
    .replace(/^综合评分解读[:：]?/, '')
    .replace(/^风险[:：]?/, '')
    .replace(/^摘要[:：]?/, '')
    .trim() || fallback
}

function toDecisionNumber(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function getEventImpact(event: any): string {
  return String(event?.ai_impact || event?.level || '').trim()
}

onShow(() => {
  void favoritesStore.fetchFavorites({ silent: true })
})

onLoad((options: any) => {
  symbol.value = options?.symbol || ''
  if (symbol.value) {
    loadData()
  }
})

async function loadData() {
  loading.value = true
  try {
    const [quoteData, flowData, semiData, newsData, infoData, eventsData, klineRes] = await Promise.allSettled([
      stockApi.getQuote(symbol.value),
      stockApi.getCapitalFlow(symbol.value),
      stockApi.getSemiAnnualReport(symbol.value),
      stockApi.getStockNews(symbol.value, { size: 10 }),
      stockApi.getStockInfos(symbol.value),
      stockApi.getStockEvents(symbol.value, { cycle: 'all', limit: 20 }),
      stockApi.getKLine(symbol.value, { period: klinePeriod.value, count: getKLineCount(klinePeriod.value) }),
    ])
    if (quoteData.status === 'fulfilled') {
      quote.value = quoteData.value
    }
    if (flowData.status === 'fulfilled') {
      const flow = flowData.value as any
      capitalFlow.value = flow?.data || flow
    }
    if (semiData.status === 'fulfilled') {
      const semi = semiData.value as any
      semiAnnualReport.value = semi?.data || semi
      disclosureUrl.value = semiAnnualReport.value?.disclosure_url || ''
    }
    if (newsData.status === 'fulfilled') {
      const news = newsData.value as any
      const rawList = Array.isArray(news) ? news : (news?.['个股新闻'] || news?.data?.['个股新闻'] || news?.data || news?.news || [])
      newsExpanded.value = false
      // 归一化中文键名为英文
      newsList.value = rawList.map((n: any) => ({
        id: n['ID'] || n.id || '',
        title: n['标题'] || n.title || '',
        summary: n['内容'] || n.content || n.summary || '',
        content: n['内容'] || n.content || '',
        url: n['链接'] || n.url || '',
        source: n['来源'] || n.source || '财联社',
        publishTime: n['时间'] || n.publish_time || n.time || '',
      }))
    }
    if (infoData.status === 'fulfilled' && infoData.value) {
      stockInfo.value = infoData.value
    }
    if (eventsData.status === 'fulfilled') {
      stockEvents.value = Array.isArray(eventsData.value) ? eventsData.value : []
    }
    if (klineRes.status === 'fulfilled') {
      klineData.value = Array.isArray(klineRes.value) ? klineRes.value : []
    }
    // 非阻塞加载 AI 分析、业绩预测和趋势股评分
    loadAiAnalysis()
    loadForecast(false)
    loadTrendScore()
  } catch (err) {
    console.error('[StockDetail] load error:', err)
  } finally {
    loading.value = false
  }
}

async function loadTrendScore() {
  if (!symbol.value) return
  trendLoading.value = true
  try {
    const res = await stockApi.getTrendScore(symbol.value)
    trendScoreData.value = res
  } catch {
    // 获取失败时尝试刷新接�?
    try {
      const refreshRes = await stockApi.refreshTrendScore(symbol.value)
      trendScoreData.value = refreshRes
    } catch {
      trendScoreData.value = null
    }
  } finally {
    trendLoading.value = false
  }
}

function getKLineCount(period: KLinePeriod): number {
  if (period === 'monthly') return 240
  if (period === 'weekly') return 50
  return 60
}

async function handleKLinePeriodChange(period: KLinePeriod) {
  if (klinePeriod.value === period || !symbol.value) return
  klinePeriod.value = period
  await loadKLineData()
}

async function loadKLineData() {
  if (!symbol.value) return
  klineLoading.value = true
  try {
    const data = await stockApi.getKLine(symbol.value, {
      period: klinePeriod.value,
      count: getKLineCount(klinePeriod.value),
    })
    klineData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[StockDetail] kline load error:', err)
    klineData.value = []
  } finally {
    klineLoading.value = false
  }
}

async function loadEvaluationHistory(page = 1) {
  if (!symbol.value) return
  historyLoading.value = true
  try {
    const res: any = await stockApi.getStockAnalysisHistory(symbol.value, { page, pageSize: historyPagination.value.pageSize })
    const data = res?.data || res
    historyRecords.value = Array.isArray(data?.['历史评价'] || data?.history) ? (data?.['历史评价'] || data?.history) : []
    historyPagination.value = {
      page: Number(data?.['当前页'] || data?.page) || page,
      pageSize: Number(data?.['每页数量'] || data?.pageSize) || historyPagination.value.pageSize,
      total: Number(data?.['总数量'] || data?.total) || historyRecords.value.length,
      totalPages: Number(data?.['总页数'] || data?.totalPages) || 1,
    }
  } catch {
    historyRecords.value = []
  } finally {
    historyLoading.value = false
  }
}

async function openHistoryDialog() {
  historyVisible.value = true
  selectedHistoryRecord.value = null
  await loadEvaluationHistory(1)
}

function openHistoryDetail(record: any) {
  selectedHistoryRecord.value = record ? {
    analysisTime: record.analysisTime || record['分析时间'] || '',
    conclusion: record.conclusion || record['结论'] || '',
    coreLogic: record.coreLogic || record['核心逻辑'] || '',
    riskWarning: record.riskWarning || record['风险提示'] || '',
  } : null
}

function closeHistoryDialog() {
  historyVisible.value = false
  selectedHistoryRecord.value = null
}

async function loadAiAnalysis() {
  aiLoading.value = true
  aiAnalysis.value = {}
  try {
    const res: any = await stockApi.getStockAnalysis(symbol.value)
    const data = res?.data || res
    aiAnalysis.value = {
      conclusion: data?.['结论'] || data?.conclusion || '',
      coreLogic: data?.['核心逻辑'] || data?.core_logic || '',
      riskWarning: data?.['风险提示'] || data?.risk_warning || '',
      analysisDate: data?.['分析时间'] || data?.analysis_time || '',
    }
  } catch {
    try {
      const createRes: any = await stockApi.createStockAnalysis(symbol.value)
      const data = createRes?.data || createRes
      aiAnalysis.value = {
        conclusion: data?.['结论'] || data?.conclusion || '',
        coreLogic: data?.['核心逻辑'] || data?.core_logic || '',
        riskWarning: data?.['风险提示'] || data?.risk_warning || '',
        analysisDate: data?.['分析时间'] || data?.analysis_time || '',
      }
    } catch {
      aiAnalysis.value = null
    }
  } finally {
    aiLoading.value = false
  }
}

async function refreshAiAnalysis() {
  if (!symbol.value) return
  aiLoading.value = true
  aiAnalysis.value = {}
  try {
    const res: any = await stockApi.createStockAnalysis(symbol.value)
    const data = res?.data || res
    aiAnalysis.value = {
      conclusion: data?.['结论'] || data?.conclusion || '',
      coreLogic: data?.['核心逻辑'] || data?.core_logic || '',
      riskWarning: data?.['风险提示'] || data?.risk_warning || '',
      analysisDate: data?.['分析时间'] || data?.analysis_time || '',
    }
    uni.showToast({ title: '已刷新', icon: 'none' })
  } catch {
    uni.showToast({ title: '刷新失败', icon: 'none' })
  } finally {
    aiLoading.value = false
  }
}

async function loadForecast(refresh: boolean) {
  forecastLoading.value = true
  try {
    let res: any = null
    if (refresh) {
      res = await stockApi.createForecast(symbol.value)
    } else {
      try {
        res = await stockApi.getForecast(symbol.value)
      } catch {
        res = await stockApi.createForecast(symbol.value)
      }
    }
    const data = res?.data || res
    forecastData.value = data
  } catch {
    forecastData.value = null
  } finally {
    forecastLoading.value = false
  }
}

function formatAiDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

function formatFlowAmount(val: number): string {
  if (val == null || isNaN(val)) return '--'
  const absVal = Math.abs(val)
  if (absVal >= 10000) return (val / 10000).toFixed(2) + '万亿'
  if (absVal >= 1) return val.toFixed(2) + '亿'
  return (val * 100).toFixed(0) + '万'
}

function formatFlowValue(val: number): string {
  if (val == null || isNaN(val)) return '--'
  return formatFlowAmount(val)
}

// 趋势股评分颜色
function tenxScoreColor(score: number): string {
  if (score >= 75) return '#22c55e'
  if (score >= 55) return '#eab308'
  return '#ef4444'
}

function tenxScoreClass(score: number): string {
  if (score >= 75) return 'is-high'
  if (score >= 55) return 'is-mid'
  return 'is-low'
}

function openNews(news: any) {
  const url = news.url || news.link || news.source_url
  if (url) {
    // #ifdef H5
    window.open(url, '_blank')
    // #endif
    // #ifndef H5
    uni.navigateTo({ url: `/modules/chat/pages/webview?url=${encodeURIComponent(url)}` })
    // #endif
  } else {
    uni.showToast({ title: '暂无详情', icon: 'none' })
  }
}

async function toggleFavorite() {
  if (!quote.value || favoritesStore.isPending(symbol.value)) return
  const changed = isFavorite.value
    ? await favoritesStore.remove(symbol.value)
    : await favoritesStore.add(symbol.value, quote.value.name || '')
  if (changed) {
    uni.showToast({ title: isFavorite.value ? '已加入自选' : '已移除自选', icon: 'none' })
  }
}

function formatEventTime(time: string | Date): string {
  if (!time) return ''
  const str = String(time).replace('T', ' ')
  // YYYY-MM-DD HH:mm:ss -> MM-DD HH:mm
  const match = str.match(/\d{4}-(\d{2})-(\d{2}) (\d{2}:\d{2})/)
  if (match) return `${match[1]}-${match[2]} ${match[3]}`
  return str.substring(5, 16) || str
}

function formatVolume(vol: number): string {
  if (!vol) return '--'
  if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿股'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万股'
  return vol + '手'
}

function formatVolumeValue(vol: number): string {
  if (!vol) return '--'
  if (vol >= 100000000) return (vol / 100000000).toFixed(2)
  if (vol >= 10000) return (vol / 10000).toFixed(2)
  return String(vol)
}

function formatVolumeUnit(vol: number): string {
  if (!vol) return ''
  if (vol >= 100000000) return '亿股'
  if (vol >= 10000) return '万股'
  return '手'
}

function formatAmount(amt: number): string {
  if (!amt) return '--'
  if (Math.abs(amt) >= 100000000) return (amt / 100000000).toFixed(2) + '亿'
  if (Math.abs(amt) >= 10000) return (amt / 10000).toFixed(2) + '万'
  return amt.toFixed(2) + '元'
}

function formatMarketValue(value: any): string {
  if (value === null || value === undefined || value === '') return '--'
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '--'
  const yuanValue = Math.abs(num) < 100000000 ? num * 10000 : num
  return formatAmount(yuanValue)
}

function formatSemiAmount(amt: number): string {
  if (!amt) return '--'
  const yi = Math.abs(amt) / 100000000
  if (yi >= 1) return yi.toFixed(2) + '亿'
  const wan = Math.abs(amt) / 10000
  if (wan >= 1) return wan.toFixed(2) + '万'
  return amt.toFixed(2) + '元'
}

function formatGrowth(val: number | null): string {
  if (val === null || val === undefined) return '--'
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(2)}%`
}

function growthClass(val: number | null): string {
  if (val === null || val === undefined) return ''
  return val >= 0 ? 'up' : 'down'
}

function openDisclosureUrl() {
  if (disclosureUrl.value) {
    // #ifdef H5
    window.open(disclosureUrl.value, '_blank')
    // #endif
    // #ifndef H5
    uni.setClipboardData({
      data: disclosureUrl.value,
      success: () => {
        uni.showToast({ title: '链接已复制', icon: 'none' })
      },
    })
    // #endif
  }
}

function goChat() {
  const name = quote.value?.name || symbol.value
  const q = `帮我分析一下${name}(${symbol.value})的最新行情和投资建议`
  uni.navigateTo({ url: `/modules/chat/pages/index?q=${q}` })
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.page-detail {
  padding: 24rpx;
  background: $bg-soft;
  box-sizing: border-box;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
}

.loading, .empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.loading-text, .empty-text {
  font-size: 28rpx;
  color: $ink-mute;
}

/* 股票头部 */
.stock-header {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 32rpx;
  margin-bottom: 16rpx;
}

.stock-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.stock-name {
  font-size: 36rpx;
  font-weight: 600;
  color: $ink;
}

.stock-code {
  font-size: 24rpx;
  color: $ink-mute;
  padding: 4rpx 16rpx;
  background: $line-soft;
  border-radius: 8rpx;
}

.favorite-toggle {
  margin-left: auto;
  min-width: 104rpx;
  padding: 10rpx 18rpx;
  color: $brand-color;
  font-size: $font-size-sm;
  text-align: center;
  border: 1rpx solid $brand-color;
  border-radius: $radius-pill;

  &.active {
    color: $text-color-secondary;
    background: $bg-color-hover;
    border-color: $border-color;
  }

  &.disabled {
    opacity: 0.5;
  }
}

.stock-price-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.stock-price {
  font-size: 44rpx;
  font-weight: 700;

  &.up { color: $up; }
  &.down { color: $down; }
}

.stock-change-box {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;

  &.up-bg { background: rgba(244, 63, 94, 0.1); }
  &.down-bg { background: rgba(34, 197, 94, 0.1); }
}

.stock-change-text {
  font-size: 26rpx;
  font-weight: 500;

  &.up { color: $up; }
  &.down { color: $down; }
}

.stock-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.stock-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx;
  background: $bg-soft;
  border-radius: 8rpx;

  .tag-label {
    font-size: 22rpx;
    color: $ink-faint;
  }

  .tag-value {
    font-size: 24rpx;
    color: $ink-soft;
  }
}

/* 涨跌�?*/
.limit-inline {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: $bg-card;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.limit-inline-label {
  font-size: 26rpx;
  color: $ink-mute;

  .up { color: $up; font-weight: 600; }
  .down { color: $down; font-weight: 600; }
}

.limit-inline-sep {
  color: $line;
  font-size: 24rpx;
}

/* 综合决策 */
.decision-card,
.major-event-alert {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
}

.decision-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  border-top: 4rpx solid $primary;
}

.decision-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16rpx;
}

.decision-kicker {
  display: block;
  font-size: 28rpx;
  line-height: 1.3;
  font-weight: 800;
  color: $ink;
}

.decision-summary {
  display: block;
  font-size: 28rpx;
  line-height: 1.6;
  font-weight: 600;
  color: $ink-soft;
}

.decision-next {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 18rpx;
  border-radius: 14rpx;
  background: $bg-soft;
}

.next-label {
  flex-shrink: 0;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: $primary-50;
  color: $primary;
  font-size: 22rpx;
  line-height: 1.35;
  font-weight: 800;
}

.next-text {
  min-width: 0;
  color: $ink;
  font-size: 27rpx;
  line-height: 1.45;
  font-weight: 700;
}

.decision-verdict {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.decision-status {
  padding: 6rpx 14rpx;
  border-radius: 10rpx;
  background: $primary-50;
  font-size: 24rpx;
  line-height: 1.35;
  font-weight: 800;

  &.is-positive {
    color: $up;
    background: $up-soft;
  }

  &.is-neutral {
    color: $primary;
    background: $primary-50;
  }

  &.is-risk {
    color: $down;
    background: $down-soft;
  }
}

.decision-period {
  padding: 6rpx 12rpx;
  border-radius: 10rpx;
  background: $bg-deep;
  color: $ink-soft;
  font-size: 22rpx;
  line-height: 1.35;
  font-weight: 700;
}

.decision-points {
  display: flex;
  flex-direction: column;
  border-top: 1rpx solid $line-soft;
}

.decision-point {
  display: grid;
  grid-template-columns: 64rpx minmax(0, 1fr) 56rpx;
  gap: 14rpx;
  align-items: start;
  padding: 18rpx 0;
  border-bottom: 1rpx solid $line-soft;

  &.is-risk {
    .point-label {
      color: $down;
      background: $down-soft;
    }
  }

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
}

.point-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56rpx;
  height: 38rpx;
  border-radius: 8rpx;
  background: $up-soft;
  font-size: 24rpx;
  line-height: 1.4;
  font-weight: 800;
  color: $up;
}

.point-more {
  flex-shrink: 0;
  font-size: 22rpx;
  line-height: 38rpx;
  font-weight: 700;
  text-align: right;
  color: $ink-mute;
}

.point-text {
  display: -webkit-box;
  overflow: hidden;
  font-size: 26rpx;
  line-height: 1.55;
  font-weight: 600;
  color: $ink-soft;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;

  &.expanded {
    display: block;
    overflow: visible;
    -webkit-line-clamp: unset;
  }
}

.major-event-alert {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-top: 18rpx;
  padding-bottom: 18rpx;
  border-left: 6rpx solid $primary;

  &.is-muted {
    background: $bg-soft;
    border-left-color: $line-strong;
  }
}

.major-event-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.major-impact {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border: 1rpx solid;
  border-radius: 8rpx;
  font-size: 22rpx;
  line-height: 1.4;
  font-weight: 800;

  &.is-positive {
    color: $up;
    border-color: #fecaca;
    background: $up-soft;
  }

  &.is-negative {
    color: $down;
    border-color: #bbf7d0;
    background: $down-soft;
  }

  &.is-neutral {
    color: $ink-mute;
    border-color: $line-strong;
    background: $bg-soft;
  }
}

.major-event-title {
  display: block;
  font-size: 26rpx;
  line-height: 1.5;
  font-weight: 600;
  color: $ink-soft;
}

.major-event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 2rpx;

  text {
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    background: $bg-deep;
    color: $ink-mute;
    font-size: 22rpx;
    line-height: 1.4;
    font-weight: 700;
  }
}

/* 周期切换 Tabs */
.view-tabs {
  display: flex;
  height: 120rpx;
  margin-bottom: 20rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  overflow: hidden;
  box-sizing: border-box;
}

.view-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 100%;
  padding: 0 8rpx;
  background: $bg-card;
  border-bottom: 4rpx solid transparent;
  box-sizing: border-box;

  &:not(:last-child) {
    border-right: 1rpx solid $line-soft;
  }

  &:active {
    background: $bg-soft;
  }

  &.is-active {
    background: $primary-50;
    border-bottom-color: $brand-color;

    .tab-label { color: $brand-color; }
    .tab-desc { color: $brand-color; }
  }
}

.tab-label {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $ink-mute;
  line-height: 1.4;
  text-align: center;
}

.tab-desc {
  display: block;
  font-size: 22rpx;
  color: $ink-mute;
  margin-top: 4rpx;
  line-height: 1.4;
  text-align: center;
}

.view-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

/* AI 研判卡片 */
.ai-analysis-card {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 28rpx;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.ai-refresh-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $bg-soft;

  &:active { background: $bg-deep; }
}

.refresh-icon {
  font-size: 28rpx;
  color: $brand-color;
}

.ai-loading {
  padding: 24rpx 0;
  text-align: center;
}

.ai-loading-text {
  font-size: 26rpx;
  color: $ink-faint;
}

.ai-empty {
  padding: 40rpx 0;
  text-align: center;
}

.ai-empty-text {
  font-size: 26rpx;
  color: $ink-faint;
}

.ai-conclusion {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.conclusion-badge {
  font-size: 36rpx;
  font-weight: 700;

  &.is-bull { color: $up; }
  &.is-bear { color: $down; }
  &.is-hold { color: $primary; }
}

.analysis-date {
  font-size: 22rpx;
  color: $ink-faint;
}

.ai-logic {
  margin-bottom: 20rpx;
}

.ai-logic-text {
  font-size: 28rpx;
  color: $ink-soft;
  line-height: 1.7;
}

.ai-section {
  margin-bottom: 20rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.ai-section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink-soft;
  margin-bottom: 12rpx;
  display: block;

  &.risk { color: $up-deep; }
}

.research-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.research-tag {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 20rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  font-weight: 500;

  &:active {
    opacity: 0.7;
  }

  &.is-logic {
    background: rgba(59, 130, 246, 0.08);
    color: $primary;
    border: 1rpx solid rgba(59, 130, 246, 0.25);

    &.is-expanded { background: rgba(59, 130, 246, 0.15); }
  }

  &.is-basis {
    background: rgba(99, 102, 241, 0.08);
    color: $primary;
    border: 1rpx solid rgba(99, 102, 241, 0.25);

    &.is-expanded { background: rgba(99, 102, 241, 0.15); }
  }

  &.is-advice {
    background: rgba(34, 197, 94, 0.08);
    color: $down;
    border: 1rpx solid rgba(34, 197, 94, 0.25);

    &.is-expanded { background: rgba(34, 197, 94, 0.15); }
  }

  &.is-risk {
    background: rgba(239, 68, 68, 0.08);
    color: $up;
    border: 1rpx solid rgba(239, 68, 68, 0.25);

    &.is-expanded { background: rgba(239, 68, 68, 0.15); }
  }
}

.research-tag-text {
  line-height: 1.4;
}

.tag-detail {
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
  border-left: 4rpx solid $primary;

  &.basis { border-left-color: $primary; }
  &.advice { border-left-color: $down; }
  &.risk { border-left-color: $up; }
}

.tag-detail-text {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.6;
}

/* 通用卡片 */
.section-card {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 20rpx;
  display: block;
}

.action-card {
  border-left: 6rpx solid $primary;
}

.short-action-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.short-action-item {
  display: grid;
  grid-template-columns: 132rpx minmax(0, 1fr);
  gap: 16rpx;
  align-items: center;
  min-width: 0;
  padding: 18rpx 20rpx;
  border-radius: 14rpx;
  background: $bg-soft;
  border: 1rpx solid $line-soft;
}

.action-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40rpx;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: $primary-50;
  color: $primary;
  font-size: 23rpx;
  line-height: 1.35;
  font-weight: 800;
}

.action-value {
  display: block;
  min-width: 0;
  font-size: 27rpx;
  line-height: 1.5;
  color: $ink;
  font-weight: 700;
}

.ai-action-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin: 18rpx 0 22rpx;
}

.ai-action-item {
  display: grid;
  grid-template-columns: 128rpx minmax(0, 1fr);
  gap: 14rpx;
  align-items: start;
  padding: 16rpx 18rpx;
  border-radius: 14rpx;
  background: $bg-soft;
  border: 1rpx solid $line-soft;
}

.ai-action-label {
  color: $primary;
  font-size: 24rpx;
  line-height: 1.45;
  font-weight: 800;
}

.ai-action-text {
  min-width: 0;
  color: $ink-soft;
  font-size: 26rpx;
  line-height: 1.55;
  font-weight: 600;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-sub {
  font-size: 24rpx;
  color: $primary;
  font-weight: 500;
}

/* 个股异动 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.event-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: $primary;
  margin-top: 8rpx;
  flex-shrink: 0;

  &.default { background: $ink-mute; }
}

.event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.event-title {
  font-size: 28rpx;
  color: $ink;
  line-height: 1.4;
}

.event-time {
  font-size: 22rpx;
  color: $ink-faint;
}

/* 交易数据网格 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rpx;
  background: $line;
  border-radius: 12rpx;
  overflow: hidden;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: $bg-card;
}

.detail-label {
  font-size: 26rpx;
  color: $ink-mute;
}

.detail-value {
  font-size: 28rpx;
  color: $ink;
  font-weight: 500;

  &.up { color: $up; }
  &.down { color: $down; }
}

.detail-volume {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 2rpx;
  min-width: 0;
  white-space: nowrap;
}

.detail-value-unit {
  display: inline-block;
  flex-shrink: 0;
  font-size: 18rpx;
  color: $ink-mute;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.is-volume-item {
  gap: 8rpx;
  padding-left: 18rpx;
  padding-right: 14rpx;
}

.is-volume-item .detail-label,
.is-volume-item .detail-volume text {
  flex-shrink: 0;
  white-space: nowrap;
}

.is-volume-item .detail-volume {
  flex: 1;
  font-size: 26rpx;
}

/* 资金流向 */
.flow-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.flow-item {
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
}

.flow-label {
  font-size: 24rpx;
  color: $ink-mute;
  margin-bottom: 8rpx;
}

.flow-value {
  font-size: 30rpx;
  font-weight: 600;

  &.up { color: $up; }
  &.down { color: $down; }
}

.flow-narrative {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: $bg-soft;
  border-radius: 8rpx;
}

.flow-narrative-text {
  font-size: 24rpx;
  color: $ink-mute;
  line-height: 1.5;
}

/* 财报分析 */
.finance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.finance-item {
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
}

.finance-label {
  font-size: 24rpx;
  color: $ink-mute;
  margin-bottom: 8rpx;
}

.finance-value {
  font-size: 32rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 4rpx;
}

.finance-change {
  font-size: 22rpx;
  color: $ink-faint;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

/* 业绩预测 */
.forecast-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.forecast-summary {
  padding: 16rpx;
  background: $bg-soft;
  border-radius: 12rpx;
}

.forecast-summary-text {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.6;
}

.forecast-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.forecast-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
}

.forecast-year {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  min-width: 80rpx;
}

.forecast-value {
  flex: 1;
  font-size: 26rpx;
  color: $ink-soft;
}

.forecast-growth {
  font-size: 26rpx;
  font-weight: 600;

  &.up { color: $up; }
  &.down { color: $down; }
}

/* 趋势股模�?*/
.tenx-card {
  .tenx-hero {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 24rpx;
    background: linear-gradient(135deg, rgba(77, 124, 254, 0.08), rgba(99, 102, 241, 0.04));
    border-radius: 16rpx;
    margin-bottom: 16rpx;
  }

  .tenx-score-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 140rpx;
  }

  .tenx-score {
    font-size: 64rpx;
    font-weight: 700;
    color: $primary;
    line-height: 1;
  }

  .tenx-score-label {
    font-size: 22rpx;
    color: $ink-mute;
    margin-top: 4rpx;
  }

  .tenx-multiple {
    font-size: 24rpx;
    color: $primary;
    font-weight: 500;
    margin-top: 8rpx;
  }

  .tenx-verdict {
    flex: 1;
  }

  .verdict-tag {
    display: inline-block;
    padding: 8rpx 20rpx;
    background: $primary;
    color: $white;
    border-radius: 28rpx;
    font-size: 26rpx;
    font-weight: 600;
  }
}

.tenx-dim-header {
  margin-bottom: 16rpx;
}

.tenx-dim-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink-soft;
}

.tenx-dimensions {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tenx-dim-item {
  border: 1rpx solid $line;
  border-radius: 12rpx;
  overflow: hidden;
  background: $bg-card;
}

.tenx-dim-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg-soft;
}

.tenx-dim-label {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
  flex: 1;
}

.tenx-dim-score {
  font-size: 28rpx;
  font-weight: 700;
  color: $primary;
}

.tenx-dim-weight {
  font-size: 22rpx;
  color: $ink-faint;
}

.tenx-dim-arrow {
  font-size: 24rpx;
  color: $ink-faint;
}

.tenx-dim-body {
  padding: 16rpx 20rpx;
  border-top: 1rpx solid $line-soft;
}

.tenx-dim-question {
  font-size: 24rpx;
  color: $ink-mute;
  line-height: 1.5;
  margin-bottom: 12rpx;
}

.tenx-dim-bar-wrap {
  height: 10rpx;
  background: $line;
  border-radius: 999rpx;
  overflow: hidden;
  margin: 0 20rpx 14rpx;
}

.tenx-dim-bar {
  height: 100%;
  background: linear-gradient(90deg, $primary, $primary);
  border-radius: 999rpx;
}

/* 行业政策 */
.policy-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.policy-item {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $line-soft;

  &:last-child { border-bottom: none; }
}

.policy-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 56rpx;
  height: 34rpx;
  padding: 0 10rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 700;

  &.is-good {
    background: $up-soft;
    color: $up;
  }

  &.is-neutral {
    background: $bg-deep;
    color: $ink-mute;
  }
}

.policy-text {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.65;

  &.is-collapsed {
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

/* 公司护城�?*/
.moat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.moat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
  text-align: center;
}

.moat-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;

  text {
    font-size: 28rpx;
    color: $white;
    font-weight: 700;
  }
}

.moat-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 8rpx;
}

.moat-desc {
  font-size: 22rpx;
  color: $ink-mute;
  line-height: 1.5;
}

/* 年报对比 */
.annual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.annual-item {
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
}

.annual-label {
  font-size: 24rpx;
  color: $ink-mute;
  margin-bottom: 8rpx;
}

.annual-value {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 4rpx;
}

.annual-note {
  font-size: 22rpx;
  color: $ink-faint;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

/* 半年�?*/
.semi-grid {
  margin-bottom: 16rpx;
}

.semi-table {
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid $line;
}

.semi-row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid $line-soft;

  &:last-child {
    border-bottom: none;
  }

  &.semi-header {
    background: $bg-soft;
    font-weight: 600;
  }
}

.semi-cell {
  flex: 1;
  padding: 16rpx 12rpx;
  font-size: 24rpx;
  color: $ink-soft;
  text-align: center;

  &.semi-cell-label {
    flex: 1.2;
    text-align: left;
    padding-left: 16rpx;
    color: $ink-mute;
  }

  &.semi-cell-value {
    font-weight: 500;

    &.up { color: $up; }
    &.down { color: $down; }
  }
}

.semi-empty {
  padding: 40rpx;
  text-align: center;
}

.semi-empty-text {
  font-size: 26rpx;
  color: $ink-faint;
}

.semi-footer {
  border-top: 1rpx solid $line-soft;
  padding-top: 16rpx;
  text-align: center;
}

.semi-link {
  font-size: 26rpx;
  color: $primary;
  font-weight: 500;
}

/* 个股新闻 */
.news-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.news-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid $line-soft;

  &:last-child { border-bottom: none; }
  &:active { opacity: 0.7; }
}

.news-toggle {
  display: flex;
  justify-content: center;
  padding: 14rpx 0 4rpx;
}

.news-toggle-text {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: $bg-deep;
  color: $primary;
  font-size: 24rpx;
  line-height: 1.35;
  font-weight: 700;
}

.news-title {
  font-size: 28rpx;
  color: $ink;
  line-height: 1.4;
  margin-bottom: 6rpx;
}

.news-meta {
  display: flex;
  gap: 12rpx;
}

.news-source {
  font-size: 22rpx;
  color: $ink-mute;
}

.news-time {
  font-size: 22rpx;
  color: $ink-faint;
}

/* AI 投顾入口 */
.ai-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 32rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.1), rgba(99, 102, 241, 0.05));
  border: 1rpx solid rgba(77, 124, 254, 0.2);
  border-radius: $r-md;
}

.ai-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ai-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $ink;
}

.ai-desc {
  font-size: 24rpx;
  color: $ink-mute;
  margin-top: 4rpx;
}

.ai-arrow {
  font-size: 36rpx;
  color: $primary;
}

/* 卡片头部操作�?*/
.card-header-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ai-history-btn {
  padding: 8rpx 20rpx;
  border-radius: 28rpx;
  background: rgba(99, 102, 241, 0.08);
  border: 1rpx solid rgba(99, 102, 241, 0.2);

  &:active { background: rgba(99, 102, 241, 0.15); }
}

.history-icon {
  font-size: 22rpx;
  color: $primary;
  font-weight: 500;
}

/* 资金流向增强 */
.cf-ai-tag-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.cf-ai-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;

  &.is-bullish { background: rgba(244, 63, 94, 0.1); color: $up; }
  &.is-bearish { background: rgba(34, 197, 94, 0.1); color: $down; }
  &.is-neutral { background: rgba(148, 163, 184, 0.1); color: $ink-mute; }
}

.cf-tags-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.cf-tag-mini {
  padding: 4rpx 12rpx;
  background: $bg-soft;
  border-radius: 6rpx;
  font-size: 20rpx;
  color: $ink-mute;
}

.cf-hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.06), rgba(99, 102, 241, 0.03));
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.cf-hero-label {
  font-size: 26rpx;
  color: $ink-mute;
}

.cf-hero-card-value {
  font-size: 36rpx;
  font-weight: 700;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

.cf-orders {
  margin-bottom: 16rpx;
}

.cf-orders-title {
  font-size: 24rpx;
  color: $ink-mute;
  margin-bottom: 12rpx;
  display: block;
}

.cf-order-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.cf-order-label {
  font-size: 24rpx;
  color: $ink-soft;
  min-width: 100rpx;
}

.cf-order-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: $line-soft;
  border-radius: 4rpx;
  overflow: hidden;
}

.cf-order-bar {
  height: 100%;
  border-radius: 4rpx;

  &.is-up { background: linear-gradient(90deg, $up, $up-light); }
  &.is-down { background: linear-gradient(90deg, $down, $down-light); }
}

.cf-order-value {
  font-size: 24rpx;
  font-weight: 600;
  min-width: 100rpx;
  text-align: right;

  &.up { color: $up; }
  &.down { color: $down; }
}

.cf-trend {
  margin-bottom: 16rpx;
}

.cf-trend-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.cf-trend-title {
  font-size: 24rpx;
  color: $ink-mute;
}

.cf-trend-badge {
  padding: 4rpx 12rpx;
  background: rgba(77, 124, 254, 0.1);
  border-radius: 6rpx;
  font-size: 20rpx;
  color: $primary;
}

.cf-trend-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 120rpx;
  padding: 0 4rpx;
}

.cf-trend-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  flex: 1;
}

.cf-trend-bar {
  width: 80%;
  border-radius: 4rpx 4rpx 0 0;
  min-height: 4rpx;

  &.is-up { background: $up; }
  &.is-down { background: $down; }
}

.cf-trend-date {
  font-size: 18rpx;
  color: $ink-faint;
  text-align: center;
}

.flow-narrative-risk {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $up;
  line-height: 1.5;
}

/* 业绩预测增强 */
.forecast-update-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.forecast-update-label {
  font-size: 22rpx;
  color: $ink-faint;
}

.forecast-update-value {
  font-size: 22rpx;
  color: $ink-mute;
}

.forecast-yoy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.forecast-yoy-label {
  font-size: 26rpx;
  color: $ink-soft;
}

.forecast-yoy-value {
  font-size: 32rpx;
  font-weight: 700;

  &.up { color: $up; }
  &.down { color: $down; }
}

.forecast-year-panel {
  padding: 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.forecast-year-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.forecast-year-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink-soft;
}

.forecast-year-unit {
  font-size: 22rpx;
  color: $ink-mute;
}

.forecast-year-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.forecast-year-item {
  padding: 16rpx;
  background: $bg-card;
  border-radius: 12rpx;
  border: 1rpx solid $line-soft;
}

.forecast-year-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.forecast-year-left {
  min-width: 0;
}

.forecast-year-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.forecast-year-label {
  display: block;
  font-size: 26rpx;
  color: $ink-soft;
  font-weight: 600;
}

.forecast-year-kind {
  display: block;
  margin-top: 2rpx;
  font-size: 21rpx;
  color: $ink-mute;

  &.is-actual { color: $primary; }
  &.is-forecast { color: $warning; }
}

.forecast-year-value {
  font-size: 28rpx;
  color: $ink;
  font-weight: 800;
}

.forecast-year-growth {
  font-size: 22rpx;
  font-weight: 700;

  &.up { color: $up; }
  &.down { color: $down; }
}

.forecast-detail-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 16rpx 18rpx;
  margin-top: 14rpx;
  background: $bg-soft;
  border: 1rpx solid $line-soft;
  border-radius: 12rpx;
}

.forecast-detail-toggle-text {
  font-size: 24rpx;
  color: $ink-soft;
  font-weight: 600;
}

.forecast-detail-toggle-icon {
  flex-shrink: 0;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: $primary-50;
  color: $primary;
  font-size: 24rpx;
  line-height: 32rpx;
  text-align: center;
  font-weight: 700;
}

.forecast-progress-track {
  height: 16rpx;
  background: $line;
  border-radius: 999rpx;
  overflow: hidden;
}

.forecast-progress-fill {
  height: 100%;
  min-width: 18rpx;
  border-radius: 999rpx;

  &.is-actual {
    background: linear-gradient(90deg, $primary, $primary-light);
  }

  &.is-forecast {
    background: linear-gradient(90deg, $warning, $warning-light);
  }
}

.forecast-list-header {
  display: flex;
  padding: 12rpx 20rpx;
  background: $line-soft;
  border-radius: 8rpx;
  margin-bottom: 4rpx;
}

.forecast-col-year { flex: 1; font-size: 22rpx; color: $ink-mute; font-weight: 600; }
.forecast-col-profit { flex: 1; font-size: 22rpx; color: $ink-mute; font-weight: 600; text-align: center; }
.forecast-col-growth { flex: 1; font-size: 22rpx; color: $ink-mute; font-weight: 600; text-align: right; }

.forecast-detail-table {
  margin-top: 12rpx;
}

.forecast-detail-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink-soft;
  margin-bottom: 12rpx;
  display: block;
}

.forecast-detail-scroll {
  overflow-x: auto;
  border: 1rpx solid $line;
  border-radius: 12rpx;
  background: $white;
}

.forecast-detail-row {
  display: flex;
  border-bottom: 1rpx solid $line-soft;

  &:last-child { border-bottom: none; }

  &.forecast-detail-head {
    background: $bg-soft;
    font-weight: 600;
  }
}

.forecast-detail-cell {
  flex: 1;
  min-width: 120rpx;
  padding: 12rpx 8rpx;
  font-size: 22rpx;
  color: $ink-soft;
  text-align: center;

  &.forecast-detail-cell-name {
    flex: 1.5;
    min-width: 160rpx;
    text-align: left;
    padding-left: 16rpx;
    color: $ink-mute;
    font-weight: 500;
  }
}

/* 趋势股模型增�?*/
.tenx-real-badge {
  padding: 4rpx 12rpx;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 6rpx;
}

.tenx-real-text {
  font-size: 20rpx;
  color: $down;
  font-weight: 600;
}

.tenx-score {
  &.is-high { color: $down; }
  &.is-mid { color: $warning; }
  &.is-low { color: $up; }
}

.verdict-tag {
  &.is-high { background: $down; }
  &.is-mid { background: $warning; }
  &.is-low { background: $up; }
}

.verdict-text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.5;
}

.tenx-dim-score {
  &.is-high { color: $down; }
  &.is-mid { color: $warning; }
  &.is-low { color: $up; }
}

.tenx-dim-bar {
  &.is-high { background: linear-gradient(90deg, $down, $down); }
  &.is-mid { background: linear-gradient(90deg, $warning, $warning); }
  &.is-low { background: linear-gradient(90deg, $up, $up); }
}

.tenx-ai-conclusion {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.06), rgba(99, 102, 241, 0.03));
  border-radius: 12rpx;
  border-left: 4rpx solid $primary;
}

.tenx-ai-conclusion-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.tenx-ai-conclusion-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  background: $primary;
  color: $white;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tenx-ai-conclusion-label {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink-soft;
}

.tenx-ai-conclusion-text {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.6;
}

.tenx-ind-list {
  margin-top: 12rpx;
}

.tenx-ind-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 0;
  border-bottom: 1rpx solid $bg-soft;

  &:last-child { border-bottom: none; }
}

.tenx-ind-name {
  flex: 1;
  font-size: 22rpx;
  color: $ink-mute;
}

.tenx-ind-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 200rpx;
}

.tenx-ind-value {
  font-size: 22rpx;
  color: $ink;
  font-weight: 500;
  min-width: 80rpx;
  text-align: right;
}

.tenx-ind-bar-track {
  flex: 1;
  height: 8rpx;
  background: $line-soft;
  border-radius: 4rpx;
  overflow: hidden;
}

.tenx-ind-bar-fill {
  height: 100%;
  border-radius: 4rpx;

  &.is-high { background: linear-gradient(90deg, $down, $down); }
  &.is-mid { background: linear-gradient(90deg, $warning, $warning); }
  &.is-low { background: linear-gradient(90deg, $up, $up); }
}

.tenx-ind-score {
  font-size: 22rpx;
  font-weight: 600;
  min-width: 40rpx;
  text-align: right;

  &.is-high { color: $down; }
  &.is-mid { color: $warning; }
  &.is-low { color: $up; }
}

.tenx-data-source {
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $line-soft;
}

.tenx-source-text {
  font-size: 22rpx;
  color: $ink-faint;
}

/* 基本面子维度 */
.tenx-sub-dims {
  margin-top: 16rpx;
  padding: 16rpx;
  background: $bg-soft;
  border-radius: 12rpx;
  border-left: 4rpx solid $primary;
}

.tenx-sub-dims-title {
  font-size: 24rpx;
  font-weight: 600;
  color: $primary-deep;
  margin-bottom: 12rpx;
  display: block;
}

.tenx-sub-dim-item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid $line-soft;

  &:last-child { border-bottom: none; }
}

.tenx-sub-dim-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.tenx-sub-dim-name {
  flex: 1;
  font-size: 24rpx;
  font-weight: 500;
  color: $ink-soft;
}

.tenx-sub-dim-score {
  font-size: 26rpx;
  font-weight: 700;

  &.is-high { color: $down; }
  &.is-mid { color: $warning; }
  &.is-low { color: $up; }
}

.tenx-sub-dim-weight {
  font-size: 20rpx;
  color: $ink-faint;
  padding: 2rpx 8rpx;
  background: $line-soft;
  border-radius: 4rpx;
}

/* 一票否�?*/
.tenx-vetoed {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 20rpx;
  text-align: center;
}

.tenx-vetoed-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.tenx-vetoed-icon-text {
  font-size: 48rpx;
  font-weight: 700;
  color: $up;
}

.tenx-vetoed-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $up;
  margin-bottom: 8rpx;
}

.tenx-vetoed-desc {
  font-size: 26rpx;
  color: $ink-mute;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.tenx-vetoed-reasons {
  width: 100%;
  text-align: left;
}

.tenx-vetoed-reason-item {
  padding: 8rpx 0;
}

.tenx-vetoed-reason-text {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.5;
}

/* 历史 AI 评价弹窗 */
.history-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-dialog {
  width: 90%;
  max-width: 680rpx;
  max-height: 80vh;
  background: $bg-card;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid $line-soft;
}

.history-dialog-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.history-dialog-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $bg-soft;

  &:active { background: $bg-deep; }
}

.close-icon {
  font-size: 24rpx;
  color: $ink-mute;
}

.history-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20rpx 28rpx;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.history-item {
  padding: 16rpx 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;

  &:active { background: $bg-deep; }
}

.history-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.history-item-time {
  font-size: 22rpx;
  color: $ink-faint;
}

.history-item-conclusion {
  font-size: 24rpx;
  font-weight: 600;

  &.is-bull { color: $up; }
  &.is-bear { color: $down; }
  &.is-hold { color: $primary; }
}

.history-item-logic {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.5;
}

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $line-soft;
}

.history-page-btn {
  padding: 8rpx 24rpx;
  background: $bg-soft;
  border-radius: 8rpx;

  text { font-size: 24rpx; color: $primary; }

  &.disabled {
    opacity: 0.4;

    text { color: $ink-faint; }
  }

  &:active:not(.disabled) { background: $bg-deep; }
}

.history-page-info {
  font-size: 24rpx;
  color: $ink-mute;
}

.history-detail-back {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.back-icon {
  font-size: 32rpx;
  color: $primary;
}

.back-text {
  font-size: 24rpx;
  color: $primary;
}

.history-detail-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.history-detail-time {
  font-size: 24rpx;
  color: $ink-faint;
}

.history-detail-conclusion {
  font-size: 28rpx;
  font-weight: 600;

  &.is-bull { color: $up; }
  &.is-bear { color: $down; }
  &.is-hold { color: $primary; }
}

.history-detail-section {
  margin-bottom: 20rpx;
}

.history-detail-section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink-soft;
  margin-bottom: 8rpx;
  display: block;

  &.risk { color: $up-deep; }
}

.history-detail-section-text {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.6;
}
</style>
