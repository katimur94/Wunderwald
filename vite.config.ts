import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'
import manifestJson from './src/pwa-manifest.json'

// WICHTIG: `base` muss dem GitHub-Repo-Namen entsprechen (Repo: katimur94/Wunderwald).
// Bei Umbenennung des Repos hier anpassen — sonst laden Assets auf GitHub Pages nicht.
export default defineConfig({
  base: '/Wunderwald/',
  build: { assetsInlineLimit: 0 },
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
