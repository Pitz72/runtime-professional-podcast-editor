import { useState, useCallback, useRef, useEffect } from 'react';
import { Project, Track, TrackKind, AudioFile, AudioClip } from '@shared/types';
import { buildAudioGraph, encodeWAV, exportAudioBuffer, ExportOptions } from '../services/audioUtils';
import { MASTERING_PRESETS } from '../presets';
import { audioCache } from '../services/AudioCache';
import { useAudioContext } from '../services/AudioContextPool';

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  isBuffering: boolean;
  isExporting: boolean;
}

export interface AudioEngineActions {
  initAudioContext: () => void;
  playPause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  exportAudio: (format?: 'wav' | 'mp3' | 'flac' | 'aac') => Promise<void>;
  hydrateBuffers: (files: AudioFile[]) => Promise<void>;
}

export const useAudioEngine = (project: Project | null): [AudioEngineState, AudioEngineActions] => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const playbackStartTimeRef = useRef(0);
  const seekOffsetRef = useRef(0);

  const { getContext, returnContext } = useAudioContext();

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = await getContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [getContext]);

  const hydrateBuffers = useCallback(async (files: AudioFile[]) => {
    // Check if we need hydration (if buffer is missing but we have url)
    // OR if we have the buffer in cache but not in the file object
    const filesToHydrate = files.filter(f => (!f.buffer && f.url) || (f.url && audioCache.has(f.id) && !f.buffer));

    if (filesToHydrate.length === 0) return;

    setIsBuffering(true);

    // Ensure we have a context for decoding
    if (!audioContextRef.current) {
        await initAudioContext();
    }
    const ac = audioContextRef.current;
    if (!ac) {
      setIsBuffering(false);
      return;
    }

    await Promise.all(filesToHydrate.map(async (file) => {
      try {
        // First check cache
        if (audioCache.has(file.id)) {
            file.buffer = audioCache.get(file.id);
            if (file.buffer) {
                 file.duration = file.buffer.duration;
            }
            return;
        }

        // Decode if not in cache
        const response = await fetch(file.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ac.decodeAudioData(arrayBuffer);

        // Cache and assign
        audioCache.set(file.id, audioBuffer);
        file.buffer = audioBuffer;
        file.duration = audioBuffer.duration;
      } catch (error) {
        console.error(`Failed to load audio for ${file.name}:`, error);
      }
    }));

    setIsBuffering(false);
  }, [initAudioContext]);

  const stopPlayback = useCallback((resetTime?: boolean) => {
    sourceNodesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
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

  const playPause = useCallback(async () => {
    if (isPlaying) {
      stopPlayback(false);
      seekOffsetRef.current = currentTime;
    } else {
      await initAudioContext();
      const ac = audioContextRef.current;
      if (!ac || !project) return;

      ac.resume();

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

  const exportAudio = useCallback(async (format: 'wav' | 'mp3' | 'flac' | 'aac' = 'wav') => {
    if (!project || !window.OfflineAudioContext) {
      alert('Audio export is not supported in this browser.');
      return;
    }

    setIsExporting(true);

    try {
      const totalDuration = Math.max(0, ...project.tracks.flatMap(t => {
        return t.clips.map(c => {
          if ((t.kind === TrackKind.Music || t.kind === TrackKind.Background) && c.isLooped) {
            return c.startTime + c.duration;
          }
          return c.startTime + c.duration;
        });
      }));

      if (totalDuration === 0) {
        alert("Project is empty. Add some clips to export.");
        setIsExporting(false);
        return;
      }

      const projectWithMastering = {
        ...project,
        mastering: project.mastering || MASTERING_PRESETS[0].settings,
      }

      const offlineContext = new OfflineAudioContext(2, Math.ceil(totalDuration * 44100), 44100);
      const { sources } = buildAudioGraph(offlineContext, projectWithMastering, projectWithMastering.tracks.filter(t => !t.isMuted), totalDuration);

      sources.forEach(({ source, clip }) => {
        source.start(clip.startTime, clip.offset, clip.duration);
      });

      const renderedBuffer = await offlineContext.startRendering();

      const exportOptions: ExportOptions = {
        format,
        quality: 'professional',
        normalize: true,
        includeEffects: true
      };

      const exportedBlob = await exportAudioBuffer(renderedBuffer, exportOptions);

      const url = URL.createObjectURL(exportedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting audio:", error);
      alert("An error occurred during audio export. See console for details.");
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
    isBuffering,
    isExporting
  };

  const actions: AudioEngineActions = {
    initAudioContext,
    playPause,
    stop: () => stopPlayback(true),
    seek,
    exportAudio,
    hydrateBuffers
  };

  return [state, actions];
};