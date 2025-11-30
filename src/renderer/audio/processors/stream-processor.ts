
class StreamAudioProcessor extends AudioWorkletProcessor {
    private buffer: Float32Array;
    private writePointer: number = 0;
    private readPointer: number = 0;
    private bufferSize: number = 44100 * 10; // 10 seconds buffer
    private available: number = 0;
    private isPlaying: boolean = false;

    constructor() {
        super();
        this.buffer = new Float32Array(this.bufferSize);

        this.port.onmessage = (event) => {
            if (event.data.type === 'WRITE') {
                this.write(event.data.chunk);
            } else if (event.data.type === 'PLAY') {
                this.isPlaying = true;
            } else if (event.data.type === 'PAUSE') {
                this.isPlaying = false;
            } else if (event.data.type === 'SEEK') {
                this.readPointer = 0;
                this.writePointer = 0;
                this.available = 0;
            }
        };
    }

    private write(chunk: Float32Array) {
        if (this.available + chunk.length > this.bufferSize) {
            // Buffer overflow - drop data or handle gracefully
            // For now, we just overwrite (circular) or stop writing?
            // Circular buffer logic:
        }

        for (let i = 0; i < chunk.length; i++) {
            this.buffer[this.writePointer] = chunk[i];
            this.writePointer = (this.writePointer + 1) % this.bufferSize;
        }
        this.available = Math.min(this.available + chunk.length, this.bufferSize);

        // Notify main thread if we need more data?
        // Or main thread tracks it.
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
        const output = outputs[0];
        if (!output || !output.length) return true;

        const channelCount = output.length;
        const frameCount = output[0].length;

        if (!this.isPlaying || this.available < frameCount) {
            // Output silence
            for (let channel = 0; channel < channelCount; channel++) {
                output[channel].fill(0);
            }

            // If running low, notify main thread
            if (this.isPlaying && this.available < 44100) { // Less than 1 second
                this.port.postMessage({ type: 'NEED_DATA' });
            }

            return true;
        }

        // Read from buffer
        // Assuming mono buffer for now, copying to all output channels
        // Real implementation should handle multi-channel buffers

        for (let i = 0; i < frameCount; i++) {
            const sample = this.buffer[this.readPointer];
            this.readPointer = (this.readPointer + 1) % this.bufferSize;

            for (let channel = 0; channel < channelCount; channel++) {
                output[channel][i] = sample;
            }
        }

        this.available -= frameCount;

        return true;
    }
}

registerProcessor('stream-audio-processor', StreamAudioProcessor);
