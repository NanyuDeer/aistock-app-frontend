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
      '/api/agent': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: process.env.VITE_WS_BASE || 'ws://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
