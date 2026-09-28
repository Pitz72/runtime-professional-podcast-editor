import React, { useRef, useEffect } from 'react';
import { useWaveformPeaks, MAX_PEAK_COLUMNS } from '../hooks/useWaveformData';

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  /** Segment of the file the clip plays, in seconds. */
  offset: number;
  duration: number;
  /** CSS size of the waveform area. */
  width: number;
  height: number;
  color?: string;
  className?: string;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioBuffer,
  offset,
  duration,
  width,
  height,
  color = '#60a5fa',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Backing store sized for the device pixel ratio, capped for safety:
  // beyond the cap the (already sub-pixel) columns are stretched by CSS.
  const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
  const backingWidth = Math.min(Math.max(1, Math.round(width * dpr)), MAX_PEAK_COLUMNS);
  const backingHeight = Math.max(1, Math.round(height * dpr));

  const peaks = useWaveformPeaks(audioBuffer, offset, duration, backingWidth);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = backingWidth;
    canvas.height = backingHeight;

    ctx.clearRect(0, 0, backingWidth, backingHeight);

    const centerY = backingHeight / 2;

    // Subtle zero-crossing center reference line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(backingWidth, centerY);
    ctx.stroke();

    // High-contrast audio peaks
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    for (let x = 0; x < peaks.length; x++) {
      const amplitude = Math.max(1, peaks[x] * (centerY - 3));
      ctx.moveTo(x + 0.5, centerY - amplitude);
      ctx.lineTo(x + 0.5, centerY + amplitude);
    }

    ctx.stroke();
  }, [peaks, backingWidth, backingHeight, color]);

  if (!audioBuffer) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800/50 rounded ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-gray-500">No audio</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default WaveformDisplay;
