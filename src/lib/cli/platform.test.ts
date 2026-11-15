import { describe, expect, it } from 'vitest';
import { assertSupportedPlatform, PlatformNotSupportedError } from './platform.js';

describe('assertSupportedPlatform', () => {
  it('allows platforms listed in supported', () => {
    expect(() =>
      assertSupportedPlatform({
        command: 'retry',
        supported: ['darwin', 'linux'],
        platform: 'linux',
      }),
    ).not.toThrow();

    expect(() =>
      assertSupportedPlatform({
        command: 'keep-awake',
        supported: ['darwin'],
        platform: 'darwin',
      }),
    ).not.toThrow();
  });

  it('throws PlatformNotSupportedError for retry on Windows', () => {
    expect(() =>
      assertSupportedPlatform({
        command: 'retry',
        supported: ['darwin', 'linux'],
        platform: 'win32',
      }),
    ).toThrow(PlatformNotSupportedError);

    try {
      assertSupportedPlatform({
        command: 'retry',
        supported: ['darwin', 'linux'],
        platform: 'win32',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PlatformNotSupportedError);
      const notSupported = error as PlatformNotSupportedError;
      expect(notSupported.message).toBe('retry is not supported on Windows.');
      expect(notSupported.command).toBe('retry');
      expect(notSupported.platform).toBe('win32');
      expect(notSupported.name).toBe('PlatformNotSupportedError');
    }
  });

  it('throws PlatformNotSupportedError for keep-awake on Windows and Linux', () => {
    expect(() =>
      assertSupportedPlatform({
        command: 'keep-awake',
        supported: ['darwin'],
        platform: 'win32',
      }),
    ).toThrow('keep-awake is not supported on Windows.');

    expect(() =>
      assertSupportedPlatform({
        command: 'keep-awake',
        supported: ['darwin'],
        platform: 'linux',
      }),
    ).toThrow('keep-awake is not supported on Linux.');
  });
});
