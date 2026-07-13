import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// NOTE: no API keys are ever injected into the renderer bundle.
// Secrets live exclusively in the main process environment.
export default defineConfig(() => {
  return {
    plugins: [react()],
    root: 'src/renderer',
    base: './', // Important for Electron
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    build: {
      outDir: '../../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    }
  };
});
