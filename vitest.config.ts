import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: {
        // uni-app uses custom elements like <view>, <text>, <scroll-view> etc.
        // Treat them as custom elements in tests rather than unknown components.
        compilerOptions: {
          isCustomElement: (tag: string) =>
            ['view', 'text', 'image', 'scroll-view', 'swiper', 'swiper-item', 'icon'].includes(tag),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    // uni-app 组件以无扩展名深度导入（如 mp-html/.../mp-html.vue），
    // vite 默认 extensions 不含 .vue，需补充才能解析（uni 插件在业务构建里做了同样的事）
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    // 仅运行 Vitest 测试（tests/**/*.test.ts）。
    // src/**/*.spec.ts 是为 Node.js 内置 node:test 运行器编写的源码正则测试，
    // 与 Vitest 不兼容（依赖 import.meta.url + readFileSync 加载 .vue 源码），
    // 由 package.json 的 "test:node" 脚本单独运行，不在 vitest 采集范围内。
    // 例外：以下两个 vitest 风格（import from 'vitest'）spec 显式纳入，
    // 供 Task 2 (P3-fix) 的 useChatStream / ReasoningPanel 单测使用。
    include: [
      'tests/**/*.test.ts',
      'src/shared/utils/useChatStream.spec.ts',
      'src/shared/utils/chatSuggestions.spec.ts',
      'src/shared/utils/parseMarkdownSections.spec.ts',
      'src/shared/utils/parseFollowupQuestions.spec.ts',
      'src/shared/utils/scrollFollow.spec.ts',
      'src/shared/utils/sessionUsageMerge.spec.ts',
      'src/shared/utils/eveningBriefCards.spec.ts',
      'src/shared/utils/speechInput.spec.ts',
      'src/pages-sub-app/chat/ReasoningPanel.spec.ts',
      'src/shared/store/modules/market.spec.ts',
      'src/modules/home/components/StockContent.spec.ts',
      'src/shared/store/modules/chatStore.spec.ts',
      'src/shared/store/modules/chat.spec.ts',
      'src/shared/store/modules/podcast.spec.ts',
      'src/pages-sub-app/chat/cards/MarketSnapshotCard.spec.ts',
      'src/pages-sub-app/chat/cards/StockSnapshotCard.spec.ts',
      'src/pages-sub-app/chat/cards/CapitalFlowCard.spec.ts',
      'src/pages-sub-app/chat/cards/DeepAnalysisCard.spec.ts',
      'src/pages-sub-app/chat/cards/ComparisonCard.spec.ts',
      'src/pages-sub-app/chat/cards/CardRenderer.spec.ts',
      'src/pages-sub-app/chat/cards/SectionCard.spec.ts',
      'src/shared/components/InsightAlertCard.spec.ts',
      'src/shared/components/FloatingPodcast.spec.ts',
      'src/modules/favorites/components/InsightDetailLayout.spec.ts',
      'src/modules/favorites/pages/monitor.spec.ts',
      'src/modules/favorites/pages/insight-detail.spec.ts',
      'src/modules/favorites/components/AlertContent.spec.ts',
      'src/shared/components/ConfirmSheet.spec.ts',
      'src/modules/chat/pages/chat-report-detail.spec.ts',
    ],
  },
})
