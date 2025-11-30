import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store';
import { useLogger } from './useLogger';
import { useMemoryCleanup } from './useMemoryCleanup';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startTime: number;
  pauseTime: number;
  totalPausedTime: number;
}

interface RecordingOptions {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export const useRecording = (trackId: string) => {
  const logger = useLogger();
  const { registerResource, unregisterResource } = useMemoryCleanup();
  const store = useAppStore();

  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    startTime: 0,
    pauseTime: 0,
    totalPausedTime: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Get user media stream
  const getMediaStream = useCallback(async (options: RecordingOptions = {}) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: options.sampleRate || 44100,
          channelCount: options.channelCount || 2,
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Register for cleanup
      const resourceId = registerResource(
        `recording-stream-${trackId}`,
        'MediaStream',
        stream
      );

      logger.info('Media stream acquired for recording', {
        trackId,
        constraints,
        resourceId
      });

      return stream;
    } catch (error) {
      logger.error('Failed to get media stream', { trackId, error });
      throw error;
    }
  }, [trackId, registerResource, logger]);

  // Setup audio analysis for monitoring
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      source.connect(analyserRef.current);

      logger.debug('Audio analysis setup completed', { trackId });
    } catch (error) {
      logger.error('Failed to setup audio analysis', { trackId, error });
    }
  }, [trackId, logger]);

  // Get current audio levels for monitoring
  const getAudioLevels = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return null;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i] * dataArrayRef.current[i];
    }
    const rms = Math.sqrt(sum / dataArrayRef.current.length);
    const level = rms / 128; // Normalize to 0-1

    return {
      level,
      peak: Math.max(...dataArrayRef.current) / 255,
      frequencyData: Array.from(dataArrayRef.current)
    };
  }, []);

  // Start recording
  const startRecording = useCallback(async (options: RecordingOptions = {}) => {
    try {
      if (recordingState.isRecording) {
        logger.warn('Recording already in progress', { trackId });
        return;
      }

      const stream = await getMediaStream(options);
      setupAudioAnalysis(stream);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        logger.info('Recording stopped', { trackId, chunks: chunksRef.current.length });
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      const startTime = Date.now();
      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        startTime,
        pauseTime: 0,
        totalPausedTime: 0
      });

      logger.info('Recording started', { trackId, options });

      // Start monitoring loop
      const monitorLevels = () => {
        if (recordingState.isRecording && !recordingState.isPaused) {
          const levels = getAudioLevels();
          if (levels) {
            // Could emit levels for UI visualization
            // onAudioLevel?.(levels);
          }
          animationFrameRef.current = requestAnimationFrame(monitorLevels);
        }
      };
      monitorLevels();

    } catch (error) {
      logger.error('Failed to start recording', { trackId, error });
      throw error;
    }
  }, [recordingState, getMediaStream, setupAudioAnalysis, getAudioLevels, trackId, logger]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!recordingState.isRecording || recordingState.isPaused) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      const pauseTime = Date.now();

      setRecordingState(prev => ({
        ...prev,
        isPaused: true,
        pauseTime
      }));

      logger.info('Recording paused', { trackId });
    }
  }, [recordingState, trackId, logger]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!recordingState.isRecording || !recordingState.isPaused) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      const resumeTime = Date.now();
      const pausedDuration = resumeTime - recordingState.pauseTime;

      setRecordingState(prev => ({
        ...prev,
        isPaused: false,
        totalPausedTime: prev.totalPausedTime + pausedDuration,
        pauseTime: 0
      }));

      logger.info('Recording resumed', { trackId, pausedDuration });
    }
  }, [recordingState, trackId, logger]);

  // Stop recording and return audio blob
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!recordingState.isRecording || !mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      const stopTime = Date.now();
      const totalDuration = stopTime - recordingState.startTime - recordingState.totalPausedTime;

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        setRecordingState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          startTime: 0,
          pauseTime: 0,
          totalPausedTime: 0
        });

        logger.info('Recording completed', {
          trackId,
          duration: totalDuration,
          blobSize: blob.size
        });

        resolve(blob);
      };

      mediaRecorderRef.current.stop();

      // Stop monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    });
  }, [recordingState, trackId, logger]);

  // Cancel recording without saving
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
    }

    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      startTime: 0,
      pauseTime: 0,
      totalPausedTime: 0
    });

    chunksRef.current = [];

    logger.info('Recording cancelled', { trackId });
  }, [recordingState, trackId, logger]);

  // Update duration during recording
  useEffect(() => {
    if (!recordingState.isRecording || recordingState.isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const duration = now - recordingState.startTime - recordingState.totalPausedTime;

      setRecordingState(prev => ({
        ...prev,
        duration
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [recordingState.isRecording, recordingState.isPaused, recordingState.startTime, recordingState.totalPausedTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        unregisterResource(`recording-stream-${trackId}`);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [trackId, unregisterResource]);

  return {
    // State
    isRecording: recordingState.isRecording,
    isPaused: recordingState.isPaused,
    duration: recordingState.duration,

    // Methods
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,

    // Monitoring
    getAudioLevels,

    // Status
    canRecord: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  };
};