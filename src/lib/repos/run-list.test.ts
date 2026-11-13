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

  it('prints recent commit counts when showCommitCountDays is set', async () => {
    const lines: string[] = [];
    const countCommitsSince = vi.fn(async (entry: { path: string }, days: number) => {
      expect(days).toBe(7);
      if (entry.path === '/a') {
        return 0;
      }
      if (entry.path === '/Users/me/repos/my-long-repo') {
        return 12;
      }
      return null;
    });

    const exit = await runRepoList({
      showCommitCountDays: 7,
      loadSettings: () => ({
        repos: [
          { name: 'repo-1', path: '/a' },
          { name: 'my-long-repo', path: '/Users/me/repos/my-long-repo' },
          { name: 'broken', path: '/missing' },
        ],
      }),
      countCommitsSince,
      log: (line) => lines.push(line),
      error: vi.fn(),
    });

    expect(exit.exitCode).toBe(0);
    expect(countCommitsSince).toHaveBeenCalledTimes(3);
    expect(lines).toEqual([
      'REPO          PATH                          COMMITS (7d)',
      'repo-1        /a                            0',
      'my-long-repo  /Users/me/repos/my-long-repo  12',
      'broken        /missing                      -',
    ]);
  });

  it('does not count commits when showCommitCountDays is omitted', async () => {
    const countCommitsSince = vi.fn();
    const lines: string[] = [];

    await runRepoList({
      loadSettings: () => ({
        repos: [{ name: 'repo-1', path: '/a' }],
      }),
      countCommitsSince,
      log: (line) => lines.push(line),
      error: vi.fn(),
    });

    expect(countCommitsSince).not.toHaveBeenCalled();
    expect(lines).toEqual(['REPO    PATH', 'repo-1  /a']);
  });
});
