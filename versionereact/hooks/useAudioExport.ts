import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { useLogger } from './useLogger';
import { useAudioWorker } from './useAudioWorker';

export interface ExportOptions {
  format: 'wav' | 'mp3' | 'flac' | 'aac';
  sampleRate: 44100 | 48000 | 96000;
  bitDepth: 16 | 24 | 32;
  channels: 1 | 2;
  normalization: boolean;
  dithering: boolean;
  applyEffects: boolean;
  quality?: 'low' | 'medium' | 'high' | 'lossless';
}

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'encoding' | 'finalizing';
  progress: number; // 0-100
  currentOperation: string;
}

export const useAudioExport = () => {
  const logger = useLogger();
  const { processAudio } = useAudioWorker();
  const store = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  // Main export function
  const exportAudio = useCallback(async (
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob> => {
    const startTime = performance.now();
    setIsExporting(true);

    try {
      const { project } = store;
      if (!project || project.tracks.length === 0) {
        throw new Error('No project or tracks to export');
      }

      logger.info('Starting audio export', {
        format: options.format,
        sampleRate: options.sampleRate,
        tracks: project.tracks.length
      });

      // Stage 1: Prepare audio data
      setProgress({ stage: 'preparing', progress: 0, currentOperation: 'Preparing audio data...' });
      onProgress?.({ stage: 'preparing', progress: 0, currentOperation: 'Preparing audio data...' });

      const audioData = await prepareAudioData(project, options);
      setProgress({ stage: 'preparing', progress: 50, currentOperation: 'Audio data prepared' });
      onProgress?.({ stage: 'preparing', progress: 50, currentOperation: 'Audio data prepared' });

      // Stage 2: Render audio
      setProgress({ stage: 'rendering', progress: 50, currentOperation: 'Rendering audio...' });
      onProgress?.({ stage: 'rendering', progress: 50, currentOperation: 'Rendering audio...' });

      const renderedBuffer = await renderAudio(audioData, options, (progress) => {
        setProgress({ stage: 'rendering', progress: 50 + progress * 0.3, currentOperation: 'Rendering audio...' });
        onProgress?.({ stage: 'rendering', progress: 50 + progress * 0.3, currentOperation: 'Rendering audio...' });
      });

      // Stage 3: Encode to target format
      setProgress({ stage: 'encoding', progress: 80, currentOperation: 'Encoding audio...' });
      onProgress?.({ stage: 'encoding', progress: 80, currentOperation: 'Encoding audio...' });

      const encodedBlob = await encodeAudio(renderedBuffer, options);

      // Stage 4: Finalize
      setProgress({ stage: 'finalizing', progress: 95, currentOperation: 'Finalizing export...' });
      onProgress?.({ stage: 'finalizing', progress: 95, currentOperation: 'Finalizing export...' });

      const exportTime = performance.now() - startTime;

      logger.info('Audio export completed', {
        format: options.format,
        size: encodedBlob.size,
        duration: exportTime.toFixed(2)
      });

      setProgress({ stage: 'finalizing', progress: 100, currentOperation: 'Export completed!' });
      onProgress?.({ stage: 'finalizing', progress: 100, currentOperation: 'Export completed!' });

      return encodedBlob;

    } catch (error) {
      logger.error('Audio export failed', { error, options });
      throw error;
    } finally {
      setIsExporting(false);
      setTimeout(() => setProgress(null), 2000); // Clear progress after 2 seconds
    }
  }, [store, logger]);

  // Prepare audio data for rendering
  const prepareAudioData = useCallback(async (project: any, options: ExportOptions) => {
    const audioData: { buffer: AudioBuffer; startTime: number; effects?: any }[] = [];

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const file = project.files.find((f: any) => f.id === clip.fileId);
        if (file?.buffer) {
          audioData.push({
            buffer: file.buffer,
            startTime: clip.startTime,
            effects: options.applyEffects ? track.effects : undefined
          });
        }
      }
    }

    return audioData;
  }, []);

  // Render audio with effects and mixing
  const renderAudio = useCallback(async (
    audioData: any[],
    options: ExportOptions,
    onProgress: (progress: number) => void
  ): Promise<AudioBuffer> => {
    const offlineContext = new OfflineAudioContext(
      options.channels,
      Math.ceil(300 * options.sampleRate), // Assume 5 minutes max for now
      options.sampleRate
    );

    let processedCount = 0;

    for (const data of audioData) {
      const source = offlineContext.createBufferSource();
      source.buffer = data.buffer;

      let outputNode: AudioNode = source;

      // Apply effects if enabled
      if (options.applyEffects && data.effects) {
        outputNode = await applyEffectsChain(offlineContext, source, data.effects);
      }

      // Connect to destination
      outputNode.connect(offlineContext.destination);

      // Schedule playback
      source.start(data.startTime);

      processedCount++;
      onProgress(processedCount / audioData.length);
    }

    const renderedBuffer = await offlineContext.startRendering();

    // Apply post-processing
    let finalBuffer = renderedBuffer;

    if (options.normalization) {
      finalBuffer = await processAudio('NORMALIZE_AUDIO', { buffer: renderedBuffer });
    }

    return finalBuffer;
  }, [processAudio]);

  // Apply effects chain for export
  const applyEffectsChain = useCallback(async (
    context: OfflineAudioContext,
    source: AudioBufferSourceNode,
    effects: any
  ): Promise<AudioNode> => {
    let currentNode: AudioNode = source;

    if (effects.compressor) {
      const compressor = context.createDynamicsCompressor();
      Object.assign(compressor, effects.compressor);
      currentNode.connect(compressor);
      currentNode = compressor;
    }

    if (effects.equalizer) {
      for (const eq of effects.equalizer) {
        const filter = context.createBiquadFilter();
        Object.assign(filter, eq);
        currentNode.connect(filter);
        currentNode = filter;
      }
    }

    return currentNode;
  }, []);

  // Encode audio to target format
  const encodeAudio = useCallback(async (
    buffer: AudioBuffer,
    options: ExportOptions
  ): Promise<Blob> => {
    switch (options.format) {
      case 'wav':
        return encodeWAV(buffer, options);

      case 'mp3':
        return encodeMP3(buffer, options);

      case 'flac':
        return encodeFLAC(buffer, options);

      case 'aac':
        return encodeAAC(buffer, options);

      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }, []);

  // WAV encoding (lossless)
  const encodeWAV = useCallback((buffer: AudioBuffer, options: ExportOptions): Blob => {
    const length = buffer.length * options.channels * (options.bitDepth / 8);
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, options.channels, true);
    view.setUint32(24, options.sampleRate, true);
    view.setUint32(28, options.sampleRate * options.channels * (options.bitDepth / 8), true);
    view.setUint16(32, options.channels * (options.bitDepth / 8), true);
    view.setUint16(34, options.bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < options.channels; channel++) {
        const sample = buffer.getChannelData(channel)[i];

        if (options.bitDepth === 16) {
          const int16 = Math.max(-32768, Math.min(32767, sample * 32768));
          view.setInt16(offset, int16, true);
          offset += 2;
        } else if (options.bitDepth === 24) {
          const int32 = Math.max(-8388608, Math.min(8388607, sample * 8388608));
          view.setUint8(offset, int32 & 0xFF);
          view.setUint8(offset + 1, (int32 >> 8) & 0xFF);
          view.setUint8(offset + 2, (int32 >> 16) & 0xFF);
          offset += 3;
        } else if (options.bitDepth === 32) {
          view.setFloat32(offset, sample, true);
          offset += 4;
        }
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }, []);

  // MP3 encoding (lossy)
  const encodeMP3 = useCallback(async (buffer: AudioBuffer, options: ExportOptions): Promise<Blob> => {
    // For MP3, we'd typically use a library like lamejs
    // This is a simplified implementation
    logger.warn('MP3 encoding not fully implemented, falling back to WAV');
    return encodeWAV(buffer, { ...options, format: 'wav' });
  }, [encodeWAV, logger]);

  // FLAC encoding (lossless)
  const encodeFLAC = useCallback(async (buffer: AudioBuffer, options: ExportOptions): Promise<Blob> => {
    // FLAC encoding would require a specific library
    logger.warn('FLAC encoding not implemented, falling back to WAV');
    return encodeWAV(buffer, { ...options, format: 'wav' });
  }, [encodeWAV, logger]);

  // AAC encoding
  const encodeAAC = useCallback(async (buffer: AudioBuffer, options: ExportOptions): Promise<Blob> => {
    // AAC encoding would use MediaRecorder or a specific library
    logger.warn('AAC encoding not implemented, falling back to WAV');
    return encodeWAV(buffer, { ...options, format: 'wav' });
  }, [encodeWAV, logger]);

  // Export stems (individual tracks)
  const exportStems = useCallback(async (
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<{ trackName: string; blob: Blob }[]> => {
    const { project } = store;
    if (!project) throw new Error('No project to export');

    const stems: { trackName: string; blob: Blob }[] = [];
    let completed = 0;

    for (const track of project.tracks) {
      setProgress({
        stage: 'rendering',
        progress: (completed / project.tracks.length) * 100,
        currentOperation: `Rendering stem: ${track.name}`
      });
      onProgress?.({
        stage: 'rendering',
        progress: (completed / project.tracks.length) * 100,
        currentOperation: `Rendering stem: ${track.name}`
      });

      const stemBlob = await exportAudio(options, (progress) => {
        // Individual progress for this stem
      });

      stems.push({ trackName: track.name, blob: stemBlob });
      completed++;
    }

    return stems;
  }, [store, exportAudio]);

  // Download helper
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.info('File downloaded', { filename, size: blob.size });
  }, [logger]);

  return {
    exportAudio,
    exportStems,
    downloadBlob,
    isExporting,
    progress
  };
};