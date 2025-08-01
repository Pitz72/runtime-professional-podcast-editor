import { vi } from 'vitest';

vi.mock('wavesurfer.js', () => {
  return {
    default: {
      create: vi.fn().mockImplementation(() => ({
        loadDecodedBuffer: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
      })),
    },
  };
});
