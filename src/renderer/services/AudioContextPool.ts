import logger from '../hooks/useLogger';

interface PooledAudioContext {
  context: AudioContext;
  lastUsed: number;
  isSuspended: boolean;
  id: string;
}

class AudioContextPool {
  private contexts: Map<string, PooledAudioContext> = new Map();
  private maxContexts: number = 3; // Maximum number of contexts to keep in pool
  private cleanupInterval: number;
  private logger = logger;

  constructor() {
    // Clean up unused contexts every 30 seconds
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup();
    }, 30000);
  }

  // Get an available audio context
  async getContext(sampleRate: number = 44100): Promise<AudioContext> {
    // Try to find an existing suspended context
    for (const [id, pooled] of this.contexts) {
      if (pooled.isSuspended && pooled.context.sampleRate === sampleRate) {
        pooled.lastUsed = Date.now();
        pooled.isSuspended = false;

        try {
          await pooled.context.resume();
          this.logger.debug(`Reused audio context ${id}`, { sampleRate });
          return pooled.context;
        } catch (error) {
          this.logger.warn(`Failed to resume context ${id}, removing from pool`, { error });
          this.contexts.delete(id);
        }
      }
    }

    // Create new context if none available
    return this.createNewContext(sampleRate);
  }

  // Create a new audio context
  private async createNewContext(sampleRate: number): Promise<AudioContext> {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate,
        latencyHint: 'interactive'
      });

      const id = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const pooled: PooledAudioContext = {
        context,
        lastUsed: Date.now(),
        isSuspended: false,
        id
      };

      this.contexts.set(id, pooled);

      // If we exceed max contexts, remove the oldest
      if (this.contexts.size > this.maxContexts) {
        this.removeOldestContext();
      }

      this.logger.debug(`Created new audio context ${id}`, { sampleRate });
      return context;
    } catch (error) {
      this.logger.error('Failed to create audio context', { error, sampleRate });
      throw error;
    }
  }

  // Return a context to the pool
  returnContext(context: AudioContext): void {
    const pooled = Array.from(this.contexts.values()).find(p => p.context === context);
    if (pooled) {
      pooled.lastUsed = Date.now();
      pooled.isSuspended = true;

      // Suspend the context to save resources
      context.suspend().catch(error => {
        this.logger.warn(`Failed to suspend context ${pooled.id}`, { error });
      });

      this.logger.debug(`Returned audio context ${pooled.id} to pool`);
    }
  }

  // Remove oldest unused context
  private removeOldestContext(): void {
    let oldest: PooledAudioContext | null = null;
    let oldestId = '';

    for (const [id, pooled] of this.contexts) {
      if (!oldest || pooled.lastUsed < oldest.lastUsed) {
        oldest = pooled;
        oldestId = id;
      }
    }

    if (oldest) {
      try {
        oldest.context.close();
        this.contexts.delete(oldestId);
        this.logger.debug(`Removed old audio context ${oldestId}`);
      } catch (error) {
        this.logger.warn(`Failed to close old context ${oldestId}`, { error });
      }
    }
  }

  // Clean up unused contexts
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [id, pooled] of this.contexts) {
      if (pooled.isSuspended && (now - pooled.lastUsed) > maxAge) {
        try {
          pooled.context.close();
          this.contexts.delete(id);
          this.logger.debug(`Cleaned up unused audio context ${id}`);
        } catch (error) {
          this.logger.warn(`Failed to cleanup context ${id}`, { error });
        }
      }
    }
  }

  // Get pool statistics
  getStats(): { total: number; suspended: number; active: number } {
    let suspended = 0;
    let active = 0;

    for (const pooled of this.contexts.values()) {
      if (pooled.isSuspended) {
        suspended++;
      } else {
        active++;
      }
    }

    return {
      total: this.contexts.size,
      suspended,
      active
    };
  }

  // Destroy the pool
  destroy(): void {
    clearInterval(this.cleanupInterval);

    for (const pooled of this.contexts.values()) {
      try {
        pooled.context.close();
      } catch (error) {
        this.logger.warn(`Failed to close context ${pooled.id} during destroy`, { error });
      }
    }

    this.contexts.clear();
    this.logger.info('Audio context pool destroyed');
  }
}

// Global instance
const audioContextPool = new AudioContextPool();

export default audioContextPool;

// Hook for using the audio context pool
export const useAudioContext = () => {
  // Use the hook for component-level logging if needed, or just use the global logger
  // For consistency with the original interface, we keep this.

  const getContext = async (sampleRate: number = 44100): Promise<AudioContext> => {
    return audioContextPool.getContext(sampleRate);
  };

  const returnContext = (context: AudioContext): void => {
    audioContextPool.returnContext(context);
  };

  const getPoolStats = () => {
    return audioContextPool.getStats();
  };

  return {
    getContext,
    returnContext,
    getPoolStats
  };
};
