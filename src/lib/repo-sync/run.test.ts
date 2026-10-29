import { describe, expect, it, vi } from 'vitest';
import { runRepoSync } from './run.js';
import type { SyncOneResult } from './sync-one.js';

describe('runRepoSync', () => {
  it('prints results in config order and exits 0 when all succeed', async () => {
    const lines: string[] = [];
    const results: SyncOneResult[] = [
      { name: 'repo-1', path: '/a', branch: 'main', status: 'up-to-date' },
      { name: 'repo-2', path: '/b', branch: 'develop', status: 'updated' },
    ];

    const exit = await runRepoSync({
      loadSettings: () => ({
        repos: [
          { name: 'repo-1', path: '/a' },
          { name: 'repo-2', path: '/b' },
        ],
      }),
      syncOne: vi.fn().mockResolvedValueOnce(results[0]).mockResolvedValueOnce(results[1]),
      log: (line) => lines.push(line),
      error: vi.fn(),
      concurrency: 2,
    });

    expect(exit.exitCode).toBe(0);
    expect(lines[0]).toContain('repo-1');
    expect(lines[1]).toContain('repo-2');
    expect(lines.at(-1)).toBe('汇总: 1 无需更新 / 1 已更新 / 0 失败');
  });

  it('exits 1 when any repo fails', async () => {
    const exit = await runRepoSync({
      loadSettings: () => ({
        repos: [{ name: 'repo-1', path: '/a' }],
      }),
      syncOne: async () => ({
        name: 'repo-1',
        path: '/a',
        branch: 'main',
        status: 'failed',
        reason: '本地与云端冲突',
      }),
      log: vi.fn(),
      error: vi.fn(),
    });

    expect(exit.exitCode).toBe(1);
  });

  it('prints config errors and exits 1', async () => {
    const error = vi.fn();
    const exit = await runRepoSync({
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
