import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8081,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'fluxo_logo.png', 'robots.txt'],
      workbox: {
        cleanupOutdatedCaches: true,
        // Removidos skipWaiting e clientsClaim para permitir o controle via prompt
      },
      manifest: {
        name: 'Fluxo - Gestão Financeira',
        short_name: 'Fluxo',
        description: 'Seu controle financeiro inteligente e simplificado.',
        start_url: '/',
        theme_color: '#0d9488',
        background_color: '#1A1F2C',
        display: 'standalone',
        icons: [
          {
            src: 'fluxo_logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'fluxo_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'fluxo_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
