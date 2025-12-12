import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // Proxy backend API to Node server
      "/console/ph-pse/mqc/api": {
        target: "http://localhost:5177",
        changeOrigin: true
      }
    }
  }
});

