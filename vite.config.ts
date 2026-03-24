import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'FamilyBudget',
        short_name: 'Budget',
        description: 'Семейный бюджет',
        theme_color: '#F2EDE1',
        background_color: '#F2EDE1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/Firefly_Gemini Flash-Photoroom.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/Firefly_Gemini Flash-Photoroom.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
