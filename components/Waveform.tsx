import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { AudioFile } from '../types';

interface WaveformProps {
  file: AudioFile;
  height?: number;
}

const Waveform: React.FC<WaveformProps> = ({ file, height = 96 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !file.buffer) return;

    // Initialize WaveSurfer
    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgb(167 139 250)', // purple-400
      progressColor: 'rgb(139 92 246)', // purple-600
      height: height,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      cursorWidth: 0, // Hide the cursor, timeline will have its own
      interact: false, // Clicks are handled by the parent clip
    });

    const ws = wavesurferRef.current;

    // Load the audio buffer
    ws.loadDecodedBuffer(file.buffer);

    // Cleanup on unmount
    return () => {
      ws.destroy();
    };
  }, [file.buffer, height]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default Waveform;
