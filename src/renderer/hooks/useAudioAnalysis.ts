import { useCallback, useState } from 'react';
import { useLogger } from './useLogger';
import { useAudioWorker } from './useAudioWorker';

export interface AudioAnalysisResult {
  // Basic properties
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  bitrate?: number;

  // Loudness and dynamics
  integratedLoudness: number; // LUFS
  truePeak: number; // dBTP
  dynamicRange: number; // LU
  crestFactor: number; // dB

  // Frequency analysis
  frequencyBands: {
    low: number; // 20-250 Hz
    mid: number; // 250-4000 Hz
    high: number; // 4000-20000 Hz
  };

  // Spectral characteristics
  spectralCentroid: number; // Hz
  spectralRolloff: number; // Hz
  spectralFlux: number;

  // Temporal features
  zeroCrossingRate: number;
  rms: number;

  // Quality metrics
  clippingDetected: boolean;
  dcOffset: number;
  noiseFloor: number; // dB

  // Advanced analysis
  beatPositions: number[]; // seconds
  tempo: number; // BPM
  key?: string; // Musical key
  genre?: string; // Genre classification
}

export const useAudioAnalysis = () => {
  const logger = useLogger();
  const { processAudio } = useAudioWorker();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze audio buffer
  const analyzeAudioBuffer = useCallback(async (
    buffer: AudioBuffer,
    options: {
      includeBeatDetection?: boolean;
      includeGenreClassification?: boolean;
      quality?: 'basic' | 'standard' | 'comprehensive';
    } = {}
  ): Promise<AudioAnalysisResult> => {
    const startTime = performance.now();
    setIsAnalyzing(true);

    try {
      const {
        includeBeatDetection = false,
        includeGenreClassification = false,
        quality = 'standard'
      } = options;

      // Basic properties
      const basicAnalysis = analyzeBasicProperties(buffer);

      // Loudness analysis
      const loudnessAnalysis = await analyzeLoudness(buffer);

      // Frequency analysis
      const frequencyAnalysis = analyzeFrequencyContent(buffer);

      // Temporal analysis
      const temporalAnalysis = analyzeTemporalFeatures(buffer);

      // Quality analysis
      const qualityAnalysis = analyzeQualityMetrics(buffer);

      let advancedAnalysis = {
        beatPositions: [] as number[],
        tempo: 0
      };

      // Advanced analysis (only for comprehensive quality)
      if (quality === 'comprehensive') {
        if (includeBeatDetection) {
          advancedAnalysis = {
            ...advancedAnalysis,
            ...await analyzeBeatDetection(buffer)
          };
        }

        if (includeGenreClassification) {
          advancedAnalysis = {
            ...advancedAnalysis,
            ...await analyzeGenre(buffer)
          };
        }
      }

      const result: AudioAnalysisResult = {
        ...basicAnalysis,
        ...loudnessAnalysis,
        ...frequencyAnalysis,
        ...temporalAnalysis,
        ...qualityAnalysis,
        ...advancedAnalysis
      };

      const analysisTime = performance.now() - startTime;
      logger.info('Audio analysis completed', {
        duration: buffer.duration.toFixed(2),
        analysisTime: analysisTime.toFixed(2),
        quality,
        loudness: result.integratedLoudness.toFixed(1)
      });

      return result;

    } catch (error) {
      logger.error('Audio analysis failed', { error });
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [logger]);

  // Basic properties analysis
  const analyzeBasicProperties = useCallback((buffer: AudioBuffer) => {
    return {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      numberOfChannels: buffer.numberOfChannels
    };
  }, []);

  // Loudness analysis (simplified LUFS calculation)
  const analyzeLoudness = useCallback(async (buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0); // Use first channel
    const blockSize = 1024;
    const overlap = 0.75;
    const stepSize = Math.floor(blockSize * (1 - overlap));

    let sum = 0;
    let sampleCount = 0;
    let peak = 0;

    // Process in blocks with overlap
    for (let i = 0; i < channelData.length; i += stepSize) {
      const block = channelData.slice(i, i + blockSize);
      if (block.length < blockSize) break;

      // Apply K-weighting filter (simplified)
      const filteredBlock = applyKWeighting(block);

      // Calculate RMS
      let blockSum = 0;
      for (const sample of filteredBlock) {
        blockSum += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }

      const rms = Math.sqrt(blockSum / filteredBlock.length);
      if (rms > 0) {
        sum += Math.pow(rms, 2);
        sampleCount++;
      }
    }

    const integratedLoudness = sampleCount > 0
      ? -0.691 + 10 * Math.log10(sum / sampleCount)
      : -Infinity;

    const truePeak = 20 * Math.log10(peak);

    return {
      integratedLoudness: Math.max(-60, Math.min(0, integratedLoudness)),
      truePeak: Math.max(-60, Math.min(20, truePeak)),
      dynamicRange: Math.abs(integratedLoudness - truePeak),
      crestFactor: truePeak - integratedLoudness
    };
  }, []);

  // Apply K-weighting filter (simplified)
  const applyKWeighting = useCallback((samples: Float32Array): Float32Array => {
    const filtered = new Float32Array(samples.length);
    const sampleRate = 44100; // Assume 44.1kHz

    // Simple high-pass filter approximation
    const fc = 40; // 40 Hz cutoff
    const rc = 1 / (fc * 2 * Math.PI);
    const dt = 1 / sampleRate;
    const alpha = dt / (rc + dt);

    let y = 0;
    for (let i = 0; i < samples.length; i++) {
      y = alpha * (samples[i] - y) + y;
      filtered[i] = y;
    }

    return filtered;
  }, []);

  // Frequency content analysis
  const analyzeFrequencyContent = useCallback((buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0);
    const fftSize = 2048;
    const sampleRate = buffer.sampleRate;

    // Simple FFT (using correlation method for basic analysis)
    const spectrum = computeSpectrum(channelData, fftSize);

    // Frequency bands
    const binSize = sampleRate / fftSize;
    const lowEnd = Math.floor(250 / binSize);
    const midEnd = Math.floor(4000 / binSize);

    let lowEnergy = 0, midEnergy = 0, highEnergy = 0;

    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = spectrum[i];

      if (i < lowEnd) {
        lowEnergy += magnitude;
      } else if (i < midEnd) {
        midEnergy += magnitude;
      } else {
        highEnergy += magnitude;
      }
    }

    // Normalize
    const totalEnergy = lowEnergy + midEnergy + highEnergy;
    const normalize = totalEnergy > 0 ? 1 / totalEnergy : 1;

    return {
      frequencyBands: {
        low: lowEnergy * normalize,
        mid: midEnergy * normalize,
        high: highEnergy * normalize
      },
      spectralCentroid: calculateSpectralCentroid(spectrum, binSize),
      spectralRolloff: calculateSpectralRolloff(spectrum, binSize, 0.85),
      spectralFlux: calculateSpectralFlux(spectrum)
    };
  }, []);

  // Simple spectrum computation
  const computeSpectrum = useCallback((samples: Float32Array, fftSize: number): Float32Array => {
    const spectrum = new Float32Array(fftSize / 2);

    for (let k = 0; k < fftSize / 2; k++) {
      let real = 0, imag = 0;

      for (let n = 0; n < fftSize; n++) {
        const angle = -2 * Math.PI * k * n / fftSize;
        const sample = samples[n] || 0;
        real += sample * Math.cos(angle);
        imag += sample * Math.sin(angle);
      }

      spectrum[k] = Math.sqrt(real * real + imag * imag) / fftSize;
    }

    return spectrum;
  }, []);

  // Spectral centroid calculation
  const calculateSpectralCentroid = useCallback((spectrum: Float32Array, binSize: number): number => {
    let numerator = 0, denominator = 0;

    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * binSize;
      const magnitude = spectrum[i];
      numerator += frequency * magnitude;
      denominator += magnitude;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }, []);

  // Spectral rolloff calculation
  const calculateSpectralRolloff = useCallback((
    spectrum: Float32Array,
    binSize: number,
    threshold: number
  ): number => {
    const totalEnergy = spectrum.reduce((sum, mag) => sum + mag, 0);
    const targetEnergy = totalEnergy * threshold;
    let cumulativeEnergy = 0;

    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i];
      if (cumulativeEnergy >= targetEnergy) {
        return i * binSize;
      }
    }

    return spectrum.length * binSize;
  }, []);

  // Spectral flux calculation
  const calculateSpectralFlux = useCallback((spectrum: Float32Array): number => {
    let flux = 0;
    for (let i = 1; i < spectrum.length; i++) {
      const diff = spectrum[i] - spectrum[i - 1];
      flux += diff > 0 ? diff : 0; // Only positive changes
    }
    return flux;
  }, []);

  // Temporal features analysis
  const analyzeTemporalFeatures = useCallback((buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    // Zero crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] > 0 && channelData[i - 1] <= 0) ||
        (channelData[i] < 0 && channelData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / (channelData.length / sampleRate);

    // RMS calculation
    let sum = 0;
    for (const sample of channelData) {
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / channelData.length);

    return {
      zeroCrossingRate,
      rms: 20 * Math.log10(rms) // Convert to dB
    };
  }, []);

  // Quality metrics analysis
  const analyzeQualityMetrics = useCallback((buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0);

    // Clipping detection
    let clippingDetected = false;
    for (const sample of channelData) {
      if (Math.abs(sample) >= 0.99) { // Close to 1.0 (0dBFS)
        clippingDetected = true;
        break;
      }
    }

    // DC offset calculation
    let dcOffset = 0;
    for (const sample of channelData) {
      dcOffset += sample;
    }
    dcOffset /= channelData.length;

    // Noise floor estimation (simplified)
    const sortedSamples = Array.from(channelData).sort((a, b) => Math.abs(a) - Math.abs(b));
    const noiseFloor = 20 * Math.log10(Math.abs(sortedSamples[Math.floor(sortedSamples.length * 0.1)] || 1e-6));

    return {
      clippingDetected,
      dcOffset: 20 * Math.log10(Math.abs(dcOffset) || 1e-6),
      noiseFloor: Math.max(-120, noiseFloor)
    };
  }, []);

  // Beat detection (simplified)
  const analyzeBeatDetection = useCallback(async (buffer: AudioBuffer) => {
    // Simplified beat detection using energy
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const energies: number[] = [];

    for (let i = 0; i < channelData.length; i += windowSize) {
      const window = channelData.slice(i, i + windowSize);
      let energy = 0;
      for (const sample of window) {
        energy += sample * sample;
      }
      energies.push(Math.sqrt(energy / window.length));
    }

    // Simple peak detection
    const beatPositions: number[] = [];
    const threshold = energies.reduce((sum, e) => sum + e, 0) / energies.length * 1.5;

    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > threshold &&
        energies[i] > energies[i - 1] &&
        energies[i] > energies[i + 1]) {
        beatPositions.push((i * windowSize) / sampleRate);
      }
    }

    // Estimate tempo
    if (beatPositions.length > 1) {
      const intervals = [];
      for (let i = 1; i < beatPositions.length; i++) {
        intervals.push(beatPositions[i] - beatPositions[i - 1]);
      }
      const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      const tempo = 60 / avgInterval;

      return {
        beatPositions,
        tempo: Math.round(tempo)
      };
    }

    return {
      beatPositions: [],
      tempo: 0
    };
  }, []);

  // Genre classification (placeholder)
  const analyzeGenre = useCallback(async (buffer: AudioBuffer) => {
    // This would require a machine learning model
    // For now, return placeholder
    return {
      genre: 'Unknown',
      key: 'Unknown'
    };
  }, []);

  return {
    analyzeAudioBuffer,
    isAnalyzing
  };
};