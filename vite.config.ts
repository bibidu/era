import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 本地默认 /era/；EdgeOne 生产构建用 ERA_BASE=/
  base: process.env.ERA_BASE ?? '/era/',
})
