import React, { useState } from 'react';
import { Project, Track, AudioClip, AudioFile, TrackKind, AudioPreset, SelectedItem } from '@shared/types';
import { VOICE_PRESETS, MUSIC_PRESETS } from '../presets';
import {
  RepeatIcon,
  SlidersIcon,
  FileAudioIcon,
  DuckingIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon
} from './icons';
import { useAppStore } from '../store';
import { useT } from '../i18n';

interface PropertiesPanelProps {
  selectedItem: SelectedItem;
  project: Project;
}

const KIND_BADGES: Record<TrackKind, { label: string; bg: string; text: string; border: string }> = {
  [TrackKind.Voice]: { label: 'VOCE', bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  [TrackKind.Music]: { label: 'MUSICA', bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-500/30' },
  [TrackKind.Background]: { label: 'SOTTOFONDO', bg: 'bg-sky-950/60', text: 'text-sky-400', border: 'border-sky-500/30' },
  [TrackKind.FX]: { label: 'FX / SIGLE', bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-500/30' },
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedItem, project }) => {
  const t = useT();
  const updateTrack = useAppStore(s => s.updateTrack);
  const updateClip = useAppStore(s => s.updateClip);
  const saveToHistory = useAppStore(s => s.saveToHistory);
  const [copiedPath, setCopiedPath] = useState(false);

  const handleCopyPath = (path: string) => {
    void navigator.clipboard?.writeText(path).then(() => {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    });
  };

  const handlePresetChange = (trackId: string, presetName: string, availablePresets: AudioPreset[]) => {
    const preset = availablePresets.find(p => p.name === presetName);
    saveToHistory();
    updateTrack(trackId, { effects: preset });
  };

  // Convert linear volume (0..1) to dBFS display
  const toDbText = (vol: number): string => {
    if (vol <= 0.0001) return '-inf dB';
    const db = 20 * Math.log10(vol);
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
  };

  // Format seconds to mm:ss.ms
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const renderTrackProperties = (trackId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track) {
      return (
        <div className="p-4 text-center text-slate-500 text-xs">
          {t('properties.trackNotFound')}
        </div>
      );
    }

    const isMusicTrack = track.kind === TrackKind.Music || track.kind === TrackKind.Background;
    const isVoiceTrack = track.kind === TrackKind.Voice;
    const badge = KIND_BADGES[track.kind] || KIND_BADGES[TrackKind.Voice];

    const selectedPresetName = track.effects?.name || '';
    const activePreset = isVoiceTrack
      ? VOICE_PRESETS.find(p => p.name === selectedPresetName)
      : isMusicTrack
      ? MUSIC_PRESETS.find(p => p.name === selectedPresetName)
      : undefined;

    const isCustomPreset =
      selectedPresetName &&
      ![...VOICE_PRESETS, ...MUSIC_PRESETS].some(p => p.name === selectedPresetName);

    return (
      <div className="space-y-4">
        {/* Track Title & Rename Header */}
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
            >
              {badge.label}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">ID: {track.id.slice(0, 6)}</span>
          </div>

          <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
            {t('properties.type')}: {track.kind}
          </label>
          <input
            type="text"
            value={track.name}
            onFocus={() => saveToHistory()}
            onChange={e => updateTrack(trackId, { name: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 font-medium focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            placeholder="Nome Traccia..."
          />
        </div>

        {/* Channel Strip Fader Section */}
        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SlidersIcon className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                {t('properties.volume')}
              </label>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-slate-100 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {Math.round(track.volume * 100)}%
              </span>
              <span className="text-[11px] text-purple-400 font-semibold w-16 text-right">
                {toDbText(track.volume)}
              </span>
            </div>
          </div>

          {/* Master Channel Range Slider */}
          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              aria-label={t('properties.volume')}
              className="console-fader w-full h-2 rounded-lg cursor-pointer"
              onMouseDown={() => saveToHistory()}
              onChange={e => updateTrack(trackId, { volume: parseFloat(e.target.value) })}
            />
            {/* Tick marks */}
            <div className="flex justify-between text-[8px] text-slate-600 font-mono mt-1 select-none px-0.5">
              <span>-inf</span>
              <span>-12dB</span>
              <span>-6dB</span>
              <span>0dB</span>
            </div>
          </div>

          {/* Quick Level Snap Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => {
                saveToHistory();
                updateTrack(trackId, { volume: 0 });
              }}
              className="px-1.5 py-1 text-[10px] font-mono bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-colors"
            >
              MUTE
            </button>
            <button
              onClick={() => {
                saveToHistory();
                updateTrack(trackId, { volume: 0.5 });
              }}
              className="px-1.5 py-1 text-[10px] font-mono bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-colors"
            >
              -6 dB
            </button>
            <button
              onClick={() => {
                saveToHistory();
                updateTrack(trackId, { volume: 0.707 });
              }}
              className="px-1.5 py-1 text-[10px] font-mono bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-colors"
            >
              -3 dB
            </button>
            <button
              onClick={() => {
                saveToHistory();
                updateTrack(trackId, { volume: 1.0 });
              }}
              className="px-1.5 py-1 text-[10px] font-mono bg-slate-950 hover:bg-purple-900/40 text-purple-300 rounded border border-slate-800 hover:border-purple-600/50 transition-colors"
            >
              0 dB
            </button>
          </div>

          {/* Hardware Solo & Mute Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                saveToHistory();
                updateTrack(trackId, { isMuted: !track.isMuted });
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold font-mono tracking-wider border transition-all ${
                track.isMuted
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  track.isMuted
                    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,1)]'
                    : 'bg-slate-600'
                }`}
              />
              {t('properties.mute').toUpperCase()}
            </button>

            <button
              type="button"
              onClick={() => {
                saveToHistory();
                updateTrack(trackId, { isSolo: !track.isSolo });
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold font-mono tracking-wider border transition-all ${
                track.isSolo
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  track.isSolo
                    ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,1)]'
                    : 'bg-slate-600'
                }`}
              />
              {t('properties.solo').toUpperCase()}
            </button>
          </div>
        </div>

        {/* Auto-Ducking Module (for Music / Background) */}
        {isMusicTrack && (
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              track.isDuckingEnabled
                ? 'bg-indigo-950/40 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    track.isDuckingEnabled
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <DuckingIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    {t('properties.ducking')}
                  </h4>
                  <p className="text-[10px] text-slate-400">{t('properties.duckingDesc')}</p>
                </div>
              </div>

              {/* Broadcast Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  saveToHistory();
                  updateTrack(trackId, { isDuckingEnabled: !track.isDuckingEnabled });
                }}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  track.isDuckingEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    track.isDuckingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Studio DSP Chain / Presets Module */}
        {(isVoiceTrack || isMusicTrack) && (
          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  {t('properties.presets')}
                </h4>
              </div>
              <span className="text-[9px] font-mono uppercase bg-purple-950/80 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">
                DSP EQ & DYNAMICS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{t('properties.presetsDesc')}</p>

            {/* Styled Preset Select */}
            <div className="relative">
              <select
                value={isCustomPreset ? 'custom' : selectedPresetName}
                onChange={e =>
                  handlePresetChange(
                    track.id,
                    e.target.value,
                    isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS
                  )
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-medium focus:ring-1 focus:ring-purple-500 focus:border-purple-500 appearance-none cursor-pointer pr-8"
              >
                <option value="">{t('properties.noPreset')} (Linear / Flat)</option>
                {(isVoiceTrack ? VOICE_PRESETS : MUSIC_PRESETS).map(preset => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
                {isCustomPreset && <option value="custom" disabled>{track.effects?.name}</option>}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Active Preset Spec Visualizer Rack */}
            {activePreset && (
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="text-purple-300 font-bold">RACK SPECS:</span>
                  <span>{activePreset.name}</span>
                </div>

                {/* EQ filters list */}
                {activePreset.equalizer && activePreset.equalizer.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Parametric EQ:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {activePreset.equalizer.map((eq, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono bg-slate-900 border border-slate-700/80 text-slate-300 px-1.5 py-0.5 rounded"
                        >
                          {eq.type === 'highpass' && `HP ${eq.frequency}Hz`}
                          {eq.type === 'lowpass' && `LP ${eq.frequency}Hz`}
                          {eq.type === 'peaking' &&
                            `${(eq.gain ?? 0) >= 0 ? '+' : ''}${eq.gain}dB @ ${eq.frequency >= 1000 ? `${eq.frequency / 1000}k` : `${eq.frequency}`}Hz`}
                          {eq.type === 'highshelf' &&
                            `HS ${(eq.gain ?? 0) >= 0 ? '+' : ''}${eq.gain}dB @ ${eq.frequency / 1000}kHz`}
                          {eq.type === 'lowshelf' &&
                            `LS ${(eq.gain ?? 0) >= 0 ? '+' : ''}${eq.gain}dB @ ${eq.frequency}Hz`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compressor settings */}
                {activePreset.compressor && (
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Compressor Dynamics:
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-slate-300">
                      <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        Thresh: <span className="text-purple-300">{activePreset.compressor.threshold} dB</span>
                      </div>
                      <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        Ratio: <span className="text-purple-300">{activePreset.compressor.ratio}:1</span>
                      </div>
                      <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        Attack: <span className="text-slate-400">{(activePreset.compressor.attack * 1000).toFixed(0)} ms</span>
                      </div>
                      <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        Release: <span className="text-slate-400">{(activePreset.compressor.release * 1000).toFixed(0)} ms</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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

    if (!clip || !file || !trackOfClip) {
      return (
        <div className="p-4 text-center text-slate-500 text-xs">
          {t('properties.clipNotFound')}
        </div>
      );
    }

    const endTime = clip.startTime + clip.duration;
    const isMusicOrBkg =
      trackOfClip.kind === TrackKind.Music || trackOfClip.kind === TrackKind.Background;

    return (
      <div className="space-y-4">
        {/* Clip Title & Parent Track */}
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <FileAudioIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-100 truncate" title={file.name}>
              {file.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span className="text-slate-500">CANALE:</span>
            <span className="text-slate-300 font-medium truncate">{trackOfClip.name}</span>
          </div>
        </div>

        {/* 2x2 Precision Timing Matrix */}
        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200 uppercase tracking-wide mb-1">
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>TIMING & POSIZIONE</span>
            </div>
            <span className="text-[10px] font-mono text-purple-400">TIMECODE</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-mono block">
                {t('properties.startTime')}
              </span>
              <p className="text-xs font-mono font-bold text-slate-100 mt-0.5">
                {clip.startTime.toFixed(2)}s
              </p>
              <span className="text-[9px] font-mono text-slate-500">
                {formatTime(clip.startTime)}
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-mono block">
                FINE SELEZIONE
              </span>
              <p className="text-xs font-mono font-bold text-slate-100 mt-0.5">
                {endTime.toFixed(2)}s
              </p>
              <span className="text-[9px] font-mono text-slate-500">
                {formatTime(endTime)}
              </span>
            </div>

            <div className="col-span-2 bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">
                  {t('properties.duration')}
                </span>
                <p className="text-xs font-mono font-bold text-purple-300 mt-0.5">
                  {clip.duration.toFixed(2)}s ({formatTime(clip.duration)})
                </p>
              </div>
              <span className="text-[10px] font-mono bg-purple-950/60 text-purple-400 border border-purple-800/60 px-2 py-0.5 rounded">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Studio Crossfade Envelope (Fade In / Fade Out) */}
        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              DISSOLVENZE (ENVELOPE)
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">SECONDI</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Fade In Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-[11px] font-medium text-slate-300">
                  {t('properties.fadeIn')}
                </label>
                <span className="text-[10px] font-mono text-purple-400">
                  {(clip.fadeIn ?? 0).toFixed(1)}s
                </span>
              </div>
              <input
                type="number"
                min="0"
                max={clip.duration / 2}
                step="0.1"
                value={clip.fadeIn ?? 0}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                onFocus={() => saveToHistory()}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  updateClip(clipId, {
                    fadeIn: isNaN(val) || val <= 0 ? undefined : Math.min(clip.duration / 2, val)
                  });
                }}
              />
              {/* Quick Fade In Presets */}
              <div className="flex gap-1">
                {[0, 0.5, 1.0].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      saveToHistory();
                      updateClip(clipId, { fadeIn: sec === 0 ? undefined : Math.min(clip.duration / 2, sec) });
                    }}
                    className="flex-1 py-0.5 text-[9px] font-mono bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-colors"
                  >
                    {sec === 0 ? '0' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Fade Out Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-[11px] font-medium text-slate-300">
                  {t('properties.fadeOut')}
                </label>
                <span className="text-[10px] font-mono text-purple-400">
                  {(clip.fadeOut ?? 0).toFixed(1)}s
                </span>
              </div>
              <input
                type="number"
                min="0"
                max={clip.duration / 2}
                step="0.1"
                value={clip.fadeOut ?? 0}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                onFocus={() => saveToHistory()}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  updateClip(clipId, {
                    fadeOut: isNaN(val) || val <= 0 ? undefined : Math.min(clip.duration / 2, val)
                  });
                }}
              />
              {/* Quick Fade Out Presets */}
              <div className="flex gap-1">
                {[0, 0.5, 1.0].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      saveToHistory();
                      updateClip(clipId, { fadeOut: sec === 0 ? undefined : Math.min(clip.duration / 2, sec) });
                    }}
                    className="flex-1 py-0.5 text-[9px] font-mono bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-colors"
                  >
                    {sec === 0 ? '0' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Clip Seamless Loop Option */}
        {isMusicOrBkg && (
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              clip.isLooped
                ? 'bg-purple-950/40 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    clip.isLooped
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <RepeatIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    {t('properties.loopClip')}
                  </h4>
                  <p className="text-[10px] text-slate-400">{t('properties.loopDesc')}</p>
                </div>
              </div>

              {/* Loop Switch Button */}
              <button
                type="button"
                onClick={() => {
                  saveToHistory();
                  updateClip(clipId, { isLooped: !clip.isLooped });
                }}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  clip.isLooped ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    clip.isLooped ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFileProperties = (fileId: string) => {
    const file = project.files.find(f => f.id === fileId);
    if (!file) {
      return (
        <div className="p-4 text-center text-slate-500 text-xs">
          {t('properties.fileNotFound')}
        </div>
      );
    }

    const extension = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
    const isReady = !!file.buffer;

    return (
      <div className="space-y-4">
        {/* File Header Card */}
        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
              {extension} ASSET
            </span>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                isReady
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
              }`}
            >
              {isReady ? 'RAM READY' : 'DECODING'}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-100 break-all">{file.name}</h3>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block uppercase">
                {t('properties.duration')}
              </span>
              <span className="text-slate-100 font-bold">{file.duration.toFixed(2)}s</span>
            </div>

            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block uppercase">CHANNELS</span>
              <span className="text-slate-100 font-bold">
                {file.buffer ? `${file.buffer.numberOfChannels} CH (${file.buffer.sampleRate} Hz)` : '2 CH'}
              </span>
            </div>
          </div>
        </div>

        {/* File Path Card */}
        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <InfoIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                {t('properties.path')}
              </span>
            </div>
            {file.path && (
              <button
                type="button"
                onClick={() => handleCopyPath(file.path!)}
                className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-mono transition-colors"
                title="Copia percorso file negli appunti"
              >
                {copiedPath ? (
                  <>
                    <CheckIcon className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">COPIATO</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3 h-3" />
                    <span>COPIA</span>
                  </>
                )}
              </button>
            )}
          </div>

          {file.path ? (
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 break-all select-all">
              {file.path}
            </div>
          ) : (
            <p className="text-[11px] text-amber-400/80 bg-amber-950/20 p-2 rounded border border-amber-900/30">
              {t('properties.noPath')}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 border-t border-slate-800/80">
      {/* Inspector Title Bar */}
      <div className="h-10 px-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <SlidersIcon className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
            {t('properties.title')}
          </h2>
        </div>
        {selectedItem && (
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
            {selectedItem.type}
          </span>
        )}
      </div>

      {/* Inspector Body */}
      <div className="p-3.5 space-y-4">
        {!selectedItem ? (
          <div className="py-10 px-4 text-center space-y-4 select-none">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600 shadow-inner">
              <SlidersIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">Nessun elemento selezionato</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                {t('properties.selectHint')}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-900 space-y-2 text-left">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                <span>Tracce: volume, solo/mute e catena DSP</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
                <span>Clip: dissolvenze, timing e loop</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500/60" />
                <span>File: metadati e percorsi sorgente</span>
              </div>
            </div>
          </div>
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
