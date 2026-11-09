import { describe, expect, it } from 'vitest';
import { ConfigError, defaultSettingsPath, resolveOpenPath, tryLoadSettings } from './config.js';

describe('defaultSettingsPath', () => {
  it('resolves under ~/.tfscripts/open-in-vscode/settings.json', () => {
    expect(defaultSettingsPath('/home/me')).toBe(
      '/home/me/.tfscripts/open-in-vscode/settings.json',
    );
  });
});

describe('tryLoadSettings', () => {
  it('returns null when the settings file is missing', () => {
    const settings = tryLoadSettings({
      settingsPath: '/missing.json',
      home: '/Users/me',
      readFile: () => {
        const err = new Error('ENOENT') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      },
    });
    expect(settings).toBeNull();
  });

  it('loads path-configs, expands ~, and rejects duplicate aliases', () => {
    const settings = tryLoadSettings({
      settingsPath: '/cfg/settings.json',
      home: '/Users/me',
      readFile: () =>
        JSON.stringify({
          'path-configs': [
            { path: '~/code/foo', alias: 'foo' },
            { path: '/abs/bar', alias: 'bar' },
          ],
        }),
    });

    expect(settings).toEqual({
      pathConfigs: [
        { path: '/Users/me/code/foo', alias: 'foo' },
        { path: '/abs/bar', alias: 'bar' },
      ],
    });

    expect(() =>
      tryLoadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            'path-configs': [
              { path: '/a', alias: 'x' },
              { path: '/b', alias: 'x' },
            ],
          }),
      }),
    ).toThrow(/duplicate alias "x"/i);
  });

  it('throws on invalid JSON or schema', () => {
    expect(() =>
      tryLoadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => '{not-json',
      }),
    ).toThrow(ConfigError);

    expect(() =>
      tryLoadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({}),
      }),
    ).toThrow(/path-configs/);

    expect(() =>
      tryLoadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({ 'path-configs': [{ path: '', alias: 'x' }] }),
      }),
    ).toThrow(/path/);

    expect(() =>
      tryLoadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({ 'path-configs': [{ path: '/a', alias: '' }] }),
      }),
    ).toThrow(/alias/);
  });

  it('allows an empty path-configs array', () => {
    expect(
      tryLoadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({ 'path-configs': [] }),
      }),
    ).toEqual({ pathConfigs: [] });
  });
});

describe('resolveOpenPath', () => {
  it('resolves an alias when settings exist', () => {
    const resolved = resolveOpenPath('demo', {
      home: '/Users/me',
      settingsPath: '/cfg.json',
      readFile: () =>
        JSON.stringify({
          'path-configs': [{ path: '~/tmp/demo', alias: 'demo' }],
        }),
    });
    expect(resolved).toBe('/Users/me/tmp/demo');
  });

  it('treats the value as a path when there is no matching alias', () => {
    expect(
      resolveOpenPath('~/repos/app', {
        home: '/Users/me',
        settingsPath: '/missing.json',
        readFile: () => {
          const err = new Error('ENOENT') as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        },
      }),
    ).toBe('/Users/me/repos/app');

    expect(
      resolveOpenPath('/tmp/demo', {
        home: '/Users/me',
        settingsPath: '/cfg.json',
        readFile: () =>
          JSON.stringify({
            'path-configs': [{ path: '/other', alias: 'other' }],
          }),
      }),
    ).toBe('/tmp/demo');
  });
});
