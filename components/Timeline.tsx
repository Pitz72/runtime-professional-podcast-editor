
import React, { useState, useRef } from 'react';
import { Project, Track, AudioFile, TrackKind, AudioClip } from '../types';
import { TRACK_META, PIXELS_PER_SECOND } from '../constants';
import { PlusCircleIcon } from './icons';

interface TimelineProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  onSelectItem: (item: { type: 'track' | 'clip', id: string } | null) => void;
  onAddTrack: (kind: TrackKind) => void;
  currentTime: number;
}

const Timeline: React.FC<TimelineProps> = ({ project, setProject, onSelectItem, onAddTrack, currentTime }) => {
  const [draggedOverTrack, setDraggedOverTrack] = useState<string | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const handleDropOnTrack = (e: React.DragEvent<HTMLDivElement>, trackId: string) => {
    e.preventDefault();
    setDraggedOverTrack(null);
    try {
      const fileData: AudioFile = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!fileData || !fileData.id) return;

      const trackElement = e.currentTarget;
      const rect = trackElement.getBoundingClientRect();
      const dropX = e.clientX - rect.left;

      const startTime = Math.max(0, dropX / PIXELS_PER_SECOND);

      setProject(p => {
        if (!p) return null;
        
        const newClip: AudioClip = {
          id: `clip-${Date.now()}`,
          fileId: fileData.id,
          trackId: trackId,
          startTime: startTime,
          duration: fileData.duration,
          offset: 0,
        };

        const newTracks = p.tracks.map(track => {
          if (track.id === trackId) {
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
          <div className="flex items-center bg-gray-700 p-2 rounded-t-md">
            <span className={`mr-2 p-1 rounded ${TRACK_META[track.kind].color}`}>
              {TRACK_META[track.kind].icon}
            </span>
            <span className="font-bold">{track.name}</span>
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
                return (
                    <div
                        key={clip.id}
                        className="absolute top-0 h-full bg-blue-600 rounded-lg border border-blue-400 flex items-center p-2 box-border overflow-hidden"
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
                        <span className="text-white text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">{file?.name || '...'}</span>
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