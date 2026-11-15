import { describe, expect, it, vi } from 'vitest';
import { acquireRunLock, defaultRunLockPath, RunLockError } from './run-lock.js';

describe('defaultRunLockPath', () => {
  it('resolves under ~/.tfscripts/run.lock', () => {
    expect(defaultRunLockPath('/home/me')).toBe('/home/me/.tfscripts/run.lock');
  });
});

describe('acquireRunLock', () => {
  it('creates the lock file with the current pid when free', () => {
    const mkdir = vi.fn();
    const openExclusive = vi.fn(() => 7);
    const writeFd = vi.fn();
    const closeFd = vi.fn();
    const removeFile = vi.fn();

    const handle = acquireRunLock({
      lockPath: '/home/me/.tfscripts/run.lock',
      pid: 4242,
      mkdir,
      openExclusive,
      writeFd,
      closeFd,
      removeFile,
    });

    expect(mkdir).toHaveBeenCalledWith('/home/me/.tfscripts', { recursive: true });
    expect(openExclusive).toHaveBeenCalledWith('/home/me/.tfscripts/run.lock');
    expect(writeFd).toHaveBeenCalledWith(7, '4242\n');
    expect(closeFd).toHaveBeenCalledWith(7);

    handle.release();
    expect(removeFile).toHaveBeenCalledWith('/home/me/.tfscripts/run.lock');
  });

  it('throws when another live process already holds the lock', () => {
    const openExclusive = vi.fn(() => {
      throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
    });
    const readFile = vi.fn(() => '111\n');
    const isAlive = vi.fn(() => true);

    expect(() =>
      acquireRunLock({
        lockPath: '/home/me/.tfscripts/run.lock',
        pid: 4242,
        openExclusive,
        readFile,
        isAlive,
        mkdir: () => undefined,
      }),
    ).toThrow(RunLockError);

    expect(() =>
      acquireRunLock({
        lockPath: '/home/me/.tfscripts/run.lock',
        pid: 4242,
        openExclusive,
        readFile,
        isAlive,
        mkdir: () => undefined,
      }),
    ).toThrow(/already running \(pid 111\)/i);

    expect(isAlive).toHaveBeenCalledWith(111);
  });

  it('reclaims a stale lock when the holder process is dead', () => {
    let exists = true;
    const openExclusive = vi.fn(() => {
      if (exists) {
        throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
      }
      return 9;
    });
    const readFile = vi.fn(() => '111\n');
    const isAlive = vi.fn(() => false);
    const removeFile = vi.fn(() => {
      exists = false;
    });
    const writeFd = vi.fn();
    const closeFd = vi.fn();

    const handle = acquireRunLock({
      lockPath: '/home/me/.tfscripts/run.lock',
      pid: 4242,
      openExclusive,
      readFile,
      isAlive,
      removeFile,
      writeFd,
      closeFd,
      mkdir: () => undefined,
    });

    expect(removeFile).toHaveBeenCalledWith('/home/me/.tfscripts/run.lock');
    expect(writeFd).toHaveBeenCalledWith(9, '4242\n');
    handle.release();
  });
});
