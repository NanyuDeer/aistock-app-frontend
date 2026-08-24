import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig(({ mode }) => {
  // 加载 env 目录下的环境变量（供 dev server proxy 使用）
  // 注意：vite.config.ts 中 process.env 不会自动读取 .env 文件，必须用 loadEnv
  const env = loadEnv(mode, path.resolve(__dirname, 'env'), '')

  // 开发代理目标：app-api(Node.js) 与 agent-py(Python) 分流
  const apiTarget = env.VITE_PROXY_API_TARGET || 'http://localhost:3000'
  const agentTarget = env.VITE_PROXY_AGENT_TARGET || 'http://localhost:8080'
  const wsTarget = env.VITE_PROXY_WS_TARGET || 'ws://localhost:3000'

  // App(app-plus) 目标输出格式为 iife，不支持 code-splitting。PDF 导出用的 jspdf
  // 其 ESM 构建在内部对 html2canvas/dompurify/canvg 使用动态 import()，触发 code-splitting。
  // 已在 agent-report.vue 将项目侧动态 import 改为静态 import，并在此把 jspdf 指向自包含的
  // UMD 构建（无任何动态 import），从而彻底消除代码分割。H5/h5 平台仍走 ESM 保持轻量。
  const isAppPlus = process.env.UNI_PLATFORM === 'app' || process.env.UNI_PLATFORM === 'app-plus'
  const jspdfAlias = isAppPlus
    ? { jspdf: 'jspdf/dist/jspdf.umd.min.js' }
    : {}

  return {
    plugins: [
      uni(),
    ],
    // AudioPlayer 同时被首页和懒加载的播报详情页使用。合并 CSS 可避免样式
    // 被首个分包独占，导致详情页单独打开时播放器成为无样式结构。
    build: {
      cssCodeSplit: false,
    },
    // 指定 env 文件目录（env/.env.development 和 env/.env.production）
    // 不指定时 Vite 默认读取项目根目录的 .env 文件，会导致 env/ 目录下的文件被忽略
    envDir: path.resolve(__dirname, 'env'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        ...jspdfAlias,
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
          silenceDeprecations: ['legacy-js-api', 'import'],
          // 全局注入设计变量，组件库组件复制过来后无需逐个修改 @import 路径
          // 用 @use 而非 @import，避免与组件内 @use 冲突（Sass 规定 @use 必须在其他语句前）
          additionalData: `@use "@/shared/styles/variables.scss" as *;`
        }
      }
    },
    server: {
      port: 5173,
      proxy: {
        // Agent 报告查询和音频文件 → Node.js app-api（publicRouter，端口 3000）
        '/api/agent/report': {
          target: apiTarget,
          changeOrigin: true
        },
        '/api/agent/audio': {
          target: apiTarget,
          changeOrigin: true
        },
        // 事件传导路由 → Node.js（publicRouter）
        '/api/agent/event': {
          target: apiTarget,
          changeOrigin: true
        },
        // 市场复盘问答需要经 Node.js 注入内部令牌后再转发至 Python
        '/api/agent/market-trace-qa/message': {
          target: apiTarget,
          changeOrigin: true
        },
        // 公共 Brief 与 Broadcast 路由 → Node.js（publicRouter）
        '^/api/agent/brief(?:/|$)': {
          target: apiTarget,
          changeOrigin: true
        },
        '^/api/agent/broadcast(?:/|$)': {
          target: apiTarget,
          changeOrigin: true
        },
        // 恐贪指数服务 → Node.js app-api（端口 3000，2026-08-15 起由 Python 8001 迁移）
        '/api/fear-greed': {
          target: apiTarget,
          changeOrigin: true
        },
        // 其他 Agent 路由 → Python FastAPI（端口 8080）
        // ws: true 支持 /api/agent/ws/* WebSocket 升级（AI 对话流式输出），
        // 与服务器 Caddy 配置等价：本地 dev server → 线上 Caddy → 127.0.0.1:8080
        '/api/agent': {
          target: agentTarget,
          ws: true,
          changeOrigin: true
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true
        }
      }
    }
  }
})
