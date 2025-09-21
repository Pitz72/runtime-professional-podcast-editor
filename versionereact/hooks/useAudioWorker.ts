import { useRef, useCallback, useEffect } from 'react';
import { useLogger } from './useLogger';

interface AudioProcessingJob {
  id: string;
  type: 'DECODE_BUFFER' | 'NORMALIZE_AUDIO' | 'ANALYZE_FREQUENCY' | 'APPLY_EFFECT';
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export const useAudioWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const jobsRef = useRef<Map<string, AudioProcessingJob>>(new Map());
  const logger = useLogger();

  // Initialize worker
  useEffect(() => {
    if (typeof Worker === 'undefined') {
      logger.warn('Web Workers not supported in this browser');
      return;
    }

    try {
      workerRef.current = new Worker('./workers/audioProcessor.worker.ts', { type: 'module' });

      workerRef.current.onmessage = (event) => {
        const { type, id, result, error } = event.data;
        const job = jobsRef.current.get(id);

        if (!job) {
          logger.warn('Received response for unknown job', { id });
          return;
        }

        jobsRef.current.delete(id);

        if (type === 'PROCESSING_COMPLETE') {
          logger.debug('Audio processing completed', { jobId: id, type: job.type });
          job.resolve(result);
        } else if (type === 'PROCESSING_ERROR') {
          logger.error('Audio processing failed', { jobId: id, type: job.type, error });
          job.reject(new Error(error));
        }
      };

      workerRef.current.onerror = (error) => {
        logger.error('Audio worker error', { error });
        // Reject all pending jobs
        jobsRef.current.forEach(job => {
          job.reject(new Error('Worker error'));
        });
        jobsRef.current.clear();
      };

      logger.info('Audio processing worker initialized');

    } catch (error) {
      logger.error('Failed to initialize audio worker', { error });
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        logger.info('Audio processing worker terminated');
      }
    };
  }, [logger]);

  // Send job to worker
  const processAudio = useCallback(<T = any>(
    type: AudioProcessingJob['type'],
    data: any
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Audio worker not available'));
        return;
      }

      const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: AudioProcessingJob = {
        id,
        type,
        data,
        resolve,
        reject
      };

      jobsRef.current.set(id, job);

      const message = { type, id, data };
      workerRef.current.postMessage(message);

      logger.debug('Audio processing job sent', { jobId: id, type });
    });
  }, [logger]);

  // Specific processing functions
  const decodeBuffer = useCallback(async (audioData: ArrayBuffer, sampleRate: number = 44100) => {
    return processAudio<AudioBuffer>('DECODE_BUFFER', { audioData, sampleRate });
  }, [processAudio]);

  const normalizeAudio = useCallback(async (buffer: AudioBuffer) => {
    return processAudio<AudioBuffer>('NORMALIZE_AUDIO', { buffer });
  }, [processAudio]);

  const analyzeFrequency = useCallback(async (buffer: AudioBuffer) => {
    return processAudio<{ frequencies: number[]; magnitudes: number[] }>('ANALYZE_FREQUENCY', { buffer });
  }, [processAudio]);

  const applyFade = useCallback(async (
    buffer: AudioBuffer,
    fadeInTime: number = 0.1,
    fadeOutTime: number = 0.1
  ) => {
    return processAudio<AudioBuffer>('APPLY_EFFECT', {
      effect: 'fade',
      buffer,
      fadeInTime,
      fadeOutTime
    });
  }, [processAudio]);

  // Get worker status
  const getWorkerStatus = useCallback(() => {
    return {
      available: !!workerRef.current,
      pendingJobs: jobsRef.current.size,
      jobs: Array.from(jobsRef.current.keys())
    };
  }, []);

  // Terminate worker manually
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      jobsRef.current.clear();
      logger.info('Audio processing worker manually terminated');
    }
  }, [logger]);

  return {
    processAudio,
    decodeBuffer,
    normalizeAudio,
    analyzeFrequency,
    applyFade,
    getWorkerStatus,
    terminateWorker,
    isAvailable: !!workerRef.current
  };
};