import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'
import manifestJson from './src/pwa-manifest.json'

// WICHTIG: `base` muss dem GitHub-Repo-Namen entsprechen (Repo: katimur94/Wunderwald).
// Bei Umbenennung des Repos hier anpassen — sonst laden Assets auf GitHub Pages nicht.
export default defineConfig({
  base: '/Wunderwald/',
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        /*
         * Vendor-Chunks: Ohne diese Aufteilung lag alles in einem einzigen
         * index-*.js von ~494 kB. Getrennt lädt der Browser parallel, und ein
         * Update am App-Code wirft die Bibliotheken nicht mehr aus dem Cache —
         * für eine Offline-PWA, die ihre Dateien dauerhaft vorhält, zählt das
         * doppelt.
         *
         * Bewusst als Funktion statt als Objekt: So landen auch die internen
         * Pakete zuverlässig im richtigen Chunk (`scheduler` bei React,
         * `motion-dom`/`motion-utils` bei Framer Motion) statt zurück im
         * Hauptbündel.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
          if (/[\\/]node_modules[\\/](framer-motion|motion|motion-dom|motion-utils)[\\/]/.test(id)) {
            return 'motion'
          }
          if (/[\\/]node_modules[\\/](dexie|zustand|use-sync-external-store)[\\/]/.test(id)) {
            return 'db'
          }
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      /*
       * 'prompt' statt 'autoUpdate': Bei 'autoUpdate' lädt der generierte
       * Registrierungs-Code die Seite selbsttätig neu, sobald ein neuer Service
       * Worker aktiviert ist — auch mitten in einer Spielrunde. Abschnitt 6.2 der
       * Spezifikation verlangt aber genau das Gegenteil: ein dezenter Balken, und
       * zwar nur auf ruhigen Screens. Deshalb Prompt-Modus plus eigener
       * UpdateBar (src/components/UpdateBar.tsx). Siehe DECISIONS.md, D17.
       */
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: manifestJson as Partial<ManifestOptions>,
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
