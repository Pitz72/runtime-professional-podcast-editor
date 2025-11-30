import React, { useRef, useEffect } from 'react';
import { useWaveformData } from '../hooks/useWaveformData';

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
  quality?: 'low' | 'medium' | 'high';
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioBuffer,
  width,
  height,
  color = '#60a5fa',
  backgroundColor = 'transparent',
  className = '',
  quality = 'medium'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformData = useWaveformData(audioBuffer, width, height, quality as 'low' | 'medium' | 'high');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    waveformData.peaks.forEach((peak, i) => {
      const x = i;
      const amplitude = peak * (height / 2);

      // Draw vertical line from center
      ctx.moveTo(x, centerY - amplitude);
      ctx.lineTo(x, centerY + amplitude);
    });

    ctx.stroke();

  }, [waveformData, width, height, color, backgroundColor]);

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
      style={{ width, height }}
    />
  );
};

export default WaveformDisplay;