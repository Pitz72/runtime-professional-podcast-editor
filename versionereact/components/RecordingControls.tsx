import React, { useState, useEffect } from 'react';
import { useRecording } from '../hooks/useRecording';
import { useAppStore } from '../store';
import { MicIcon, PauseIcon, PlayIcon } from './icons';
import { useLogger } from '../hooks/useLogger';

interface RecordingControlsProps {
  trackId: string;
  onRecordingComplete?: (blob: Blob) => void;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  trackId,
  onRecordingComplete
}) => {
  const logger = useLogger();
  const { addClip, addFile } = useAppStore();
  const [showOptions, setShowOptions] = useState(false);
  const [recordingOptions, setRecordingOptions] = useState({
    sampleRate: 44100,
    channelCount: 2,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  });

  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    getAudioLevels,
    canRecord
  } = useRecording(trackId);

  const [audioLevels, setAudioLevels] = useState<{
    level: number;
    peak: number;
  } | null>(null);

  // Monitor audio levels during recording
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const monitorLevels = () => {
      const levels = getAudioLevels();
      if (levels) {
        setAudioLevels({ level: levels.level, peak: levels.peak });
      }
      requestAnimationFrame(monitorLevels);
    };

    const animationId = requestAnimationFrame(monitorLevels);
    return () => cancelAnimationFrame(animationId);
  }, [isRecording, isPaused, getAudioLevels]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      await startRecording(recordingOptions);
      logger.info('Recording started via UI', { trackId, options: recordingOptions });
    } catch (error) {
      logger.error('Failed to start recording via UI', { trackId, error });
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const blob = await stopRecording();
      if (blob && onRecordingComplete) {
        onRecordingComplete(blob);
      }

      // Auto-create clip from recording
      if (blob) {
        await createClipFromRecording(blob);
      }

      logger.info('Recording stopped via UI', { trackId, blobSize: blob?.size });
    } catch (error) {
      logger.error('Failed to stop recording via UI', { trackId, error });
    }
  };

  const createClipFromRecording = async (blob: Blob) => {
    try {
      // Create object URL for the blob
      const url = URL.createObjectURL(blob);

      // Create audio element to get duration
      const audio = new Audio(url);
      await new Promise((resolve) => {
        audio.onloadedmetadata = resolve;
      });

      const duration = audio.duration;

      // Create file entry
      const fileId = `recorded-${Date.now()}`;
      const audioFile = {
        id: fileId,
        name: `Recording ${new Date().toLocaleTimeString()}`,
        url,
        type: blob.type,
        duration
      };

      addFile(audioFile);

      // Create clip
      const clip = {
        id: `clip-recorded-${Date.now()}`,
        fileId,
        trackId,
        startTime: 0, // Will be positioned by user
        duration,
        offset: 0,
        isLooped: false
      };

      addClip(trackId, clip);

      logger.info('Clip created from recording', {
        trackId,
        fileId: audioFile.id,
        clipId: clip.id,
        duration
      });

    } catch (error) {
      logger.error('Failed to create clip from recording', { trackId, error });
    }
  };

  if (!canRecord) {
    return (
      <div className="text-center p-4 text-gray-400">
        <MicIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Recording not supported in this browser</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MicIcon className="w-5 h-5" />
          Audio Recording
        </h3>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-gray-400 hover:text-white text-sm"
        >
          {showOptions ? 'Hide' : 'Show'} Options
        </button>
      </div>

      {/* Recording Options */}
      {showOptions && (
        <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-600">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recording Options</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-gray-400 mb-1">Sample Rate</label>
              <select
                value={recordingOptions.sampleRate}
                onChange={(e) => setRecordingOptions(prev => ({
                  ...prev,
                  sampleRate: parseInt(e.target.value)
                }))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                disabled={isRecording}
              >
                <option value={44100}>44.1 kHz</option>
                <option value={48000}>48 kHz</option>
                <option value={96000}>96 kHz</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Channels</label>
              <select
                value={recordingOptions.channelCount}
                onChange={(e) => setRecordingOptions(prev => ({
                  ...prev,
                  channelCount: parseInt(e.target.value)
                }))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                disabled={isRecording}
              >
                <option value={1}>Mono</option>
                <option value={2}>Stereo</option>
              </select>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={recordingOptions.echoCancellation}
                onChange={(e) => setRecordingOptions(prev => ({
                  ...prev,
                  echoCancellation: e.target.checked
                }))}
                disabled={isRecording}
                className="mr-2"
              />
              <span className="text-gray-300">Echo Cancellation</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={recordingOptions.noiseSuppression}
                onChange={(e) => setRecordingOptions(prev => ({
                  ...prev,
                  noiseSuppression: e.target.checked
                }))}
                disabled={isRecording}
                className="mr-2"
              />
              <span className="text-gray-300">Noise Suppression</span>
            </label>
          </div>
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-400 font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Recording
            </span>
            <span className="text-white font-mono text-sm">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Audio Level Indicator */}
          {audioLevels && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Level</span>
                <span>{(audioLevels.level * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-75"
                  style={{ width: `${audioLevels.level * 100}%` }}
                ></div>
                {audioLevels.peak > 0.9 && (
                  <div
                    className="bg-red-500 h-2 rounded-full absolute"
                    style={{ width: '2px', marginLeft: `${audioLevels.peak * 100}%` }}
                  ></div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <MicIcon className="w-4 h-4" />
            Start Recording
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                Resume
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
              >
                <PauseIcon className="w-4 h-4" />
                Pause
              </button>
            )}

            <button
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </button>

            <button
              onClick={cancelRecording}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Recording Tips */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• Make sure your microphone is properly connected</p>
        <p>• Speak clearly and at consistent volume</p>
        <p>• Avoid background noise when possible</p>
      </div>
    </div>
  );
};

export default RecordingControls;