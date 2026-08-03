import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { rmSync } from 'node:fs'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'omit-unused-public-assets',
      closeBundle: {
        sequential: true,
        order: 'post',
        handler() {
          // 像素字体未在运行时引用，去掉可缩小部署产物
          rmSync(path.resolve(__dirname, 'dist/fonts/pixel'), { recursive: true, force: true })
        },
      },
    },
  ],
  // 本地默认 /era/；自建站生产构建用 ERA_BASE=/
  base: process.env.ERA_BASE ?? '/era/',
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\')) {
            return 'react-vendor'
          }
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
