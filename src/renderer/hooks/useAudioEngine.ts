import { useState, useCallback, useRef, useEffect } from 'react';
import { Project } from '@shared/types';
import { buildAudioGraph, ExportFormat } from '../services/audioUtils';
import { encodeAudioBuffer } from '../services/exportService';
import { MASTERING_PRESETS } from '../presets';

export interface AudioEngineState {
  isPlaying: boolean;
  isExporting: boolean;
}

export interface AudioEngineActions {
  initAudioContext: () => AudioContext;
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBuffer>;
  playPause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  /**
   * Playhead time without React re-renders: read it imperatively,
   * or subscribe for per-frame updates (returns an unsubscribe).
   */
  getCurrentTime: () => number;
  onTimeUpdate: (callback: (time: number) => void) => () => void;
  /** Render the mix offline and return the encoded blob (null if the project is empty). */
  exportAudio: (format?: ExportFormat) => Promise<Blob | null>;
}

export const useAudioEngine = (project: Project | null): [AudioEngineState, AudioEngineActions] => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const playbackStartTimeRef = useRef(0);

  // The playhead position is intentionally NOT React state: updating it at
  // 60fps through setState would re-render the whole editor on every frame.
  const currentTimeRef = useRef(0);
  const timeListenersRef = useRef<Set<(time: number) => void>>(new Set());

  const notifyTime = useCallback((time: number) => {
    currentTimeRef.current = time;
    timeListenersRef.current.forEach(listener => listener(time));
  }, []);

  const getCurrentTime = useCallback(() => currentTimeRef.current, []);

  const onTimeUpdate = useCallback((callback: (time: number) => void) => {
    timeListenersRef.current.add(callback);
    callback(currentTimeRef.current);
    return () => {
      timeListenersRef.current.delete(callback);
    };
  }, []);

  const initAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const decodeAudioData = useCallback((data: ArrayBuffer): Promise<AudioBuffer> => {
    const ac = initAudioContext();
    return ac.decodeAudioData(data);
  }, [initAudioContext]);

  const stopPlayback = useCallback((resetTime?: boolean) => {
    sourceNodesRef.current.forEach(source => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    sourceNodesRef.current.clear();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    setIsPlaying(false);
    if (resetTime) {
      notifyTime(0);
    }
  }, [notifyTime]);

  const playPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback(false);
    } else {
      const ac = initAudioContext();
      if (!project) return;

      const startOffset = currentTimeRef.current;

      const soloTrack = project.tracks.find(t => t.isSolo);
      const tracksToPlay = soloTrack ? [soloTrack] : project.tracks.filter(t => !t.isMuted);
      const totalDuration = Math.max(0, ...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)));

      const { sources } = buildAudioGraph(ac, project, tracksToPlay, totalDuration, startOffset);
      sourceNodesRef.current.clear();

      playbackStartTimeRef.current = ac.currentTime;

      sources.forEach(({ source, clip }) => {
        const file = project.files.find(f => f.id === clip.fileId);
        const clipEndTime = clip.startTime + clip.duration;
        if (file && startOffset < clipEndTime) {
          const offsetInClip = Math.max(0, startOffset - clip.startTime);

          if (offsetInClip < clip.duration) {
            const durationToPlay = clip.duration - offsetInClip;
            const playAt = clip.startTime < startOffset ? ac.currentTime : ac.currentTime + (clip.startTime - startOffset);

            source.start(playAt, clip.offset + offsetInClip, durationToPlay);
            sourceNodesRef.current.set(clip.id, source);
          }
        }
      });

      setIsPlaying(true);

      const tick = () => {
        const acNow = audioContextRef.current?.currentTime;
        if (!acNow || !animationFrameRef.current) return;

        const newCurrentTime = startOffset + (acNow - playbackStartTimeRef.current);

        if (totalDuration > 0 && newCurrentTime >= totalDuration) {
          stopPlayback(true);
        } else {
          notifyTime(newCurrentTime);
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, [isPlaying, project, stopPlayback, initAudioContext, notifyTime]);

  const seek = useCallback((time: number) => {
    if (isPlaying) return;
    notifyTime(Math.max(0, time));
  }, [isPlaying, notifyTime]);

  const exportAudio = useCallback(async (format: ExportFormat = 'wav'): Promise<Blob | null> => {
    if (!project) return null;

    setIsExporting(true);
    try {
      const totalDuration = Math.max(0, ...project.tracks.flatMap(t =>
        t.clips.map(c => c.startTime + c.duration)
      ));

      if (totalDuration === 0) {
        return null;
      }

      const projectWithMastering = {
        ...project,
        mastering: project.mastering || MASTERING_PRESETS[0].settings,
      };

      // Export honors solo exactly like playback does.
      const soloTrack = project.tracks.find(t => t.isSolo);
      const tracksToExport = soloTrack ? [soloTrack] : project.tracks.filter(t => !t.isMuted);

      // Render at the highest source sample rate (44.1kHz floor, 48kHz cap)
      // instead of forcing everything down to 44.1kHz.
      const maxSourceRate = Math.max(0, ...project.files.map(f => f.buffer?.sampleRate ?? 0));
      const renderSampleRate = Math.min(48000, Math.max(44100, maxSourceRate));

      const offlineContext = new OfflineAudioContext(2, Math.ceil(totalDuration * renderSampleRate), renderSampleRate);
      const { sources } = buildAudioGraph(offlineContext, projectWithMastering, tracksToExport, totalDuration, 0);

      sources.forEach(({ source, clip }) => {
        source.start(clip.startTime, clip.offset, clip.duration);
      });

      const renderedBuffer = await offlineContext.startRendering();

      // Encoding (normalization included) happens in a Web Worker.
      return await encodeAudioBuffer(renderedBuffer, format, true);
    } finally {
      setIsExporting(false);
    }
  }, [project]);

  useEffect(() => {
    return () => {
      stopPlayback(true);
    };
  }, [stopPlayback]);

  const state: AudioEngineState = {
    isPlaying,
    isExporting,
  };

  const actions: AudioEngineActions = {
    initAudioContext,
    decodeAudioData,
    playPause,
    stop: () => stopPlayback(true),
    seek,
    getCurrentTime,
    onTimeUpdate,
    exportAudio,
  };

  return [state, actions];
};
