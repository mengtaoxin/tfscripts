import { describe, expect, it } from 'vitest';
import { defaultSettingsPath, loadSettings, ConfigError } from './config.js';

describe('defaultSettingsPath', () => {
  it('resolves under ~/.tfscripts/repos/settings.json', () => {
    expect(defaultSettingsPath('/home/me')).toBe('/home/me/.tfscripts/repos/settings.json');
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
      { path: '/Users/me/code/foo', name: 'foo', environment: 'local' },
      { path: '/abs/bar', name: 'bar', environment: 'local' },
    ]);
  });

  it('loads per-repo environment and ssh-host next to path', () => {
    const settings = loadSettings({
      settingsPath: '/cfg/settings.json',
      home: '/Users/me',
      readFile: () =>
        JSON.stringify({
          repos: [
            { path: '/local/app' },
            {
              path: '~/code/foo',
              environment: 'ssh',
              'ssh-host': 'devbox',
            },
          ],
        }),
    });

    expect(settings.repos).toEqual([
      { path: '/local/app', name: 'app', environment: 'local' },
      {
        path: '~/code/foo',
        name: 'foo',
        environment: 'ssh',
        sshHost: 'devbox',
      },
    ]);
  });

  it('defaults each repo environment to local', () => {
    const settings = loadSettings({
      settingsPath: '/cfg/settings.json',
      home: '/Users/me',
      readFile: () => JSON.stringify({ repos: [{ path: '/abs/bar' }] }),
    });

    expect(settings.repos[0]).toEqual({
      path: '/abs/bar',
      name: 'bar',
      environment: 'local',
    });
  });

  it('rejects invalid per-repo environment values', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            repos: [{ path: '/abs/bar', environment: 'cloud' }],
          }),
      }),
    ).toThrow(/repos\[0\]\.environment must be "local" or "ssh"/);
  });

  it('requires ssh-host when a repo environment is ssh', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            repos: [{ path: '/abs/bar', environment: 'ssh' }],
          }),
      }),
    ).toThrow(/repos\[0\]\.ssh-host is required when environment is "ssh"/);
  });

  it('rejects empty ssh-host when environment is ssh', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            repos: [{ path: '/abs/bar', environment: 'ssh', 'ssh-host': '  ' }],
          }),
      }),
    ).toThrow(/repos\[0\]\.ssh-host must be a non-empty string/);
  });

  it('rejects ssh-host when environment is local', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            repos: [{ path: '/abs/bar', environment: 'local', 'ssh-host': 'devbox' }],
          }),
      }),
    ).toThrow(/repos\[0\]\.ssh-host is only valid when environment is "ssh"/);
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
