import React, { useState } from 'react';
import { Project, Track, AudioClip, TrackKind, AudioPreset } from '../types';
import { VOICE_PRESETS, MUSIC_PRESETS } from '../presets';
import { getAudioEnhancementPreset } from '../services/geminiService';
import { WandIcon, RepeatIcon } from './icons';
import { AI_PRESET_NAME } from '../constants';


interface PropertiesPanelProps {
  selectedItem: { type: 'track' | 'clip', id: string } | null;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedItem, project, setProject }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handlePresetChange = (trackId: string, presetName: string, availablePresets: AudioPreset[]) => {
    let preset: AudioPreset | undefined;
    if (presetName === AI_PRESET_NAME) {
      // Don't do anything if they re-select the AI preset, it's already applied
      const track = project.tracks.find(t => t.id === trackId);
      if (track?.effects?.name === AI_PRESET_NAME) return;
    }
    
    preset = availablePresets.find(p => p.name === presetName);
    
    setProject(p => {
      if (!p) return null;
      return {
        ...p,
        tracks: p.tracks.map(t => t.id === trackId ? { ...t, effects: preset } : t)
      }
    });
  };

  const handleAiEnhance = async (trackId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track) return;

    setIsAiLoading(true);
    setAiError(null);

    // Generate a more descriptive prompt based on the track
    const description = `A ${track.kind.toLowerCase()} recording for a podcast${track.kind === 'Voice' ? ' with potential background noise and room reverb that needs cleaning' : ' that may need enhancement for better podcast production'}.`;

    try {
      const preset = await getAudioEnhancementPreset(description);
      if (preset) {
        setProject(p => {
          if (!p) return null;
          return {
            ...p,
            tracks: p.tracks.map(t => t.id === trackId ? { ...t, effects: preset } : t)
          }
        });
      } else {
        throw new Error("AI did not return a valid preset.");
      }
    } catch (error) {
      console.error("AI Enhancement failed:", error);
      setAiError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderTrackProperties = (trackId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track) return <p className="text-gray-500">Track not found.</p>;

    const isMusicTrack = track.kind === TrackKind.Music || track.kind === TrackKind.Background;
    const isVoiceTrack = track.kind === TrackKind.Voice;

    let selectedPresetName = track.effects?.name || '';
    const isCustomPreset = selectedPresetName && ![...VOICE_PRESETS, ...MUSIC_PRESETS].some(p => p.name === selectedPresetName);

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
              <p className="text-xs text-gray-400 mb-3">Choose a preset to enhance the audio.</p>
              <select
                value={isCustomPreset ? 'custom' : selectedPresetName}
                onChange={(e) => handlePresetChange(track.id, e.target.value, isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
              >
                  <option value="">- No Preset -</option>
                  {(isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS).map(preset => (
                      <option key={preset.name} value={preset.name}>{preset.name}</option>
                  ))}
                  {isCustomPreset && <option value="custom" disabled>{track.effects?.name}</option>}
              </select>
            </div>
        )}
        
        {isVoiceTrack && (
           <div className="mt-6 border-t border-gray-600 pt-4">
               <h4 className="font-semibold text-purple-400 mb-2">AI Enhancement</h4>
               <p className="text-xs text-gray-400 mb-3">Use AI to automatically clean up noise and reverb from this voice track.</p>
               <button
                  onClick={() => handleAiEnhance(track.id)}
                  disabled={isAiLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors disabled:bg-purple-800 disabled:cursor-wait"
               >
                 <WandIcon className="w-5 h-5" />
                 {isAiLoading ? 'Analyzing...' : 'AI-Powered Cleanup'}
               </button>
               {aiError && <p className="text-red-400 text-xs mt-2">Error: {aiError}</p>}
           </div>
        )}

      </>
    );
  };

  const renderClipProperties = (clipId: string) => {
    let clip: AudioClip | undefined;
    let file: import('../types').AudioFile | undefined;
    let trackOfClip: Track | undefined;
    
    for (const track of project.tracks) {
        const foundClip = track.clips.find(c => c.id === clipId);
        if (foundClip) {
            clip = foundClip;
            file = project.files.find(f => f.id === clip.fileId);
            trackOfClip = track;
            break;
        }
    }
     
    if (!clip || !file || !trackOfClip) return <p className="text-gray-500">Clip not found.</p>;

    const handleLoopToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isLooped = e.target.checked;
        setProject(p => {
            if (!p) return null;
            return {
                ...p,
                tracks: p.tracks.map(t => {
                    if (t.id !== trackOfClip?.id) return t;
                    return {
                        ...t,
                        clips: t.clips.map(c => c.id === clipId ? { ...c, isLooped } : c)
                    };
                })
            };
        });
    };

    return (
        <>
            <h3 className="text-lg font-bold mb-2 truncate">{file.name}</h3>
            <p className="text-sm text-gray-400 mb-4">Clip Properties</p>
            <div className="space-y-2 text-sm">
                <p><span className="font-semibold text-gray-300">Start Time:</span> {clip.startTime.toFixed(2)}s</p>
                <p><span className="font-semibold text-gray-300">Duration:</span> {clip.duration.toFixed(2)}s</p>
                <p><span className="font-semibold text-gray-300">Track:</span> <span className="truncate">{trackOfClip.name}</span></p>
            </div>

            {(trackOfClip.kind === TrackKind.Music || trackOfClip.kind === TrackKind.Background) && (
                <div className="mt-6 border-t border-gray-600 pt-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!clip.isLooped}
                            onChange={handleLoopToggle}
                            className="h-5 w-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-800"
                        />
                         <span className="text-gray-300 flex items-center gap-2">
                            <RepeatIcon className="w-4 h-4"/>
                            Loop Clip
                         </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 pl-8">Repeats this clip for the entire project duration.</p>
                </div>
            )}
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