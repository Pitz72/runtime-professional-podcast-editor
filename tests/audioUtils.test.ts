// Automated tests for audio utilities and project persistence.

import { describe, it, expect } from 'vitest'
import {
  encodeWAV,
  normalizeAudioBuffer,
  validateAudioFile,
  getSampleRateForLame,
  formatFileSize,
} from '../src/renderer/services/audioUtils'
import { parseProject, serializeProject } from '../src/renderer/services/projectIO'
import { Project, TrackKind, PROJECT_SCHEMA_VERSION } from '../src/shared/types'

function createTestBuffer(length: number = 100, sampleRate: number = 44100, amplitude: number = 0.5): AudioBuffer {
  const buffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate })
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(i * 0.1) * amplitude
    }
  }
  return buffer
}

describe('encodeWAV', () => {
  it('encodes an audio buffer to a WAV blob with the right size', () => {
    const buffer = createTestBuffer(100)
    const wavBlob = encodeWAV(buffer)

    expect(wavBlob).toBeInstanceOf(Blob)
    expect(wavBlob.type).toBe('audio/wav')
    // 44-byte header + samples * channels * 2 bytes
    expect(wavBlob.size).toBe(44 + 100 * 2 * 2)
  })

  it('handles an empty buffer', () => {
    const buffer = createTestBuffer(0)
    const wavBlob = encodeWAV(buffer)

    expect(wavBlob.size).toBe(44)
  })
})

describe('normalizeAudioBuffer', () => {
  it('scales the peak up to 1.0 without clipping', () => {
    const buffer = createTestBuffer(1000, 44100, 0.25)
    const normalized = normalizeAudioBuffer(buffer)

    expect(normalized.length).toBe(buffer.length)
    expect(normalized.sampleRate).toBe(buffer.sampleRate)
    expect(normalized.numberOfChannels).toBe(buffer.numberOfChannels)

    let maxPeak = 0
    for (let channel = 0; channel < normalized.numberOfChannels; channel++) {
      const data = normalized.getChannelData(channel)
      for (const sample of data) {
        maxPeak = Math.max(maxPeak, Math.abs(sample))
      }
    }
    expect(maxPeak).toBeGreaterThan(0.99)
    expect(maxPeak).toBeLessThanOrEqual(1.0)
  })

  it('leaves a silent buffer untouched', () => {
    const buffer = createTestBuffer(100, 44100, 0)
    const normalized = normalizeAudioBuffer(buffer)
    expect(Math.max(...normalized.getChannelData(0))).toBe(0)
  })
})

describe('validateAudioFile', () => {
  it('accepts a normal audio file', () => {
    const result = validateAudioFile({ size: 2048, type: 'audio/wav', name: 'test.wav' })
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects a file that is too large', () => {
    const result = validateAudioFile({ size: 3 * 1024 * 1024 * 1024, type: 'audio/wav', name: 'large.wav' })
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('too large')
  })

  it('rejects a file that is too small', () => {
    const result = validateAudioFile({ size: 512, type: 'audio/wav', name: 'small.wav' })
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('too small')
  })

  it('warns on unrecognized types but stays valid', () => {
    const result = validateAudioFile({ size: 2048, type: 'application/octet-stream', name: 'mystery.bin' })
    expect(result.isValid).toBe(true)
    expect(result.warnings!.length).toBeGreaterThan(0)
  })
})

describe('getSampleRateForLame', () => {
  it('maps sample rates to lamejs-supported rates', () => {
    expect(getSampleRateForLame(48000)).toBe(44100)
    expect(getSampleRateForLame(44100)).toBe(44100)
    expect(getSampleRateForLame(22050)).toBe(22050)
    expect(getSampleRateForLame(8000)).toBe(8000)
  })
})

describe('formatFileSize', () => {
  it('formats byte counts', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
})

describe('project persistence', () => {
  const sampleProject: Project = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    name: 'Test Show',
    tracks: [
      {
        id: 'track-1',
        name: 'Voice 1',
        kind: TrackKind.Voice,
        volume: 1,
        isMuted: false,
        isSolo: false,
        clips: [
          { id: 'clip-1', fileId: 'file-1', trackId: 'track-1', startTime: 2, duration: 10, offset: 0 },
        ],
      },
    ],
    files: [
      { id: 'file-1', name: 'intro.wav', path: 'C:\\audio\\intro.wav', type: 'audio/wav', duration: 12 },
    ],
  }

  it('round-trips a project through serialize/parse', () => {
    const json = serializeProject(sampleProject)
    const parsed = parseProject(json)

    expect(parsed.name).toBe('Test Show')
    expect(parsed.tracks).toHaveLength(1)
    expect(parsed.tracks[0].clips).toHaveLength(1)
    expect(parsed.files[0].path).toBe('C:\\audio\\intro.wav')
  })

  it('never embeds audio buffers in the serialized project', () => {
    const withBuffer: Project = {
      ...sampleProject,
      files: [{ ...sampleProject.files[0], buffer: createTestBuffer(44100) }],
    }
    const json = serializeProject(withBuffer)
    expect(json).not.toContain('buffer')
    expect(json.length).toBeLessThan(5000)
  })

  it('rejects non-JSON content', () => {
    expect(() => parseProject('not json at all')).toThrow('not valid JSON')
  })

  it('rejects JSON that is not a project', () => {
    expect(() => parseProject('{"foo": 1}')).toThrow('not a Runtime Radio project')
  })

  it('drops clips that reference missing files', () => {
    const broken = {
      ...JSON.parse(serializeProject(sampleProject)),
      files: [],
    }
    const parsed = parseProject(JSON.stringify(broken))
    expect(parsed.tracks[0].clips).toHaveLength(0)
  })

  it('clamps out-of-range volumes', () => {
    const loud = JSON.parse(serializeProject(sampleProject))
    loud.tracks[0].volume = 99
    const parsed = parseProject(JSON.stringify(loud))
    expect(parsed.tracks[0].volume).toBe(1)
  })
})
