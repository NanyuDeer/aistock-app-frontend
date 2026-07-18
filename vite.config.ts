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

  return {
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
        // 其他 Agent 路由 → Python FastAPI（端口 8080）
        '/api/agent': {
          target: agentTarget,
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
