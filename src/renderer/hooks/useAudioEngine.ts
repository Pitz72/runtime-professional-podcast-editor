import { useState, useCallback, useRef, useEffect } from 'react';
import { Project } from '@shared/types';
import { buildAudioGraph, exportAudioBuffer, ExportFormat } from '../services/audioUtils';
import { MASTERING_PRESETS } from '../presets';

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  isExporting: boolean;
}

export interface AudioEngineActions {
  initAudioContext: () => AudioContext;
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBuffer>;
  playPause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  /** Render the mix offline and return the encoded blob (null if the project is empty). */
  exportAudio: (format?: ExportFormat) => Promise<Blob | null>;
}

export const useAudioEngine = (project: Project | null): [AudioEngineState, AudioEngineActions] => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const playbackStartTimeRef = useRef(0);
  const seekOffsetRef = useRef(0);

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
      setCurrentTime(0);
      seekOffsetRef.current = 0;
    }
  }, []);

  const playPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback(false);
      seekOffsetRef.current = currentTime;
    } else {
      const ac = initAudioContext();
      if (!project) return;

      const soloTrack = project.tracks.find(t => t.isSolo);
      const tracksToPlay = soloTrack ? [soloTrack] : project.tracks.filter(t => !t.isMuted);
      const totalDuration = Math.max(0, ...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)));

      const { sources } = buildAudioGraph(ac, project, tracksToPlay, totalDuration);
      sourceNodesRef.current.clear();

      playbackStartTimeRef.current = ac.currentTime;

      sources.forEach(({ source, clip }) => {
        const file = project.files.find(f => f.id === clip.fileId);
        const clipEndTime = clip.startTime + clip.duration;
        if (file && seekOffsetRef.current < clipEndTime) {
          const offsetInClip = Math.max(0, seekOffsetRef.current - clip.startTime);

          if (offsetInClip < clip.duration) {
            const durationToPlay = clip.duration - offsetInClip;
            const playAt = clip.startTime < seekOffsetRef.current ? ac.currentTime : ac.currentTime + (clip.startTime - seekOffsetRef.current);

            source.start(playAt, clip.offset + offsetInClip, durationToPlay);
            sourceNodesRef.current.set(clip.id, source);
          }
        }
      });

      setIsPlaying(true);

      const tick = () => {
        const acNow = audioContextRef.current?.currentTime;
        if (!acNow || !animationFrameRef.current) return;

        const newCurrentTime = seekOffsetRef.current + (acNow - playbackStartTimeRef.current);

        if (totalDuration > 0 && newCurrentTime >= totalDuration) {
          stopPlayback(true);
        } else {
          setCurrentTime(newCurrentTime);
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, [isPlaying, project, currentTime, stopPlayback, initAudioContext]);

  const seek = useCallback((time: number) => {
    if (isPlaying) return;
    const newTime = Math.max(0, time);
    setCurrentTime(newTime);
    seekOffsetRef.current = newTime;
  }, [isPlaying]);

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

      const offlineContext = new OfflineAudioContext(2, Math.ceil(totalDuration * 44100), 44100);
      const { sources } = buildAudioGraph(offlineContext, projectWithMastering, projectWithMastering.tracks.filter(t => !t.isMuted), totalDuration);

      sources.forEach(({ source, clip }) => {
        source.start(clip.startTime, clip.offset, clip.duration);
      });

      const renderedBuffer = await offlineContext.startRendering();

      return await exportAudioBuffer(renderedBuffer, { format, normalize: true });
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
    currentTime,
    isExporting,
  };

  const actions: AudioEngineActions = {
    initAudioContext,
    decodeAudioData,
    playPause,
    stop: () => stopPlayback(true),
    seek,
    exportAudio,
  };

  return [state, actions];
};
