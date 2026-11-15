import { describe, expect, it, vi } from 'vitest';
import {
  defaultStatePath,
  getLastRemoteOperationTime,
  readReposState,
  repoStateKey,
  setLastRemoteOperationTime,
  writeReposState,
  type ReposState,
} from './state.js';

describe('defaultStatePath', () => {
  it('resolves under ~/.tfscripts/repos/state.json', () => {
    expect(defaultStatePath('/home/me')).toBe('/home/me/.tfscripts/repos/state.json');
  });
});

describe('repoStateKey', () => {
  it('uses path for local repos', () => {
    expect(repoStateKey({ name: 'foo', path: '/Users/me/code/foo', environment: 'local' })).toBe(
      '/Users/me/code/foo',
    );
  });

  it('uses sshHost:path for ssh repos', () => {
    expect(
      repoStateKey({
        name: 'bar',
        path: '~/repos/bar',
        environment: 'ssh',
        sshHost: 'devbox',
      }),
    ).toBe('devbox:~/repos/bar');
  });
});

describe('readReposState / writeReposState', () => {
  it('returns empty state when the file is missing', () => {
    const state = readReposState({
      statePath: '/missing/state.json',
      readFile: () => {
        const err = new Error('ENOENT') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      },
    });
    expect(state).toEqual({});
  });

  it('returns empty state on invalid JSON', () => {
    expect(
      readReposState({
        statePath: '/bad.json',
        readFile: () => '{not-json',
      }),
    ).toEqual({});
  });

  it('reads valid per-repo last-remote-operation-time entries', () => {
    const state = readReposState({
      statePath: '/state.json',
      readFile: () =>
        JSON.stringify({
          '/Users/me/code/foo': {
            'last-remote-operation-time': '2026-11-15T14:01:00.000Z',
          },
          'devbox:~/repos/bar': {
            'last-remote-operation-time': '2026-11-15T14:01:05.000Z',
          },
          '/bad': { 'last-remote-operation-time': 123 },
          '/also-bad': 'nope',
        }),
    });

    expect(state).toEqual({
      '/Users/me/code/foo': {
        'last-remote-operation-time': '2026-11-15T14:01:00.000Z',
      },
      'devbox:~/repos/bar': {
        'last-remote-operation-time': '2026-11-15T14:01:05.000Z',
      },
    });
  });

  it('writes state with mkdir and pretty JSON', () => {
    const mkdir = vi.fn();
    const writeFile = vi.fn();
    const state: ReposState = {
      '/abs/foo': { 'last-remote-operation-time': '2026-11-15T14:01:00.000Z' },
    };

    writeReposState({
      statePath: '/home/me/.tfscripts/repos/state.json',
      state,
      mkdir,
      writeFile,
    });

    expect(mkdir).toHaveBeenCalledWith('/home/me/.tfscripts/repos', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      '/home/me/.tfscripts/repos/state.json',
      `${JSON.stringify(state, null, 2)}\n`,
      'utf8',
    );
  });
});

describe('getLastRemoteOperationTime / setLastRemoteOperationTime', () => {
  it('gets and sets last-remote-operation-time for a key', () => {
    let stored: ReposState = {};
    const readFile = () => JSON.stringify(stored);
    const writeFile = (_path: string, data: string) => {
      stored = JSON.parse(data) as ReposState;
    };

    expect(
      getLastRemoteOperationTime(readReposState({ statePath: '/s.json', readFile }), '/abs/foo'),
    ).toBeUndefined();

    setLastRemoteOperationTime({
      statePath: '/s.json',
      key: '/abs/foo',
      isoTime: '2026-11-15T14:01:00.000Z',
      readFile,
      writeFile,
      mkdir: () => undefined,
    });

    expect(
      getLastRemoteOperationTime(readReposState({ statePath: '/s.json', readFile }), '/abs/foo'),
    ).toBe('2026-11-15T14:01:00.000Z');
  });
});
