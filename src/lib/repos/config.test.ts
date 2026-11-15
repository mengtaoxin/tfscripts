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
    expect(settings.showCommitCountDays).toBeUndefined();
  });

  it('loads optional list.show-commit-count as a positive integer', () => {
    const settings = loadSettings({
      settingsPath: '/cfg/settings.json',
      home: '/Users/me',
      readFile: () =>
        JSON.stringify({
          'list.show-commit-count': 7,
          repos: [{ path: '/abs/bar' }],
        }),
    });

    expect(settings.showCommitCountDays).toBe(7);
  });

  it('rejects invalid list.show-commit-count values', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            'list.show-commit-count': 0,
            repos: [{ path: '/abs/bar' }],
          }),
      }),
    ).toThrow(/list\.show-commit-count must be a positive integer/);

    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            'list.show-commit-count': 1.5,
            repos: [{ path: '/abs/bar' }],
          }),
      }),
    ).toThrow(/list\.show-commit-count must be a positive integer/);

    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            'list.show-commit-count': '7',
            repos: [{ path: '/abs/bar' }],
          }),
      }),
    ).toThrow(/list\.show-commit-count must be a positive integer/);
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

  it('loads optional ai-git-submit-parameters next to path', () => {
    const settings = loadSettings({
      settingsPath: '/cfg/settings.json',
      home: '/Users/me',
      readFile: () =>
        JSON.stringify({
          repos: [
            {
              path: '~/code/foo',
              environment: 'ssh',
              'ssh-host': 'devbox',
              'ai-git-submit-parameters': ['--add yes', '--push yes'],
            },
            { path: '/local/app' },
          ],
        }),
    });

    expect(settings.repos[0]).toEqual({
      path: '~/code/foo',
      name: 'foo',
      environment: 'ssh',
      sshHost: 'devbox',
      aiGitSubmitParameters: ['--add yes', '--push yes'],
    });
    expect(settings.repos[1]).toEqual({
      path: '/local/app',
      name: 'app',
      environment: 'local',
    });
  });

  it('rejects non-array ai-git-submit-parameters', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            repos: [{ path: '/abs/bar', 'ai-git-submit-parameters': '--add yes' }],
          }),
      }),
    ).toThrow(/repos\[0\]\.ai-git-submit-parameters must be an array of non-empty strings/);
  });

  it('rejects empty strings in ai-git-submit-parameters', () => {
    expect(() =>
      loadSettings({
        settingsPath: '/cfg.json',
        home: '/Users/me',
        readFile: () =>
          JSON.stringify({
            repos: [{ path: '/abs/bar', 'ai-git-submit-parameters': ['--add yes', '  '] }],
          }),
      }),
    ).toThrow(/repos\[0\]\.ai-git-submit-parameters must be an array of non-empty strings/);
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
