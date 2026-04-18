import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appEnv = env.VITE_APP_ENV || ''
  const title = `WYRTH${appEnv} — The Capsule Wardrobe Cape`

  return {
    plugins: [react()],
    define: {
      __APP_TITLE__: JSON.stringify(title),
    },
  }
})
