import { describe, expect, it } from 'vitest';
import type { RepoSyncSettings } from '../infra/config.js';
import { completeRepos } from './complete.js';

const ACTIONS = ['update', 'check', 'list', 'submit', 'help'] as const;

function settings(names: readonly string[]): RepoSyncSettings {
  return {
    repos: names.map((name) => ({ name, path: `/tmp/${name}` })),
    remoteOperationThrottlingSeconds: 10,
  };
}

describe('completeRepos', () => {
  it('lists actions when words are empty or prefix the first word', () => {
    expect(completeRepos([])).toEqual([...ACTIONS]);
    expect(completeRepos([''])).toEqual([...ACTIONS]);
    expect(completeRepos(['su'])).toEqual(['submit']);
  });

  it('lists actions after help', () => {
    expect(completeRepos(['help', ''])).toEqual(['update', 'check', 'list', 'submit']);
    expect(completeRepos(['help', 'ch'])).toEqual(['check']);
  });

  it('suggests --name after submit', () => {
    expect(completeRepos(['submit', ''])).toEqual(['--name']);
    expect(completeRepos(['submit', '--n'])).toEqual(['--name']);
  });

  it('lists repo names after submit --name from settings', () => {
    const deps = {
      loadSettings: () => settings(['tfscripts', 'other', 'tools']),
    };
    expect(completeRepos(['submit', '--name', ''], deps)).toEqual(['tfscripts', 'other', 'tools']);
    expect(completeRepos(['submit', '--name', 'tf'], deps)).toEqual(['tfscripts']);
  });

  it('returns unique repo names when duplicates exist', () => {
    const deps = {
      loadSettings: () => ({
        repos: [
          { name: 'dup', path: '/a' },
          { name: 'dup', path: '/b' },
          { name: 'solo', path: '/c' },
        ],
        remoteOperationThrottlingSeconds: 10,
      }),
    };
    expect(completeRepos(['submit', '--name', ''], deps)).toEqual(['dup', 'solo']);
  });

  it('returns no candidates when settings fail to load', () => {
    const deps = {
      loadSettings: () => {
        throw new Error('Settings file not found');
      },
    };
    expect(completeRepos(['submit', '--name', ''], deps)).toEqual([]);
  });

  it('returns no candidates for unknown contexts', () => {
    expect(completeRepos(['update', ''])).toEqual([]);
    expect(completeRepos(['submit', '--name', 'foo', ''])).toEqual([]);
  });
});
