import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, Track, TrackKind, SelectedItem } from '@shared/types';
import { TRACK_META, ZOOM_LEVELS } from '../constants';
import { PlusCircleIcon, CloseIcon, ZoomInIcon, ZoomOutIcon, VolumeIcon, DuckingIcon } from './icons';
import { useDroppable } from '@dnd-kit/core';
import TimelineRuler from './TimelineRuler';
import Clip from './Clip';
import ContextMenu, { ContextMenuState } from './ContextMenu';
import { useT } from '../i18n';
import { useAppStore } from '../store';
import { getSnapTargets, snapTime, clampToFreeSpace, maxEndBeforeNextClip, minStartAfterPreviousClip, SNAP_THRESHOLD_PX } from '../services/timelineUtils';

const DroppableTrack: React.FC<{ track: Track; children: React.ReactNode; onContextMenu: (e: React.MouseEvent) => void }> = ({ track, children, onContextMenu }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `track-${track.id}`,
    data: { type: 'track', track }
  });

  return (
    <div
      id={`track-${track.id}`}
      ref={setNodeRef}
      className={`h-[86px] bg-slate-950/70 border-t border-slate-800/80 rounded-b-lg relative transition-all ${
        isOver ? 'ring-2 ring-purple-500/80 bg-purple-950/20 shadow-inner' : ''
      }`}
      onContextMenu={onContextMenu}
    >
      {track.clips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600/70 text-xs italic tracking-wider">
          <span className="px-3 py-1 rounded border border-dashed border-slate-800/80 bg-slate-950/50">
            Trascina qui un file audio per questa traccia
          </span>
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * The playhead moves via direct DOM writes driven by the audio engine's
 * time subscription — NOT via React state. Re-rendering the whole timeline
 * 60 times per second would make the editor unusable on real projects.
 */
const Playhead: React.FC<{
  pixelsPerSecond: number;
  onTimeUpdate: (callback: (time: number) => void) => () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ pixelsPerSecond, onTimeUpdate, onMouseDown }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return onTimeUpdate(time => {
      if (ref.current) {
        ref.current.style.transform = `translateX(${time * pixelsPerSecond}px)`;
      }
    });
  }, [onTimeUpdate, pixelsPerSecond]);

  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 w-[2px] h-full bg-rose-500 z-30 cursor-ew-resize shadow-[0_0_8px_rgba(244,63,94,0.9)]"
      onMouseDown={onMouseDown}
    >
      {/* Top Playhead Marker Handle */}
      <div className="absolute -top-3.5 -left-[7px] w-4 h-4 bg-rose-500 rounded-sm rotate-45 border border-white/80 shadow-md pointer-events-auto hover:scale-110 transition-transform" />
    </div>
  );
};

type Interaction = {
  type: 'move' | 'resize-left' | 'resize-right';
  clipId: string;
  trackId: string;
  initialX: number;
  initialStartTime: number;
  initialDuration: number;
  initialOffset: number;
} | {
  type: 'seek';
  initialX: number;
};

interface TimelineProps {
  project: Project;
  updateProject: (updater: (project: Project) => Project) => void;
  /** Called once at the start of a drag/resize gesture so it becomes a single undo step. */
  onInteractionStart: () => void;
  selectedItem: SelectedItem;
  onSelectItem: (item: SelectedItem) => void;
  onAddTrack: (kind: TrackKind) => void;
  onDeleteTrack: (trackId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (callback: (time: number) => void) => () => void;
  getCurrentTime: () => number;
  isPlaying: boolean;
  pixelsPerSecond: number;
  zoomIndex: number;
  onZoomChange: (index: number) => void;
  hasClipboardContent: boolean;
  onCopyClip: (clipId: string) => void;
  onPasteClip: (trackId: string, pasteTime: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ project, updateProject, onInteractionStart, selectedItem, onSelectItem, onAddTrack, onDeleteTrack, onDeleteClip, onSeek, onTimeUpdate, getCurrentTime, isPlaying, pixelsPerSecond, zoomIndex, onZoomChange, hasClipboardContent, onCopyClip, onPasteClip }) => {
  const t = useT();
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  // The scrolled content area: fresh getBoundingClientRect() on this element
  // already accounts for scroll AND container padding, so position math
  // never needs manual scrollLeft/padding corrections.
  const contentRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string>('');

  const totalDuration = Math.max(60, ...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)));

  const getFileForClip = useCallback((clipId: string) => {
    const clip = project.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return null;
    return project.files.find(f => f.id === clip.fileId) || null;
  }, [project.files, project.tracks]);

  const onClipInteractionStart = (type: 'move' | 'resize-left' | 'resize-right', clipId: string, e: React.MouseEvent) => {
    if (isPlaying) return;
    e.preventDefault();
    e.stopPropagation();

    const track = project.tracks.find(t => t.clips.some(c => c.id === clipId));
    const clip = track?.clips.find(c => c.id === clipId);
    if (!track || !clip) return;

    onSelectItem({ type: 'clip', id: clipId });
    onInteractionStart();
    setInteraction({
      type,
      clipId,
      trackId: track.id,
      initialX: e.clientX,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration,
      initialOffset: clip.offset,
    });
  };

  const handlePlayheadInteraction = (e: React.MouseEvent) => {
    if (isPlaying) return;
    e.preventDefault();
    e.stopPropagation();
    setInteraction({ type: 'seek', initialX: e.clientX });
  }

  const openTrackContextMenu = (track: Track, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trackRect = e.currentTarget.getBoundingClientRect();
    const pasteTime = Math.max(0, (e.clientX - trackRect.left) / pixelsPerSecond);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: t('timeline.pasteHere'),
          disabled: !hasClipboardContent,
          onClick: () => onPasteClip(track.id, pasteTime),
        },
      ],
    });
  };

  const openClipContextMenu = (clipId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectItem({ type: 'clip', id: clipId });

    const currentTime = getCurrentTime();
    const track = project.tracks.find(t => t.clips.some(c => c.id === clipId));
    const clip = track?.clips.find(c => c.id === clipId);
    const canSplit = Boolean(clip && currentTime > clip.startTime + 0.05 && currentTime < (clip.startTime + clip.duration - 0.05));

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: t('timeline.splitClip'),
          disabled: !canSplit,
          onClick: () => {
            useAppStore.getState().splitClip(clipId, currentTime);
          },
        },
        { label: t('timeline.copyClip'), onClick: () => onCopyClip(clipId) },
        { label: t('timeline.deleteClip'), danger: true, onClick: () => onDeleteClip(clipId) },
      ],
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction) return;

      if (interaction.type === 'seek') {
        const contentRect = contentRef.current?.getBoundingClientRect();
        if (!contentRect) return;
        const newTime = Math.max(0, (e.clientX - contentRect.left) / pixelsPerSecond);
        onSeek(newTime);
        return;
      }

      const { type, initialX, initialStartTime, initialDuration, initialOffset, clipId } = interaction;
      const deltaX = e.clientX - initialX;
      const deltaTime = deltaX / pixelsPerSecond;

      // Hold Alt to bypass snapping (standard DAW behavior).
      const snapThreshold = e.altKey ? 0 : SNAP_THRESHOLD_PX / pixelsPerSecond;

      updateProject(p => {
        const snapTargets = getSnapTargets(p, clipId, getCurrentTime());

        const newTracks = p.tracks.map(track => {
          const clipIndex = track.clips.findIndex(c => c.id === clipId);
          if (clipIndex === -1) return track;

          const clip = track.clips[clipIndex];
          const file = getFileForClip(clipId);
          if (!file) return track;

          const otherClips = track.clips.filter(c => c.id !== clipId);
          const newClip = { ...clip };

          if (type === 'move') {
            let desired = Math.max(0, initialStartTime + deltaTime);
            if (snapThreshold > 0) {
              // Snap whichever edge (start or end) is closer to a target.
              const snappedStart = snapTime(desired, snapTargets, snapThreshold);
              const snappedByEnd = snapTime(desired + initialDuration, snapTargets, snapThreshold) - initialDuration;
              desired = Math.abs(snappedStart - desired) <= Math.abs(snappedByEnd - desired)
                ? snappedStart
                : Math.max(0, snappedByEnd);
            }
            newClip.startTime = clampToFreeSpace(otherClips, desired, clip.duration);
          } else if (type === 'resize-right') {
            let desiredEnd = initialStartTime + Math.max(0.1, initialDuration + deltaTime);
            if (snapThreshold > 0) {
              desiredEnd = snapTime(desiredEnd, snapTargets, snapThreshold);
            }
            const maxByFile = clip.startTime + (file.duration - clip.offset);
            const maxByNeighbor = maxEndBeforeNextClip(otherClips, clip.startTime);
            const end = Math.min(desiredEnd, maxByFile, maxByNeighbor);
            newClip.duration = Math.max(0.1, end - clip.startTime);
          } else if (type === 'resize-left') {
            let desiredStart = initialStartTime + deltaTime;
            if (snapThreshold > 0) {
              desiredStart = snapTime(desiredStart, snapTargets, snapThreshold);
            }
            const clipEnd = initialStartTime + initialDuration;
            const minByFile = initialStartTime - initialOffset; // offset can't go below 0
            const minByNeighbor = minStartAfterPreviousClip(otherClips, clipEnd);
            const maxStart = clipEnd - 0.1;
            const start = Math.min(Math.max(desiredStart, minByFile, minByNeighbor, 0), maxStart);

            const delta = start - initialStartTime;
            newClip.startTime = start;
            newClip.offset = initialOffset + delta;
            newClip.duration = initialDuration - delta;
          }

          const newClips = [...track.clips];
          newClips[clipIndex] = newClip;
          return { ...track, clips: newClips };
        });
        return { ...p, tracks: newTracks };
      });
    };

    const handleMouseUp = () => {
      setInteraction(null);
    };

    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, updateProject, getFileForClip, onSeek, pixelsPerSecond, getCurrentTime]);


  return (
    <div className="flex-1 flex flex-col bg-slate-950/80 p-4 space-y-3 overflow-auto" ref={timelineContainerRef}>
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md py-1 border-b border-slate-800/80 shadow-sm">
        <TimelineRuler duration={totalDuration} pixelsPerSecond={pixelsPerSecond} onSeek={onSeek} />
      </div>
      <div className="relative" style={{ width: `${totalDuration * pixelsPerSecond}px` }} ref={contentRef}>
        {project.tracks.map(track => (
          <div
            key={track.id}
            className={`
              mb-3 rounded-lg border transition-all shadow-md
              ${selectedItem?.type === 'track' && selectedItem.id === track.id ? 'border-purple-500/80 bg-purple-950/20 shadow-purple-500/10' : 'border-slate-800/90 bg-slate-900/70'}
            `}
          >
            {/* DAW Channel Strip Header */}
            <div
              className="flex items-center bg-slate-900/95 border-b border-slate-800/80 px-3 py-2 rounded-t-lg cursor-pointer select-none"
              onClick={() => onSelectItem({ type: 'track', id: track.id })}
            >
              {/* Kind Badge */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold mr-2.5 ${TRACK_META[track.kind].color} text-white shadow-sm flex-shrink-0`}>
                {TRACK_META[track.kind].icon}
                <span className="uppercase text-[9px] tracking-wider">{track.kind}</span>
              </div>

              {/* Editable Name */}
              {editingTrackId === track.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editingTrackName}
                  onChange={(e) => setEditingTrackName(e.target.value)}
                  onBlur={() => {
                    const trimmed = editingTrackName.trim();
                    if (trimmed) {
                      useAppStore.getState().renameTrack(track.id, trimmed);
                    }
                    setEditingTrackId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = editingTrackName.trim();
                      if (trimmed) {
                        useAppStore.getState().renameTrack(track.id, trimmed);
                      }
                      setEditingTrackId(null);
                    } else if (e.key === 'Escape') {
                      setEditingTrackId(null);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-950 text-white font-bold px-2 py-0.5 rounded border border-purple-500 flex-1 mr-2 text-xs focus:outline-none"
                />
              ) : (
                <span
                  className="font-bold flex-1 truncate mr-2 text-xs text-slate-200 hover:text-purple-300 transition-colors"
                  title={`${t('timeline.renameTrack')} (Doppio clic)`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTrackId(track.id);
                    setEditingTrackName(track.name);
                  }}
                >
                  {track.name}
                </span>
              )}

              {/* Ducking Active Indicator */}
              {track.isDuckingEnabled && (
                <span className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 mr-2 shadow-sm" title="Ducking attivo: abbassa il volume durante la voce">
                  <DuckingIcon className="w-3 h-3 text-indigo-400" />
                  <span>DUCK</span>
                </span>
              )}

              {/* Quick Channel Fader */}
              <div
                className="hidden md:flex items-center gap-1.5 mr-3 bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded"
                onClick={e => e.stopPropagation()}
                title={`Volume: ${Math.round(track.volume * 100)}%`}
              >
                <VolumeIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={track.volume}
                  onMouseDown={() => useAppStore.getState().saveToHistory()}
                  onChange={(e) => updateProject(p => ({
                    ...p,
                    tracks: p.tracks.map(t => t.id === track.id ? { ...t, volume: parseFloat(e.target.value) } : t)
                  }))}
                  className="w-14 h-1"
                />
                <span className="text-[10px] font-mono text-slate-400 w-6 text-right tabular-nums">
                  {Math.round(track.volume * 100)}%
                </span>
              </div>

              {/* Mute and Solo Hardware-Style Buttons */}
              <div className="flex items-center mr-2 gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateProject(p => ({
                      ...p,
                      tracks: p.tracks.map(t => t.id === track.id ? { ...t, isMuted: !t.isMuted } : t)
                    }));
                  }}
                  className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded transition-all ${
                    track.isMuted
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/50 border border-red-400'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                  aria-label={track.isMuted ? t('timeline.unmute') : t('timeline.mute')}
                  title={track.isMuted ? t('timeline.unmute') : t('timeline.mute')}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateProject(p => ({
                      ...p,
                      tracks: p.tracks.map(t => t.id === track.id ? { ...t, isSolo: !t.isSolo } : t)
                    }));
                  }}
                  className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded transition-all ${
                    track.isSolo
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/50 font-black border border-amber-200'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                  aria-label={track.isSolo ? t('timeline.unsolo') : t('timeline.solo')}
                  title={track.isSolo ? t('timeline.unsolo') : t('timeline.solo')}
                >
                  S
                </button>
              </div>

              {/* Delete Track */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTrack(track.id);
                }}
                className="p-1 text-slate-400 hover:text-white hover:bg-red-500/80 rounded transition-colors"
                aria-label={t('timeline.deleteTrack', { name: track.name })}
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Droppable Clip Lane */}
            <DroppableTrack
              track={track}
              onContextMenu={(e) => openTrackContextMenu(track, e)}
            >
              {track.clips.map(clip => {
                const file = getFileForClip(clip.id);
                return (
                  <Clip
                    key={clip.id}
                    clip={clip}
                    file={file}
                    trackKind={track.kind}
                    pixelsPerSecond={pixelsPerSecond}
                    isSelected={selectedItem?.type === 'clip' && selectedItem.id === clip.id}
                    onSelect={onSelectItem}
                    onContextMenu={openClipContextMenu}
                    onInteractionStart={onClipInteractionStart}
                  />
                );
              })}
            </DroppableTrack>
          </div>
        ))}
        <Playhead
          pixelsPerSecond={pixelsPerSecond}
          onTimeUpdate={onTimeUpdate}
          onMouseDown={handlePlayheadInteraction}
        />
      </div>

      {/* Timeline Bottom Toolbar */}
      <div className="pt-3 pb-1 flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddTrack(TrackKind.Voice)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-white rounded-md text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircleIcon className="w-3.5 h-3.5 text-emerald-400" /> {t('timeline.addVoiceTrack')}
          </button>
          <button
            onClick={() => onAddTrack(TrackKind.Music)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 text-slate-200 hover:text-white rounded-md text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircleIcon className="w-3.5 h-3.5 text-purple-400" /> {t('timeline.addMusicTrack')}
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md shadow-sm">
          <button
            onClick={() => onZoomChange(Math.max(0, zoomIndex - 1))}
            disabled={zoomIndex === 0}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-40 transition-colors"
            title="Riduci zoom"
          >
            <ZoomOutIcon className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-12 text-center select-none font-medium">
            {ZOOM_LEVELS[zoomIndex]} px/s
          </span>
          <button
            onClick={() => onZoomChange(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-40 transition-colors"
            title="Aumenta zoom"
          >
            <ZoomInIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />}
    </div >
  );
};

export default Timeline;
