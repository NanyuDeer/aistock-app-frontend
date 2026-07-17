import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, 'env'))
  const apiBase = env.VITE_API_BASE || 'http://localhost:56790'
  const agentApiBase = env.VITE_AGENT_API_BASE || 'http://localhost:8080'
  const wsBase = env.VITE_WS_BASE || 'ws://localhost:56790'

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
        // Agent 报告查询和音频文件 → Node.js app-api（publicRouter，端口 56790）
        '/api/agent/report': {
          target: apiBase,
          changeOrigin: true
        },
        '/api/agent/audio': {
          target: apiBase,
          changeOrigin: true
        },
        // 事件传导路由 → Node.js（端口 56790，publicRouter）
        '/api/agent/event': {
          target: apiBase,
          changeOrigin: true
        },
        // 其他 Agent 路由 → Python FastAPI（端口 8080）
        '/api/agent': {
          target: agentApiBase,
          changeOrigin: true
        },
        '/api': {
          target: apiBase,
          changeOrigin: true
        },
        '/ws': {
          target: wsBase,
          ws: true,
          changeOrigin: true
        }
      }
    }
  }
})
