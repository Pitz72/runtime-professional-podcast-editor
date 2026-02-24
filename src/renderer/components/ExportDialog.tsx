import React, { useState } from 'react';
import { Project } from '@shared/types';
import { ExportFormat } from '../services/audioUtils';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onExport: (format: ExportFormat) => Promise<void>;
  isExporting: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, project, onExport, isExporting }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('wav');

  if (!isOpen) return null;

  const handleExport = async () => {
    await onExport(selectedFormat);
    onClose();
  };

  const formats: { value: ExportFormat; label: string; description: string; enabled: boolean }[] = [
    { value: 'wav', label: 'WAV', description: 'Lossless, highest quality', enabled: true },
    { value: 'mp3', label: 'MP3', description: 'Lossy, universal compatibility', enabled: true },
    { value: 'flac', label: 'FLAC', description: 'Lossless compressed (coming soon)', enabled: false },
    { value: 'aac', label: 'AAC', description: 'Lossy, streaming optimized (coming soon)', enabled: false },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full border border-gray-700">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Export Audio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
            disabled={isExporting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Format</h3>
            <div className="grid grid-cols-2 gap-2">
              {formats.map(({ value, label, description, enabled }) => (
                <label
                  key={value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${!enabled ? 'opacity-40 cursor-not-allowed' :
                      selectedFormat === value
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-600 hover:bg-gray-700/50'
                    }`}
                >
                  <input
                    type="radio"
                    value={value}
                    checked={selectedFormat === value}
                    onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                    className="mr-3 mt-0.5"
                    disabled={isExporting || !enabled}
                  />
                  <div>
                    <div className="font-medium text-white text-sm">{label}</div>
                    <div className="text-xs text-gray-400">{description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-gray-900/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Project: <span className="text-gray-300">{project.name}</span></div>
            <div className="text-xs text-gray-400">Tracks: <span className="text-gray-300">{project.tracks.length}</span></div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;