
// Worker for streaming audio file chunks
// Currently supports WAV files

self.onmessage = async (e) => {
    const { type, file, start, length, id } = e.data;

    try {
        switch (type) {
            case 'INIT':
                const metadata = await parseWavHeader(file);
                self.postMessage({ type: 'INIT_SUCCESS', metadata, id });
                break;

            case 'READ':
                const chunk = await readFileChunk(file, start, length);
                // Transfer the ArrayBuffer to avoid copying
                (self as any).postMessage({ type: 'READ_SUCCESS', chunk, id }, [chunk]);
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
            id
        });
    }
};

async function readFileChunk(file: File, start: number, length: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file.slice(start, start + length));
    });
}

async function parseWavHeader(file: File) {
    const headerBuffer = await readFileChunk(file, 0, 44);
    const view = new DataView(headerBuffer);

    // Check RIFF header
    if (view.getUint32(0, false) !== 0x52494646) throw new Error('Invalid WAV file (no RIFF)');
    if (view.getUint32(8, false) !== 0x57415645) throw new Error('Invalid WAV file (no WAVE)');

    // Parse chunks to find 'fmt ' and 'data'
    // This is a simplified parser, assuming standard header size for now
    // In a real implementation, we should walk the chunks

    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);

    // Find data chunk offset
    // Standard header is 44 bytes, but could be larger
    // For MVP, we assume 44 bytes header
    const dataOffset = 44;
    const dataSize = file.size - dataOffset;
    const totalSamples = dataSize / (channels * (bitsPerSample / 8));
    const duration = totalSamples / sampleRate;

    return {
        channels,
        sampleRate,
        bitsPerSample,
        dataOffset,
        dataSize,
        duration
    };
}
