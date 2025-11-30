import React, { useState, useEffect } from 'react';
import { useAudioAnalysis, AudioAnalysisResult } from '../hooks/useAudioAnalysis';
import { AudioFile } from '@shared/types';
import { useLogger } from '../hooks/useLogger';

interface AudioAnalyzerProps {
  file: AudioFile;
  onClose: () => void;
}

const AudioAnalyzer: React.FC<AudioAnalyzerProps> = ({ file, onClose }) => {
  const logger = useLogger();
  const { analyzeAudioBuffer, isAnalyzing } = useAudioAnalysis();
  const [analysis, setAnalysis] = useState<AudioAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performAnalysis = async () => {
      if (!file.buffer) {
        setError('Audio buffer not available for analysis');
        return;
      }

      try {
        setError(null);
        const result = await analyzeAudioBuffer(file.buffer, {
          includeBeatDetection: true,
          includeGenreClassification: false,
          quality: 'comprehensive'
        });
        setAnalysis(result);

        logger.info('Audio analysis displayed', {
          fileId: file.id,
          loudness: result.integratedLoudness.toFixed(1),
          tempo: result.tempo
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
        setError(errorMessage);
        logger.error('Audio analysis failed in UI', { fileId: file.id, error: errorMessage });
      }
    };

    performAnalysis();
  }, [file, analyzeAudioBuffer, logger]);

  const formatFrequency = (hz: number): string => {
    if (hz >= 1000) {
      return `${(hz / 1000).toFixed(1)}kHz`;
    }
    return `${hz.toFixed(0)}Hz`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLoudnessColor = (loudness: number): string => {
    if (loudness > -14) return 'text-green-400';
    if (loudness > -20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityIndicator = (value: number, good: number, bad: number): string => {
    if (value >= good) return 'text-green-400';
    if (value <= bad) return 'text-red-400';
    return 'text-yellow-400';
  };

  if (isAnalyzing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Analyzing Audio</h3>
            <p className="text-gray-400">Processing {file.name}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Analysis Failed</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Audio Analysis</h2>
            <p className="text-gray-400">{file.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Basic Properties */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Basic Properties</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white">{formatTime(analysis.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sample Rate:</span>
                  <span className="text-white">{analysis.sampleRate} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Channels:</span>
                  <span className="text-white">{analysis.numberOfChannels}</span>
                </div>
              </div>
            </div>

            {/* Loudness Analysis */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Loudness</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Integrated:</span>
                  <span className={`font-semibold ${getLoudnessColor(analysis.integratedLoudness)}`}>
                    {analysis.integratedLoudness.toFixed(1)} LUFS
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">True Peak:</span>
                  <span className="text-white">{analysis.truePeak.toFixed(1)} dBTP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dynamic Range:</span>
                  <span className="text-white">{analysis.dynamicRange.toFixed(1)} LU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Crest Factor:</span>
                  <span className="text-white">{analysis.crestFactor.toFixed(1)} dB</span>
                </div>
              </div>
            </div>

            {/* Frequency Analysis */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Frequency Content</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Low (20-250Hz):</span>
                  <span className="text-white">{(analysis.frequencyBands.low * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mid (250-4kHz):</span>
                  <span className="text-white">{(analysis.frequencyBands.mid * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">High (4k-20kHz):</span>
                  <span className="text-white">{(analysis.frequencyBands.high * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Spectral Centroid:</span>
                  <span className="text-white">{formatFrequency(analysis.spectralCentroid)}</span>
                </div>
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Quality Metrics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Clipping:</span>
                  <span className={analysis.clippingDetected ? 'text-red-400' : 'text-green-400'}>
                    {analysis.clippingDetected ? 'Detected' : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">DC Offset:</span>
                  <span className="text-white">{analysis.dcOffset.toFixed(1)} dB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Noise Floor:</span>
                  <span className="text-white">{analysis.noiseFloor.toFixed(1)} dB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">RMS:</span>
                  <span className="text-white">{analysis.rms.toFixed(1)} dB</span>
                </div>
              </div>
            </div>

            {/* Temporal Features */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Temporal Features</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Zero Crossing Rate:</span>
                  <span className="text-white">{analysis.zeroCrossingRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Spectral Flux:</span>
                  <span className="text-white">{analysis.spectralFlux.toFixed(2)}</span>
                </div>
                {analysis.tempo > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tempo:</span>
                    <span className="text-white">{analysis.tempo} BPM</span>
                  </div>
                )}
                {analysis.beatPositions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Beats Detected:</span>
                    <span className="text-white">{analysis.beatPositions.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Recommendations</h3>
              <div className="space-y-2 text-sm">
                {analysis.integratedLoudness < -20 && (
                  <div className="text-yellow-400">
                    ⚠️ Consider increasing overall loudness
                  </div>
                )}
                {analysis.clippingDetected && (
                  <div className="text-red-400">
                    🚨 Clipping detected - reduce peaks
                  </div>
                )}
                {Math.abs(analysis.dcOffset) > -40 && (
                  <div className="text-yellow-400">
                    ⚠️ DC offset detected - consider filtering
                  </div>
                )}
                {analysis.dynamicRange < 6 && (
                  <div className="text-blue-400">
                    ℹ️ Low dynamic range - compressed audio
                  </div>
                )}
                {analysis.frequencyBands.low < 0.1 && (
                  <div className="text-blue-400">
                    ℹ️ Low-frequency content minimal
                  </div>
                )}
                {analysis.tempo > 0 && (
                  <div className="text-green-400">
                    ✅ Tempo detected: {analysis.tempo} BPM
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Detailed Beat Positions */}
          {analysis.beatPositions.length > 0 && (
            <div className="mt-6 bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Beat Positions</h3>
              <div className="max-h-32 overflow-y-auto">
                <div className="grid grid-cols-6 gap-2 text-xs text-gray-300">
                  {analysis.beatPositions.slice(0, 30).map((beat, index) => (
                    <div key={index} className="bg-gray-800 px-2 py-1 rounded text-center">
                      {formatTime(beat)}
                    </div>
                  ))}
                  {analysis.beatPositions.length > 30 && (
                    <div className="bg-gray-800 px-2 py-1 rounded text-center text-gray-500">
                      +{analysis.beatPositions.length - 30} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioAnalyzer;