import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock AudioContext and related APIs
class MockAudioContext {
  createBuffer = vi.fn();
  createGain = vi.fn();
  createDynamicsCompressor = vi.fn();
  createBiquadFilter = vi.fn();
  decodeAudioData = vi.fn();
  destination = {};
  currentTime = 0;
  state = "running";
  close = vi.fn();

  constructor() {
    // Make createBuffer return a proper MockAudioBuffer
    this.createBuffer.mockImplementation(
      (numOfChannels: number, length: number, sampleRate: number) => {
        return new MockAudioBuffer(numOfChannels, length, sampleRate);
      }
    );

    // Make decodeAudioData resolve successfully for valid audio
    this.decodeAudioData.mockImplementation((arrayBuffer: ArrayBuffer) => {
      return Promise.resolve(new MockAudioBuffer(2, 44100, 44100));
    });
  }
}

class MockAudioBuffer {
  constructor(
    public numberOfChannels: number,
    public length: number,
    public sampleRate: number
  ) {}

  getChannelData = vi.fn((channel: number) => {
    // Return a Float32Array filled with test data
    const data = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      data[i] = Math.sin(i * 0.1) * 0.5; // Sine wave
    }
    return data;
  });
}

global.AudioContext = MockAudioContext as any;
global.AudioBuffer = MockAudioBuffer as any;
global.OfflineAudioContext = MockAudioContext as any;

// Mock Web Audio API
Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(window, "OfflineAudioContext", {
  writable: true,
  value: MockAudioContext,
});

// Mock fetch for data URL handling
global.fetch = vi.fn();

// Mock URL APIs
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader
const MockFileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(function () {
    // Simulate async loading
    setTimeout(() => {
      if (this.onload) {
        this.result = "data:audio/wav;base64,mockdata";
        this.onload({ target: { result: this.result } } as any);
      }
    }, 0);
  }),
  readAsArrayBuffer: vi.fn(function () {
    setTimeout(() => {
      if (this.onload) {
        this.result = new ArrayBuffer(1024);
        this.onload({ target: { result: this.result } } as any);
      }
    }, 0);
  }),
  onload: null,
  onerror: null,
  result: null,
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
  readyState: 0,
}));

global.FileReader = MockFileReader as any;
