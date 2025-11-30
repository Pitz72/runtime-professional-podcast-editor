import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    root: 'src/renderer',
    base: './', // Important for Electron
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
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
        manualChunks: {
          'audio-analysis': ['src/renderer/hooks/useAudioAnalysis.ts'],
          'ai-services': ['src/renderer/services/geminiService.ts'],
          'audio-processing': ['src/renderer/services/audioUtils.ts', 'src/renderer/workers/audioProcessor.worker.ts'],
          'ui-components': ['src/renderer/components/WaveformDisplay.tsx', 'src/renderer/components/PropertiesPanel.tsx']
        }
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    }
  };
});
