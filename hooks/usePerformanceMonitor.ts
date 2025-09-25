import { useEffect, useRef, useCallback } from 'react';
import { useLogger } from './useLogger';

interface PerformanceMetrics {
  fps: number;
  memoryUsage?: number;
  audioContextLatency?: number;
  renderTime: number;
  interactionTime: number;
}

interface PerformanceEntry {
  timestamp: number;
  metrics: PerformanceMetrics;
  context?: string;
}

export const usePerformanceMonitor = () => {
  const logger = useLogger();
  const metricsRef = useRef<PerformanceEntry[]>([]);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const renderTimeRef = useRef(0);
  const interactionTimeRef = useRef(0);

  // FPS monitoring
  const updateFPS = useCallback(() => {
    frameCountRef.current++;
    const now = performance.now();
    const delta = now - lastTimeRef.current;

    if (delta >= 1000) { // Update every second
      fpsRef.current = Math.round((frameCountRef.current * 1000) / delta);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  }, []);

  // Memory monitoring (Chrome only)
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return undefined;
  }, []);

  // Audio context latency monitoring
  const measureAudioLatency = useCallback((audioContext: AudioContext) => {
    if (audioContext) {
      return audioContext.baseLatency + audioContext.outputLatency;
    }
    return undefined;
  }, []);

  // Collect current metrics
  const collectMetrics = useCallback((context?: string, audioContext?: AudioContext): PerformanceMetrics => {
    const memory = getMemoryUsage();
    const audioLatency = audioContext ? measureAudioLatency(audioContext) : undefined;

    return {
      fps: fpsRef.current,
      memoryUsage: memory?.used,
      audioContextLatency: audioLatency,
      renderTime: renderTimeRef.current,
      interactionTime: interactionTimeRef.current
    };
  }, [getMemoryUsage, measureAudioLatency]);

  // Record metrics
  const recordMetrics = useCallback((context?: string, audioContext?: AudioContext) => {
    const metrics = collectMetrics(context, audioContext);
    const entry: PerformanceEntry = {
      timestamp: Date.now(),
      metrics,
      context
    };

    metricsRef.current.push(entry);

    // Keep only last 100 entries
    if (metricsRef.current.length > 100) {
      metricsRef.current.shift();
    }

    // Log performance issues
    if (metrics.fps < 30) {
      logger.warn('Low FPS detected', { fps: metrics.fps, context });
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      logger.warn('High memory usage detected', {
        memoryUsage: metrics.memoryUsage,
        context
      });
    }

    if (metrics.audioContextLatency && metrics.audioContextLatency > 0.1) { // 100ms
      logger.warn('High audio latency detected', {
        latency: metrics.audioContextLatency,
        context
      });
    }

    return metrics;
  }, [collectMetrics, logger]);

  // Measure render time
  const measureRenderTime = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime;
    renderTimeRef.current = renderTime;

    if (renderTime > 16.67) { // More than one frame at 60fps
      logger.warn('Slow render detected', { renderTime, context: 'render' });
    }
  }, [logger]);

  // Measure interaction time
  const measureInteractionTime = useCallback((startTime: number, interaction: string) => {
    const interactionTime = performance.now() - startTime;
    interactionTimeRef.current = interactionTime;

    if (interactionTime > 100) { // More than 100ms
      logger.warn('Slow interaction detected', {
        interactionTime,
        interaction,
        context: 'interaction'
      });
    }
  }, [logger]);

  // Get performance history
  const getPerformanceHistory = useCallback(() => {
    return [...metricsRef.current];
  }, []);

  // Get average metrics
  const getAverageMetrics = useCallback(() => {
    if (metricsRef.current.length === 0) return null;

    const recentEntries = metricsRef.current.slice(-10); // Last 10 entries
    const avgMetrics: PerformanceMetrics = {
      fps: Math.round(recentEntries.reduce((sum, entry) => sum + entry.metrics.fps, 0) / recentEntries.length),
      memoryUsage: recentEntries.some(e => e.metrics.memoryUsage) ?
        Math.round(recentEntries.reduce((sum, entry) => sum + (entry.metrics.memoryUsage || 0), 0) / recentEntries.length) : undefined,
      audioContextLatency: recentEntries.some(e => e.metrics.audioContextLatency) ?
        recentEntries.reduce((sum, entry) => sum + (entry.metrics.audioContextLatency || 0), 0) / recentEntries.length : undefined,
      renderTime: Math.round(recentEntries.reduce((sum, entry) => sum + entry.metrics.renderTime, 0) / recentEntries.length),
      interactionTime: Math.round(recentEntries.reduce((sum, entry) => sum + entry.metrics.interactionTime, 0) / recentEntries.length)
    };

    return avgMetrics;
  }, []);

  // Clear performance history
  const clearHistory = useCallback(() => {
    metricsRef.current = [];
  }, []);

  // Auto-update FPS
  useEffect(() => {
    const updateLoop = () => {
      updateFPS();
      requestAnimationFrame(updateLoop);
    };

    const animationId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animationId);
  }, [updateFPS]);

  return {
    recordMetrics,
    measureRenderTime,
    measureInteractionTime,
    getPerformanceHistory,
    getAverageMetrics,
    clearHistory,
    collectMetrics
  };
};