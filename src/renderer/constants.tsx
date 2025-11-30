import React from 'react';
import { Track, TrackKind } from '@shared/types';
import { MusicIcon, MicIcon, SoundHighIcon, FXIcon } from './components/icons';

export const APP_VERSION = '1.0.0';
export const APP_VERSION_NAME = 'The Sonic Generational Evolution';
export const APP_AUTHOR = 'Simone Pizzi';
export const AI_PRESET_NAME = 'AI Enhanced';
export const APP_NAME = 'Runtime Radio Podcast Toolkit';
export const APP_DESCRIPTION = 'Professional Digital Audio Workstation for Podcast Production';

// Timeline display settings
export const ZOOM_LEVELS = [5, 10, 15, 25, 50, 75, 100, 150]; // Pixels per second
export const INITIAL_ZOOM_LEVEL = 4; // Corresponds to 50 in ZOOM_LEVELS


// Ducking parameters
export const DUCKING_AMOUNT = 0.2; // Duck to 20% of original volume
export const DUCKING_ATTACK = 0.05; // 50ms to duck down
export const DUCKING_RELEASE = 0.5; // 500ms to recover

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'track-1',
    name: 'Music',
    kind: TrackKind.Music,
    clips: [],
    volume: 0.8,
    isMuted: false,
    isSolo: false,
    isDuckingEnabled: true,
  },
  {
    id: 'track-2',
    name: 'Background',
    kind: TrackKind.Background,
    clips: [],
    volume: 0.4,
    isMuted: false,
    isSolo: false,
    isDuckingEnabled: true,
  },
  {
    id: 'track-3',
    name: 'Voice 1',
    kind: TrackKind.Voice,
    clips: [],
    volume: 1,
    isMuted: false,
    isSolo: false,
  },
  {
    id: 'track-4',
    name: 'Sound FX',
    kind: TrackKind.FX,
    clips: [],
    volume: 0.9,
    isMuted: false,
    isSolo: false,
  },
];

export const TRACK_META: { [key in TrackKind]: { color: string; icon: React.ReactNode } } = {
  [TrackKind.Music]: { color: 'bg-purple-800', icon: <MusicIcon className="w-4 h-4" /> },
  [TrackKind.Background]: { color: 'bg-blue-800', icon: <SoundHighIcon className="w-4 h-4" /> },
  [TrackKind.Voice]: { color: 'bg-green-800', icon: <MicIcon className="w-4 h-4" /> },
  [TrackKind.FX]: { color: 'bg-orange-800', icon: <FXIcon className="w-4 h-4" /> },
};