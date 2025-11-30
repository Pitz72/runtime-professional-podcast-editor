
import AudioStreamWorker from '../workers/audio-stream.worker?worker';

export interface AudioFileMetadata {
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
    dataOffset: number;
    dataSize: number;
    duration: number;
}

class AudioStreamService {
    private worker: Worker;
    private pendingRequests: Map<string, { resolve: (data: any) => void, reject: (err: any) => void }>;
    private requestIdCounter: number = 0;

    constructor() {
        this.worker = new AudioStreamWorker();
        this.pendingRequests = new Map();

        this.worker.onmessage = (e) => {
            const { type, id, metadata, chunk, error } = e.data;
            const request = this.pendingRequests.get(id);

            if (request) {
                if (type === 'ERROR') {
                    request.reject(new Error(error));
                } else if (type === 'INIT_SUCCESS') {
                    request.resolve(metadata);
                } else if (type === 'READ_SUCCESS') {
                    request.resolve(chunk);
                }
                this.pendingRequests.delete(id);
            }
        };
    }

    private getNextId(): string {
        return `req_${++this.requestIdCounter}`;
    }

    public async initFile(file: File): Promise<AudioFileMetadata> {
        const id = this.getNextId();
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'INIT', file, id });
        });
    }

    public async readChunk(file: File, start: number, length: number): Promise<ArrayBuffer> {
        const id = this.getNextId();
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'READ', file, start, length, id });
        });
    }

    public async createStreamNode(context: AudioContext, file: File): Promise<AudioWorkletNode> {
        // Initialize file metadata first
        const metadata = await this.initFile(file);

        const node = new AudioWorkletNode(context, 'stream-audio-processor', {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [metadata.channels]
        });

        // Setup data piping
        let currentOffset = metadata.dataOffset;
        const chunkSize = 44100 * 4; // Read 1 second of data (approx, assuming 16-bit stereo) -> actually calculate bytes
        // 44100 frames * channels * bytesPerSample
        const bytesPerFrame = metadata.channels * (metadata.bitsPerSample / 8);
        const bytesPerChunk = 44100 * bytesPerFrame; // 1 second chunks

        node.port.onmessage = async (event) => {
            if (event.data.type === 'NEED_DATA') {
                if (currentOffset < metadata.dataOffset + metadata.dataSize) {
                    const length = Math.min(bytesPerChunk, (metadata.dataOffset + metadata.dataSize) - currentOffset);
                    try {
                        const chunk = await this.readChunk(file, currentOffset, length);

                        // Convert ArrayBuffer to Float32Array for AudioWorklet
                        // This is tricky because WAV data is Int16 (usually)
                        // We should probably do conversion in Worker to save main thread CPU?
                        // Or let Worklet handle Int16? Worklet expects Float32Array in output.
                        // If we send Int16Array to Worklet, it needs to convert.
                        // Let's convert here for now or in Worker.
                        // Worker sends ArrayBuffer.

                        // Let's assume 16-bit PCM for now
                        const int16 = new Int16Array(chunk);
                        const float32 = new Float32Array(int16.length);
                        for (let i = 0; i < int16.length; i++) {
                            float32[i] = int16[i] / 32768.0;
                        }

                        node.port.postMessage({ type: 'WRITE', chunk: float32 }, [float32.buffer]);
                        currentOffset += length;
                    } catch (e) {
                        console.error('Error reading chunk', e);
                    }
                }
            }
        };

        // Initial pre-roll
        node.port.postMessage({ type: 'NEED_DATA' });

        return node;
    }

    public terminate() {
        this.worker.terminate();
    }
}

export const audioStreamService = new AudioStreamService();
