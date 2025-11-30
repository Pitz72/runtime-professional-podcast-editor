import React, { useState } from 'react';
import { useAudioExport, ExportOptions } from '../hooks/useAudioExport';
import { useAppStore } from '../store';
import { useLogger } from '../hooks/useLogger';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const logger = useLogger();
  const { project } = useAppStore();
  const { exportAudio, exportStems, downloadBlob, isExporting, progress } = useAudioExport();

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'wav',
    sampleRate: 44100,
    bitDepth: 16,
    channels: 2,
    normalization: true,
    dithering: false,
    applyEffects: true,
    quality: 'high'
  });

  const [exportMode, setExportMode] = useState<'mix' | 'stems'>('mix');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!project) return;

    setIsProcessing(true);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const baseName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

    try {
      if (exportMode === 'mix') {
        logger.info('Starting mix export', { options: exportOptions });

        const blob = await exportAudio(exportOptions, (progress) => {
          // Progress is handled by the hook
        });

        const extension = exportOptions.format;
        const filename = `${baseName}.${extension}`;
        downloadBlob(blob, filename);

        logger.info('Mix export completed', { filename, size: blob.size });

      } else {
        logger.info('Starting stems export', { options: exportOptions });

        const stems = await exportStems(exportOptions, (progress) => {
          // Progress is handled by the hook
        });

        stems.forEach(({ trackName, blob }) => {
          const safeTrackName = trackName.replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `${baseName}_${safeTrackName}.${exportOptions.format}`;
          downloadBlob(blob, filename);
        });

        logger.info('Stems export completed', { stemCount: stems.length });
      }

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      logger.error('Export failed', { error, mode: exportMode });
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'wav':
        return 'Lossless uncompressed format, highest quality';
      case 'flac':
        return 'Lossless compressed format, good compression';
      case 'mp3':
        return 'Lossy compressed format, small file size';
      case 'aac':
        return 'Lossy compressed format, good for web/streaming';
      default:
        return '';
    }
  };

  const getEstimatedFileSize = () => {
    if (!project) return 'Unknown';

    const duration = Math.max(...project.tracks.flatMap(t =>
      t.clips.map(c => c.startTime + c.duration)
    ));

    const sampleRate = exportOptions.sampleRate;
    const channels = exportOptions.channels;
    const bitDepth = exportOptions.bitDepth;

    // Rough calculation for uncompressed size
    const bytesPerSecond = sampleRate * channels * (bitDepth / 8);
    const totalBytes = bytesPerSecond * duration;

    // Apply compression ratios for compressed formats
    let compressionRatio = 1;
    switch (exportOptions.format) {
      case 'mp3':
        compressionRatio = exportOptions.quality === 'high' ? 8 : 12;
        break;
      case 'aac':
        compressionRatio = 10;
        break;
      case 'flac':
        compressionRatio = 2;
        break;
    }

    const compressedBytes = totalBytes / compressionRatio;
    const sizeMB = compressedBytes / (1024 * 1024);

    return `${sizeMB.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Export Audio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
            disabled={isProcessing}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Mode */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Export Mode</h3>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mix"
                  checked={exportMode === 'mix'}
                  onChange={(e) => setExportMode(e.target.value as 'mix')}
                  className="mr-2"
                  disabled={isProcessing}
                />
                <span className="text-gray-300">Export Mix</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="stems"
                  checked={exportMode === 'stems'}
                  onChange={(e) => setExportMode(e.target.value as 'stems')}
                  className="mr-2"
                  disabled={isProcessing}
                />
                <span className="text-gray-300">Export Stems</span>
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {exportMode === 'mix'
                ? 'Export the final mixed audio with all effects applied'
                : 'Export individual tracks as separate files'
              }
            </p>
          </div>

          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Format</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'wav', label: 'WAV' },
                { value: 'mp3', label: 'MP3' },
                { value: 'flac', label: 'FLAC' },
                { value: 'aac', label: 'AAC' }
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700">
                  <input
                    type="radio"
                    value={value}
                    checked={exportOptions.format === value}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      format: e.target.value as ExportOptions['format']
                    }))}
                    className="mr-3"
                    disabled={isProcessing}
                  />
                  <div>
                    <div className="font-medium text-white">{label}</div>
                    <div className="text-sm text-gray-400">{getFormatDescription(value)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quality Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Quality Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sample Rate</label>
                <select
                  value={exportOptions.sampleRate}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    sampleRate: parseInt(e.target.value) as ExportOptions['sampleRate']
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  disabled={isProcessing}
                >
                  <option value={44100}>44.1 kHz (CD Quality)</option>
                  <option value={48000}>48 kHz (Professional)</option>
                  <option value={96000}>96 kHz (High-End)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bit Depth</label>
                <select
                  value={exportOptions.bitDepth}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    bitDepth: parseInt(e.target.value) as ExportOptions['bitDepth']
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  disabled={isProcessing}
                >
                  <option value={16}>16-bit</option>
                  <option value={24}>24-bit</option>
                  <option value={32}>32-bit (Float)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Processing Options */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Processing Options</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.normalization}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    normalization: e.target.checked
                  }))}
                  className="mr-3"
                  disabled={isProcessing}
                />
                <div>
                  <div className="text-gray-300">Normalize audio levels</div>
                  <div className="text-sm text-gray-500">Ensure consistent loudness across the export</div>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.applyEffects}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    applyEffects: e.target.checked
                  }))}
                  className="mr-3"
                  disabled={isProcessing}
                />
                <div>
                  <div className="text-gray-300">Apply track effects</div>
                  <div className="text-sm text-gray-500">Include EQ, compression, and other effects in export</div>
                </div>
              </label>

              {exportOptions.format === 'wav' && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.dithering}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dithering: e.target.checked
                    }))}
                    className="mr-3"
                    disabled={isProcessing}
                  />
                  <div>
                    <div className="text-gray-300">Apply dithering</div>
                    <div className="text-sm text-gray-500">Reduce quantization noise in 16-bit exports</div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* File Size Estimate */}
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-white mb-2">Estimated File Size</h4>
            <p className="text-gray-300">{getEstimatedFileSize()}</p>
            <p className="text-sm text-gray-500 mt-1">
              {exportMode === 'stems' && project && `× ${project.tracks.length} files`}
            </p>
          </div>

          {/* Progress */}
          {(isExporting || isProcessing) && progress && (
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">{progress.currentOperation}</span>
                <span className="text-gray-400">{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isProcessing || !project}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Exporting...' : `Export ${exportMode === 'mix' ? 'Mix' : 'Stems'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;