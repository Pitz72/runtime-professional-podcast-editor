import React from 'react';
import { AudioClip, AudioFile, TrackKind } from '@shared/types';
import { RepeatIcon } from './icons';
import WaveformDisplay from './WaveformDisplay';

interface ClipProps {
  clip: AudioClip;
  file: AudioFile | null;
  trackKind?: TrackKind;
  isSelected: boolean;
  pixelsPerSecond: number;
  onSelect: (item: { type: 'clip', id: string }) => void;
  onContextMenu: (clipId: string, e: React.MouseEvent) => void;
  onInteractionStart: (
    type: 'move' | 'resize-left' | 'resize-right',
    clipId: string,
    e: React.MouseEvent
  ) => void;
}

const THEMES: Record<TrackKind, {
  base: string;
  selected: string;
  topBar: string;
  badge: string;
  waveform: string;
  waveformSelected: string;
  accent: string;
}> = {
  [TrackKind.Voice]: {
    base: 'bg-gradient-to-b from-emerald-950/95 via-slate-900/95 to-slate-950 border border-emerald-500/40 text-emerald-100 shadow-md shadow-emerald-950/40',
    selected: 'ring-2 ring-emerald-400 border-emerald-300 shadow-xl shadow-emerald-500/30 z-20',
    topBar: 'bg-emerald-950/90 border-b border-emerald-500/30 text-emerald-200',
    badge: 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/50',
    waveform: '#34d399',
    waveformSelected: '#a7f3d0',
    accent: '#10b981',
  },
  [TrackKind.Music]: {
    base: 'bg-gradient-to-b from-purple-950/95 via-slate-900/95 to-slate-950 border border-purple-500/40 text-purple-100 shadow-md shadow-purple-950/40',
    selected: 'ring-2 ring-purple-400 border-purple-300 shadow-xl shadow-purple-500/30 z-20',
    topBar: 'bg-purple-950/90 border-b border-purple-500/30 text-purple-200',
    badge: 'bg-purple-900/80 text-purple-300 border border-purple-700/50',
    waveform: '#c084fc',
    waveformSelected: '#f3e8ff',
    accent: '#a855f7',
  },
  [TrackKind.Background]: {
    base: 'bg-gradient-to-b from-sky-950/95 via-slate-900/95 to-slate-950 border border-sky-500/40 text-sky-100 shadow-md shadow-sky-950/40',
    selected: 'ring-2 ring-sky-400 border-sky-300 shadow-xl shadow-sky-500/30 z-20',
    topBar: 'bg-sky-950/90 border-b border-sky-500/30 text-sky-200',
    badge: 'bg-sky-900/80 text-sky-300 border border-sky-700/50',
    waveform: '#38bdf8',
    waveformSelected: '#bae6fd',
    accent: '#0ea5e9',
  },
  [TrackKind.FX]: {
    base: 'bg-gradient-to-b from-amber-950/95 via-slate-900/95 to-slate-950 border border-amber-500/40 text-amber-100 shadow-md shadow-amber-950/40',
    selected: 'ring-2 ring-amber-400 border-amber-300 shadow-xl shadow-amber-500/30 z-20',
    topBar: 'bg-amber-950/90 border-b border-amber-500/30 text-amber-200',
    badge: 'bg-amber-900/80 text-amber-300 border border-amber-700/50',
    waveform: '#fbbf24',
    waveformSelected: '#fef3c7',
    accent: '#f59e0b',
  },
};

const Clip: React.FC<ClipProps> = ({
  clip,
  file,
  trackKind = TrackKind.Voice,
  isSelected,
  pixelsPerSecond,
  onSelect,
  onContextMenu,
  onInteractionStart
}) => {
  const theme = THEMES[trackKind] || THEMES[TrackKind.Voice];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect({ type: 'clip', id: clip.id });
    onInteractionStart('move', clip.id, e);
  };

  const handleResizeLeft = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onInteractionStart('resize-left', clip.id, e);
  };

  const handleResizeRight = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onInteractionStart('resize-right', clip.id, e);
  };

  const clipWidth = Math.max(20, clip.duration * pixelsPerSecond);

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 h-[82px] rounded-md flex flex-col box-border overflow-hidden group cursor-grab active:cursor-grabbing select-none transition-shadow
        ${theme.base}
        ${isSelected ? theme.selected : 'hover:border-slate-400/60'}
      `}
      style={{
        left: `${clip.startTime * pixelsPerSecond}px`,
        width: `${clipWidth}px`,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => onContextMenu(clip.id, e)}
    >
      {/* Top Header Bar */}
      <div className={`h-5 px-2 flex items-center justify-between text-[10px] font-semibold tracking-wide pointer-events-none z-10 ${theme.topBar}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
          <span className="truncate max-w-[140px] drop-shadow">{file?.name ?? '—'}</span>
        </div>
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {clip.isLooped && <RepeatIcon className="w-3 h-3 text-purple-300" />}
          <span className={`px-1 rounded text-[9px] font-mono leading-tight ${theme.badge}`}>
            {clip.duration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Waveform Area */}
      <div className="flex-1 relative overflow-hidden pointer-events-none">
        {file?.buffer ? (
          <div className="absolute inset-0 opacity-80">
            <WaveformDisplay
              audioBuffer={file.buffer}
              offset={clip.offset}
              duration={clip.duration}
              width={clipWidth}
              height={62}
              color={isSelected ? theme.waveformSelected : theme.waveform}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">
            {file ? 'Loading waveform...' : 'Missing file'}
          </div>
        )}

        {/* Visual Fade In overlay with gradient and micro badge */}
        {clip.fadeIn && clip.fadeIn > 0 ? (
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10 border-r border-white/20"
            style={{ width: `${Math.min(clip.fadeIn * pixelsPerSecond, clipWidth)}px` }}
          >
            <span className="absolute bottom-1 left-1 text-[8px] font-mono text-white/70 bg-black/60 px-0.5 rounded">
              ◢ {clip.fadeIn.toFixed(1)}s
            </span>
          </div>
        ) : null}

        {/* Visual Fade Out overlay with gradient and micro badge */}
        {clip.fadeOut && clip.fadeOut > 0 ? (
          <div
            className="absolute right-0 top-0 bottom-0 pointer-events-none bg-gradient-to-l from-black/80 via-black/40 to-transparent z-10 border-l border-white/20"
            style={{ width: `${Math.min(clip.fadeOut * pixelsPerSecond, clipWidth)}px` }}
          >
            <span className="absolute bottom-1 right-1 text-[8px] font-mono text-white/70 bg-black/60 px-0.5 rounded">
              {clip.fadeOut.toFixed(1)}s ◣
            </span>
          </div>
        ) : null}
      </div>

      {/* Tactile Left Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all z-20"
        onMouseDown={handleResizeLeft}
        title="Trascina per accorciare/allungare l'inizio"
      >
        <div className="w-0.5 h-5 bg-white/80 rounded-full" />
      </div>

      {/* Tactile Right Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all z-20"
        onMouseDown={handleResizeRight}
        title="Trascina per accorciare/allungare la fine"
      >
        <div className="w-0.5 h-5 bg-white/80 rounded-full" />
      </div>
    </div>
  );
};

export default Clip;
