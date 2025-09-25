// Automated tests for audioUtils functions using Vitest

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  encodeWAV,
  normalizeAudioBuffer,
  getActiveFileIds,
  cleanupUnusedAudioBuffers,
  validateAudioFile,
  getWaveformQualityForZoom,
  getBitrateForQuality
} from '../services/audioUtils'

// Mock AudioContext and AudioBuffer for testing
function createMockAudioBuffer(length: number = 100, sampleRate: number = 44100): AudioBuffer {
  const audioContext = new AudioContext()
  const buffer = audioContext.createBuffer(2, length, sampleRate)

  // Fill with test data
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(i * 0.1) * 0.5 // Sine wave
    }
  }

  return buffer
}

describe('audioUtils', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  describe('encodeWAV', () => {
    it('should encode audio buffer to WAV blob', () => {
      const buffer = createMockAudioBuffer()
      const wavBlob = encodeWAV(buffer)

      expect(wavBlob).toBeInstanceOf(Blob)
      expect(wavBlob.type).toBe('audio/wav')
      expect(wavBlob.size).toBeGreaterThan(0)
    })

    it('should handle empty buffer', () => {
      const buffer = createMockAudioBuffer(0)
      const wavBlob = encodeWAV(buffer)

      expect(wavBlob).toBeInstanceOf(Blob)
      expect(wavBlob.size).toBeGreaterThan(44) // WAV header size
    })
  })

  describe('normalizeAudioBuffer', () => {
    it('should normalize audio buffer to prevent clipping', () => {
      const buffer = createMockAudioBuffer()
      const normalized = normalizeAudioBuffer(buffer)

      expect(normalized).toBeInstanceOf(AudioBuffer)
      expect(normalized.length).toBe(buffer.length)
      expect(normalized.sampleRate).toBe(buffer.sampleRate)
      expect(normalized.numberOfChannels).toBe(buffer.numberOfChannels)

      // Check that peak is at or below 1.0
      let maxPeak = 0
      for (let channel = 0; channel < normalized.numberOfChannels; channel++) {
        const data = normalized.getChannelData(channel)
        for (const sample of data) {
          maxPeak = Math.max(maxPeak, Math.abs(sample))
        }
      }
      expect(maxPeak).toBeLessThanOrEqual(1.0)
    })
  })

  describe('getActiveFileIds', () => {
    it('should return set of active file IDs', () => {
      const mockProject = {
        tracks: [
          {
            clips: [
              { fileId: 'file1' },
              { fileId: 'file2' }
            ]
          },
          {
            clips: [
              { fileId: 'file1' },
              { fileId: 'file3' }
            ]
          }
        ]
      }

      const activeIds = getActiveFileIds(mockProject)

      expect(activeIds).toBeInstanceOf(Set)
      expect(activeIds.has('file1')).toBe(true)
      expect(activeIds.has('file2')).toBe(true)
      expect(activeIds.has('file3')).toBe(true)
      expect(activeIds.size).toBe(3)
    })

    it('should handle empty project', () => {
      const mockProject = { tracks: [] }
      const activeIds = getActiveFileIds(mockProject)

      expect(activeIds.size).toBe(0)
    })
  })

  describe('cleanupUnusedAudioBuffers', () => {
    it('should clean up unused buffers', () => {
      const mockProject = {
        files: [
          { id: 'file1', buffer: { test: 'data' } },
          { id: 'file2', buffer: { test: 'data' } },
          { id: 'file3', buffer: { test: 'data' } }
        ]
      }

      const activeIds = new Set(['file1', 'file2'])
      cleanupUnusedAudioBuffers(mockProject, activeIds)

      expect(mockProject.files[0].buffer).toBeDefined() // file1 active
      expect(mockProject.files[1].buffer).toBeDefined() // file2 active
      expect(mockProject.files[2].buffer).toBeUndefined() // file3 inactive
    })

    it('should not affect files without buffers', () => {
      const mockProject = {
        files: [
          { id: 'file1', buffer: undefined },
          { id: 'file2', buffer: { test: 'data' } }
        ]
      }

      const activeIds = new Set(['file1'])
      cleanupUnusedAudioBuffers(mockProject, activeIds)

      expect(mockProject.files[0].buffer).toBeUndefined()
      expect(mockProject.files[1].buffer).toBeUndefined() // cleaned up
    })
  })

  describe('validateAudioFile', () => {
    it('should validate a proper audio file', async () => {
      // Create a file with proper size by using a Uint8Array
      const data = new Uint8Array(2048) // 2KB
      const mockFile = new File([data], 'test.wav', { type: 'audio/wav' })

      const result = await validateAudioFile(mockFile)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject file too large', async () => {
      // Create a large file (3GB)
      const data = new Uint8Array(1024) // Small data but we'll mock the size
      const mockFile = new File([data], 'large.wav', { type: 'audio/wav' })
      Object.defineProperty(mockFile, 'size', { value: 3 * 1024 * 1024 * 1024, writable: false })

      const result = await validateAudioFile(mockFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('should reject file too small', async () => {
      const data = new Uint8Array(512) // 512 bytes
      const mockFile = new File([data], 'small.wav', { type: 'audio/wav' })

      const result = await validateAudioFile(mockFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('too small')
    })
  })

  describe('getWaveformQualityForZoom', () => {
    it('should return low quality for low zoom levels', () => {
      expect(getWaveformQualityForZoom(0)).toBe('low')
      expect(getWaveformQualityForZoom(1)).toBe('low')
      expect(getWaveformQualityForZoom(2)).toBe('low')
    })

    it('should return medium quality for medium zoom levels', () => {
      expect(getWaveformQualityForZoom(3)).toBe('medium')
      expect(getWaveformQualityForZoom(4)).toBe('medium')
    })

    it('should return high quality for high zoom levels', () => {
      expect(getWaveformQualityForZoom(5)).toBe('high')
      expect(getWaveformQualityForZoom(10)).toBe('high')
    })
  })

  describe('getBitrateForQuality', () => {
    it('should return correct MP3 bitrates', () => {
      expect(getBitrateForQuality('cd', 'mp3')).toBe(128)
      expect(getBitrateForQuality('professional', 'mp3')).toBe(192)
      expect(getBitrateForQuality('high-end', 'mp3')).toBe(320)
    })

    it('should return correct AAC bitrates', () => {
      expect(getBitrateForQuality('cd', 'aac')).toBe(128)
      expect(getBitrateForQuality('professional', 'aac')).toBe(192)
      expect(getBitrateForQuality('high-end', 'aac')).toBe(256)
    })
  })
})