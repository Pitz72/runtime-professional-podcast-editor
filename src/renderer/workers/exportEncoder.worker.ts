// Export encoding worker: normalization + WAV/MP3 encoding run here
// so long projects never freeze the UI thread.

import { encode, EncodeRequest } from '../services/encoders';

interface WorkerRequest extends EncodeRequest {
    id: number;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const { id, ...request } = event.data;
    try {
        const bytes = encode(request);
        (self as unknown as Worker).postMessage(
            { id, ok: true, bytes: bytes.buffer },
            [bytes.buffer]
        );
    } catch (error) {
        (self as unknown as Worker).postMessage({
            id,
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown encoding error',
        });
    }
};

export { };
