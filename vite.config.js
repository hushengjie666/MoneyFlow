import { defineConfig } from "vite";

export default defineConfig({
  root: "frontend",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  },
  test: {
    include: ["tests/**/*.test.js"]
  }
});
