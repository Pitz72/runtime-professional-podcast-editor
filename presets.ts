import { AudioPreset, CompressorSettings } from './types';

export const VOICE_PRESETS: AudioPreset[] = [
  {
    name: "Modern Podcast Clarity",
    compressor: {
      threshold: -24,
      knee: 30,
      ratio: 4,
      attack: 0.003,
      release: 0.25,
    },
    equalizer: [
      { type: 'highpass', frequency: 80, Q: 1 },
      { type: 'peaking', frequency: 3500, Q: 1.5, gain: 2.5 },
      { type: 'highshelf', frequency: 10000, gain: 1.5 },
    ],
  },
  {
    name: "Warm Broadcast Voice",
    compressor: {
      threshold: -28,
      knee: 15,
      ratio: 3.5,
      attack: 0.01,
      release: 0.3,
    },
    equalizer: [
      { type: 'highpass', frequency: 70, Q: 1.2 },
      { type: 'lowshelf', frequency: 200, gain: 1.5 },
      { type: 'peaking', frequency: 2500, Q: 2, gain: -2 }, // Gentle scoop for warmth
      { type: 'highshelf', frequency: 12000, gain: 2.0 },
    ],
  },
  {
    name: "Telephone Effect",
    compressor: {
        threshold: -18,
        knee: 5,
        ratio: 8,
        attack: 0.001,
        release: 0.1,
    },
    equalizer: [
        { type: 'highpass', frequency: 300, Q: 2 },
        { type: 'peaking', frequency: 1000, Q: 1, gain: 3 },
        { type: 'lowpass', frequency: 3400, Q: 2 },
    ],
  },
];

export const MUSIC_PRESETS: AudioPreset[] = [
    {
        name: 'Punchy Pop/Rock',
        equalizer: [
            { type: 'lowshelf', frequency: 120, gain: 2.5 },
            { type: 'peaking', frequency: 500, Q: 1.5, gain: -1.5 },
            { type: 'highshelf', frequency: 8000, gain: 3.0 },
        ]
    },
    {
        name: 'Lofi Vibe',
        equalizer: [
            { type: 'highpass', frequency: 50, Q: 1},
            { type: 'lowpass', frequency: 6000, Q: 1.5 },
        ]
    },
    {
        name: 'Ambient Background',
        equalizer: [
            { type: 'highpass', frequency: 100, Q: 1 },
            { type: 'lowpass', frequency: 10000, Q: 1 },
            { type: 'highshelf', frequency: 5000, gain: -4 }, // Reduce high frequencies
        ]
    },
    {
        name: 'Podcast Music Bed',
        equalizer: [
            { type: 'highpass', frequency: 100, Q: 1.5 },
            { type: 'peaking', frequency: 3000, Q: 2, gain: -6 }, // Wide scoop for vocals
            { type: 'lowpass', frequency: 12000, Q: 1 },
        ]
    }
];

export const MASTERING_PRESETS: { name: string, settings: CompressorSettings }[] = [
    {
        name: 'Standard Broadcast',
        settings: {
            threshold: -14,
            knee: 10,
            ratio: 4,
            attack: 0.005,
            release: 0.3,
        }
    },
    {
        name: 'Subtle Glue',
        settings: {
            threshold: -8,
            knee: 5,
            ratio: 2,
            attack: 0.01,
            release: 0.2,
        }
    },
    {
        name: 'Loud & Punchy',
        settings: {
            threshold: -18,
            knee: 8,
            ratio: 6,
            attack: 0.002,
            release: 0.15,
        }
    }
];