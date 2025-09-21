// Audio processing web worker
// This runs in a separate thread to avoid blocking the main UI thread

interface AudioProcessingMessage {
  type: 'PROCESS_AUDIO' | 'DECODE_BUFFER' | 'APPLY_EFFECT' | 'ANALYZE_FREQUENCY' | 'NORMALIZE_AUDIO';
  id: string;
  data: any;
}

interface AudioProcessingResponse {
  type: 'PROCESSING_COMPLETE' | 'PROCESSING_ERROR';
  id: string;
  result?: any;
  error?: string;
}

// Audio processing functions
const audioProcessors = {
  // Decode audio buffer
  async decodeBuffer(audioData: ArrayBuffer, sampleRate: number = 44100): Promise<AudioBuffer> {
    const audioContext = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)({
      sampleRate
    });

    try {
      const buffer = await audioContext.decodeAudioData(audioData);
      audioContext.close();
      return buffer;
    } catch (error) {
      audioContext.close();
      throw error;
    }
  },

  // Apply basic normalization
  normalizeAudio(buffer: AudioBuffer): AudioBuffer {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    // Find peak value
    let peak = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        peak = Math.max(peak, Math.abs(channelData[i]));
      }
    }

    // Create normalized buffer
    const normalizedBuffer = new AudioContext().createBuffer(numberOfChannels, length, sampleRate);
    const gain = peak > 0 ? 1.0 / peak : 1.0;

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalData = buffer.getChannelData(channel);
      const normalizedData = normalizedBuffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        normalizedData[i] = originalData[i] * gain;
      }
    }

    return normalizedBuffer;
  },

  // Basic frequency analysis
  analyzeFrequency(buffer: AudioBuffer): { frequencies: number[]; magnitudes: number[] } {
    const analyser = new AudioContext().createAnalyser();
    analyser.fftSize = 2048;

    const bufferSize = analyser.frequencyBinCount;
    const frequencyData = new Float32Array(bufferSize);

    // Simple FFT analysis (simplified for worker)
    const sampleRate = buffer.sampleRate;
    const nyquist = sampleRate / 2;
    const frequencies: number[] = [];
    const magnitudes: number[] = [];

    for (let i = 0; i < bufferSize; i++) {
      const frequency = (i * nyquist) / bufferSize;
      frequencies.push(frequency);

      // Simplified magnitude calculation
      let magnitude = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        const sampleIndex = Math.floor((i / bufferSize) * channelData.length);
        magnitude += Math.abs(channelData[sampleIndex] || 0);
      }
      magnitudes.push(magnitude / buffer.numberOfChannels);
    }

    return { frequencies, magnitudes };
  },

  // Apply simple fade in/out
  applyFade(buffer: AudioBuffer, fadeInTime: number = 0.1, fadeOutTime: number = 0.1): AudioBuffer {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    const fadeInSamples = Math.floor(fadeInTime * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutTime * sampleRate);

    const processedBuffer = new AudioContext().createBuffer(numberOfChannels, length, sampleRate);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalData = buffer.getChannelData(channel);
      const processedData = processedBuffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        let gain = 1.0;

        // Apply fade in
        if (i < fadeInSamples) {
          gain *= i / fadeInSamples;
        }

        // Apply fade out
        if (i > length - fadeOutSamples) {
          gain *= (length - i) / fadeOutSamples;
        }

        processedData[i] = originalData[i] * gain;
      }
    }

    return processedBuffer;
  }
};

// Message handler
self.onmessage = async (event: MessageEvent<AudioProcessingMessage>) => {
  const { type, id, data } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'DECODE_BUFFER':
        result = await audioProcessors.decodeBuffer(data.audioData, data.sampleRate);
        break;

      case 'NORMALIZE_AUDIO':
        result = audioProcessors.normalizeAudio(data.buffer);
        break;

      case 'ANALYZE_FREQUENCY':
        result = audioProcessors.analyzeFrequency(data.buffer);
        break;

      case 'APPLY_EFFECT':
        if (data.effect === 'fade') {
          result = audioProcessors.applyFade(data.buffer, data.fadeInTime, data.fadeOutTime);
        } else {
          throw new Error(`Unknown effect: ${data.effect}`);
        }
        break;

      default:
        throw new Error(`Unknown processing type: ${type}`);
    }

    // Send result back to main thread
    const response: AudioProcessingResponse = {
      type: 'PROCESSING_COMPLETE',
      id,
      result
    };

    (self as any).postMessage(response);

  } catch (error) {
    // Send error back to main thread
    const response: AudioProcessingResponse = {
      type: 'PROCESSING_ERROR',
      id,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };

    (self as any).postMessage(response);
  }
};

// Export for TypeScript (not actually used in worker)
export {};