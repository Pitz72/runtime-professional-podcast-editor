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
}

const MasterMeter: React.FC<{
  onMeterUpdate: (callback: (level: number) => void) => () => void;
}> = ({ onMeterUpdate }) => {
  const barRef = React.useRef<HTMLDivElement>(null);
  const peakTextRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    return onMeterUpdate((level) => {
      if (barRef.current) {
        const percent = Math.min(100, Math.max(0, level * 100));
        barRef.current.style.width = `${percent}%`;
        if (level >= 0.99) {
          barRef.current.style.backgroundColor = '#ef4444';
        } else if (level >= 0.8) {
          barRef.current.style.backgroundColor = '#eab308';
        } else {
          barRef.current.style.backgroundColor = '#22c55e';
        }
      }
      if (peakTextRef.current) {
        if (level <= 0.0001) {
          peakTextRef.current.textContent = '-∞ dB';
        } else {
          const db = 20 * Math.log10(level);
          peakTextRef.current.textContent = `${db.toFixed(1)} dB`;
        }
      }
    });
  }, [onMeterUpdate]);

  return (
    <div className="flex flex-col justify-center w-28 h-8 px-2 py-1 bg-gray-950 border border-gray-700 rounded select-none" title="Master Peak Meter">
      <div className="w-full h-2.5 bg-gray-800 rounded-sm overflow-hidden relative">
        <div
          ref={barRef}
          className="h-full bg-green-500 transition-[width] duration-75 ease-out"
          style={{ width: '0%' }}
        />
      </div>
      <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono leading-none mt-1">
        <span>MASTER</span>
        <span ref={peakTextRef} className="text-gray-300 font-bold">-∞ dB</span>
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
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg">
        <button
          onClick={onStop}
          className="p-2 text-gray-300 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          disabled={isBusy}
          aria-label={t('transport.stop')}
        >
          <StopIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onPlayPause}
          className="p-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed"
          disabled={isBusy}
          aria-label={isPlaying ? t('transport.pause') : t('transport.play')}
        >
          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
        </button>
      </div>
      {onMeterUpdate && <MasterMeter onMeterUpdate={onMeterUpdate} />}
      <div className="flex items-center gap-2">
        <label htmlFor="mastering-preset" className="text-sm font-medium text-gray-400">{t('transport.mastering')}</label>
        <select
          id="mastering-preset"
          value={selectedMasteringName}
          onChange={handleMasteringSelect}
          disabled={isBusy || isPlaying}
          className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
        >
          {MASTERING_PRESETS.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
      <button
        onClick={onSave}
        className="flex items-center gap-2 p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        disabled={isBusy || isPlaying}
      >
        <SaveIcon className="w-5 h-5" />
        <span className="font-semibold text-sm">{t('transport.save')}</span>
      </button>
      <div className="flex items-center gap-2">
        <label htmlFor="export-format" className="text-sm font-medium text-gray-400">{t('transport.format')}</label>
        <select
          id="export-format"
          value={exportFormat}
          onChange={(e) => onExportFormatChange(e.target.value as ExportFormat)}
          disabled={isBusy || isPlaying}
          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
        >
          <option value="wav">WAV</option>
          <option value="mp3">MP3</option>
        </select>
      </div>
      <button
        onClick={() => onExport(exportFormat)}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isBusy || isPlaying}
      >
        <span className="font-semibold">{exportButtonText}</span>
      </button>
    </div>
  );
};

export default TransportControls;
