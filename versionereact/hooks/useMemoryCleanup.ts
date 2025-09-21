import { useEffect, useRef, useCallback } from 'react';
import { useLogger } from './useLogger';

interface MemoryResource {
  id: string;
  type: 'AudioBuffer' | 'AudioContext' | 'MediaStream' | 'Blob' | 'URL' | 'Timer' | 'EventListener';
  resource: any;
  cleanup?: () => void;
  timestamp: number;
}

export const useMemoryCleanup = () => {
  const resourcesRef = useRef<Map<string, MemoryResource>>(new Map());
  const logger = useLogger();

  // Register a resource for cleanup
  const registerResource = useCallback((
    id: string,
    type: MemoryResource['type'],
    resource: any,
    cleanup?: () => void
  ) => {
    const memoryResource: MemoryResource = {
      id,
      type,
      resource,
      cleanup,
      timestamp: Date.now()
    };

    resourcesRef.current.set(id, memoryResource);
    logger.debug('Resource registered for cleanup', { id, type });

    return id;
  }, [logger]);

  // Unregister a resource
  const unregisterResource = useCallback((id: string) => {
    const resource = resourcesRef.current.get(id);
    if (resource) {
      resourcesRef.current.delete(id);
      logger.debug('Resource unregistered from cleanup', { id: resource.id, type: resource.type });
    }
  }, [logger]);

  // Clean up a specific resource
  const cleanupResource = useCallback((id: string) => {
    const resource = resourcesRef.current.get(id);
    if (!resource) return;

    try {
      // Custom cleanup function
      if (resource.cleanup) {
        resource.cleanup();
      } else {
        // Default cleanup based on type
        switch (resource.type) {
          case 'AudioBuffer':
            // AudioBuffers are garbage collected automatically
            break;
          case 'AudioContext':
            if (resource.resource && resource.resource.state !== 'closed') {
              resource.resource.close();
            }
            break;
          case 'MediaStream':
            if (resource.resource) {
              resource.resource.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
            break;
          case 'Blob':
          case 'URL':
            if (resource.resource && typeof resource.resource.revokeObjectURL === 'function') {
              resource.resource.revokeObjectURL(resource.resource);
            }
            break;
          case 'Timer':
            if (typeof resource.resource === 'number') {
              clearTimeout(resource.resource);
            } else if (resource.resource) {
              clearInterval(resource.resource);
            }
            break;
        }
      }

      resourcesRef.current.delete(id);
      logger.debug('Resource cleaned up', { id: resource.id, type: resource.type });

    } catch (error) {
      logger.error('Failed to cleanup resource', { id: resource.id, type: resource.type, error });
    }
  }, [logger]);

  // Clean up all resources
  const cleanupAll = useCallback(() => {
    const resourceIds = Array.from(resourcesRef.current.keys());
    resourceIds.forEach(id => cleanupResource(id));
    logger.info('All resources cleaned up', { count: resourceIds.length });
  }, [cleanupResource, logger]);

  // Get memory statistics
  const getMemoryStats = useCallback(() => {
    const resources = Array.from(resourcesRef.current.values());
    const stats = {
      total: resources.length,
      byType: {} as Record<string, number>,
      oldest: resources.length > 0 ? Math.min(...resources.map((r: MemoryResource) => r.timestamp)) : null,
      newest: resources.length > 0 ? Math.max(...resources.map((r: MemoryResource) => r.timestamp)) : null
    };

    resources.forEach((resource: MemoryResource) => {
      stats.byType[resource.type] = (stats.byType[resource.type] || 0) + 1;
    });

    return stats;
  }, []);

  // Auto-cleanup old resources
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      const oldResources: string[] = [];
      resourcesRef.current.forEach((resource, id) => {
        if (now - resource.timestamp > maxAge) {
          oldResources.push(id);
        }
      });

      oldResources.forEach(id => {
        logger.debug('Auto-cleaning old resource', { id });
        cleanupResource(id);
      });

      if (oldResources.length > 0) {
        logger.info('Auto-cleaned old resources', { count: oldResources.length });
      }

    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [cleanupResource, logger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  // Memory pressure detection (Chrome only)
  useEffect(() => {
    const handleMemoryPressure = () => {
      logger.warn('Memory pressure detected, cleaning up resources');
      cleanupAll();
    };

    if ('memory' in performance) {
      // Listen for memory pressure (if supported)
      window.addEventListener('beforeunload', cleanupAll);

      // Check memory usage periodically
      const memoryCheckInterval = setInterval(() => {
        const memory = (performance as any).memory;
        const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        if (usedPercent > 80) {
          logger.warn('High memory usage detected', {
            usedPercent: usedPercent.toFixed(1),
            usedMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(1),
            limitMB: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)
          });

          // Force garbage collection hint
          if (window.gc) {
            window.gc();
          }
        }
      }, 30000); // Check every 30 seconds

      return () => {
        clearInterval(memoryCheckInterval);
        window.removeEventListener('beforeunload', cleanupAll);
      };
    }

    return () => {
      window.removeEventListener('beforeunload', cleanupAll);
    };
  }, [cleanupAll, logger]);

  return {
    registerResource,
    unregisterResource,
    cleanupResource,
    cleanupAll,
    getMemoryStats
  };
};

// Utility functions for common resource types
export const createAudioBufferResource = (id: string, buffer: AudioBuffer) => ({
  id,
  type: 'AudioBuffer' as const,
  resource: buffer
});

export const createAudioContextResource = (id: string, context: AudioContext) => ({
  id,
  type: 'AudioContext' as const,
  resource: context,
  cleanup: () => {
    if (context && context.state !== 'closed') {
      context.close();
    }
  }
});

export const createMediaStreamResource = (id: string, stream: MediaStream) => ({
  id,
  type: 'MediaStream' as const,
  resource: stream,
  cleanup: () => {
    stream.getTracks().forEach(track => track.stop());
  }
});

export const createBlobResource = (id: string, blob: Blob) => ({
  id,
  type: 'Blob' as const,
  resource: blob
});

export const createURLResource = (id: string, url: string) => ({
  id,
  type: 'URL' as const,
  resource: { url },
  cleanup: () => {
    URL.revokeObjectURL(url);
  }
});

export const createTimerResource = (id: string, timerId: number, isInterval = false) => ({
  id,
  type: 'Timer' as const,
  resource: timerId,
  cleanup: () => {
    if (isInterval) {
      clearInterval(timerId);
    } else {
      clearTimeout(timerId);
    }
  }
});