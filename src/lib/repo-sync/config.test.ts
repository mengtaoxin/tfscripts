import { describe, expect, it } from 'vitest';
import { defaultSettingsPath, loadSettings, ConfigError } from './config.js';

describe('defaultSettingsPath', () => {
  it('resolves under ~/.tfscripts/repo-sync/settings.json', () => {
    expect(defaultSettingsPath('/home/me')).toBe('/home/me/.tfscripts/repo-sync/settings.json');
  });
});

describe('loadSettings', () => {
  it('loads valid repos and expands ~ in paths', () => {
    const settings = loadSettings({
      settingsPath: '/cfg/settings.json',
      home: '/Users/me',
      readFile: () =>
        JSON.stringify({
          repos: [{ path: '~/code/foo' }, { path: '/abs/bar' }],
        }),
    });

    expect(settings.repos).toEqual([
      { path: '/Users/me/code/foo', name: 'foo' },
      { path: '/abs/bar', name: 'bar' },
    ]);
  });

  it('throws when the settings file is missing', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/missing.json',
        home: '/Users/me',
        readFile: () => {
          const err = new Error('ENOENT') as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      loadSettings({
        settingsPath: '/missing.json',
        home: '/Users/me',
        readFile: () => {
          const err = new Error('ENOENT') as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        },
      }),
    ).toThrow(/Settings file not found/);
  });

  it('throws on invalid JSON', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => '{not-json',
      }),
    ).toThrow(/Invalid JSON/);
  });

  it('throws when repos is missing or empty', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({}),
      }),
    ).toThrow(/repos/);

    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({ repos: [] }),
      }),
    ).toThrow(/at least one/);
  });

  it('throws when a repo path is missing or empty', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({ repos: [{ path: '' }] }),
      }),
    ).toThrow(/path/);

    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () => JSON.stringify({ repos: [{}] }),
      }),
    ).toThrow(/path/);
  });
});
