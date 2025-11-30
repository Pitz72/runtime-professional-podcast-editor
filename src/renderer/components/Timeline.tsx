import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Project, Track, AudioFile, TrackKind, AudioClip, TimelineHandle } from '@shared/types';
import { TRACK_META, ZOOM_LEVELS } from '../constants';
import { PlusCircleIcon, CloseIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import TimelineRuler from './TimelineRuler';
import Clip from './Clip';

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
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  selectedItem: { type: 'track' | 'clip', id: string } | null;
  onSelectItem: (item: { type: 'track' | 'clip', id: string } | null) => void;
  onAddTrack: (kind: TrackKind) => void;
  onDeleteTrack: (trackId: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  pixelsPerSecond: number;
  zoomIndex: number;
  onZoomChange: (index: number) => void;
  onCopyClip?: (clipId: string) => void;
  onPasteClip?: (trackId: string, pasteTime: number) => void;
}

const Timeline = forwardRef<TimelineHandle, TimelineProps>(({ project, setProject, selectedItem, onSelectItem, onAddTrack, onDeleteTrack, currentTime, onSeek, isPlaying, pixelsPerSecond, zoomIndex, onZoomChange, onCopyClip, onPasteClip }, ref) => {
  const [draggedOverTrack, setDraggedOverTrack] = useState<string | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  useImperativeHandle(ref, () => ({
    scrollToTime: (time: number) => {
      const container = timelineContainerRef.current;
      if (!container || !isPlaying) return;

      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const playheadPos = time * pixelsPerSecond;

      // Center the playhead
      const targetScrollLeft = playheadPos - containerWidth / 2;

      // Only auto-scroll if the playhead is outside the middle 60% of the view
      const followMargin = containerWidth * 0.2;
      if (playheadPos < scrollLeft + followMargin || playheadPos > scrollLeft + containerWidth - followMargin) {
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    }
  }));


  const totalDuration = Math.max(60, ...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)));

  const handleDropOnTrack = (e: React.DragEvent<HTMLDivElement>, track: Track) => {
    e.preventDefault();
    setDraggedOverTrack(null);
    try {
      const fileData: AudioFile = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!fileData || !fileData.id) return;

      const file = project.files.find(f => f.id === fileData.id);
      if (!file) return;

      const trackElement = e.currentTarget;
      const rect = trackElement.getBoundingClientRect();
      const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
      const dropX = e.clientX - rect.left + scrollLeft;

      const startTime = Math.max(0, dropX / pixelsPerSecond);

      setProject(p => {
        if (!p) return null;

        const newClip: AudioClip = {
          id: `clip-${Date.now()}`,
          fileId: file.id,
          trackId: track.id,
          startTime: startTime,
          duration: file.duration,
          offset: 0,
          isLooped: false,
        };

        const newTracks = p.tracks.map(t => {
          if (t.id === track.id) {
            return { ...t, clips: [...t.clips, newClip] };
          }
          return t;
        });

        return { ...p, tracks: newTracks };
      });

    } catch (error) {
      console.error("Failed to handle drop:", error);
    }
  };

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

  const handleDeleteClip = useCallback((clipId: string) => {
    setProject(p => {
      if (!p) return null;

      const newTracks = p.tracks.map(track => {
        const clipIndex = track.clips.findIndex(c => c.id === clipId);
        if (clipIndex !== -1) {
          const newClips = [...track.clips];
          newClips.splice(clipIndex, 1);
          return { ...track, clips: newClips };
        }
        return track;
      });

      return { ...p, tracks: newTracks };
    });

    // Deselect if the deleted clip was selected
    if (selectedItem?.type === 'clip' && selectedItem.id === clipId) {
      onSelectItem(null);
    }
  }, [setProject, selectedItem, onSelectItem]);

  const handlePlayheadInteraction = (e: React.MouseEvent) => {
    if (isPlaying) return;
    e.preventDefault();
    e.stopPropagation();
    setInteraction({ type: 'seek', initialX: e.clientX });
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction) return;

      const timelineRect = timelineContainerRef.current?.getBoundingClientRect();
      if (!timelineRect) return;

      if (interaction.type === 'seek') {
        const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
        const newX = e.clientX - timelineRect.left + scrollLeft;
        const newTime = Math.max(0, newX / pixelsPerSecond);
        onSeek(newTime);
        return;
      }

      const { type, initialX, initialStartTime, initialDuration, initialOffset, clipId } = interaction;
      const deltaX = e.clientX - initialX;
      const deltaTime = deltaX / pixelsPerSecond;

      setProject(p => {
        if (!p) return p;
        const newTracks = p.tracks.map(track => {
          const clipIndex = track.clips.findIndex(c => c.id === clipId);
          if (clipIndex === -1) return track;

          const clip = track.clips[clipIndex];
          const file = getFileForClip(clipId);
          if (!file) return track;

          let newClip = { ...clip };

          if (type === 'move') {
            newClip.startTime = Math.max(0, initialStartTime + deltaTime);
          } else if (type === 'resize-right') {
            const newDuration = Math.max(0.1, initialDuration + deltaTime);
            newClip.duration = Math.min(newDuration, file.duration - clip.offset);
          } else if (type === 'resize-left') {
            // Can't move left past the start of the audio file (where offset would be < 0).
            const minTimeDelta = -initialOffset;
            // Can't move right past the end of the clip (where duration would be < 0.1s).
            const maxTimeDelta = initialDuration - 0.1;

            // Clamp the mouse movement delta to our calculated bounds.
            const clampedDeltaTime = Math.max(minTimeDelta, Math.min(deltaTime, maxTimeDelta));

            newClip.startTime = initialStartTime + clampedDeltaTime;
            newClip.offset = initialOffset + clampedDeltaTime;
            newClip.duration = initialDuration - clampedDeltaTime;
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
  }, [interaction, setProject, getFileForClip, onSeek, pixelsPerSecond]);


  return (
    <div className="flex-1 flex flex-col bg-gray-800/50 p-4 space-y-2 overflow-auto" ref={timelineContainerRef}>
      <div className="sticky top-0 z-20 bg-gray-800/50 py-2">
        <TimelineRuler duration={totalDuration} pixelsPerSecond={pixelsPerSecond} />
      </div>
      <div className="relative" style={{ width: `${totalDuration * pixelsPerSecond}px` }}>
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
                aria-label={`Delete track ${track.name}`}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div
              className={`h-24 bg-gray-900/50 rounded-b-md relative ${draggedOverTrack === track.id ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDraggedOverTrack(track.id); }}
              onDragLeave={() => setDraggedOverTrack(null)}
              onDrop={(e) => handleDropOnTrack(e, track)}
              onContextMenu={(e) => {
                e.preventDefault();
                // Show paste option if clipboard has content
                if (onPasteClip) {
                  const pasteTime = (e.clientX - e.currentTarget.getBoundingClientRect().left + timelineContainerRef.current?.scrollLeft || 0) / pixelsPerSecond;
                  onPasteClip(track.id, pasteTime);
                }
              }}
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
                    onDelete={handleDeleteClip}
                    onCopy={onCopyClip}
                    onInteractionStart={onClipInteractionStart}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div
          className="absolute top-0 left-0 w-0.5 h-full bg-red-500 z-30 cursor-ew-resize"
          style={{ transform: `translateX(${currentTime * pixelsPerSecond}px)` }}
          onMouseDown={handlePlayheadInteraction}
        >
          <div className="absolute -top-4 -left-1.5 w-4 h-4 bg-red-500 rounded-full"></div>
        </div>
      </div>
      <div className="pt-4 flex justify-center gap-4 items-center">
        <button onClick={() => onAddTrack(TrackKind.Voice)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm">
          <PlusCircleIcon className="w-4 h-4" /> Add Voice Track
        </button>
        <button onClick={() => onAddTrack(TrackKind.Music)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm">
          <PlusCircleIcon className="w-4 h-4" /> Add Music Track
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onZoomChange(Math.max(0, zoomIndex - 1))} disabled={zoomIndex === 0} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50">
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">Zoom</span>
          <button onClick={() => onZoomChange(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50">
            <ZoomInIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default Timeline;