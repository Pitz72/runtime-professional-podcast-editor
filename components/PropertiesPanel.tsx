import React from 'react';
import { Project, Track, AudioClip, TrackKind, AudioPreset } from '../types';
import { VOICE_PRESETS, MUSIC_PRESETS } from '../presets';

interface PropertiesPanelProps {
  selectedItem: { type: 'track' | 'clip', id: string } | null;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedItem, project, setProject }) => {

  const handlePresetChange = (trackId: string, presetName: string, availablePresets: AudioPreset[]) => {
    const preset = availablePresets.find(p => p.name === presetName);
    setProject(p => {
      if (!p) return null;
      return {
        ...p,
        tracks: p.tracks.map(t => t.id === trackId ? { ...t, effects: preset } : t)
      }
    });
  };

  const renderTrackProperties = (trackId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track) return <p className="text-gray-500">Track not found.</p>;

    const isMusicTrack = track.kind === TrackKind.Music || track.kind === TrackKind.Background;
    const isVoiceTrack = track.kind === TrackKind.Voice;

    return (
      <>
        <h3 className="text-lg font-bold mb-2">{track.name}</h3>
        <p className="text-sm text-gray-400 mb-4">Type: {track.kind}</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Volume</label>
            <input type="range" min="0" max="1" step="0.01" value={track.volume} 
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setProject(p => p ? {...p, tracks: p.tracks.map(t => t.id === trackId ? {...t, volume: newVolume} : t)} : null)
              }}
            />
          </div>
        </div>

        { isMusicTrack && (
          <div className="mt-6 border-t border-gray-600 pt-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!!track.isDuckingEnabled}
                className="h-5 w-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-800"
                onChange={e => {
                  const isEnabled = e.target.checked;
                  setProject(p => p ? {...p, tracks: p.tracks.map(t => t.id === trackId ? {...t, isDuckingEnabled: isEnabled} : t)} : null);
                }}
              />
              <span className="text-gray-300">
                Automatic Ducking
                <p className="text-xs text-gray-500">Lowers volume when voice is present.</p>
              </span>
            </label>
          </div>
        )}

        {(isVoiceTrack || isMusicTrack) && (
            <div className="mt-6 border-t border-gray-600 pt-4">
              <h4 className="font-semibold text-purple-400 mb-2">Audio Presets</h4>
              <p className="text-xs text-gray-400 mb-3">Choose a preset to enhance the audio of this track.</p>
              <select
                value={track.effects?.name || ''}
                onChange={(e) => handlePresetChange(track.id, e.target.value, isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              >
                  <option value="">- No Preset -</option>
                  {(isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS).map(preset => (
                      <option key={preset.name} value={preset.name}>{preset.name}</option>
                  ))}
              </select>
            </div>
        )}

      </>
    );
  };

  const renderClipProperties = (clipId: string) => {
    let clip: AudioClip | undefined;
    let file: import('../types').AudioFile | undefined;
    
    for (const track of project.tracks) {
        clip = track.clips.find(c => c.id === clipId);
        if (clip) {
            file = project.files.find(f => f.id === clip.fileId);
            break;
        }
    }
     
    if (!clip || !file) return <p className="text-gray-500">Clip not found.</p>;

    return (
        <>
            <h3 className="text-lg font-bold mb-2 truncate">{file.name}</h3>
            <p className="text-sm text-gray-400 mb-4">Clip Properties</p>
            <div className="space-y-2 text-sm">
                <p><span className="font-semibold text-gray-300">Start Time:</span> {clip.startTime.toFixed(2)}s</p>
                <p><span className="font-semibold text-gray-300">Duration:</span> {clip.duration.toFixed(2)}s</p>
            </div>
        </>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold p-3 bg-gray-900 border-b border-gray-700">Properties</h2>
      <div className="p-4">
        {!selectedItem ? (
          <p className="text-gray-500">Select a track or a clip to see its properties.</p>
        ) : selectedItem.type === 'track' ? (
          renderTrackProperties(selectedItem.id)
        ) : (
          renderClipProperties(selectedItem.id)
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;