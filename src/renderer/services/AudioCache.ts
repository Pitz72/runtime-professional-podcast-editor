export class AudioCache {
  private static instance: AudioCache;
  private buffers: Map<string, AudioBuffer> = new Map();

  private constructor() {}

  static getInstance(): AudioCache {
    if (!AudioCache.instance) {
      AudioCache.instance = new AudioCache();
    }
    return AudioCache.instance;
  }

  get(id: string): AudioBuffer | undefined {
    return this.buffers.get(id);
  }

  set(id: string, buffer: AudioBuffer): void {
    this.buffers.set(id, buffer);
  }

  has(id: string): boolean {
    return this.buffers.has(id);
  }

  clear(): void {
      this.buffers.clear();
  }

  // Method to manually prune if needed, though browsers handle AudioBuffer GC if not referenced.
  // However, since we hold them in a Map, they are referenced.
  // We might need a mechanism to release buffers for files no longer in the project.
}

export const audioCache = AudioCache.getInstance();
