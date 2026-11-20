import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// API a la que se reenvían las llamadas /api (por defecto la de esta PC).
const API = process.env.API_URL ?? 'http://localhost:3000'

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
      '/api': API,
    },
  },
  preview: {
    host: true,
    proxy: {
      '/api': API,
    },
  },
})
