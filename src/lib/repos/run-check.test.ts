import { describe, expect, it, vi } from 'vitest';
import { runRepoCheck } from './run-check.js';
import type { CheckOneResult } from './check-one.js';

describe('runRepoCheck', () => {
  it('rewrites progress in place, then prints ordered check rows', async () => {
    const lines: string[] = [];
    const progressUpdates: string[] = [];
    const endProgress = vi.fn();
    const results: CheckOneResult[] = [
      {
        name: 'repo-1',
        path: '/a',
        branch: 'main',
        status: 'ok',
        remoteBehind: 0,
        localAhead: 0,
        dirtyLines: 0,
      },
      {
        name: 'repo-2',
        path: '/b',
        branch: 'develop',
        status: 'ok',
        remoteBehind: 2,
        localAhead: 1,
        dirtyLines: 5,
      },
    ];

    let resolve1!: (value: CheckOneResult) => void;
    let resolve2!: (value: CheckOneResult) => void;
    const pending1 = new Promise<CheckOneResult>((resolve) => {
      resolve1 = resolve;
    });
    const pending2 = new Promise<CheckOneResult>((resolve) => {
      resolve2 = resolve;
    });

    const exitPromise = runRepoCheck({
      loadSettings: () => ({
        repos: [
          { name: 'repo-1', path: '/a' },
          { name: 'repo-2', path: '/b' },
        ],
        remoteOperationThrottlingSeconds: 10,
      }),
      checkOne: async (entry) => (entry.name === 'repo-1' ? pending1 : pending2),
      log: (line) => lines.push(line),
      setProgress: (text) => {
        progressUpdates.push(text);
      },
      endProgress,
      error: vi.fn(),
      concurrency: 2,
    });

    await vi.waitFor(() => {
      expect(progressUpdates).toEqual(['repos processing: 0/2']);
    });

    resolve2(results[1]!);
    await vi.waitFor(() => {
      expect(progressUpdates).toEqual(['repos processing: 0/2', 'repos processing: 1/2']);
    });

    resolve1(results[0]!);
    const exit = await exitPromise;

    expect(exit.exitCode).toBe(0);
    expect(progressUpdates).toEqual([
      'repos processing: 0/2',
      'repos processing: 1/2',
      'repos processing: 2/2',
    ]);
    expect(endProgress).toHaveBeenCalledOnce();
    expect(lines).toEqual([
      'REPO    BRANCH   REMOTE  LOCAL AHEAD  DIRTY LINES',
      'repo-1  main     -       -            -',
      'repo-2  develop  2       1            5',
    ]);
  });

  it('exits 1 when any repo check fails', async () => {
    const exit = await runRepoCheck({
      loadSettings: () => ({
        repos: [{ name: 'repo-1', path: '/a' }],
        remoteOperationThrottlingSeconds: 10,
      }),
      checkOne: async () => ({
        name: 'repo-1',
        path: '/a',
        branch: 'main',
        status: 'failed',
        remoteBehind: 0,
        localAhead: 0,
        dirtyLines: 0,
        reason: 'current branch has no upstream',
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
    const exit = await runRepoCheck({
      loadSettings: () => {
        throw new Error('Settings file not found');
      },
      log: vi.fn(),
      error,
    });

    expect(exit.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith('Settings file not found');
  });

  it('prints a COMMITS column when settings include showCommitCountDays', async () => {
    const lines: string[] = [];
    const checkOne = vi.fn(async (entry: { name: string; path: string }) => ({
      name: entry.name,
      path: entry.path,
      branch: 'main',
      status: 'ok' as const,
      remoteBehind: 0,
      localAhead: 0,
      dirtyLines: 0,
      commitCount: 5,
    }));

    const exit = await runRepoCheck({
      loadSettings: () => ({
        repos: [{ name: 'repo-1', path: '/a' }],
        showCommitCountDays: 14,
        remoteOperationThrottlingSeconds: 10,
      }),
      checkOne,
      log: (line) => lines.push(line),
      setProgress: vi.fn(),
      endProgress: vi.fn(),
      error: vi.fn(),
    });

    expect(exit.exitCode).toBe(0);
    expect(checkOne).toHaveBeenCalledWith(
      { name: 'repo-1', path: '/a' },
      expect.objectContaining({ showCommitCountDays: 14 }),
    );
    expect(lines).toEqual([
      'REPO    BRANCH  REMOTE  LOCAL AHEAD  DIRTY LINES  COMMITS (14d)',
      'repo-1  main    -       -            -            5',
    ]);
  });
});
