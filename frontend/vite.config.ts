import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In sviluppo le chiamate /api vengono inoltrate al backend .NET
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5080' },
  },
  build: {
    outDir: '../backend/Ortol.Api/wwwroot',
    emptyOutDir: true,
  },
})
