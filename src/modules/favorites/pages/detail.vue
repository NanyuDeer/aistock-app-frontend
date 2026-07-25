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

      <!-- 2. 个股异动 -->
      <view v-if="isFavorite && stockEvents.length" class="section-card">
        <text class="section-title">个股异动</text>
        <view class="event-list">
          <view v-for="(evt, idx) in stockEvents" :key="idx" class="event-item">
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
          @tap="activeView = tab.key"
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
                v-for="(news, idx) in newsList"
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
        <view v-if="capitalFlowInfo && (capitalFlowInfo.mainInflow != null || (capitalFlowInfo.orders && capitalFlowInfo.orders.length))" class="section-card">
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
            :orders="capitalFlowInfo.orders || []"
            :trend="capitalFlowInfo.trend || []"
            :trend-dates="capitalFlowInfo.trendDates || []"
            :trend-badge="capitalFlowInfo.trendBadge"
          />
          <!-- AI 叙述 -->
          <view v-if="capitalFlowInfo.narrative" class="flow-narrative">
            <text class="flow-narrative-text">{{ capitalFlowInfo.narrative }}</text>
            <text v-if="capitalFlowInfo.risk" class="flow-narrative-risk">风险：{{ capitalFlowInfo.risk }}</text>
          </view>
        </view>

        <!-- 交易数据 -->
        <view class="section-card">
          <text class="section-title">交易数据</text>
          <view class="detail-grid">
            <view class="detail-item">
              <text class="detail-label">最新价</text>
              <text :class="['detail-value', quote.changePercent >= 0 ? 'up' : 'down']">{{ quote.price.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">均价</text>
              <text class="detail-value">{{ quote.avgPrice.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">涨跌幅</text>
              <text :class="['detail-value', quote.changePercent >= 0 ? 'up' : 'down']">{{ quote.changePercent.toFixed(2) }}%</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">涨跌额</text>
              <text :class="['detail-value', quote.change >= 0 ? 'up' : 'down']">{{ quote.change.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">成交量</text>
              <text class="detail-value">{{ formatVolume(quote.volume) }}</text>
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
              <text class="detail-label">涨停</text>
              <text class="detail-value up">{{ quote.limitUp.toFixed(2) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">跌停</text>
              <text class="detail-value down">{{ quote.limitDown.toFixed(2) }}</text>
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
              <text class="detail-label">振幅</text>
              <text class="detail-value">{{ quote.amplitude.toFixed(2) }}%</text>
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
          <text class="section-title">财报分析</text>
          <view class="finance-grid">
            <view v-for="item in midMockData.finance" :key="item.label" class="finance-item">
              <text class="finance-label">{{ item.label }}</text>
              <text class="finance-value">{{ item.value }}</text>
              <text :class="['finance-change', item.type]">{{ item.change }}</text>
            </view>
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
            <ForecastTrendChart
              v-if="forecastLineCategories.length && forecastLineSeries.length"
              :categories="forecastLineCategories"
              :series="forecastLineSeries"
              :visible="activeView === 'mid'"
            />
            <view v-if="forecastData.predictions && forecastData.predictions.length" class="forecast-list">
              <view class="forecast-list-header">
                <text class="forecast-col-year">年度</text>
                <text class="forecast-col-profit">净利润(亿)</text>
                <text class="forecast-col-growth">增长率</text>
              </view>
              <view v-for="(pred, idx) in forecastData.predictions" :key="idx" class="forecast-item">
                <text class="forecast-year">{{ pred.year }}</text>
                <text class="forecast-value">{{ pred.netProfit }}</text>
                <text
                  v-if="pred.growth !== '--'"
                  :class="['forecast-growth', pred.growth >= 0 ? 'up' : 'down']"
                >
                  {{ pred.growth >= 0 ? '+' : '' }}{{ pred.growth }}%
                </text>
                <text v-else class="forecast-growth">--</text>
              </view>
            </view>
            <!-- 业绩预测详表 -->
            <view v-if="forecastData.detailIndicators && forecastData.detailIndicators.length" class="forecast-detail-table">
              <text class="forecast-detail-title">详细指标预测</text>
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

        <!-- 半年报信息 -->
        <view v-if="semiAnnualReport" class="section-card">
          <view class="section-header">
            <text class="section-title">半年报财务数据</text>
            <text v-if="semiAnnualReport.reports?.length" class="section-sub">
              {{ semiAnnualReport.reports[0]?.end_date?.slice(0, 4) }}年半年报
            </text>
          </view>
          <view class="semi-grid">
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
          </view>
          <view class="semi-footer">
            <text class="semi-link" @tap="openDisclosureUrl">查看完整公告 ></text>
          </view>
        </view>

        <!-- 行业景气指数 -->
        <view class="section-card">
          <text class="section-title">行业景气指数</text>
          <view class="industry-health-head">
            <view class="industry-pills">
              <view v-for="tag in midMockData.industryHealth.tags" :key="tag.text" class="industry-pill">
                <text>{{ tag.text }}</text>
              </view>
            </view>
            <text :class="['industry-score', midMockData.industryHealth.levelClass]">
              {{ midMockData.industryHealth.score }}/100
            </text>
          </view>
          <view class="industry-trend">
            <view class="trend-bars">
              <view
                v-for="(item, idx) in midMockData.industryHealth.trend"
                :key="idx"
                class="trend-bar-wrap"
              >
                <view class="trend-bar" :style="{ height: (item.value * 1.2) + 'rpx' }"></view>
                <text class="trend-month">{{ item.month }}</text>
              </view>
            </view>
          </view>
          <view class="industry-detail-grid">
            <view v-for="detail in midMockData.industryHealth.details" :key="detail.title" class="industry-detail-item">
              <view class="industry-detail-icon">
                <text>{{ detail.icon }}</text>
              </view>
              <text class="industry-detail-title">{{ detail.title }}</text>
              <text class="industry-detail-desc">{{ detail.desc }}</text>
            </view>
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
          <view class="policy-list">
            <view v-for="(policy, idx) in longMockData.policies" :key="idx" class="policy-item">
              <text :class="['policy-tag', policy.type]">{{ policy.tag }}</text>
              <text class="policy-text">{{ policy.text }}</text>
            </view>
          </view>
        </view>

        <!-- 公司护城河 -->
        <view class="section-card">
          <text class="section-title">公司护城河</text>
          <view class="moat-grid">
            <view v-for="moat in longMockData.moats" :key="moat.title" class="moat-item">
              <view class="moat-icon">
                <text>{{ moat.icon }}</text>
              </view>
              <text class="moat-title">{{ moat.title }}</text>
              <text class="moat-desc">{{ moat.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 年报对比 -->
        <view class="section-card">
          <text class="section-title">年报对比</text>
          <view class="annual-grid">
            <view v-for="item in longMockData.annual" :key="item.label" class="annual-item">
              <text class="annual-label">{{ item.label }}</text>
              <text class="annual-value">{{ item.value }}</text>
              <text :class="['annual-note', item.type]">{{ item.note }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 7. AI 投顾入口 -->
      <view class="ai-card" @tap="goChat">
        <view class="ai-icon-wrap">
          <SvgIcon name="robot-line" size="36rpx" color="#4d7cfe" />
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
import ForecastTrendChart from '@/modules/favorites/components/ForecastTrendChart.vue'
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
const stockEvents = ref<any[]>([])
const forecastData = ref<any>(null)
const forecastLoading = ref(false)
const klineData = ref<any[]>([])
type KLinePeriod = 'daily' | 'weekly' | 'yearly'
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
  { key: 'long', label: '长线', desc: '季/年' }
]

// AI 研判 composable（接入真实 trend-score 数据）
const symbolRef = computed(() => symbol.value)
const quoteRef = computed(() => ({ name: quote.value?.name, industry: stockInfo.value?.industry || quote.value?.industry }))
const trendScoreDataRef = computed(() => trendScoreData.value)
const {
  midAiAnalysis,
  longAiAnalysis,
  midMockData,
  longMockData,
  trendModel,
  trendVetoed,
  trendVetoReasons,
} = useStockAiAnalysis(symbolRef, quoteRef, trendScoreDataRef)

// 资金流向归一化（对齐网页端 capitalFlowInfo）
const capitalFlowInfo = computed(() => {
  const source = capitalFlow.value || {
    tag: '观察',
    tagClass: 'is-neutral',
    mainInflow: 0,
    ratio: '--',
    fiveDay: 0,
    streak: '观察中',
    trendBadge: '趋势：资金温和观察',
    narrative: '暂无资金流向数据...',
    risk: '数据加载中',
    trend: [],
    trendDates: [],
    orders: [],
  }
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
        kind: item.kind,
      }
    })
    .filter(item => item.year && item.value != null) as Array<{ year: string; value: number; label: string; kind?: string }>
  if (!parsed.length) return []
  const max = Math.max(...parsed.map(item => Math.abs(item.value)), 0.01)
  return parsed.map(item => ({
    ...item,
    height: Math.max(14, Math.round((Math.abs(item.value) / max) * 100)),
  }))
})

const forecastLineCategories = computed(() => forecastYearKeys.value.map(item => item.year))

const forecastLineSeries = computed(() => {
  const details = forecastData.value?.detailIndicators
  if (!Array.isArray(details) || details.length === 0 || !forecastYearKeys.value.length) return []
  return [
    { name: '净利增长率', data: readForecastSeries(details, '净利润增长率') },
    { name: '营收增长率', data: readForecastSeries(details, '营业收入增长率') },
    { name: 'ROE', data: readForecastSeries(details, '净资产收益率') },
    { name: '市盈率', data: readForecastSeries(details, '市盈率') },
  ].filter(item => item.data.some(v => v !== 0))
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

function buildForecastChartSource(): Array<{ year: string; netProfit: any; kind?: string }> {
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

function readForecastSeries(details: any[], indicator: string): number[] {
  const row = details.find((item: any) => String(item['预测指标'] || item.indicator || '').includes(indicator))
  if (!row) return forecastYearKeys.value.map(() => 0)
  return forecastYearKeys.value.map(item => parseForecastNumber(row[item.key]) ?? 0)
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
  if (period === 'yearly') return 240
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

function formatAmount(amt: number): string {
  if (!amt) return '--'
  if (Math.abs(amt) >= 100000000) return (amt / 100000000).toFixed(2) + '亿'
  if (Math.abs(amt) >= 10000) return (amt / 10000).toFixed(2) + '万'
  return amt.toFixed(2) + '元'
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
  const msg = `分析一下${name}(${symbol.value})的行情`
  uni.navigateTo({ url: `/modules/chat/pages/index?message=${encodeURIComponent(msg)}` })
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.page-detail {
  padding: 24rpx;
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  min-height: 100vh;
  background: #f5f7fa;
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
  color: #6b7280;
}

/* 股票头部 */
.stock-header {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
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
  color: #1a1d24;
}

.stock-code {
  font-size: 24rpx;
  color: #6b7280;
  padding: 4rpx 16rpx;
  background: #f0f2f5;
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

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
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

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
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
  background: #f5f7fa;
  border-radius: 8rpx;

  .tag-label {
    font-size: 22rpx;
    color: #9ca3af;
  }

  .tag-value {
    font-size: 24rpx;
    color: #4b5563;
  }
}

/* 涨跌�?*/
.limit-inline {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.limit-inline-label {
  font-size: 26rpx;
  color: #6b7280;

  .up { color: #f43f5e; font-weight: 600; }
  .down { color: #22c55e; font-weight: 600; }
}

.limit-inline-sep {
  color: #e5e7eb;
  font-size: 24rpx;
}

/* 周期切换 Tabs */
.view-tabs {
  display: flex;
  height: 120rpx;
  margin-bottom: 20rpx;
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
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
  background: #ffffff;
  border-bottom: 4rpx solid transparent;
  box-sizing: border-box;

  &:not(:last-child) {
    border-right: 1rpx solid #f0f2f5;
  }

  &:active {
    background: #f8fafc;
  }

  &.is-active {
    background: #f0f7ff;
    border-bottom-color: $brand-color;

    .tab-label { color: $brand-color; }
    .tab-desc { color: $brand-color; }
  }
}

.tab-label {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #64748b;
  line-height: 1.4;
  text-align: center;
}

.tab-desc {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 4rpx;
  line-height: 1.4;
  text-align: center;
}

.view-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

/* AI 研判卡片 */
.ai-analysis-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
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
  color: #1a1d24;
}

.ai-refresh-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f7fa;

  &:active { background: #e8ecf1; }
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
  color: #9ca3af;
}

.ai-empty {
  padding: 40rpx 0;
  text-align: center;
}

.ai-empty-text {
  font-size: 26rpx;
  color: #9ca3af;
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

  &.is-bull { color: #f43f5e; }
  &.is-bear { color: #22c55e; }
  &.is-hold { color: #0066cc; }
}

.analysis-date {
  font-size: 22rpx;
  color: #9ca3af;
}

.ai-logic {
  margin-bottom: 20rpx;
}

.ai-logic-text {
  font-size: 28rpx;
  color: #4b5563;
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
  color: #334155;
  margin-bottom: 12rpx;
  display: block;

  &.risk { color: #7f1d1d; }
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
    color: #2563eb;
    border: 1rpx solid rgba(59, 130, 246, 0.25);

    &.is-expanded { background: rgba(59, 130, 246, 0.15); }
  }

  &.is-basis {
    background: rgba(99, 102, 241, 0.08);
    color: #4f46e5;
    border: 1rpx solid rgba(99, 102, 241, 0.25);

    &.is-expanded { background: rgba(99, 102, 241, 0.15); }
  }

  &.is-advice {
    background: rgba(34, 197, 94, 0.08);
    color: #16a34a;
    border: 1rpx solid rgba(34, 197, 94, 0.25);

    &.is-expanded { background: rgba(34, 197, 94, 0.15); }
  }

  &.is-risk {
    background: rgba(239, 68, 68, 0.08);
    color: #dc2626;
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
  background: #f8fafc;
  border-radius: 12rpx;
  border-left: 4rpx solid #2563eb;

  &.basis { border-left-color: #4f46e5; }
  &.advice { border-left-color: #16a34a; }
  &.risk { border-left-color: #dc2626; }
}

.tag-detail-text {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
}

/* 通用卡片 */
.section-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 20rpx;
  display: block;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-sub {
  font-size: 24rpx;
  color: #4d7cfe;
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
  background: #4d7cfe;
  margin-top: 8rpx;
  flex-shrink: 0;

  &.default { background: #94a3b8; }
}

.event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.event-title {
  font-size: 28rpx;
  color: #1a1d24;
  line-height: 1.4;
}

.event-time {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 交易数据网格 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rpx;
  background: #e5e7eb;
  border-radius: 12rpx;
  overflow: hidden;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #ffffff;
}

.detail-label {
  font-size: 26rpx;
  color: #6b7280;
}

.detail-value {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
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
  background: #f5f7fa;
  border-radius: 12rpx;
}

.flow-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.flow-value {
  font-size: 30rpx;
  font-weight: 600;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

.flow-narrative {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #f8fafc;
  border-radius: 8rpx;
}

.flow-narrative-text {
  font-size: 24rpx;
  color: #6b7280;
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
  background: #f5f7fa;
  border-radius: 12rpx;
}

.finance-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.finance-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 4rpx;
}

.finance-change {
  font-size: 22rpx;
  color: #9ca3af;

  &.is-up { color: #f43f5e; }
  &.is-down { color: #22c55e; }
}

/* 业绩预测 */
.forecast-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.forecast-summary {
  padding: 16rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.forecast-summary-text {
  font-size: 26rpx;
  color: #4b5563;
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
  background: #f5f7fa;
  border-radius: 12rpx;
}

.forecast-year {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
  min-width: 80rpx;
}

.forecast-value {
  flex: 1;
  font-size: 26rpx;
  color: #4b5563;
}

.forecast-growth {
  font-size: 26rpx;
  font-weight: 600;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 行业景气指数 */
.industry-health-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.industry-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.industry-pill {
  padding: 6rpx 16rpx;
  background: rgba(77, 124, 254, 0.1);
  border-radius: 8rpx;

  text {
    font-size: 22rpx;
    color: #4d7cfe;
  }
}

.industry-score {
  font-size: 36rpx;
  font-weight: 700;

  &.is-hot { color: #f43f5e; }
  &.is-warm { color: #f59e0b; }
  &.is-normal { color: #4d7cfe; }
  &.is-cold { color: #22c55e; }
}

.industry-trend {
  margin-bottom: 20rpx;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 160rpx;
  padding: 0 8rpx;
}

.trend-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.trend-bar {
  width: 32rpx;
  background: linear-gradient(180deg, #4d7cfe, #6366f1);
  border-radius: 6rpx 6rpx 0 0;
}

.trend-month {
  font-size: 20rpx;
  color: #9ca3af;
}

.industry-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12rpx;
}

.industry-detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.industry-detail-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #4d7cfe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;

  text {
    font-size: 24rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

.industry-detail-title {
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 4rpx;
}

.industry-detail-desc {
  font-size: 24rpx;
  color: #1a1d24;
  font-weight: 500;
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
    margin-bottom: 24rpx;
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
    color: #4d7cfe;
    line-height: 1;
  }

  .tenx-score-label {
    font-size: 22rpx;
    color: #6b7280;
    margin-top: 4rpx;
  }

  .tenx-multiple {
    font-size: 24rpx;
    color: #4d7cfe;
    font-weight: 500;
    margin-top: 8rpx;
  }

  .tenx-verdict {
    flex: 1;
  }

  .verdict-tag {
    display: inline-block;
    padding: 8rpx 20rpx;
    background: #4d7cfe;
    color: #ffffff;
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
  color: #334155;
}

.tenx-dimensions {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tenx-dim-item {
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
  overflow: hidden;
  background: #ffffff;
}

.tenx-dim-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #f8fafc;
}

.tenx-dim-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
  flex: 1;
}

.tenx-dim-score {
  font-size: 28rpx;
  font-weight: 700;
  color: #4d7cfe;
}

.tenx-dim-weight {
  font-size: 22rpx;
  color: #9ca3af;
}

.tenx-dim-arrow {
  font-size: 24rpx;
  color: #9ca3af;
}

.tenx-dim-body {
  padding: 16rpx 20rpx;
  border-top: 1rpx solid #f0f2f5;
}

.tenx-dim-question {
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 12rpx;
}

.tenx-dim-bar-wrap {
  height: 10rpx;
  background: #e5e7eb;
  border-radius: 999rpx;
  overflow: hidden;
  margin: 0 20rpx 14rpx;
}

.tenx-dim-bar {
  height: 100%;
  background: linear-gradient(90deg, #4d7cfe, #6366f1);
  border-radius: 999rpx;
}

/* 行业政策 */
.policy-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.policy-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 18rpx 0;
  background: transparent;
  border-radius: 12rpx;

  & + .policy-item {
    border-top: 1rpx solid #eef2f7;
  }
}

.policy-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 64rpx;
  height: 36rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 700;

  &.is-good {
    background: #fff1f2;
    color: #ef4444;
  }

  &.is-neutral {
    background: #f1f5f9;
    color: #64748b;
  }
}

.policy-text {
  font-size: 26rpx;
  color: #334155;
  line-height: 1.65;
  flex: 1;
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
  background: #f5f7fa;
  border-radius: 12rpx;
  text-align: center;
}

.moat-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #4d7cfe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;

  text {
    font-size: 28rpx;
    color: #ffffff;
    font-weight: 700;
  }
}

.moat-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 8rpx;
}

.moat-desc {
  font-size: 22rpx;
  color: #6b7280;
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
  background: #f5f7fa;
  border-radius: 12rpx;
}

.annual-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.annual-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 4rpx;
}

.annual-note {
  font-size: 22rpx;
  color: #9ca3af;

  &.is-up { color: #f43f5e; }
  &.is-down { color: #22c55e; }
}

/* 半年�?*/
.semi-grid {
  margin-bottom: 16rpx;
}

.semi-table {
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid #e5e7eb;
}

.semi-row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f0f2f5;

  &:last-child {
    border-bottom: none;
  }

  &.semi-header {
    background: #f5f7fa;
    font-weight: 600;
  }
}

.semi-cell {
  flex: 1;
  padding: 16rpx 12rpx;
  font-size: 24rpx;
  color: #374151;
  text-align: center;

  &.semi-cell-label {
    flex: 1.2;
    text-align: left;
    padding-left: 16rpx;
    color: #6b7280;
  }

  &.semi-cell-value {
    font-weight: 500;

    &.up { color: #f43f5e; }
    &.down { color: #22c55e; }
  }
}

.semi-empty {
  padding: 40rpx;
  text-align: center;
}

.semi-empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.semi-footer {
  border-top: 1rpx solid #f0f2f5;
  padding-top: 16rpx;
  text-align: center;
}

.semi-link {
  font-size: 26rpx;
  color: #4d7cfe;
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
  border-bottom: 1rpx solid #f0f2f5;

  &:last-child { border-bottom: none; }
  &:active { opacity: 0.7; }
}

.news-title {
  font-size: 28rpx;
  color: #1a1d24;
  line-height: 1.4;
  margin-bottom: 6rpx;
}

.news-meta {
  display: flex;
  gap: 12rpx;
}

.news-source {
  font-size: 22rpx;
  color: #6b7280;
}

.news-time {
  font-size: 22rpx;
  color: #9ca3af;
}

/* AI 投顾入口 */
.ai-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.1), rgba(99, 102, 241, 0.05));
  border: 1rpx solid rgba(77, 124, 254, 0.2);
  border-radius: 20rpx;
}

.ai-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #4d7cfe;
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
  color: #1a1d24;
}

.ai-desc {
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 4rpx;
}

.ai-arrow {
  font-size: 36rpx;
  color: #4d7cfe;
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
  color: #6366f1;
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

  &.is-bullish { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
  &.is-bearish { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
  &.is-neutral { background: rgba(148, 163, 184, 0.1); color: #64748b; }
}

.cf-tags-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.cf-tag-mini {
  padding: 4rpx 12rpx;
  background: #f5f7fa;
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #6b7280;
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
  color: #6b7280;
}

.cf-hero-card-value {
  font-size: 36rpx;
  font-weight: 700;

  &.is-up { color: #f43f5e; }
  &.is-down { color: #22c55e; }
}

.cf-orders {
  margin-bottom: 16rpx;
}

.cf-orders-title {
  font-size: 24rpx;
  color: #6b7280;
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
  color: #4b5563;
  min-width: 100rpx;
}

.cf-order-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: #f0f2f5;
  border-radius: 4rpx;
  overflow: hidden;
}

.cf-order-bar {
  height: 100%;
  border-radius: 4rpx;

  &.is-up { background: linear-gradient(90deg, #f43f5e, #fb7185); }
  &.is-down { background: linear-gradient(90deg, #22c55e, #4ade80); }
}

.cf-order-value {
  font-size: 24rpx;
  font-weight: 600;
  min-width: 100rpx;
  text-align: right;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
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
  color: #6b7280;
}

.cf-trend-badge {
  padding: 4rpx 12rpx;
  background: rgba(77, 124, 254, 0.1);
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #4d7cfe;
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

  &.is-up { background: #f43f5e; }
  &.is-down { background: #22c55e; }
}

.cf-trend-date {
  font-size: 18rpx;
  color: #9ca3af;
  text-align: center;
}

.flow-narrative-risk {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #dc2626;
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
  color: #9ca3af;
}

.forecast-update-value {
  font-size: 22rpx;
  color: #6b7280;
}

.forecast-yoy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.forecast-yoy-label {
  font-size: 26rpx;
  color: #4b5563;
}

.forecast-yoy-value {
  font-size: 32rpx;
  font-weight: 700;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

.forecast-year-panel {
  padding: 20rpx;
  background: #f8fafc;
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
  color: #334155;
}

.forecast-year-unit {
  font-size: 22rpx;
  color: #94a3b8;
}

.forecast-year-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.forecast-year-item {
  padding: 16rpx;
  background: #ffffff;
  border-radius: 12rpx;
  border: 1rpx solid #eef2f7;
}

.forecast-year-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.forecast-year-label {
  display: block;
  font-size: 26rpx;
  color: #334155;
  font-weight: 600;
}

.forecast-year-kind {
  display: block;
  margin-top: 2rpx;
  font-size: 21rpx;
  color: #64748b;

  &.is-actual { color: #4d7cfe; }
  &.is-forecast { color: #d97706; }
}

.forecast-year-value {
  font-size: 30rpx;
  color: #1e293b;
  font-weight: 700;
}

.forecast-progress-track {
  height: 16rpx;
  background: #e5e7eb;
  border-radius: 999rpx;
  overflow: hidden;
}

.forecast-progress-fill {
  height: 100%;
  min-width: 18rpx;
  border-radius: 999rpx;

  &.is-actual {
    background: linear-gradient(90deg, #4d7cfe, #7c9cff);
  }

  &.is-forecast {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }
}

.forecast-list-header {
  display: flex;
  padding: 12rpx 20rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
  margin-bottom: 4rpx;
}

.forecast-col-year { flex: 1; font-size: 22rpx; color: #6b7280; font-weight: 600; }
.forecast-col-profit { flex: 1; font-size: 22rpx; color: #6b7280; font-weight: 600; text-align: center; }
.forecast-col-growth { flex: 1; font-size: 22rpx; color: #6b7280; font-weight: 600; text-align: right; }

.forecast-detail-table {
  margin-top: 16rpx;
}

.forecast-detail-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12rpx;
  display: block;
}

.forecast-detail-scroll {
  overflow-x: auto;
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.forecast-detail-row {
  display: flex;
  border-bottom: 1rpx solid #f0f2f5;

  &:last-child { border-bottom: none; }

  &.forecast-detail-head {
    background: #f5f7fa;
    font-weight: 600;
  }
}

.forecast-detail-cell {
  flex: 1;
  min-width: 120rpx;
  padding: 12rpx 8rpx;
  font-size: 22rpx;
  color: #4b5563;
  text-align: center;

  &.forecast-detail-cell-name {
    flex: 1.5;
    min-width: 160rpx;
    text-align: left;
    padding-left: 16rpx;
    color: #6b7280;
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
  color: #22c55e;
  font-weight: 600;
}

.tenx-score {
  &.is-high { color: #22c55e; }
  &.is-mid { color: #eab308; }
  &.is-low { color: #ef4444; }
}

.verdict-tag {
  &.is-high { background: #22c55e; }
  &.is-mid { background: #eab308; }
  &.is-low { background: #ef4444; }
}

.verdict-text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #4b5563;
  line-height: 1.5;
}

.tenx-dim-score {
  &.is-high { color: #22c55e; }
  &.is-mid { color: #eab308; }
  &.is-low { color: #ef4444; }
}

.tenx-dim-bar {
  &.is-high { background: linear-gradient(90deg, #16a34a, #22c55e); }
  &.is-mid { background: linear-gradient(90deg, #ca8a04, #eab308); }
  &.is-low { background: linear-gradient(90deg, #dc2626, #ef4444); }
}

.tenx-ai-conclusion {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.06), rgba(99, 102, 241, 0.03));
  border-radius: 12rpx;
  border-left: 4rpx solid #4d7cfe;
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
  background: #4d7cfe;
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tenx-ai-conclusion-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
}

.tenx-ai-conclusion-text {
  font-size: 26rpx;
  color: #4b5563;
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
  border-bottom: 1rpx solid #f5f7fa;

  &:last-child { border-bottom: none; }
}

.tenx-ind-name {
  flex: 1;
  font-size: 22rpx;
  color: #6b7280;
}

.tenx-ind-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 200rpx;
}

.tenx-ind-value {
  font-size: 22rpx;
  color: #1a1d24;
  font-weight: 500;
  min-width: 80rpx;
  text-align: right;
}

.tenx-ind-bar-track {
  flex: 1;
  height: 8rpx;
  background: #f0f2f5;
  border-radius: 4rpx;
  overflow: hidden;
}

.tenx-ind-bar-fill {
  height: 100%;
  border-radius: 4rpx;

  &.is-high { background: linear-gradient(90deg, #16a34a, #22c55e); }
  &.is-mid { background: linear-gradient(90deg, #ca8a04, #eab308); }
  &.is-low { background: linear-gradient(90deg, #dc2626, #ef4444); }
}

.tenx-ind-score {
  font-size: 22rpx;
  font-weight: 600;
  min-width: 40rpx;
  text-align: right;

  &.is-high { color: #22c55e; }
  &.is-mid { color: #eab308; }
  &.is-low { color: #ef4444; }
}

.tenx-data-source {
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f0f2f5;
}

.tenx-source-text {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 基本面子维度 */
.tenx-sub-dims {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  border-left: 4rpx solid #6366f1;
}

.tenx-sub-dims-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #4338ca;
  margin-bottom: 12rpx;
  display: block;
}

.tenx-sub-dim-item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #eef2f7;

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
  color: #334155;
}

.tenx-sub-dim-score {
  font-size: 26rpx;
  font-weight: 700;

  &.is-high { color: #22c55e; }
  &.is-mid { color: #eab308; }
  &.is-low { color: #ef4444; }
}

.tenx-sub-dim-weight {
  font-size: 20rpx;
  color: #9ca3af;
  padding: 2rpx 8rpx;
  background: #eef2f7;
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
  color: #ef4444;
}

.tenx-vetoed-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #ef4444;
  margin-bottom: 8rpx;
}

.tenx-vetoed-desc {
  font-size: 26rpx;
  color: #6b7280;
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
  color: #4b5563;
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
  background: #ffffff;
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
  border-bottom: 1rpx solid #f0f2f5;
}

.history-dialog-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.history-dialog-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f7fa;

  &:active { background: #e8ecf1; }
}

.close-icon {
  font-size: 24rpx;
  color: #6b7280;
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
  background: #f5f7fa;
  border-radius: 12rpx;

  &:active { background: #eef0f3; }
}

.history-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.history-item-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.history-item-conclusion {
  font-size: 24rpx;
  font-weight: 600;

  &.is-bull { color: #f43f5e; }
  &.is-bear { color: #22c55e; }
  &.is-hold { color: #0066cc; }
}

.history-item-logic {
  font-size: 24rpx;
  color: #4b5563;
  line-height: 1.5;
}

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.history-page-btn {
  padding: 8rpx 24rpx;
  background: #f5f7fa;
  border-radius: 8rpx;

  text { font-size: 24rpx; color: #4d7cfe; }

  &.disabled {
    opacity: 0.4;

    text { color: #9ca3af; }
  }

  &:active:not(.disabled) { background: #e8ecf1; }
}

.history-page-info {
  font-size: 24rpx;
  color: #6b7280;
}

.history-detail-back {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.back-icon {
  font-size: 32rpx;
  color: #4d7cfe;
}

.back-text {
  font-size: 24rpx;
  color: #4d7cfe;
}

.history-detail-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.history-detail-time {
  font-size: 24rpx;
  color: #9ca3af;
}

.history-detail-conclusion {
  font-size: 28rpx;
  font-weight: 600;

  &.is-bull { color: #f43f5e; }
  &.is-bear { color: #22c55e; }
  &.is-hold { color: #0066cc; }
}

.history-detail-section {
  margin-bottom: 20rpx;
}

.history-detail-section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8rpx;
  display: block;

  &.risk { color: #7f1d1d; }
}

.history-detail-section-text {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
}
</style>
