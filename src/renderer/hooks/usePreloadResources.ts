import { useEffect } from 'react';

export const usePreloadResources = () => {
  useEffect(() => {
    // Preload critical audio processing resources
    const preloadAudioUtils = async () => {
      try {
        // Preload audio utilities
        await import('../services/audioUtils');
        console.log('Audio utils preloaded');
      } catch (error) {
        console.warn('Failed to preload audio utils:', error);
      }
    };

    // Preload waveform display for better UX
    const preloadWaveform = async () => {
      try {
        await import('../components/WaveformDisplay');
        console.log('Waveform display preloaded');
      } catch (error) {
        console.warn('Failed to preload waveform display:', error);
      }
    };

    // Start preloading after initial render
    const timer = setTimeout(() => {
      preloadAudioUtils();
      preloadWaveform();
    }, 1000); // Wait 1 second after mount

    return () => clearTimeout(timer);
  }, []);
};