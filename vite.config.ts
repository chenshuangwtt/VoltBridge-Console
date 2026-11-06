import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const proxyTarget = env.DEV_PROXY_TARGET || env.VITE_API_BASE_URL

  return {
    plugins: [vue()],

    server: {
      host: '0.0.0.0',
      port: Number(env.DEV_PORT || 5173),

      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },

        '/actuator': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
