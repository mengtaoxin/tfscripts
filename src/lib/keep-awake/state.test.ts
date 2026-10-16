import { describe, expect, it, vi } from 'vitest';
import {
  clearKeepAwakeState,
  defaultStatePath,
  readActiveKeepAwakeState,
  writeKeepAwakeState,
  type KeepAwakeState,
} from './state.js';

const sample: KeepAwakeState = {
  pid: 12345,
  hours: 4,
  screen: false,
  startedAt: '2026-10-16T00:00:00.000Z',
  endsAt: '2026-10-16T04:00:00.000Z',
};

describe('defaultStatePath', () => {
  it('resolves under ~/.tfscripts/keep-awake/keep-awake.json', () => {
    expect(defaultStatePath('/Users/me')).toBe('/Users/me/.tfscripts/keep-awake/keep-awake.json');
  });
});

describe('readActiveKeepAwakeState', () => {
  it('returns null when the state file is missing', () => {
    const readFile = vi.fn(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    const isAlive = vi.fn();

    expect(
      readActiveKeepAwakeState({
        statePath: '/tmp/keep-awake.json',
        readFile,
        isAlive,
      }),
    ).toBeNull();
    expect(isAlive).not.toHaveBeenCalled();
  });

  it('returns null and clears state when the process is not alive', () => {
    const readFile = vi.fn(() => JSON.stringify(sample));
    const isAlive = vi.fn(() => false);
    const removeFile = vi.fn();

    expect(
      readActiveKeepAwakeState({
        statePath: '/tmp/keep-awake.json',
        readFile,
        isAlive,
        removeFile,
      }),
    ).toBeNull();
    expect(removeFile).toHaveBeenCalledWith('/tmp/keep-awake.json');
  });

  it('returns state when the process is alive', () => {
    const readFile = vi.fn(() => JSON.stringify(sample));
    const isAlive = vi.fn(() => true);

    expect(
      readActiveKeepAwakeState({
        statePath: '/tmp/keep-awake.json',
        readFile,
        isAlive,
      }),
    ).toEqual(sample);
  });
});

describe('writeKeepAwakeState / clearKeepAwakeState', () => {
  it('writes JSON and clears via remove', () => {
    const mkdir = vi.fn();
    const writeFile = vi.fn();
    const removeFile = vi.fn();

    writeKeepAwakeState({
      statePath: '/tmp/dir/keep-awake.json',
      state: sample,
      mkdir,
      writeFile,
    });

    expect(mkdir).toHaveBeenCalledWith('/tmp/dir', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/dir/keep-awake.json',
      `${JSON.stringify(sample, null, 2)}\n`,
      'utf8',
    );

    clearKeepAwakeState({ statePath: '/tmp/dir/keep-awake.json', removeFile });
    expect(removeFile).toHaveBeenCalledWith('/tmp/dir/keep-awake.json');
  });
});
