import '@testing-library/jest-dom'

// Functional mock of AudioBuffer backed by real Float32Array storage,
// so encoding/normalization code paths can be exercised in jsdom.
class MockAudioBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  duration: number
  private channels: Float32Array[]

  // Mirrors the real AudioBuffer(options) constructor.
  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels ?? 1
    this.length = options.length
    this.sampleRate = options.sampleRate
    this.duration = options.length / options.sampleRate
    this.channels = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]
  }
}

class MockBaseAudioContext {
  currentTime = 0
  state = 'running'
  destination = {}

  createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate })
  }
}

class MockAudioContext extends MockBaseAudioContext {
  close() { return Promise.resolve() }
  resume() { return Promise.resolve() }
}

class MockOfflineAudioContext extends MockBaseAudioContext {}

Object.assign(globalThis, {
  AudioContext: MockAudioContext,
  OfflineAudioContext: MockOfflineAudioContext,
  AudioBuffer: MockAudioBuffer,
})

export { MockAudioBuffer }
