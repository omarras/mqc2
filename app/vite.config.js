// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/console/ph-pse/mqc/',
  plugins: [vue()],
  server: {
    proxy: {
      '/console/ph-pse/mqc/api': {
        target: 'http://localhost:5177',
        changeOrigin: true,
      },
      '/console/ph-pse/mqc/tmp': {
        target: 'http://localhost:5177',
        changeOrigin: true,
      },
    }
  }
})
