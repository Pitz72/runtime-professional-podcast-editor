// A simplified function to calculate the RMS (Root Mean Square) of an audio buffer.
// This is a common way to approximate the loudness of an audio signal.
export function calculateRMS(audioBuffer: AudioBuffer): number {
  const data = audioBuffer.getChannelData(0); // Use the first channel for calculation
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  const rms = Math.sqrt(sum / data.length);
  return rms;
}

// Converts a linear RMS value to decibels (dBFS).
export function rmsToDB(rms: number): number {
  if (rms === 0) return -Infinity;
  return 20 * Math.log10(rms);
}

// Calculates the gain required to bring a clip to a target loudness.
// Note: This is a simplified model. Professional LUFS normalization is more complex.
// We are using RMS as a proxy for loudness. A common target for podcasts is -16 LUFS,
// which corresponds to a certain RMS level. We'll use a target of -18dBFS for RMS as a starting point.
export function calculateNormalizationGain(
  sourceRmsDb: number,
  targetRmsDb: number = -18
): number {
  if (sourceRmsDb === -Infinity) return 0; // Silence, no gain needed
  const gainDb = targetRmsDb - sourceRmsDb;
  return gainDb;
}

// Converts gain in decibels to a linear multiplier for the GainNode.
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}
