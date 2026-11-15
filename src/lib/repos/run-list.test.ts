import { describe, expect, it, vi } from 'vitest';
import { runRepoList } from './run-list.js';

describe('runRepoList', () => {
  it('prints a REPO / PATH table from settings', async () => {
    const lines: string[] = [];

    const exit = await runRepoList({
      loadSettings: () => ({
        repos: [
          { name: 'repo-1', path: '/a' },
          { name: 'my-long-repo', path: '/Users/me/repos/my-long-repo' },
        ],
      }),
      log: (line) => lines.push(line),
      error: vi.fn(),
    });

    expect(exit.exitCode).toBe(0);
    expect(lines).toEqual([
      'REPO          PATH',
      'repo-1        /a',
      'my-long-repo  /Users/me/repos/my-long-repo',
    ]);
  });

  it('prints config errors and exits 1', async () => {
    const error = vi.fn();
    const exit = await runRepoList({
      loadSettings: () => {
        throw new Error('Settings file not found');
      },
      log: vi.fn(),
      error,
    });

    expect(exit.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith('Settings file not found');
  });
});
