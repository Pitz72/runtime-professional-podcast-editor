// Bridges the renderer to the export encoding worker.
// Falls back to synchronous encoding if Workers are unavailable (tests).

import { encode, EncodeRequest, ExportFormat, getExportMimeType } from './encoders';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (bytes: ArrayBuffer) => void; reject: (err: Error) => void }>();

function getWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    if (!worker) {
        worker = new Worker(new URL('../workers/exportEncoder.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; bytes?: ArrayBuffer; error?: string }>) => {
            const { id, ok, bytes, error } = event.data;
            const job = pending.get(id);
            if (!job) return;
            pending.delete(id);
            if (ok && bytes) job.resolve(bytes);
            else job.reject(new Error(error ?? 'Encoding failed.'));
        };
        worker.onerror = () => {
            pending.forEach(job => job.reject(new Error('Export worker crashed.')));
            pending.clear();
            worker?.terminate();
            worker = null;
        };
    }
    return worker;
}

/**
 * Encode a rendered AudioBuffer off the main thread.
 * Channel data is transferred (zero-copy) to the worker.
 */
export async function encodeAudioBuffer(
    buffer: AudioBuffer,
    format: ExportFormat,
    normalize: boolean = true,
    bitrate?: number
): Promise<Blob> {
    // Copy channel data out of the AudioBuffer (getChannelData views are not transferable
    // while the AudioBuffer still owns them).
    const channels: Float32Array[] = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        channels.push(new Float32Array(buffer.getChannelData(c)));
    }

    const request: EncodeRequest = {
        channels,
        sampleRate: buffer.sampleRate,
        length: buffer.length,
        format,
        normalize,
        bitrate,
    };

    const activeWorker = getWorker();
    if (!activeWorker) {
        const bytes = encode(request);
        return new Blob([bytes], { type: getExportMimeType(format) });
    }

    const id = nextId++;
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        activeWorker.postMessage({ id, ...request }, channels.map(c => c.buffer));
    });

    return new Blob([bytes], { type: getExportMimeType(format) });
}
