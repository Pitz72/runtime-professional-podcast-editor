import React from 'react';
import { PlayIcon, PauseIcon, StopIcon, SaveIcon } from './icons';
import { CompressorSettings } from '../types';
import { MASTERING_PRESETS } from '../presets';
import { ExportFormat } from '../services/audioUtils';

interface TransportControlsProps {
   isPlaying: boolean;
   onPlayPause: () => void;
   onStop: () => void;
   onSave: () => void;
   onExport: (format: ExportFormat) => void;
   onMasteringChange: (preset: CompressorSettings | undefined) => void;
   isBuffering: boolean;
   isExporting: boolean;
   currentMastering?: CompressorSettings;
}

const TransportControls: React.FC<TransportControlsProps> = ({
  isPlaying,
  onPlayPause,
  onStop,
  onSave,
  onExport,
  onMasteringChange,
  isBuffering,
  isExporting,
  currentMastering
}) => {
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('wav');

  const isBusy = isBuffering || isExporting;
  const exportButtonText = isExporting ? 'Exporting...' : 'Export';

  const handleExport = () => {
    onExport(selectedFormat);
  };

  const handleMasteringSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    if (!presetName) {
      onMasteringChange(undefined);
      return;
    }
    const preset = MASTERING_PRESETS.find(p => p.name === presetName);
    onMasteringChange(preset?.settings);
  };
  
  const selectedMasteringName = MASTERING_PRESETS.find(p => 
    JSON.stringify(p.settings) === JSON.stringify(currentMastering)
  )?.name || '';

  return (
    <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg">
            <button 
                onClick={onStop} 
                className="p-2 text-gray-300 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                disabled={isBusy}
            >
                <StopIcon className="w-5 h-5" />
            </button>
            <button 
                onClick={onPlayPause} 
                className="p-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed"
                disabled={isBusy}
            >
                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
        </div>
        <div className="flex items-center gap-2">
           <label htmlFor="mastering-preset" className="text-sm font-medium text-gray-400">Mastering:</label>
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
           <span className="font-semibold text-sm">Save</span>
       </button>
       <div className="flex items-center gap-2">
           <label htmlFor="export-format" className="text-sm font-medium text-gray-400">Format:</label>
           <select
               id="export-format"
               value={selectedFormat}
               onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
               disabled={isBusy || isPlaying}
               className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
           >
               <option value="wav">WAV</option>
               <option value="mp3">MP3</option>
               <option value="flac">FLAC (soon)</option>
               <option value="aac">AAC (soon)</option>
           </select>
       </div>
       <button
           onClick={handleExport}
           className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
           disabled={isBusy || isPlaying}
       >
           <span className="font-semibold">{exportButtonText}</span>
       </button>
    </div>
  );
};

export default TransportControls;