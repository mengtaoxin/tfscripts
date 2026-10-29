import { describe, expect, it, vi } from 'vitest';
import { runRepoSync } from './run.js';
import type { SyncOneResult } from './sync-one.js';

describe('runRepoSync', () => {
  it('rewrites progress in place, then prints ordered results and summary', async () => {
    const lines: string[] = [];
    const progressUpdates: string[] = [];
    const endProgress = vi.fn();
    const results: SyncOneResult[] = [
      { name: 'repo-1', path: '/a', branch: 'main', status: 'up-to-date' },
      { name: 'repo-2', path: '/b', branch: 'develop', status: 'updated' },
    ];

    let resolve1!: (value: SyncOneResult) => void;
    let resolve2!: (value: SyncOneResult) => void;
    const pending1 = new Promise<SyncOneResult>((resolve) => {
      resolve1 = resolve;
    });
    const pending2 = new Promise<SyncOneResult>((resolve) => {
      resolve2 = resolve;
    });

    const exitPromise = runRepoSync({
      loadSettings: () => ({
        repos: [
          { name: 'repo-1', path: '/a' },
          { name: 'repo-2', path: '/b' },
        ],
      }),
      syncOne: async (entry) => (entry.name === 'repo-1' ? pending1 : pending2),
      log: (line) => lines.push(line),
      setProgress: (text) => {
        progressUpdates.push(text);
      },
      endProgress,
      error: vi.fn(),
      concurrency: 2,
    });

    await vi.waitFor(() => {
      expect(progressUpdates).toEqual(['repo-sync processing: 0/2']);
    });
    expect(lines).toEqual([]);

    resolve2(results[1]!);
    await vi.waitFor(() => {
      expect(progressUpdates).toEqual(['repo-sync processing: 0/2', 'repo-sync processing: 1/2']);
    });
    expect(lines).toEqual([]);

    resolve1(results[0]!);
    const exit = await exitPromise;

    expect(exit.exitCode).toBe(0);
    expect(progressUpdates).toEqual([
      'repo-sync processing: 0/2',
      'repo-sync processing: 1/2',
      'repo-sync processing: 2/2',
    ]);
    expect(endProgress).toHaveBeenCalledOnce();
    expect(lines).toEqual([
      'REPO    BRANCH   STATUS',
      'repo-1  main     ✓ up to date',
      'repo-2  develop  ↑ updated',
      'Summary: 2 repos / 1 up to date / 1 updated / 0 failed',
    ]);
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
        reason: 'local and remote conflict',
      }),
      log: vi.fn(),
      setProgress: vi.fn(),
      endProgress: vi.fn(),
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
