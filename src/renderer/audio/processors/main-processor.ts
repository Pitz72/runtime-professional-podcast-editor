// This processor runs in the audio thread and handles real-time audio processing
// It receives audio data, applies gain/effects, and sends analysis data back to the main thread

class MainAudioProcessor extends AudioWorkletProcessor {
    private _volume: number = 1.0;
    private _isMuted: boolean = false;

    static get parameterDescriptors() {
        return [
            {
                name: 'gain',
                defaultValue: 1.0,
                minValue: 0.0,
                maxValue: 2.0,
            },
        ];
    }

    constructor() {
        super();
        this.port.onmessage = (event) => {
            if (event.data.type === 'SET_VOLUME') {
                this._volume = event.data.value;
            } else if (event.data.type === 'SET_MUTE') {
                this._isMuted = event.data.value;
            }
        };
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || !input.length) return true;

        const gain = parameters.gain;
        const isConstantGain = gain.length === 1;

        for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            if (this._isMuted) {
                // Silence output if muted
                outputChannel.fill(0);
                continue;
            }

            for (let i = 0; i < inputChannel.length; i++) {
                const gainValue = isConstantGain ? gain[0] : gain[i];
                outputChannel[i] = inputChannel[i] * this._volume * gainValue;
            }
        }

        // Calculate peak levels for metering (send every ~100ms to avoid flooding main thread)
        // In a real implementation, we would use a counter to throttle this
        if (currentTime % 0.1 < 0.01) {
            this.calculateAndSendLevels(output);
        }

        return true;
    }

    private calculateAndSendLevels(output: Float32Array[]) {
        let maxAmplitude = 0;
        for (const channelData of output) {
            for (const sample of channelData) {
                const abs = Math.abs(sample);
                if (abs > maxAmplitude) maxAmplitude = abs;
            }
        }
        this.port.postMessage({ type: 'LEVELS', value: maxAmplitude });
    }
}

registerProcessor('main-audio-processor', MainAudioProcessor);
