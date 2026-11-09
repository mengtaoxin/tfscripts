import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { buildCodeArgs, runOpen } from './run.js';

describe('buildCodeArgs', () => {
  it('uses -r when reusing a window and -n otherwise', () => {
    expect(buildCodeArgs('/tmp/demo', true)).toEqual(['-r', '/tmp/demo']);
    expect(buildCodeArgs('/tmp/demo', false)).toEqual(['-n', '/tmp/demo']);
  });
});

describe('runOpen', () => {
  it('resolves an alias and spawns code -r by default', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const pending = runOpen(
      { path: 'demo', reuseWindow: true },
      {
        home: '/Users/me',
        settingsPath: '/cfg.json',
        readFile: () =>
          JSON.stringify({
            'path-configs': [{ path: '~/tmp/demo', alias: 'demo' }],
          }),
        spawn,
      },
    );
    child.emit('close', 0, null);

    await expect(pending).resolves.toEqual({ exitCode: 0 });
    expect(spawn).toHaveBeenCalledWith('code', ['-r', '/Users/me/tmp/demo'], {
      stdio: 'inherit',
    });
  });

  it('spawns code -n when reuseWindow is false', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const pending = runOpen(
      { path: '/tmp/demo', reuseWindow: false },
      {
        home: '/Users/me',
        settingsPath: '/missing.json',
        readFile: () => {
          const err = new Error('ENOENT') as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        },
        spawn,
      },
    );
    child.emit('close', 0, null);

    await expect(pending).resolves.toEqual({ exitCode: 0 });
    expect(spawn).toHaveBeenCalledWith('code', ['-n', '/tmp/demo'], { stdio: 'inherit' });
  });

  it('returns exit code 1 when code is not on PATH', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const error = vi.fn();
    const pending = runOpen(
      { path: '/tmp/demo', reuseWindow: true },
      {
        home: '/Users/me',
        settingsPath: '/missing.json',
        readFile: () => {
          const err = new Error('ENOENT') as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        },
        spawn,
        error,
      },
    );
    const spawnError = new Error('spawn code ENOENT') as NodeJS.ErrnoException;
    spawnError.code = 'ENOENT';
    child.emit('error', spawnError);

    await expect(pending).resolves.toEqual({ exitCode: 1 });
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(/code CLI not found|not found on PATH/i),
    );
  });

  it('returns exit code 1 when settings are invalid', async () => {
    const spawn = vi.fn();
    const error = vi.fn();
    const result = await runOpen(
      { path: 'demo', reuseWindow: true },
      {
        home: '/Users/me',
        settingsPath: '/cfg.json',
        readFile: () => '{not-json',
        spawn,
        error,
      },
    );

    expect(result).toEqual({ exitCode: 1 });
    expect(spawn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/Invalid JSON/));
  });

  it('propagates a non-zero exit code from code', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const pending = runOpen(
      { path: '/tmp/demo', reuseWindow: true },
      {
        home: '/Users/me',
        settingsPath: '/missing.json',
        readFile: () => {
          const err = new Error('ENOENT') as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        },
        spawn,
      },
    );
    child.emit('close', 2, null);

    await expect(pending).resolves.toEqual({ exitCode: 2 });
  });
});
