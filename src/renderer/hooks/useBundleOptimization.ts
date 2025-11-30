import React, { useEffect, useCallback } from 'react';
import { useLogger } from './useLogger';

// Bundle chunks definition
export const BUNDLE_CHUNKS = {
  // Core chunks (always loaded)
  CORE: ['react', 'react-dom', 'zustand', '@google/genai'],

  // Feature chunks (lazy loaded)
  TIMELINE: ['timeline', 'timeline-ruler', 'clip'],
  AUDIO_PROCESSING: ['audio-engine', 'audio-worker', 'audio-context-pool'],
  EFFECTS: ['effects', 'equalizer', 'compressor'],
  EXPORT: ['export', 'wav-encoder', 'stem-separator'],
  COLLABORATION: ['collaboration', 'yjs', 'webrtc'],
  ANALYSIS: ['analyzer', 'frequency-analysis', 'loudness-meter'],

  // UI chunks
  MODALS: ['modals', 'dialogs', 'tooltips'],
  ADVANCED_UI: ['waveform', 'automation-editor', 'effect-rack']
} as const;

interface BundleMetrics {
  chunkName: string;
  size: number;
  loadTime: number;
  cached: boolean;
  timestamp: number;
}

export const useBundleOptimization = () => {
  const logger = useLogger();

  // Preload critical chunks
  const preloadCritical = useCallback(async () => {
    const criticalChunks = [
      BUNDLE_CHUNKS.TIMELINE[0],
      BUNDLE_CHUNKS.AUDIO_PROCESSING[0],
      BUNDLE_CHUNKS.EFFECTS[0]
    ];

    logger.info('Preloading critical chunks', { chunks: criticalChunks });

    const preloadPromises = criticalChunks.map(async (chunk) => {
      const startTime = performance.now();

      try {
        // Use dynamic imports for preloading
        switch (chunk) {
          case 'timeline':
            await import('../components/Timeline');
            break;
          case 'audio-engine':
            await import('../services/AudioContextPool');
            break;
          case 'effects':

            break;
        }

        const loadTime = performance.now() - startTime;
        logger.debug('Critical chunk preloaded', { chunk, loadTime: `${loadTime.toFixed(2)}ms` });

      } catch (error) {
        logger.error('Failed to preload critical chunk', { chunk, error });
      }
    });

    await Promise.allSettled(preloadPromises);
  }, [logger]);

  // Preload on user interaction
  const preloadOnInteraction = useCallback(async (interaction: string) => {
    const chunksToPreload: string[] = [];

    switch (interaction) {
      case 'export':
        chunksToPreload.push(...BUNDLE_CHUNKS.EXPORT);
        break;
      case 'analyze':
        chunksToPreload.push(...BUNDLE_CHUNKS.ANALYSIS);
        break;
      case 'collaborate':
        chunksToPreload.push(...BUNDLE_CHUNKS.COLLABORATION);
        break;
      case 'advanced-ui':
        chunksToPreload.push(...BUNDLE_CHUNKS.ADVANCED_UI);
        break;
    }

    if (chunksToPreload.length > 0) {
      logger.debug('Preloading chunks on interaction', { interaction, chunks: chunksToPreload });

      // Preload in background without blocking
      setTimeout(async () => {
        for (const chunk of chunksToPreload) {
          try {
            await preloadChunk(chunk);
          } catch (error) {
            logger.warn('Failed to preload chunk', { chunk, error });
          }
        }
      }, 100);
    }
  }, [logger]);

  // Generic chunk preloader
  const preloadChunk = useCallback(async (chunkName: string): Promise<void> => {
    const startTime = performance.now();

    try {
      switch (chunkName) {
        // Timeline chunk
        case 'timeline':
          await import('../components/Timeline');
          break;
        case 'timeline-ruler':
          await import('../components/TimelineRuler');
          break;
        case 'clip':
          await import('../components/Clip');
          break;

        // Audio processing chunk
        case 'audio-engine':
          await import('../services/AudioContextPool');
          break;
        case 'audio-worker':
          await import('../workers/audioProcessor.worker');
          break;
        case 'audio-context-pool':
          await import('../services/AudioContextPool');
          break;

        // Effects chunk
        case 'effects':
        case 'wav-encoder':
          await import('../components/Editor'); // WAV encoding is in Editor
          break;

        // Default case for unknown chunks
        default:
          logger.warn('Unknown chunk requested for preload', { chunkName });
          return;
      }

      const loadTime = performance.now() - startTime;
      logger.debug('Chunk preloaded successfully', {
        chunkName,
        loadTime: `${loadTime.toFixed(2)}ms`
      });

    } catch (error) {
      logger.error('Failed to preload chunk', { chunkName, error });
      throw error;
    }
  }, [logger]);

  // Monitor bundle loading performance
  const monitorBundlePerformance = useCallback(() => {
    // Monitor resource timing for bundles
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const bundleResources = resources.filter(resource =>
        resource.name.includes('.js') &&
        (resource.name.includes('chunk') || resource.name.includes('bundle'))
      );

      bundleResources.forEach(resource => {
        const metrics: BundleMetrics = {
          chunkName: resource.name.split('/').pop() || 'unknown',
          size: resource.transferSize,
          loadTime: resource.responseEnd - resource.requestStart,
          cached: resource.transferSize === 0,
          timestamp: Date.now()
        };

        logger.debug('Bundle performance metrics', metrics);

        // Alert on slow loading
        if (metrics.loadTime > 1000 && !metrics.cached) {
          logger.warn('Slow bundle loading detected', metrics);
        }
      });
    }
  }, [logger]);

  // Initialize optimization on mount
  useEffect(() => {
    // Preload critical chunks after initial render
    const timer = setTimeout(() => {
      preloadCritical();
    }, 100);

    // Monitor performance
    monitorBundlePerformance();

    return () => clearTimeout(timer);
  }, [preloadCritical, monitorBundlePerformance]);

  // Prefetch strategy based on user behavior
  const prefetchBasedOnBehavior = useCallback((behavior: string) => {
    switch (behavior) {
      case 'frequent_export':
        preloadOnInteraction('export');
        break;
      case 'frequent_analysis':
        preloadOnInteraction('analyze');
        break;
      case 'collaboration_mode':
        preloadOnInteraction('collaborate');
        break;
    }
  }, [preloadOnInteraction]);

  return {
    preloadCritical,
    preloadOnInteraction,
    preloadChunk,
    monitorBundlePerformance,
    prefetchBasedOnBehavior
  };
};

// Utility for creating optimized lazy components
export const createOptimizedLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  chunkName?: string
) => {
  return React.lazy(() =>
    importFn().then(module => {
      // Log successful lazy loading
      console.debug(`Lazy component loaded: ${chunkName || 'unknown'}`);
      return module;
    }).catch(error => {
      console.error(`Failed to load lazy component: ${chunkName || 'unknown'}`, error);
      throw error;
    })
  );
};

// Bundle size monitoring
export const getBundleSizeEstimate = (): Record<string, number> => {
  // This would be populated by build tools
  return {
    'core': 250, // KB
    'timeline': 180,
    'audio-processing': 120,
    'effects': 80,
    'export': 90,
    'collaboration': 200,
    'analysis': 150,
    'advanced-ui': 220
  };
};

// Memory usage estimation for bundles
export const estimateBundleMemoryUsage = (bundleName: string): number => {
  const baseSizes = getBundleSizeEstimate();
  const sizeKB = baseSizes[bundleName] || 100;

  // Estimate memory usage (typically 2-3x bundle size)
  return sizeKB * 2.5;
};