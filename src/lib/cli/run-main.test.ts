import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformNotSupportedError } from './platform.js';
import { RunLockError } from './run-lock.js';
import { runCliMain } from './run-main.js';

function mockExit() {
  return vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit');
  }) as never);
}

describe('runCliMain', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('acquires and releases the shared run lock around main', async () => {
    const exit = mockExit();
    const release = vi.fn();
    const acquireLock = vi.fn(() => ({ release }));

    await expect(runCliMain(async () => 0, { acquireLock, argv: ['check'] })).rejects.toThrow(
      'process.exit',
    );

    expect(acquireLock).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('releases the lock when main throws a mapped error', async () => {
    mockExit();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const release = vi.fn();
    const acquireLock = vi.fn(() => ({ release }));

    await expect(
      runCliMain(
        async () => {
          throw new PlatformNotSupportedError('retry', 'win32');
        },
        { acquireLock, argv: ['start'] },
      ),
    ).rejects.toThrow('process.exit');

    expect(release).toHaveBeenCalledOnce();
  });

  it('skips the run lock for help requests', async () => {
    const exit = mockExit();
    const acquireLock = vi.fn(() => ({ release: vi.fn() }));

    await expect(runCliMain(async () => 0, { acquireLock, argv: ['--help'] })).rejects.toThrow(
      'process.exit',
    );

    expect(acquireLock).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('skips the run lock for __complete requests', async () => {
    const exit = mockExit();
    const acquireLock = vi.fn(() => ({ release: vi.fn() }));

    await expect(
      runCliMain(async () => 0, { acquireLock, argv: ['__complete', '--', 'submit'] }),
    ).rejects.toThrow('process.exit');

    expect(acquireLock).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('prints PlatformNotSupportedError message and exits 1', async () => {
    const exit = mockExit();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      runCliMain(
        async () => {
          throw new PlatformNotSupportedError('retry', 'win32');
        },
        { acquireLock: () => ({ release: () => undefined }), argv: ['start'] },
      ),
    ).rejects.toThrow('process.exit');

    expect(error).toHaveBeenCalledWith('retry is not supported on Windows.');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('prints RunLockError message and exits 1', async () => {
    const exit = mockExit();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      runCliMain(async () => 0, {
        acquireLock: () => {
          throw new RunLockError('Another tfscripts command is already running (pid 111).');
        },
        argv: ['check'],
      }),
    ).rejects.toThrow('process.exit');

    expect(error).toHaveBeenCalledWith('Another tfscripts command is already running (pid 111).');
    expect(exit).toHaveBeenCalledWith(1);
  });
});
