
import React, { useState, useRef, useEffect } from 'react';
import { Project, Track, AudioFile, TrackKind, AudioClip } from '../types';
import { TRACK_META, PIXELS_PER_SECOND } from '../constants';
import { PlusCircleIcon, TrashIcon } from './icons';
import Waveform from './Waveform';

interface TimelineProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  onSelectItem: (item: { type: 'track' | 'clip', id: string } | null) => void;
  onAddTrack: (kind: TrackKind) => void;
  currentTime: number;
  selectedItem: { type: 'track' | 'clip', id: string } | null;
}

const Timeline: React.FC<TimelineProps> = ({ project, setProject, onSelectItem, onAddTrack, currentTime, selectedItem }) => {
  const [draggedOverTrack, setDraggedOverTrack] = useState<string | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [trimmingState, setTrimmingState] = useState<{
    clipId: string;
    handle: 'left' | 'right';
    startX: number;
    originalStartTime: number;
    originalDuration: number;
    originalOffset: number;
  } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!trimmingState) return;

      const dx = e.clientX - trimmingState.startX;
      const dTime = dx / PIXELS_PER_SECOND;

      setProject(p => {
        if (!p) return p;
        return {
          ...p,
          tracks: p.tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id !== trimmingState.clipId) return clip;

              if (trimmingState.handle === 'left') {
                const newStartTime = Math.max(0, trimmingState.originalStartTime + dTime);
                const timeDiff = newStartTime - trimmingState.originalStartTime;
                const newDuration = trimmingState.originalDuration - timeDiff;
                const newOffset = trimmingState.originalOffset + timeDiff;

                if (newDuration < 0.1) return clip; // Prevent inverting
                return { ...clip, startTime: newStartTime, duration: newDuration, offset: newOffset };
              } else { // right handle
                const newDuration = trimmingState.originalDuration + dTime;
                if (newDuration < 0.1) return clip; // Prevent inverting
                return { ...clip, duration: newDuration };
              }
            })
          }))
        };
      });
    };

    const handleMouseUp = () => {
      setTrimmingState(null);
    };

    if (trimmingState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimmingState, setProject]);

  const handleDropOnTrack = (e: React.DragEvent<HTMLDivElement>, newTrackId: string) => {
    e.preventDefault();
    setDraggedOverTrack(null);

    const trackElement = e.currentTarget;
    const rect = trackElement.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const newStartTime = Math.max(0, dropX / PIXELS_PER_SECOND);

    try {
      // Try to handle clip move first
      const moveDataString = e.dataTransfer.getData('application/x-runtime-clip');
      if (moveDataString) {
        const { clipId, originalTrackId } = JSON.parse(moveDataString);

        setProject(p => {
          if (!p) return null;

          let clipToMove: AudioClip | undefined;
          const originalTrack = p.tracks.find(t => t.id === originalTrackId);
          if (originalTrack) {
            clipToMove = originalTrack.clips.find(c => c.id === clipId);
          }

          if (!clipToMove) return p; // Clip not found, do nothing

          const updatedClip = {
            ...clipToMove,
            startTime: newStartTime,
            trackId: newTrackId
          };

          const newTracks = p.tracks.map(track => {
            // Remove from original track
            if (track.id === originalTrackId) {
              return { ...track, clips: track.clips.filter(c => c.id !== clipId) };
            }
            // Add to new track
            if (track.id === newTrackId) {
              return { ...track, clips: [...track.clips, updatedClip] };
            }
            return track;
          });

          return { ...p, tracks: newTracks };
        });

        return; // Early return after handling clip move
      }

      // Fallback to handle new file drop
      const fileData: AudioFile = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!fileData || !fileData.id) return;

      setProject(p => {
        if (!p) return null;
        
        const newClip: AudioClip = {
          id: `clip-${Date.now()}`,
          fileId: fileData.id,
          trackId: newTrackId,
          startTime: newStartTime,
          duration: fileData.duration,
          offset: 0,
        };

        const newTracks = p.tracks.map(track => {
          if (track.id === newTrackId) {
            return { ...track, clips: [...track.clips, newClip] };
          }
          return track;
        });
        
        return { ...p, tracks: newTracks };
      });

    } catch (error) {
      console.error("Failed to handle drop:", error);
    }
  };

  const getFileForClip = (clipId: string) => {
      const clip = project.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
      if (!clip) return null;
      return project.files.find(f => f.id === clip.fileId) || null;
  }

  const handleDeleteTrack = (trackId: string) => {
    setProject(p => {
        if (!p) return null;
        return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
    });
    if (selectedItem?.type === 'track' && selectedItem.id === trackId) {
        onSelectItem(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-800/50 p-4 space-y-2 overflow-auto" ref={timelineContainerRef}>
      {project.tracks.map(track => (
        <div 
          key={track.id}
          className={`
            p-2 rounded-lg border-2 
            ${draggedOverTrack === track.id ? 'border-purple-500 bg-purple-900/40' : 'border-transparent'}
          `}
          onClick={() => onSelectItem({ type: 'track', id: track.id })}
        >
          <div className="flex items-center justify-between bg-gray-700 p-2 rounded-t-md">
            <div className="flex items-center">
                <span className={`mr-2 p-1 rounded ${TRACK_META[track.kind].color}`}>
                {TRACK_META[track.kind].icon}
                </span>
                <span className="font-bold">{track.name}</span>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTrack(track.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-800 rounded-md"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
          </div>
          <div
            className="h-24 bg-gray-900/50 rounded-b-md relative"
            onDragOver={(e) => { e.preventDefault(); setDraggedOverTrack(track.id); }}
            onDragLeave={() => setDraggedOverTrack(null)}
            onDrop={(e) => handleDropOnTrack(e, track.id)}
          >
            {track.clips.length === 0 && (
                 <div className="flex items-center justify-center h-full">
                    <p className="text-gray-600 text-sm">Drop audio file here</p>
                 </div>
            )}
            <div 
              className="absolute top-0 left-0 w-0.5 h-full bg-red-500 z-10"
              style={{ transform: `translateX(${currentTime * PIXELS_PER_SECOND}px)`}}
            ></div>
            {track.clips.map(clip => {
                const file = getFileForClip(clip.id);
                const handleClipDragStart = (e: React.DragEvent<HTMLDivElement>, clipId: string, trackId: string) => {
                    e.stopPropagation();
                    const moveData = { type: 'clip', clipId, trackId };
                    e.dataTransfer.setData('application/x-runtime-clip', JSON.stringify(moveData));
                    e.dataTransfer.effectAllowed = 'move';
                };

                return (
                    <div
                        key={clip.id}
                        draggable={!trimmingState}
                        onDragStart={(e) => handleClipDragStart(e, clip.id, track.id)}
                        className="absolute top-0 h-full bg-gray-700/80 rounded-lg border border-gray-600 box-border overflow-hidden group"
                        style={{
                            left: `${clip.startTime * PIXELS_PER_SECOND}px`,
                            width: `${clip.duration * PIXELS_PER_SECOND}px`,
                            minWidth: '20px'
                        }}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent track selection
                            onSelectItem({ type: 'clip', id: clip.id });
                        }}
                    >
                        <div
                            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-purple-500/50 opacity-0 group-hover:opacity-100 z-20"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setTrimmingState({
                                    clipId: clip.id,
                                    handle: 'left',
                                    startX: e.clientX,
                                    originalStartTime: clip.startTime,
                                    originalDuration: clip.duration,
                                    originalOffset: clip.offset,
                                });
                            }}
                        />
                        <div className="w-full h-full cursor-grab active:cursor-grabbing" draggable={!trimmingState}>
                            {file?.buffer ? (
                                <Waveform file={file} height={96} />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-xs text-gray-400">Buffering...</p>
                                </div>
                            )}
                        </div>
                         <span className="absolute bottom-1 left-2 text-white text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none opacity-80">
                            {file?.name || '...'}
                         </span>
                         <div
                            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-purple-500/50 opacity-0 group-hover:opacity-100 z-20"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setTrimmingState({
                                    clipId: clip.id,
                                    handle: 'right',
                                    startX: e.clientX,
                                    originalStartTime: clip.startTime,
                                    originalDuration: clip.duration,
                                    originalOffset: clip.offset,
                                });
                            }}
                        />
                    </div>
                );
            })}
          </div>
        </div>
      ))}
      <div className="pt-4 flex justify-center gap-2">
        <button onClick={() => onAddTrack(TrackKind.Voice)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm">
          <PlusCircleIcon className="w-4 h-4" /> Add Voice Track
        </button>
         <button onClick={() => onAddTrack(TrackKind.Music)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm">
          <PlusCircleIcon className="w-4 h-4" /> Add Music Track
        </button>
      </div>
    </div>
  );
};

export default Timeline;