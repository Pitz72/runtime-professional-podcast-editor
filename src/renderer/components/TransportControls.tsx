import React from 'react';
import { PlayIcon, PauseIcon, StopIcon, SaveIcon } from './icons';
import { CompressorSettings } from '@shared/types';
import { MASTERING_PRESETS } from '../presets';
import { ExportFormat } from '../services/audioUtils';
import { useT } from '../i18n';

interface TransportControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSave: () => void;
  onExport: (format: ExportFormat) => void;
  onMasteringChange: (preset: CompressorSettings | undefined) => void;
  isExporting: boolean;
  currentMastering?: CompressorSettings;
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
  onMeterUpdate?: (callback: (level: number) => void) => () => void;
  onTimeUpdate?: (callback: (time: number) => void) => () => void;
}

const TimecodeDisplay: React.FC<{
  onTimeUpdate?: (callback: (time: number) => void) => () => void;
}> = ({ onTimeUpdate }) => {
  const timeRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!onTimeUpdate) return;
    return onTimeUpdate((time) => {
      if (timeRef.current) {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);
        timeRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
      }
    });
  }, [onTimeUpdate]);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-black/90 border border-slate-800 rounded-lg shadow-inner select-none font-mono">
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">TC</span>
      <span
        ref={timeRef}
        className="text-emerald-400 font-bold text-sm tracking-widest tabular-nums drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
      >
        00:00.00
      </span>
    </div>
  );
};

const MasterMeter: React.FC<{
  onMeterUpdate: (callback: (level: number) => void) => () => void;
}> = ({ onMeterUpdate }) => {
  const barLRef = React.useRef<HTMLDivElement>(null);
  const barRRef = React.useRef<HTMLDivElement>(null);
  const clipRef = React.useRef<HTMLDivElement>(null);
  const peakTextRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    return onMeterUpdate((level) => {
      const percent = Math.min(100, Math.max(0, level * 100));
      const isClipping = level >= 0.99;

      if (barLRef.current) {
        barLRef.current.style.width = `${percent}%`;
        barLRef.current.style.backgroundColor = isClipping ? '#ef4444' : level >= 0.8 ? '#f59e0b' : '#10b981';
      }
      if (barRRef.current) {
        // Subtle stereo offset simulation for visual realism
        const rPercent = Math.min(100, Math.max(0, percent * (0.96 + Math.random() * 0.08)));
        barRRef.current.style.width = `${rPercent}%`;
        barRRef.current.style.backgroundColor = isClipping ? '#ef4444' : level >= 0.8 ? '#f59e0b' : '#10b981';
      }

      if (clipRef.current) {
        clipRef.current.style.opacity = isClipping ? '1' : '0.2';
      }

      if (peakTextRef.current) {
        if (level <= 0.0001) {
          peakTextRef.current.textContent = '-∞ dB';
          peakTextRef.current.style.color = '#94a3b8';
        } else {
          const db = 20 * Math.log10(level);
          peakTextRef.current.textContent = `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
          peakTextRef.current.style.color = isClipping ? '#ef4444' : level >= 0.8 ? '#f59e0b' : '#cbd5e1';
        }
      }
    });
  }, [onMeterUpdate]);

  return (
    <div className="flex flex-col justify-center w-32 h-9 px-2 py-1 bg-black/90 border border-slate-800 rounded-lg shadow-inner select-none" title="Master Broadcast Peak Meter">
      {/* Stereo L/R Bars */}
      <div className="space-y-0.5">
        <div className="w-full h-1.5 bg-slate-900 rounded-sm overflow-hidden relative border border-slate-800">
          <div
            ref={barLRef}
            className="h-full bg-emerald-500 transition-[width] duration-75 ease-out"
            style={{ width: '0%' }}
          />
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-sm overflow-hidden relative border border-slate-800">
          <div
            ref={barRRef}
            className="h-full bg-emerald-500 transition-[width] duration-75 ease-out"
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Meter Scale / Readout */}
      <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono leading-none mt-1">
        <div className="flex items-center gap-1">
          <div
            ref={clipRef}
            className="w-1.5 h-1.5 rounded-full bg-rose-500 opacity-20 shadow-sm"
            title="Clip indicator"
          />
          <span className="text-slate-500 font-bold">MSTR</span>
        </div>
        <span ref={peakTextRef} className="text-slate-300 font-bold tabular-nums">-∞ dB</span>
      </div>
    </div>
  );
};

const TransportControls: React.FC<TransportControlsProps> = ({
  isPlaying,
  onPlayPause,
  onStop,
  onSave,
  onExport,
  onMasteringChange,
  isExporting,
  currentMastering,
  exportFormat,
  onExportFormatChange,
  onMeterUpdate,
  onTimeUpdate,
}) => {
  const t = useT();
  const isBusy = isExporting;
  const exportButtonText = isExporting ? t('transport.exporting') : t('transport.export');

  const handleMasteringSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = MASTERING_PRESETS.find(p => p.name === e.target.value);
    onMasteringChange(preset?.settings);
  };

  const selectedMasteringName = MASTERING_PRESETS.find(p =>
    JSON.stringify(p.settings) === JSON.stringify(currentMastering)
  )?.name || MASTERING_PRESETS[0].name;

  return (
    <div className="flex items-center gap-3">
      {/* Timecode Digital Readout */}
      <TimecodeDisplay onTimeUpdate={onTimeUpdate} />

      {/* Transport Controls (Stop, Play/Pause) */}
      <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800 shadow-md">
        <button
          onClick={onStop}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-40 transition-colors"
          disabled={isBusy}
          aria-label={t('transport.stop')}
          title="Stop & Reset"
        >
          <StopIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onPlayPause}
          className={`px-3 py-2 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-md flex items-center gap-1.5 ${
            isPlaying
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
          } disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed`}
          disabled={isBusy}
          aria-label={isPlaying ? t('transport.pause') : t('transport.play')}
          title={isPlaying ? 'Pausa (Spazio)' : 'Riproduci (Spazio)'}
        >
          {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
          <span className="text-xs uppercase tracking-wider font-bold hidden sm:inline">
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </span>
        </button>
      </div>

      {/* Master Peak Level Meter */}
      {onMeterUpdate && <MasterMeter onMeterUpdate={onMeterUpdate} />}

      {/* Mastering Presets Dropdown */}
      <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-lg shadow-sm">
        <label htmlFor="mastering-preset" className="text-xs font-semibold text-slate-400 whitespace-nowrap">
          {t('transport.mastering')}
        </label>
        <select
          id="mastering-preset"
          value={selectedMasteringName}
          onChange={handleMasteringSelect}
          disabled={isBusy || isPlaying}
          className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-xs font-medium focus:ring-purple-500 focus:border-purple-500 disabled:opacity-40"
        >
          {MASTERING_PRESETS.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40 transition-colors shadow-sm"
        disabled={isBusy || isPlaying}
        title="Salva progetto (Ctrl+S)"
      >
        <SaveIcon className="w-4 h-4 text-slate-300" />
        <span className="font-semibold text-xs hidden sm:inline">{t('transport.save')}</span>
      </button>

      {/* Export Segment: Format Selector + Export Button */}
      <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 shadow-md">
        <select
          id="export-format"
          value={exportFormat}
          onChange={(e) => onExportFormatChange(e.target.value as ExportFormat)}
          disabled={isBusy || isPlaying}
          className="px-2 py-1.5 bg-transparent border-0 rounded text-slate-300 text-xs font-mono font-bold focus:ring-0 focus:outline-none disabled:opacity-40 cursor-pointer"
        >
          <option value="wav" className="bg-slate-900 text-white">WAV</option>
          <option value="mp3" className="bg-slate-900 text-white">MP3</option>
        </select>
        <button
          onClick={() => onExport(exportFormat)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-xs tracking-wide transition-all"
          disabled={isBusy || isPlaying}
        >
          <span>{exportButtonText}</span>
        </button>
      </div>
    </div>
  );
};

export default TransportControls;
