import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig({
  plugins: [uni()],
  // 指定 env 文件目录（env/.env.development 和 env/.env.production）
  // 不指定时 Vite 默认读取项目根目录的 .env 文件，会导致 env/ 目录下的文件被忽略
  envDir: path.resolve(__dirname, 'env'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        silenceDeprecations: ['legacy-js-api', 'import']
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      // 为什么写死端口：Vite dev server 启动时不会把 envDir 下的 .env 变量注入
      // process.env，process.env.VITE_API_BASE 恒为 undefined，导致 fallback 到
      // 无服务的 56790。dev proxy 直接写死本地端口；生产走 Caddy 反代不受影响。
      // 顺序约定：Node 路由（report/audio/event）在前，Python 路由（/api/agent）
      // 在后，/api 放最后兜底，避免 /api/agent 被前面的 /api 匹配。
      // Agent 报告查询和音频文件 → Node.js app-api（publicRouter，端口 3000）
      '/api/agent/report': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/agent/audio': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // 事件传导路由 → Node.js（端口 3000，publicRouter）
      '/api/agent/event': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // 其他 Agent 路由 → Python FastAPI（端口 8000）
      '/api/agent': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
