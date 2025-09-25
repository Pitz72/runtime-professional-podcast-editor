// Audio processing utilities extracted from Editor component

import { Project, Track, TrackKind, CompressorSettings } from '../types';
import { DUCKING_AMOUNT, DUCKING_ATTACK, DUCKING_RELEASE } from '../constants';
import * as lamejs from 'lamejs';

// Helper to build the audio graph for both playback and export
export const buildAudioGraph = (
    context: BaseAudioContext,
    project: Project,
    tracksToProcess: Track[],
    totalDuration: number,
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

    const sources: { source: AudioBufferSourceNode, clip: any }[] = [];
    const voiceClips = project.tracks
        .filter(t => t.kind === TrackKind.Voice)
        .flatMap(t => t.clips);

    let voiceEvents: { time: number, type: 'start' | 'end' }[] = [];
    if (voiceClips.length > 0) {
        voiceClips.forEach(c => {
            voiceEvents.push({ time: c.startTime, type: 'start' });
            voiceEvents.push({ time: c.startTime + c.duration, type: 'end' });
        });
        voiceEvents.sort((a,b) => a.time - b.time);
    }

    tracksToProcess.forEach(track => {
        const trackGain = context.createGain();
        trackGain.gain.setValueAtTime(track.volume, context.currentTime);
        trackGain.connect(masterBus);

        // --- DUCKING LOGIC ---
        if ((track.kind === TrackKind.Music || track.kind === TrackKind.Background) && track.isDuckingEnabled && voiceEvents.length > 0) {
            const gainParam = trackGain.gain;
            let activeVoices = 0;

            gainParam.setValueAtTime(voiceEvents[0]?.time === 0 ? track.volume * DUCKING_AMOUNT : track.volume, context.currentTime);

            voiceEvents.forEach(event => {
                const previousActiveVoices = activeVoices;
                activeVoices += (event.type === 'start' ? 1 : -1);

                if (previousActiveVoices === 0 && activeVoices > 0) {
                    gainParam.linearRampToValueAtTime(track.volume * DUCKING_AMOUNT, context.currentTime + event.time + DUCKING_ATTACK);
                } else if (previousActiveVoices > 0 && activeVoices === 0) {
                    gainParam.linearRampToValueAtTime(track.volume, context.currentTime + event.time + DUCKING_RELEASE);
                }
            });
        }

        let trackHead: AudioNode = trackGain;

        // --- EFFECTS CHAIN ---
        if (track.effects) {
            const { compressor: compressorSettings, equalizer: eqSettingsList } = track.effects;
            let lastNodeInFXChain: AudioNode = trackGain;

            if(eqSettingsList) {
                [...eqSettingsList].reverse().forEach(eqSettings => {
                    const filter = context.createBiquadFilter();
                    filter.type = eqSettings.type;
                    filter.frequency.setValueAtTime(eqSettings.frequency, context.currentTime);
                    if (typeof eqSettings.gain === 'number') filter.gain.setValueAtTime(eqSettings.gain, context.currentTime);
                    if (typeof eqSettings.Q === 'number') filter.Q.setValueAtTime(eqSettings.Q, context.currentTime);
                    filter.connect(lastNodeInFXChain);
                    lastNodeInFXChain = filter;
                });
            }

            if(compressorSettings){
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(compressorSettings.threshold, context.currentTime);
                compressor.knee.setValueAtTime(compressorSettings.knee, context.currentTime);
                compressor.ratio.setValueAtTime(compressorSettings.ratio, context.currentTime);
                compressor.attack.setValueAtTime(compressorSettings.attack, context.currentTime);
                compressor.release.setValueAtTime(compressorSettings.release, context.currentTime);
                compressor.connect(lastNodeInFXChain);
                trackHead = compressor;
            }
        }

        // --- SOURCE NODES ---
        track.clips.forEach(clip => {
            const file = project.files.find(f => f.id === clip.fileId);
            if (file?.buffer) {
                 if ((track.kind === TrackKind.Music || track.kind === TrackKind.Background) && clip.isLooped && clip.duration > 0) {
                    let currentStartTime = clip.startTime;
                    while (currentStartTime < totalDuration) {
                        const source = context.createBufferSource();
                        source.buffer = file.buffer;
                        source.connect(trackHead);
                        const repeatedClip = { ...clip, id: `${clip.id}-loop-${currentStartTime}`, startTime: currentStartTime };
                        sources.push({ source, clip: repeatedClip });
                        currentStartTime += clip.duration;
                    }
                } else {
                    const source = context.createBufferSource();
                    source.buffer = file.buffer;
                    source.connect(trackHead);
                    sources.push({ source, clip });
                }
            }
        });
    });

    return { sources };
};

// WAV encoding function
export function encodeWAV(audioBuffer: AudioBuffer): Blob {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit inventory

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < numOfChan; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

// Export format utilities
export type ExportFormat = 'wav' | 'mp3' | 'flac' | 'aac';

export interface ExportOptions {
    format: ExportFormat;
    quality: 'cd' | 'professional' | 'high-end';
    normalize: boolean;
    includeEffects: boolean;
    bitrate?: number; // for MP3/AAC
}

export function getExportMimeType(format: ExportFormat): string {
    switch (format) {
        case 'wav': return 'audio/wav';
        case 'mp3': return 'audio/mpeg';
        case 'flac': return 'audio/flac';
        case 'aac': return 'audio/aac';
        default: return 'audio/wav';
    }
}

export function getExportFileExtension(format: ExportFormat): string {
    return format;
}

export function getBitrateForQuality(quality: 'cd' | 'professional' | 'high-end', format: ExportFormat): number {
    if (format === 'mp3') {
        switch (quality) {
            case 'cd': return 128;
            case 'professional': return 192;
            case 'high-end': return 320;
        }
    } else if (format === 'aac') {
        switch (quality) {
            case 'cd': return 128;
            case 'professional': return 192;
            case 'high-end': return 256;
        }
    }
    return 192; // default
}

export function getSampleRateForLame(sampleRate: number): number {
    // lamejs supports: 8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000
    if (sampleRate >= 44100) return 44100;
    if (sampleRate >= 32000) return 32000;
    if (sampleRate >= 24000) return 24000;
    if (sampleRate >= 22050) return 22050;
    if (sampleRate >= 16000) return 16000;
    if (sampleRate >= 12000) return 12000;
    if (sampleRate >= 11025) return 11025;
    return 8000;
}

export function getWaveformQualityForZoom(zoomIndex: number): 'low' | 'medium' | 'high' {
    // ZOOM_LEVELS = [5, 10, 15, 25, 50, 75, 100, 150]
    if (zoomIndex <= 2) return 'low';     // Zoom levels 0-2 (5-15 px/sec): low quality
    if (zoomIndex <= 4) return 'medium';  // Zoom levels 3-4 (25-50 px/sec): medium quality
    return 'high';                        // Zoom levels 5+ (75+ px/sec): high quality
}

export function shouldVirtualizeTimeline(trackCount: number, clipCount: number): boolean {
    return trackCount > 10 || clipCount > 50;
}

// MP3 encoding using lamejs
export function encodeMP3(audioBuffer: AudioBuffer, bitrate: number = 192): Blob {
    const sampleRate = getSampleRateForLame(audioBuffer.sampleRate);
    const channels = audioBuffer.numberOfChannels;

    // Resample if necessary
    let processedBuffer = audioBuffer;
    if (audioBuffer.sampleRate !== sampleRate) {
        processedBuffer = resampleAudioBuffer(audioBuffer, sampleRate);
    }

    // Convert to 16-bit PCM samples
    const leftChannel = processedBuffer.getChannelData(0);
    const rightChannel = channels > 1 ? processedBuffer.getChannelData(1) : leftChannel;

    const leftSamples = new Int16Array(leftChannel.length);
    const rightSamples = new Int16Array(rightChannel.length);

    for (let i = 0; i < leftChannel.length; i++) {
        leftSamples[i] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32768));
        rightSamples[i] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32768));
    }

    // Create MP3 encoder
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
    const mp3Data: Int8Array[] = [];

    // Process in chunks to avoid memory issues
    const blockSize = 1152; // MP3 frame size
    for (let i = 0; i < leftSamples.length; i += blockSize) {
        const leftChunk = leftSamples.subarray(i, i + blockSize);
        const rightChunk = rightSamples.subarray(i, i + blockSize);

        const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    // Finalize
    const mp3buf = encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    // Combine all MP3 data
    const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of mp3Data) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return new Blob([result], { type: 'audio/mpeg' });
}

// Simple audio buffer resampling (basic implementation)
function resampleAudioBuffer(audioBuffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
    const sourceSampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    const sourceLength = audioBuffer.length;
    const targetLength = Math.round(sourceLength * targetSampleRate / sourceSampleRate);

    const resampledBuffer = new AudioContext().createBuffer(channels, targetLength, targetSampleRate);

    for (let channel = 0; channel < channels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const targetData = resampledBuffer.getChannelData(channel);

        // Simple linear interpolation resampling
        for (let i = 0; i < targetLength; i++) {
            const sourceIndex = (i / targetLength) * sourceLength;
            const index = Math.floor(sourceIndex);
            const fraction = sourceIndex - index;

            if (index < sourceLength - 1) {
                targetData[i] = sourceData[index] * (1 - fraction) + sourceData[index + 1] * fraction;
            } else {
                targetData[i] = sourceData[index];
            }
        }
    }

    return resampledBuffer;
}

export async function exportAudioBuffer(
    audioBuffer: AudioBuffer,
    options: ExportOptions
): Promise<Blob> {
    // Apply normalization if requested
    let processedBuffer = audioBuffer;
    if (options.normalize) {
        processedBuffer = normalizeAudioBuffer(audioBuffer);
    }

    // Export based on format
    switch (options.format) {
        case 'wav':
            return encodeWAV(processedBuffer);

        case 'mp3':
            const bitrate = options.bitrate || getBitrateForQuality(options.quality, 'mp3');
            return encodeMP3(processedBuffer, bitrate);

        case 'flac':
            // FLAC not implemented yet - fallback to WAV
            console.warn('FLAC export not implemented, exporting as WAV');
            return encodeWAV(processedBuffer);

        case 'aac':
            // AAC not implemented yet - fallback to WAV
            console.warn('AAC export not implemented, exporting as WAV');
            return encodeWAV(processedBuffer);

        default:
            return encodeWAV(processedBuffer);
    }
}

export function normalizeAudioBuffer(audioBuffer: AudioBuffer): AudioBuffer {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // Find peak value across all channels
    let peak = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            peak = Math.max(peak, Math.abs(channelData[i]));
        }
    }

    // Create normalized buffer
    const normalizedBuffer = new AudioContext().createBuffer(numberOfChannels, length, sampleRate);
    const gain = peak > 0 ? 1.0 / peak : 1.0;

    for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const normalizedData = normalizedBuffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
            normalizedData[i] = originalData[i] * gain;
        }
    }

    return normalizedBuffer;
}

// Memory management utilities
export function cleanupUnusedAudioBuffers(project: any, activeFileIds: Set<string>): void {
    // Mark buffers for cleanup if they're not actively used
    project.files.forEach((file: any) => {
        if (file.buffer && !activeFileIds.has(file.id)) {
            // Buffer is not currently active, can be cleaned up
            file.buffer = undefined;
        }
    });
}

export function getActiveFileIds(project: any): Set<string> {
    const activeIds = new Set<string>();

    // Add files used in clips
    project.tracks.forEach((track: any) => {
        track.clips.forEach((clip: any) => {
            activeIds.add(clip.fileId);
        });
    });

    return activeIds;
}

export function forceGarbageCollection(): void {
    // Force garbage collection if available (Chrome/Edge)
    if ((window as any).gc) {
        (window as any).gc();
    }
}

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

export async function validateAudioFile(file: File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
        isValid: true,
        warnings: []
    };

    // Check file size
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

    // Check MIME type
    if (!SUPPORTED_AUDIO_TYPES.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|flac|aac|m4a|mp4)$/i)) {
        result.warnings.push(`Unsupported file type: ${file.type || 'unknown'}. Supported: ${SUPPORTED_AUDIO_TYPES.join(', ')}`);
    }

    // Try to validate by attempting to decode a small portion
    try {
        const arrayBuffer = await readFileChunk(file, 0, Math.min(1024 * 1024, file.size)); // Read first 1MB
        const audioContext = new AudioContext();

        // Quick validation - try to decode
        await audioContext.decodeAudioData(arrayBuffer.slice());

        audioContext.close();
    } catch (error) {
        result.isValid = false;
        result.error = `File appears to be corrupted or not a valid audio file: ${error instanceof Error ? error.message : 'Unknown error'}`;
        return result;
    }

    // Additional warnings
    if (file.size > 500 * 1024 * 1024) { // 500MB
        result.warnings.push('Large file detected. Loading may be slow and use significant memory.');
    }

    return result;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function readFileChunk(file: File, start: number, length: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file.slice(start, start + length));
    });
}