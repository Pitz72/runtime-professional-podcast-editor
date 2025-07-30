import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // File di ingresso del processo principale dell'App Electron.
        entry: 'electron/main.cjs',
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          // Notifica al processo di rendering di ricaricare la pagina
          // quando la build degli script di preload è completa.
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
})