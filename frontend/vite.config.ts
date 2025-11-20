import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  base: mode === 'development' ? '/' : '/static/frontend/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    manifest: 'manifest.json',           // genera dist/manifest.json
    rollupOptions: { input: path.resolve(__dirname, 'index.html') },
  },
}))
