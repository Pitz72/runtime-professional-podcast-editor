// Automated tests for audio utilities, encoders and project persistence.

import { describe, it, expect } from 'vitest'
import { validateAudioFile, formatFileSize } from '../src/renderer/services/audioUtils'
import {
  encodeWAV,
  normalizeChannels,
  getSampleRateForLame,
  resampleChannels,
  NORMALIZE_TARGET_PEAK,
  RawAudio,
} from '../src/renderer/services/encoders'
import { computePeaks } from '../src/renderer/hooks/useWaveformData'
import { snapTime, clampToFreeSpace, maxEndBeforeNextClip, minStartAfterPreviousClip } from '../src/renderer/services/timelineUtils'
import { parseProject, serializeProject } from '../src/renderer/services/projectIO'
import { Project, TrackKind, PROJECT_SCHEMA_VERSION } from '../src/shared/types'

function createRawAudio(length: number = 100, sampleRate: number = 44100, amplitude: number = 0.5): RawAudio {
  const channels = [new Float32Array(length), new Float32Array(length)]
  for (const data of channels) {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(i * 0.1) * amplitude
    }
  }
  return { channels, sampleRate, length }
}

describe('encodeWAV', () => {
  it('encodes raw audio to WAV bytes with the right size', () => {
    const audio = createRawAudio(100)
    const bytes = encodeWAV(audio)

    // 44-byte header + samples * channels * 2 bytes
    expect(bytes.length).toBe(44 + 100 * 2 * 2)
    // RIFF magic
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('RIFF')
  })

  it('handles empty audio', () => {
    const bytes = encodeWAV(createRawAudio(0))
    expect(bytes.length).toBe(44)
  })
})

describe('normalizeChannels', () => {
  it('normalizes the peak to -1 dBFS, not full scale', () => {
    const audio = createRawAudio(1000, 44100, 0.25)
    const normalized = normalizeChannels(audio)

    let maxPeak = 0
    for (const data of normalized.channels) {
      for (const sample of data) {
        maxPeak = Math.max(maxPeak, Math.abs(sample))
      }
    }
    expect(maxPeak).toBeCloseTo(NORMALIZE_TARGET_PEAK, 3)
    expect(maxPeak).toBeLessThan(1.0)
  })

  it('leaves silent audio untouched', () => {
    const audio = createRawAudio(100, 44100, 0)
    const normalized = normalizeChannels(audio)
    expect(Math.max(...normalized.channels[0])).toBe(0)
  })
})

describe('getSampleRateForLame', () => {
  it('keeps 48kHz sources at 48kHz (lamejs supports it)', () => {
    expect(getSampleRateForLame(48000)).toBe(48000)
    expect(getSampleRateForLame(96000)).toBe(48000)
  })

  it('maps other rates to supported ones', () => {
    expect(getSampleRateForLame(44100)).toBe(44100)
    expect(getSampleRateForLame(22050)).toBe(22050)
    expect(getSampleRateForLame(8000)).toBe(8000)
  })
})

describe('resampleChannels', () => {
  it('halves the sample count when halving the rate', () => {
    const audio = createRawAudio(1000, 48000)
    const resampled = resampleChannels(audio, 24000)
    expect(resampled.length).toBe(500)
    expect(resampled.sampleRate).toBe(24000)
  })

  it('is a no-op at the same rate', () => {
    const audio = createRawAudio(100, 44100)
    expect(resampleChannels(audio, 44100)).toBe(audio)
  })
})

describe('computePeaks', () => {
  it('computes peaks only for the requested segment', () => {
    // 2 seconds at 100 Hz: first second silent, second second loud
    const buffer = new AudioBuffer({ numberOfChannels: 1, length: 200, sampleRate: 100 })
    const data = buffer.getChannelData(0)
    for (let i = 100; i < 200; i++) data[i] = 0.8

    const silentPeaks = computePeaks(buffer, 0, 1, 10)
    const loudPeaks = computePeaks(buffer, 1, 1, 10)

    expect(Math.max(...silentPeaks)).toBe(0)
    expect(Math.max(...loudPeaks)).toBeCloseTo(0.8, 5)
  })

  it('returns zeroed peaks for out-of-range segments', () => {
    const buffer = new AudioBuffer({ numberOfChannels: 1, length: 100, sampleRate: 100 })
    const peaks = computePeaks(buffer, 10, 1, 5)
    expect(peaks).toHaveLength(5)
    expect(Math.max(...peaks)).toBe(0)
  })
})

describe('snapTime', () => {
  it('snaps to the nearest target within the threshold', () => {
    expect(snapTime(10.05, [10, 20], 0.2, 0)).toBe(10)
    expect(snapTime(19.9, [10, 20], 0.2, 0)).toBe(20)
  })

  it('leaves the time alone outside the threshold', () => {
    expect(snapTime(15, [10, 20], 0.2, 0)).toBe(15)
  })

  it('snaps to the grid when closer than any target', () => {
    expect(snapTime(6.97, [20], 0.1, 1)).toBe(7)
  })

  it('never returns negative times', () => {
    expect(snapTime(-0.5, [], 0.2, 1)).toBe(0)
  })
})

describe('clampToFreeSpace', () => {
  const clips = [
    { startTime: 10, duration: 5 }, // occupies 10..15
    { startTime: 20, duration: 5 }, // occupies 20..25
  ]

  it('keeps a position that already fits', () => {
    expect(clampToFreeSpace(clips, 2, 5)).toBe(2)
    expect(clampToFreeSpace(clips, 15, 5)).toBe(15)
  })

  it('pushes an overlapping clip into the nearest gap', () => {
    // Desired 12 overlaps 10..15; the 15..20 gap fits a 5s clip.
    const result = clampToFreeSpace(clips, 12, 5)
    expect(result === 15 || result === 5).toBe(true)
    // Verify no overlap with either clip
    expect(result + 5 <= 20 || result >= 25).toBe(true)
  })

  it('skips gaps that are too small', () => {
    // Gap 15..20 is 5s wide: a 6s clip cannot fit there.
    const result = clampToFreeSpace(clips, 16, 6)
    expect(result).toBe(25) // after the last clip
  })

  it('appends after the last clip on a fully packed track', () => {
    const packed = [{ startTime: 0, duration: 100 }]
    expect(clampToFreeSpace(packed, 50, 10)).toBe(100)
  })
})

describe('resize limits', () => {
  const clips = [
    { startTime: 0, duration: 5 },   // 0..5
    { startTime: 20, duration: 5 },  // 20..25
  ]

  it('maxEndBeforeNextClip stops at the next clip', () => {
    expect(maxEndBeforeNextClip(clips, 10)).toBe(20)
    expect(maxEndBeforeNextClip(clips, 30)).toBe(Number.POSITIVE_INFINITY)
  })

  it('minStartAfterPreviousClip stops at the previous clip end', () => {
    expect(minStartAfterPreviousClip(clips, 15)).toBe(5)
    expect(minStartAfterPreviousClip(clips, 3)).toBe(0)
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
      files: [{
        ...sampleProject.files[0],
        buffer: new AudioBuffer({ numberOfChannels: 2, length: 44100, sampleRate: 44100 }),
      }],
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
