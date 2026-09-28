// Audio graph construction and file validation, shared by playback and export.

import { Project, Track, TrackKind } from '@shared/types';
import { DUCKING_AMOUNT, DUCKING_ATTACK, DUCKING_RELEASE } from '../constants';

export type { ExportFormat } from './encoders';
export { getExportMimeType } from './encoders';

// NOTE: AudioContext is NOT created here. It must be created lazily
// after a user interaction (browser policy). Each hook manages its own context.

/**
 * Build the audio graph for playback or offline export.
 *
 * @param startOffset Timeline position (seconds) playback starts from.
 *                    Ducking automation is scheduled relative to it, so
 *                    resuming mid-timeline keeps ducking in sync.
 */
export const buildAudioGraph = (
    context: BaseAudioContext,
    project: Project,
    tracksToProcess: Track[],
    totalDuration: number,
    startOffset: number = 0,
) => {
    const masterBus = context.createGain();

    // --- MASTERING CHAIN ---
    if (project.mastering) {
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(project.mastering.threshold, context.currentTime);
        limiter.knee.setValueAtTime(project.mastering.knee, context.currentTime);
        limiter.ratio.setValueAtTime(project.mastering.ratio, context.currentTime);
        limiter.attack.setValueAtTime(project.mastering.attack, context.currentTime);
        limiter.release.setValueAtTime(project.mastering.release, context.currentTime);
        masterBus.connect(limiter);
        limiter.connect(context.destination);
    } else {
        masterBus.connect(context.destination);
    }

    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    masterBus.connect(analyser);

    const sources: {
        source: AudioBufferSourceNode,
        clip: {
            id: string;
            fileId: string;
            startTime: number;
            duration: number;
            offset: number;
            fadeIn?: number;
            fadeOut?: number;
            /** Set on looped clips: length of one loop iteration in seconds. */
            loopSegmentDuration?: number;
        }
    }[] = [];

    // Only audible (non-muted, non-excluded by solo) voice tracks trigger ducking
    const hasSolo = project.tracks.some(t => t.isSolo);
    const audibleVoiceTracks = project.tracks.filter(
        t => t.kind === TrackKind.Voice && !t.isMuted && (!hasSolo || t.isSolo)
    );
    const voiceClips = audibleVoiceTracks.flatMap(t => t.clips);

    const voiceEvents: { time: number, type: 'start' | 'end' }[] = [];
    if (voiceClips.length > 0) {
        voiceClips.forEach(c => {
            voiceEvents.push({ time: c.startTime, type: 'start' });
            voiceEvents.push({ time: c.startTime + c.duration, type: 'end' });
        });
        voiceEvents.sort((a, b) => a.time - b.time);
    }

    tracksToProcess.forEach(track => {
        const trackGain = context.createGain();
        trackGain.gain.setValueAtTime(track.volume, context.currentTime);
        trackGain.connect(masterBus);

        // --- DUCKING LOGIC ---
        if ((track.kind === TrackKind.Music || track.kind === TrackKind.Background) && track.isDuckingEnabled && voiceEvents.length > 0) {
            const gainParam = trackGain.gain;

            // Voices already speaking at the start position determine the initial gain.
            let activeVoices = voiceClips.filter(
                c => c.startTime <= startOffset && c.startTime + c.duration > startOffset
            ).length;

            gainParam.setValueAtTime(
                activeVoices > 0 ? track.volume * DUCKING_AMOUNT : track.volume,
                context.currentTime
            );

            voiceEvents
                .filter(event => event.time > startOffset)
                .forEach(event => {
                    const previousActiveVoices = activeVoices;
                    activeVoices += (event.type === 'start' ? 1 : -1);

                    const when = context.currentTime + (event.time - startOffset);

                    // Anchor the current value right before each ramp, otherwise the
                    // ramp would start from the previous automation point — possibly
                    // minutes earlier — producing minutes-long pseudo-fades.
                    if (previousActiveVoices === 0 && activeVoices > 0) {
                        gainParam.setValueAtTime(track.volume, when);
                        gainParam.linearRampToValueAtTime(track.volume * DUCKING_AMOUNT, when + DUCKING_ATTACK);
                    } else if (previousActiveVoices > 0 && activeVoices === 0) {
                        gainParam.setValueAtTime(track.volume * DUCKING_AMOUNT, when);
                        gainParam.linearRampToValueAtTime(track.volume, when + DUCKING_RELEASE);
                    }
                });
        }

        // --- EFFECTS CHAIN ---
        // Build the chain back-to-front so that trackHead is always the entry
        // point sources connect to: source -> [compressor] -> [EQ...] -> gain.
        let trackHead: AudioNode = trackGain;

        if (track.effects) {
            const { compressor: compressorSettings, equalizer: eqSettingsList } = track.effects;

            if (eqSettingsList && eqSettingsList.length > 0) {
                [...eqSettingsList].reverse().forEach(eqSettings => {
                    const filter = context.createBiquadFilter();
                    filter.type = eqSettings.type;
                    filter.frequency.setValueAtTime(eqSettings.frequency, context.currentTime);
                    if (typeof eqSettings.gain === 'number') filter.gain.setValueAtTime(eqSettings.gain, context.currentTime);
                    if (typeof eqSettings.Q === 'number') filter.Q.setValueAtTime(eqSettings.Q, context.currentTime);
                    filter.connect(trackHead);
                    trackHead = filter;
                });
            }

            if (compressorSettings) {
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(compressorSettings.threshold, context.currentTime);
                compressor.knee.setValueAtTime(compressorSettings.knee, context.currentTime);
                compressor.ratio.setValueAtTime(compressorSettings.ratio, context.currentTime);
                compressor.attack.setValueAtTime(compressorSettings.attack, context.currentTime);
                compressor.release.setValueAtTime(compressorSettings.release, context.currentTime);
                compressor.connect(trackHead);
                trackHead = compressor;
            }
        }

        // --- SOURCE NODES ---
        track.clips.forEach(clip => {
            const file = project.files.find(f => f.id === clip.fileId);
            if (file?.buffer) {
                if ((track.kind === TrackKind.Music || track.kind === TrackKind.Background) && clip.isLooped && clip.duration > 0) {
                    // Native looping: ONE source node with a loop region, instead
                    // of hundreds of stacked nodes for long projects.
                    const source = context.createBufferSource();
                    source.buffer = file.buffer;
                    source.loop = true;
                    source.loopStart = clip.offset;
                    source.loopEnd = Math.min(clip.offset + clip.duration, file.buffer.duration);
                    source.connect(trackHead);
                    sources.push({
                        source,
                        clip: {
                            ...clip,
                            // The looped clip occupies the timeline until the project ends.
                            duration: Math.max(0, totalDuration - clip.startTime),
                            loopSegmentDuration: clip.duration,
                        },
                    });
                } else {
                    const source = context.createBufferSource();
                    source.buffer = file.buffer;

                    // Micro-fade and custom fade-in/fade-out via dedicated clip gain
                    const clipGain = context.createGain();
                    source.connect(clipGain);
                    clipGain.connect(trackHead);

                    const MICRO_FADE = 0.005; // 5ms micro-fade to eliminate clicks
                    const fadeIn = Math.max(MICRO_FADE, clip.fadeIn ?? MICRO_FADE);
                    const fadeOut = Math.max(MICRO_FADE, clip.fadeOut ?? MICRO_FADE);
                    const safeFadeIn = Math.min(fadeIn, clip.duration / 2);
                    const safeFadeOut = Math.min(fadeOut, clip.duration / 2);

                    const clipStartTimeline = clip.startTime;
                    const clipEndTimeline = clip.startTime + clip.duration;

                    if (startOffset <= clipStartTimeline) {
                        const startAt = context.currentTime + (clipStartTimeline - startOffset);
                        const endAt = startAt + clip.duration;
                        clipGain.gain.setValueAtTime(0, startAt);
                        clipGain.gain.linearRampToValueAtTime(1, startAt + safeFadeIn);
                        if (clip.duration > safeFadeIn + safeFadeOut) {
                            clipGain.gain.setValueAtTime(1, endAt - safeFadeOut);
                        }
                        clipGain.gain.linearRampToValueAtTime(0, endAt);
                    } else if (startOffset < clipEndTimeline) {
                        const elapsed = startOffset - clipStartTimeline;
                        const remaining = clip.duration - elapsed;
                        const now = context.currentTime;
                        const endAt = now + remaining;

                        if (elapsed < safeFadeIn) {
                            const initialGain = Math.max(0, elapsed / safeFadeIn);
                            clipGain.gain.setValueAtTime(0, now);
                            clipGain.gain.linearRampToValueAtTime(initialGain, now + MICRO_FADE);
                            clipGain.gain.linearRampToValueAtTime(1, now + (safeFadeIn - elapsed));
                            if (clip.duration > safeFadeIn + safeFadeOut) {
                                clipGain.gain.setValueAtTime(1, endAt - safeFadeOut);
                            }
                            clipGain.gain.linearRampToValueAtTime(0, endAt);
                        } else if (elapsed >= clip.duration - safeFadeOut) {
                            const remainingFadeOut = clipEndTimeline - startOffset;
                            const initialGain = Math.max(0, remainingFadeOut / safeFadeOut);
                            clipGain.gain.setValueAtTime(0, now);
                            clipGain.gain.linearRampToValueAtTime(initialGain, now + MICRO_FADE);
                            clipGain.gain.linearRampToValueAtTime(0, endAt);
                        } else {
                            clipGain.gain.setValueAtTime(0, now);
                            clipGain.gain.linearRampToValueAtTime(1, now + MICRO_FADE);
                            clipGain.gain.setValueAtTime(1, endAt - safeFadeOut);
                            clipGain.gain.linearRampToValueAtTime(0, endAt);
                        }
                    }

                    sources.push({ source, clip });
                }
            }
        });
    });

    return { sources, masterBus, analyser };
};

// File validation utilities
export interface FileValidationResult {
    isValid: boolean;
    error?: string;
    warnings?: string[];
}

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const MIN_FILE_SIZE = 1024; // 1KB minimum for valid audio
export const SUPPORTED_AUDIO_TYPES = [
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/mpeg', 'audio/mp3',
    'audio/ogg', 'audio/vorbis',
    'audio/flac',
    'audio/aac', 'audio/x-aac',
    'audio/m4a', 'audio/mp4'
];

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Cheap pre-checks before decoding (size and declared type).
 * Real validation happens when the full file is decoded.
 */
export function validateAudioFile(file: { size: number; type: string; name: string }): FileValidationResult {
    const result: FileValidationResult = {
        isValid: true,
        warnings: []
    };

    if (file.size > MAX_FILE_SIZE) {
        result.isValid = false;
        result.error = `File too large: ${formatFileSize(file.size)}. Maximum allowed: ${formatFileSize(MAX_FILE_SIZE)}`;
        return result;
    }

    if (file.size < MIN_FILE_SIZE) {
        result.isValid = false;
        result.error = `File too small: ${formatFileSize(file.size)}. Minimum required: ${formatFileSize(MIN_FILE_SIZE)}`;
        return result;
    }

    if (!SUPPORTED_AUDIO_TYPES.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|flac|aac|m4a|mp4)$/i)) {
        result.warnings!.push(`Unrecognized file type: ${file.type || 'unknown'}.`);
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB
        result.warnings!.push('Large file detected. Loading may be slow and use significant memory.');
    }

    return result;
}
