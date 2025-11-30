import { AudioPreset, CompressorSettings } from '@shared/types';

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
    {
        name: "Deep & Rich Narrator",
        compressor: {
            threshold: -22,
            knee: 20,
            ratio: 3,
            attack: 0.005,
            release: 0.4,
        },
        equalizer: [
            { type: 'highpass', frequency: 60, Q: 1 },
            { type: 'lowshelf', frequency: 150, gain: 2.5 },
            { type: 'peaking', frequency: 300, Q: 1.5, gain: 1.5 },
            { type: 'peaking', frequency: 5000, Q: 2, gain: 2 },
            { type: 'highshelf', frequency: 8000, gain: 1 },
        ],
    },
    {
        name: "Bright & Present Interview",
        compressor: {
            threshold: -26,
            knee: 25,
            ratio: 4.5,
            attack: 0.002,
            release: 0.2,
        },
        equalizer: [
            { type: 'highpass', frequency: 90, Q: 1 },
            { type: 'peaking', frequency: 2000, Q: 1.5, gain: -1.5 },
            { type: 'peaking', frequency: 4000, Q: 2, gain: 3 },
            { type: 'peaking', frequency: 8000, Q: 3, gain: 2 },
            { type: 'highshelf', frequency: 12000, gain: 1.5 },
        ],
    },
    {
        name: "Vintage Radio Effect",
        compressor: {
            threshold: -20,
            knee: 10,
            ratio: 5,
            attack: 0.01,
            release: 0.5,
        },
        equalizer: [
            { type: 'highpass', frequency: 100, Q: 1 },
            { type: 'lowshelf', frequency: 250, gain: 3 },
            { type: 'peaking', frequency: 800, Q: 1, gain: -2 },
            { type: 'peaking', frequency: 3000, Q: 2, gain: 2 },
            { type: 'lowpass', frequency: 5000, Q: 1 },
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
            { type: 'highpass', frequency: 50, Q: 1 },
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
        name: 'Jazz/Soul Warmth',
        equalizer: [
            { type: 'lowshelf', frequency: 80, gain: 2 },
            { type: 'peaking', frequency: 250, Q: 1, gain: 1.5 },
            { type: 'peaking', frequency: 3000, Q: 2, gain: -2 },
            { type: 'peaking', frequency: 7000, Q: 3, gain: 2 },
            { type: 'highshelf', frequency: 10000, gain: 1 },
        ]
    },
    {
        name: 'Electronic/Dance',
        equalizer: [
            { type: 'highpass', frequency: 30, Q: 1 },
            { type: 'peaking', frequency: 120, Q: 1.5, gain: 3 },
            { type: 'peaking', frequency: 800, Q: 2, gain: -2 },
            { type: 'peaking', frequency: 5000, Q: 2.5, gain: 2 },
            { type: 'highshelf', frequency: 12000, gain: 1.5 },
        ]
    },
    {
        name: 'Classical/Acoustic',
        equalizer: [
            { type: 'highpass', frequency: 40, Q: 1 },
            { type: 'peaking', frequency: 200, Q: 1, gain: 1 },
            { type: 'peaking', frequency: 2000, Q: 2, gain: -1.5 },
            { type: 'peaking', frequency: 8000, Q: 3, gain: 2 },
            { type: 'highshelf', frequency: 15000, gain: 1 },
        ]
    },
    {
        name: 'Hip-Hop/Urban',
        equalizer: [
            { type: 'lowshelf', frequency: 60, gain: 3 },
            { type: 'peaking', frequency: 150, Q: 1.5, gain: 2 },
            { type: 'peaking', frequency: 800, Q: 2, gain: -1 },
            { type: 'peaking', frequency: 3000, Q: 2.5, gain: 1.5 },
            { type: 'highshelf', frequency: 10000, gain: 2 },
        ]
    },
    {
        name: 'Folk/Acoustic Bright',
        equalizer: [
            { type: 'highpass', frequency: 60, Q: 1 },
            { type: 'peaking', frequency: 300, Q: 1.5, gain: 1.5 },
            { type: 'peaking', frequency: 2500, Q: 2, gain: -1 },
            { type: 'peaking', frequency: 5000, Q: 2.5, gain: 2.5 },
            { type: 'highshelf', frequency: 12000, gain: 1.5 },
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
    },
    {
        name: 'Transparent Limiting',
        settings: {
            threshold: -12,
            knee: 6,
            ratio: 8,
            attack: 0.001,
            release: 0.1,
        }
    },
    {
        name: 'Vintage Tube Warmth',
        settings: {
            threshold: -16,
            knee: 12,
            ratio: 3.5,
            attack: 0.008,
            release: 0.4,
        }
    },
    {
        name: 'Modern Digital',
        settings: {
            threshold: -10,
            knee: 4,
            ratio: 5,
            attack: 0.0005,
            release: 0.08,
        }
    },
    {
        name: 'Gentle Evening Out',
        settings: {
            threshold: -6,
            knee: 8,
            ratio: 2.5,
            attack: 0.015,
            release: 0.25,
        }
    },
    {
        name: 'Aggressive Brickwall',
        settings: {
            threshold: -8,
            knee: 2,
            ratio: 12,
            attack: 0.0001,
            release: 0.05,
        }
    }
];