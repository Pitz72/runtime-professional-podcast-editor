import { useMemo } from 'react';

/**
 * Hard cap on computed peak columns (= canvas backing-store width).
 * Browsers reject canvases beyond ~32k px; long clips at high zoom would
 * blow past that. Above the cap the waveform is stretched via CSS.
 */
export const MAX_PEAK_COLUMNS = 8192;

/**
 * Min/max peaks for ONE SEGMENT of an audio buffer — the segment the clip
 * actually plays (offset → offset + duration), not the whole file.
 */
export const computePeaks = (
  audioBuffer: AudioBuffer,
  offsetSeconds: number,
  durationSeconds: number,
  columns: number
): number[] => {
  const channelData = audioBuffer.getChannelData(0); // First channel is representative
  const sampleRate = audioBuffer.sampleRate;

  const startSample = Math.max(0, Math.floor(offsetSeconds * sampleRate));
  const endSample = Math.min(channelData.length, Math.ceil((offsetSeconds + durationSeconds) * sampleRate));
  const segmentLength = Math.max(0, endSample - startSample);

  const peaks: number[] = new Array(columns).fill(0);
  if (segmentLength === 0 || columns === 0) return peaks;

  const samplesPerColumn = segmentLength / columns;

  for (let i = 0; i < columns; i++) {
    const start = startSample + Math.floor(i * samplesPerColumn);
    const end = Math.min(endSample, startSample + Math.floor((i + 1) * samplesPerColumn) + 1);

    let peak = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > peak) peak = abs;
    }
    peaks[i] = peak;
  }

  return peaks;
};

export const useWaveformPeaks = (
  audioBuffer: AudioBuffer | null,
  offsetSeconds: number,
  durationSeconds: number,
  columns: number
): number[] | null => {
  return useMemo(() => {
    if (!audioBuffer || columns <= 0) return null;
    return computePeaks(audioBuffer, offsetSeconds, durationSeconds, Math.floor(columns));
  }, [audioBuffer, offsetSeconds, durationSeconds, columns]);
};
