import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ⚙️ Config principal
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  console.log('[VITE CONFIG] Cargando entorno:')
  console.log('  VITE_BACKEND_HOST =', env.VITE_BACKEND_HOST)
  console.log('  VITE_APP_SHARED_SECRET =', env.VITE_APP_SHARED_SECRET)

  if (!env.VITE_APP_SHARED_SECRET) {
    throw new Error('❌ Falta VITE_APP_SHARED_SECRET en tu archivo .env')
  }

  return {
    plugins: [react()],
    server: {
      host: '10.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: `http://${env.VITE_BACKEND_HOST}`,
          changeOrigin: true,
          headers: {
            'X-Distritec-App': env.VITE_APP_SHARED_SECRET
          }
        }
      }
    },
    // 🧭 Habilita mapas de origen (source maps) en el build
    build: {
      sourcemap: true
    }
  }
})
