import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformNotSupportedError } from './platform.js';
import { runCliMain } from './run-main.js';

describe('runCliMain', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints PlatformNotSupportedError message and exits 1', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      runCliMain(async () => {
        throw new PlatformNotSupportedError('retry', 'win32');
      }),
    ).rejects.toThrow('process.exit');

    expect(error).toHaveBeenCalledWith('retry is not supported on Windows.');
    expect(exit).toHaveBeenCalledWith(1);
  });
});
