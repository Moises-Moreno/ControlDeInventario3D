import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Escucha en la red local: el teléfono o la tablet entran con http://<IP de la PC>:5173
    host: true,
    // Las llamadas a /api las reenvía Vite a la API de esta PC (sin CORS ni IPs en el código).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  preview: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
