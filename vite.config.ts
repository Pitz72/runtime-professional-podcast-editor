import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // Separate chunk for audio analysis (heavy computation)
              'audio-analysis': ['hooks/useAudioAnalysis.ts'],
              // Separate chunk for AI services
              'ai-services': ['services/geminiService.ts'],
              // Separate chunk for advanced audio processing
              'audio-processing': ['services/audioUtils.ts', 'workers/audioProcessor.worker.ts'],
              // Separate chunk for UI components
              'ui-components': ['components/WaveformDisplay.tsx', 'components/PropertiesPanel.tsx'],
            }
          }
        }
      }
    };
});
