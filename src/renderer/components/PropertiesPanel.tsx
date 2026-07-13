import React from 'react';
import { Project, Track, AudioClip, AudioFile, TrackKind, AudioPreset, SelectedItem } from '@shared/types';
import { VOICE_PRESETS, MUSIC_PRESETS } from '../presets';
import { RepeatIcon } from './icons';
import { useAppStore } from '../store';
import { useT } from '../i18n';


interface PropertiesPanelProps {
  selectedItem: SelectedItem;
  project: Project;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedItem, project }) => {
  const t = useT();
  const updateTrack = useAppStore(s => s.updateTrack);
  const updateClip = useAppStore(s => s.updateClip);
  const saveToHistory = useAppStore(s => s.saveToHistory);

  const handlePresetChange = (trackId: string, presetName: string, availablePresets: AudioPreset[]) => {
    const preset = availablePresets.find(p => p.name === presetName);
    saveToHistory();
    updateTrack(trackId, { effects: preset });
  };

  const renderTrackProperties = (trackId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track) return <p className="text-gray-500">{t('properties.trackNotFound')}</p>;

    const isMusicTrack = track.kind === TrackKind.Music || track.kind === TrackKind.Background;
    const isVoiceTrack = track.kind === TrackKind.Voice;

    const selectedPresetName = track.effects?.name || '';
    const isCustomPreset = selectedPresetName && ![...VOICE_PRESETS, ...MUSIC_PRESETS].some(p => p.name === selectedPresetName);

    return (
      <>
        <h3 className="text-lg font-bold mb-2">{track.name}</h3>
        <p className="text-sm text-gray-400 mb-4">{t('properties.type')}: {track.kind}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">{t('properties.volume')}</label>
            <input type="range" min="0" max="1" step="0.01" value={track.volume}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              onChange={(e) => updateTrack(trackId, { volume: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        {isMusicTrack && (
          <div className="mt-6 border-t border-gray-600 pt-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!track.isDuckingEnabled}
                className="h-5 w-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-800"
                onChange={e => {
                  saveToHistory();
                  updateTrack(trackId, { isDuckingEnabled: e.target.checked });
                }}
              />
              <span className="text-gray-300">
                {t('properties.ducking')}
                <p className="text-xs text-gray-500">{t('properties.duckingDesc')}</p>
              </span>
            </label>
          </div>
        )}

        {(isVoiceTrack || isMusicTrack) && (
          <div className="mt-6 border-t border-gray-600 pt-4">
            <h4 className="font-semibold text-purple-400 mb-2">{t('properties.presets')}</h4>
            <p className="text-xs text-gray-400 mb-3">{t('properties.presetsDesc')}</p>
            <select
              value={isCustomPreset ? 'custom' : selectedPresetName}
              onChange={(e) => handlePresetChange(track.id, e.target.value, isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">{t('properties.noPreset')}</option>
              {(isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS).map(preset => (
                <option key={preset.name} value={preset.name}>{preset.name}</option>
              ))}
              {isCustomPreset && <option value="custom" disabled>{track.effects?.name}</option>}
            </select>
          </div>
        )}

      </>
    );
  };

  const renderClipProperties = (clipId: string) => {
    let clip: AudioClip | undefined;
    let file: AudioFile | undefined;
    let trackOfClip: Track | undefined;

    for (const track of project.tracks) {
      const foundClip = track.clips.find(c => c.id === clipId);
      if (foundClip) {
        clip = foundClip;
        file = project.files.find(f => f.id === foundClip.fileId);
        trackOfClip = track;
        break;
      }
    }

    if (!clip || !file || !trackOfClip) return <p className="text-gray-500">{t('properties.clipNotFound')}</p>;

    return (
      <>
        <h3 className="text-lg font-bold mb-2 truncate">{file.name}</h3>
        <p className="text-sm text-gray-400 mb-4">{t('properties.clipProperties')}</p>
        <div className="space-y-2 text-sm">
          <p><span className="font-semibold text-gray-300">{t('properties.startTime')}:</span> {clip.startTime.toFixed(2)}s</p>
          <p><span className="font-semibold text-gray-300">{t('properties.duration')}:</span> {clip.duration.toFixed(2)}s</p>
          <p><span className="font-semibold text-gray-300">{t('properties.track')}:</span> <span className="truncate">{trackOfClip.name}</span></p>
        </div>

        {(trackOfClip.kind === TrackKind.Music || trackOfClip.kind === TrackKind.Background) && (
          <div className="mt-6 border-t border-gray-600 pt-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!clip.isLooped}
                onChange={(e) => {
                  saveToHistory();
                  updateClip(clipId, { isLooped: e.target.checked });
                }}
                className="h-5 w-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-800"
              />
              <span className="text-gray-300 flex items-center gap-2">
                <RepeatIcon className="w-4 h-4" />
                {t('properties.loopClip')}
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 pl-8">{t('properties.loopDesc')}</p>
          </div>
        )}
      </>
    );
  };

  const renderFileProperties = (fileId: string) => {
    const file = project.files.find(f => f.id === fileId);
    if (!file) return <p className="text-gray-500">{t('properties.fileNotFound')}</p>;

    return (
      <>
        <h3 className="text-lg font-bold mb-2 break-all">{file.name}</h3>
        <p className="text-sm text-gray-400 mb-4">{t('properties.fileProperties')}</p>
        <div className="space-y-2 text-sm">
          <p><span className="font-semibold text-gray-300">{t('properties.duration')}:</span> {file.duration.toFixed(2)}s</p>
          {file.path && <p className="break-all"><span className="font-semibold text-gray-300">{t('properties.path')}:</span> {file.path}</p>}
          {!file.path && (
            <p className="text-yellow-400 text-xs">
              {t('properties.noPath')}
            </p>
          )}
          {!file.buffer && (
            <p className="text-red-400 text-xs">
              {t('properties.notLoaded')}
            </p>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold p-3 bg-gray-900 border-b border-gray-700">{t('properties.title')}</h2>
      <div className="p-4">
        {!selectedItem ? (
          <p className="text-gray-500">{t('properties.selectHint')}</p>
        ) : selectedItem.type === 'track' ? (
          renderTrackProperties(selectedItem.id)
        ) : selectedItem.type === 'clip' ? (
          renderClipProperties(selectedItem.id)
        ) : (
          renderFileProperties(selectedItem.id)
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
