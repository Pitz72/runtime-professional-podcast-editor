import React from 'react';
import { AudioClip, AudioFile } from '@shared/types';
import { RepeatIcon, CloseIcon } from './icons';
import WaveformDisplay from './WaveformDisplay';

interface ClipProps {
  clip: AudioClip;
  file: AudioFile | null;
  isSelected: boolean;
  pixelsPerSecond: number;
  onSelect: (item: { type: 'clip', id: string }) => void;
  onDelete?: (clipId: string) => void;
  onCopy?: (clipId: string) => void;
  onInteractionStart: (
    type: 'move' | 'resize-left' | 'resize-right',
    clipId: string,
    e: React.MouseEvent
  ) => void;
}

const Clip: React.FC<ClipProps> = ({ clip, file, isSelected, pixelsPerSecond, onSelect, onDelete, onCopy, onInteractionStart }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect({ type: 'clip', id: clip.id });
    onInteractionStart('move', clip.id, e);
  };

  const handleResizeLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInteractionStart('resize-left', clip.id, e);
  }

  const handleResizeRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInteractionStart('resize-right', clip.id, e);
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(clip.id);
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopy) {
      onCopy(clip.id);
    }
  }

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 h-20 rounded-lg flex items-center p-2 box-border overflow-hidden group cursor-grab active:cursor-grabbing relative
        ${isSelected ? 'bg-purple-600/80 border-2 border-purple-300 z-10' : 'bg-blue-600/80 border border-blue-400'}
      `}
      style={{
        left: `${clip.startTime * pixelsPerSecond}px`,
        width: `${clip.duration * pixelsPerSecond}px`,
        minWidth: '20px'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={onCopy ? "Double-click to copy clip" : undefined}
    >
      {/* Waveform background */}
      {file?.buffer && (
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <WaveformDisplay
            audioBuffer={file.buffer}
            width={clip.duration * pixelsPerSecond}
            height={80}
            color={isSelected ? '#c084fc' : '#93c5fd'}
            backgroundColor="transparent"
            className="w-full h-full"
          />
        </div>
      )}

      {/* Delete button - top right corner */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
          title="Delete clip"
        >
          <CloseIcon className="w-3 h-3" />
        </button>
      )}

      <div
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 z-10"
        onMouseDown={handleResizeLeft}
      ></div>
      <div className="flex-1 flex items-center overflow-hidden pointer-events-none relative z-10">
        {clip.isLooped && <RepeatIcon className="w-4 h-4 text-white/70 mr-2 flex-shrink-0" />}
        <span className="text-white text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
          {file?.name || 'Loading...'}
        </span>
      </div>
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 z-10"
        onMouseDown={handleResizeRight}
      ></div>
    </div>
  );
};

export default Clip;