import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, Track, TrackKind, SelectedItem } from '@shared/types';
import { TRACK_META, ZOOM_LEVELS } from '../constants';
import { PlusCircleIcon, CloseIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import { useDroppable } from '@dnd-kit/core';
import TimelineRuler from './TimelineRuler';
import Clip from './Clip';
import ContextMenu, { ContextMenuState } from './ContextMenu';
import { useT } from '../i18n';
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
      className={`h-24 bg-gray-900/50 rounded-b-md relative ${isOver ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
      onContextMenu={onContextMenu}
    >
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
      className="absolute top-0 left-0 w-0.5 h-full bg-red-500 z-30 cursor-ew-resize"
      onMouseDown={onMouseDown}
    >
      <div className="absolute -top-4 -left-1.5 w-4 h-4 bg-red-500 rounded-full"></div>
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
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
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
    <div className="flex-1 flex flex-col bg-gray-800/50 p-4 space-y-2 overflow-auto" ref={timelineContainerRef}>
      <div className="sticky top-0 z-20 bg-gray-800/50 py-2">
        <TimelineRuler duration={totalDuration} pixelsPerSecond={pixelsPerSecond} />
      </div>
      <div className="relative" style={{ width: `${totalDuration * pixelsPerSecond}px` }} ref={contentRef}>
        {project.tracks.map(track => (
          <div
            key={track.id}
            className={`
              mb-2 rounded-lg border
              ${selectedItem?.type === 'track' && selectedItem.id === track.id ? 'border-purple-500 bg-purple-900/20' : 'border-transparent'}
            `}
          >
            <div className="flex items-center bg-gray-700 p-2 rounded-t-md cursor-pointer" onClick={() => onSelectItem({ type: 'track', id: track.id })}>
              <span className={`mr-2 p-1 rounded ${TRACK_META[track.kind].color}`}>
                {TRACK_META[track.kind].icon}
              </span>
              <span className="font-bold flex-1">{track.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTrack(track.id)
                }}
                className="p-1 text-gray-400 hover:text-white hover:bg-red-500 rounded"
                aria-label={t('timeline.deleteTrack', { name: track.name })}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
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
      <div className="pt-4 flex justify-center gap-4 items-center">
        <button onClick={() => onAddTrack(TrackKind.Voice)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm">
          <PlusCircleIcon className="w-4 h-4" /> {t('timeline.addVoiceTrack')}
        </button>
        <button onClick={() => onAddTrack(TrackKind.Music)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm">
          <PlusCircleIcon className="w-4 h-4" /> {t('timeline.addMusicTrack')}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onZoomChange(Math.max(0, zoomIndex - 1))} disabled={zoomIndex === 0} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50">
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">{t('timeline.zoom')}</span>
          <button onClick={() => onZoomChange(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50">
            <ZoomInIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />}
    </div >
  );
};

export default Timeline;
