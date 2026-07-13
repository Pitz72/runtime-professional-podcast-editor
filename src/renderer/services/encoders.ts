// Pure audio encoders operating on raw channel data.
// No AudioBuffer/AudioContext dependency, so they run identically
// on the main thread and inside the export Web Worker.

import * as lamejs from 'lamejs';

export interface RawAudio {
    channels: Float32Array[];
    sampleRate: number;
    length: number;
}

/** Professional headroom: normalize peaks to -1 dBFS, not 0 dBFS. */
export const NORMALIZE_TARGET_PEAK = Math.pow(10, -1 / 20); // ≈ 0.8913

export function normalizeChannels(audio: RawAudio, targetPeak: number = NORMALIZE_TARGET_PEAK): RawAudio {
    let peak = 0;
    for (const data of audio.channels) {
        for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > peak) peak = abs;
        }
    }
    if (peak === 0) return audio;

    const gain = targetPeak / peak;
    const channels = audio.channels.map(data => {
        const out = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) out[i] = data[i] * gain;
        return out;
    });
    return { ...audio, channels };
}

export function encodeWAV(audio: RawAudio): Uint8Array {
    const numOfChan = audio.channels.length;
    const length = audio.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    let pos = 0;

    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    // WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audio.sampleRate);
    setUint32(audio.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit samples

    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // chunk length

    // interleaved samples
    for (let offset = 0; offset < audio.length; offset++) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, audio.channels[i][offset]));
            sample = Math.round(sample < 0 ? sample * 32768 : sample * 32767);
            view.setInt16(pos, sample, true);
            pos += 2;
        }
    }

    return new Uint8Array(buffer);
}

export function getSampleRateForLame(sampleRate: number): number {
    // lamejs supports: 8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000
    if (sampleRate >= 48000) return 48000;
    if (sampleRate >= 44100) return 44100;
    if (sampleRate >= 32000) return 32000;
    if (sampleRate >= 24000) return 24000;
    if (sampleRate >= 22050) return 22050;
    if (sampleRate >= 16000) return 16000;
    if (sampleRate >= 12000) return 12000;
    if (sampleRate >= 11025) return 11025;
    return 8000;
}

/** Linear-interpolation resampling on raw channels. */
export function resampleChannels(audio: RawAudio, targetSampleRate: number): RawAudio {
    if (audio.sampleRate === targetSampleRate) return audio;

    const targetLength = Math.round(audio.length * targetSampleRate / audio.sampleRate);
    const channels = audio.channels.map(sourceData => {
        const targetData = new Float32Array(targetLength);
        for (let i = 0; i < targetLength; i++) {
            const sourceIndex = (i / targetLength) * audio.length;
            const index = Math.floor(sourceIndex);
            const fraction = sourceIndex - index;
            if (index < audio.length - 1) {
                targetData[i] = sourceData[index] * (1 - fraction) + sourceData[index + 1] * fraction;
            } else {
                targetData[i] = sourceData[index] ?? 0;
            }
        }
        return targetData;
    });

    return { channels, sampleRate: targetSampleRate, length: targetLength };
}

export function encodeMP3(audio: RawAudio, bitrate: number = 192): Uint8Array {
    const targetRate = getSampleRateForLame(audio.sampleRate);
    const processed = resampleChannels(audio, targetRate);

    const channels = Math.min(2, processed.channels.length);
    const leftChannel = processed.channels[0];
    const rightChannel = channels > 1 ? processed.channels[1] : leftChannel;

    const leftSamples = new Int16Array(leftChannel.length);
    const rightSamples = new Int16Array(rightChannel.length);
    for (let i = 0; i < leftChannel.length; i++) {
        leftSamples[i] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32768));
        rightSamples[i] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32768));
    }

    const encoder = new lamejs.Mp3Encoder(channels, targetRate, bitrate);
    const mp3Data: Int8Array[] = [];

    const blockSize = 1152; // MP3 frame size
    for (let i = 0; i < leftSamples.length; i += blockSize) {
        const leftChunk = leftSamples.subarray(i, i + blockSize);
        const rightChunk = rightSamples.subarray(i, i + blockSize);
        const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
    const flushed = encoder.flush();
    if (flushed.length > 0) mp3Data.push(flushed);

    const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of mp3Data) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

export type ExportFormat = 'wav' | 'mp3';

export interface EncodeRequest {
    channels: Float32Array[];
    sampleRate: number;
    length: number;
    format: ExportFormat;
    normalize: boolean;
    bitrate?: number;
}

export function encode(request: EncodeRequest): Uint8Array {
    let audio: RawAudio = {
        channels: request.channels,
        sampleRate: request.sampleRate,
        length: request.length,
    };
    if (request.normalize) {
        audio = normalizeChannels(audio);
    }
    return request.format === 'mp3'
        ? encodeMP3(audio, request.bitrate ?? 192)
        : encodeWAV(audio);
}

export function getExportMimeType(format: ExportFormat): string {
    return format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
}
