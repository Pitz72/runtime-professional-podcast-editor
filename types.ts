export enum TrackKind {
  Music = 'Music',
  Background = 'Background',
  Voice = 'Voice',
  FX = 'FX',
}

export interface AudioFile {
  id: string;
  name: string;
  url: string; // Object URL for saving/re-loading
  type: string;
  duration: number;
  buffer?: AudioBuffer; // Store the decoded audio data for performance
}

export interface AudioClip {
  id:string;
  fileId: string;
  trackId: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  offset: number; // start point within the original audio file
  normalizationGain?: number; // Gain in dB to be applied for loudness normalization
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

export interface Project {
  name: string;
  tracks: Track[];
  files: AudioFile[];
  mastering?: CompressorSettings;
}