import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  base: '/Smart-Desktop-Pet-White/',
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // 把三方依赖拆成独立 chunk，避免与业务代码混在一起
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'icons': ['lucide-react'],
          'state': ['zustand'],
        },
      },
    },
  },
  resolve: {
    alias: {
      // 显式写别名，避免 vite-tsconfig-paths 在某些工作目录下识别不到
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
