import { useMemo } from 'react';

export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
  width: number;
  height: number;
}

export const useWaveformData = (
  audioBuffer: AudioBuffer | null,
  width: number = 200,
  height: number = 60
): WaveformData | null => {
  return useMemo(() => {
    if (!audioBuffer) return null;

    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const samplesPerPixel = Math.floor(channelData.length / width);
    const peaks: number[] = [];

    // Calculate peaks for each pixel column
    for (let i = 0; i < width; i++) {
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);

      let min = 0;
      let max = 0;

      // Find min and max in this segment
      for (let j = start; j < end; j++) {
        const sample = channelData[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      // Store the peak value (absolute maximum)
      peaks.push(Math.max(Math.abs(min), Math.abs(max)));
    }

    return {
      peaks,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      width,
      height
    };
  }, [audioBuffer, width, height]);
};

// Utility function to draw waveform on canvas
export const drawWaveform = (
  canvas: HTMLCanvasElement,
  waveformData: WaveformData,
  color: string = '#60a5fa',
  backgroundColor: string = 'transparent'
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { peaks, width, height } = waveformData;

  // Set canvas size
  canvas.width = width;
  canvas.height = height;

  // Clear canvas
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw waveform
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const centerY = height / 2;

  for (let i = 0; i < peaks.length; i++) {
    const x = i;
    const amplitude = peaks[i] * (height / 2);

    // Draw vertical line from center
    ctx.moveTo(x, centerY - amplitude);
    ctx.lineTo(x, centerY + amplitude);
  }

  ctx.stroke();
};

// Hook for optimized waveform rendering
export const useWaveformRenderer = () => {
  const renderWaveform = useMemo(() =>
    (audioBuffer: AudioBuffer | null, width: number = 200, height: number = 60) => {
      if (!audioBuffer) return null;

      const canvas = document.createElement('canvas');
      const waveformData = {
        peaks: [] as number[],
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        width,
        height
      };

      const channelData = audioBuffer.getChannelData(0);
      const samplesPerPixel = Math.floor(channelData.length / width);

      // Calculate peaks more efficiently
      for (let i = 0; i < width; i++) {
        const start = i * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, channelData.length);

        let peak = 0;
        for (let j = start; j < end; j++) {
          peak = Math.max(peak, Math.abs(channelData[j]));
        }

        waveformData.peaks.push(peak);
      }

      drawWaveform(canvas, waveformData);
      return canvas.toDataURL();
    },
    []
  );

  return { renderWaveform };
};