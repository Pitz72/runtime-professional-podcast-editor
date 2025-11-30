// Type definitions for AudioWorklet
interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}

declare var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new(options?: any): AudioWorkletProcessor;
    parameterDescriptors?: {
        name: string;
        defaultValue?: number;
        minValue?: number;
        maxValue?: number;
        automationRate?: 'a-rate' | 'k-rate';
    }[];
};

declare function registerProcessor(
    name: string,
    processorCtor: (new (options?: any) => AudioWorkletProcessor) & {
        parameterDescriptors?: any[];
    }
): void;

declare var currentTime: number;
declare var sampleRate: number;
