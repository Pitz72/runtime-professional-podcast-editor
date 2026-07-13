export enum TrackKind {
  Music = 'Music',
  Background = 'Background',
  Voice = 'Voice',
  FX = 'FX',
}

export interface AudioFile {
  id: string;
  name: string;
  /** Absolute path on disk. Files without a path cannot be reloaded after saving. */
  path?: string;
  type: string;
  duration: number;
  /** Decoded audio data, never serialized. */
  buffer?: AudioBuffer;
}

export interface AudioClip {
  id: string;
  fileId: string;
  trackId: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  offset: number; // start point within the original audio file
  isLooped?: boolean; // For music tracks
}

export interface CompressorSettings {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

export interface BiquadFilterSettings {
  type: 'lowshelf' | 'highshelf' | 'peaking' | 'lowpass' | 'highpass';
  frequency: number;
  gain?: number;
  Q?: number;
}

export interface AudioPreset {
    name: string;
    compressor?: CompressorSettings;
    equalizer: BiquadFilterSettings[];
}

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  clips: AudioClip[];
  volume: number; // 0 to 1
  isMuted: boolean;
  isSolo: boolean;
  effects?: AudioPreset;
  isDuckingEnabled?: boolean;
}

/** Version of the on-disk project schema, independent of the app version. */
export const PROJECT_SCHEMA_VERSION = 1;

export interface Project {
  schemaVersion?: number;
  name: string;
  tracks: Track[];
  files: AudioFile[];
  mastering?: CompressorSettings;
}

export type SelectedItem = {
  type: 'track' | 'clip' | 'file';
  id: string;
} | null;
