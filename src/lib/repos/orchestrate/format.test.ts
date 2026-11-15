import { describe, expect, it } from 'vitest';
import {
  formatCheckTable,
  formatListTable,
  formatProgressLine,
  formatResultTable,
  formatSummary,
  statusLabel,
} from './format.js';
import type { CheckOneResult } from '../ops/check-one.js';
import type { SyncOneResult } from '../ops/sync-one.js';
import type { RepoEntry } from '../infra/config.js';

describe('format', () => {
  it('maps statuses to English labels with markers', () => {
    expect(statusLabel('up-to-date')).toBe('✓ up to date');
    expect(statusLabel('updated')).toBe('↑ updated');
    expect(statusLabel('failed')).toBe('✗ failed');
  });

  it('formats aligned result rows with a header', () => {
    const results: SyncOneResult[] = [
      {
        name: 'repo-1',
        path: '/r/repo-1',
        branch: 'main',
        status: 'up-to-date',
      },
      {
        name: 'my-long-repo',
        path: '/r/my-long-repo',
        branch: 'feature/x',
        status: 'updated',
      },
      {
        name: 'repo-3',
        path: '/r/repo-3',
        branch: 'develop',
        status: 'failed',
        reason: 'local and remote conflict',
      },
    ];

    expect(formatResultTable(results)).toEqual([
      'REPO          BRANCH     STATUS',
      'repo-1        main       ✓ up to date',
      'my-long-repo  feature/x  ↑ updated',
      'repo-3        develop    ✗ failed: local and remote conflict',
    ]);
  });

  it('returns only the header when there are no results', () => {
    expect(formatResultTable([])).toEqual(['REPO  BRANCH  STATUS']);
  });

  it('adds an AFTER UPDATE column when showAfterUpdate is set', () => {
    const results: SyncOneResult[] = [
      {
        name: 'repo-1',
        path: '/r/repo-1',
        branch: 'main',
        status: 'up-to-date',
      },
      {
        name: 'repo-2',
        path: '/r/repo-2',
        branch: 'main',
        status: 'updated',
        afterUpdate: { kind: 'success' },
      },
      {
        name: 'repo-3',
        path: '/r/repo-3',
        branch: 'main',
        status: 'updated',
        afterUpdate: {
          kind: 'failed',
          shortMessage: 'npm ERR! missing',
          logPath: '/tmp/1-abc.log',
        },
      },
    ];

    expect(formatResultTable(results, { showAfterUpdate: true })).toEqual([
      'REPO    BRANCH  STATUS        AFTER UPDATE',
      'repo-1  main    ✓ up to date  -',
      'repo-2  main    ↑ updated     success',
      'repo-3  main    ↑ updated     failed: npm ERR! missing (log: /tmp/1-abc.log)',
    ]);
  });

  it('formats an in-place progress line', () => {
    expect(formatProgressLine(0, 23)).toBe('repos processing: 0/23');
    expect(formatProgressLine(1, 20)).toBe('repos processing: 1/20');
    expect(formatProgressLine(3, 20)).toBe('repos processing: 3/20');
    expect(formatProgressLine(19, 20)).toBe('repos processing: 19/20');
  });

  it('formats a summary line with total repo count', () => {
    expect(
      formatSummary([
        { name: 'a', path: '/a', branch: 'main', status: 'up-to-date' },
        { name: 'b', path: '/b', branch: 'main', status: 'updated' },
        { name: 'c', path: '/c', branch: 'main', status: 'failed', reason: 'x' },
        { name: 'd', path: '/d', branch: 'main', status: 'failed', reason: 'y' },
      ]),
    ).toBe('Summary: 4 repos / 1 up to date / 1 updated / 2 failed');
  });

  it('formats a list table with repo name and path', () => {
    const repos: RepoEntry[] = [
      { name: 'repo-1', path: '/exampleDir/repo-1' },
      { name: 'my-long-repo', path: '/Users/me/repos/my-long-repo' },
    ];

    expect(formatListTable(repos)).toEqual([
      'REPO          PATH',
      'repo-1        /exampleDir/repo-1',
      'my-long-repo  /Users/me/repos/my-long-repo',
    ]);
  });

  it('formats a check table with dashes for zero counts', () => {
    const results: CheckOneResult[] = [
      {
        name: 'repo-1',
        path: '/r/repo-1',
        branch: 'main',
        status: 'ok',
        remoteBehind: 0,
        localAhead: 0,
        dirtyLines: 0,
      },
      {
        name: 'my-long-repo',
        path: '/r/my-long-repo',
        branch: 'feature/x',
        status: 'ok',
        remoteBehind: 3,
        localAhead: 1,
        dirtyLines: 12,
      },
      {
        name: 'repo-3',
        path: '/r/repo-3',
        branch: 'develop',
        status: 'failed',
        remoteBehind: 0,
        localAhead: 0,
        dirtyLines: 0,
        reason: 'current branch has no upstream',
      },
    ];

    expect(formatCheckTable(results)).toEqual([
      'REPO          BRANCH     REMOTE  LOCAL AHEAD  DIRTY LINES',
      'repo-1        main       -       -            -',
      'my-long-repo  feature/x  3       1            12',
      'repo-3        develop    ✗ failed: current branch has no upstream',
    ]);
  });

  it('formats a check table with recent commit counts when days are set', () => {
    const results: CheckOneResult[] = [
      {
        name: 'repo-1',
        path: '/r/repo-1',
        branch: 'main',
        status: 'ok',
        remoteBehind: 0,
        localAhead: 0,
        dirtyLines: 0,
        commitCount: 0,
      },
      {
        name: 'my-long-repo',
        path: '/r/my-long-repo',
        branch: 'feature/x',
        status: 'ok',
        remoteBehind: 3,
        localAhead: 1,
        dirtyLines: 12,
        commitCount: 12,
      },
      {
        name: 'repo-3',
        path: '/r/repo-3',
        branch: 'develop',
        status: 'failed',
        remoteBehind: 0,
        localAhead: 0,
        dirtyLines: 0,
        reason: 'current branch has no upstream',
      },
    ];

    expect(formatCheckTable(results, { showCommitCountDays: 7 })).toEqual([
      'REPO          BRANCH     REMOTE  LOCAL AHEAD  DIRTY LINES  COMMITS (7d)',
      'repo-1        main       -       -            -            0',
      'my-long-repo  feature/x  3       1            12           12',
      'repo-3        develop    ✗ failed: current branch has no upstream',
    ]);
  });

  it('formats a check table with a dash when branch is unknown', () => {
    const results: CheckOneResult[] = [
      {
        name: 'repo-1',
        path: '/r/repo-1',
        branch: '',
        status: 'failed',
        remoteBehind: 0,
        localAhead: 0,
        dirtyLines: 0,
        reason: 'path does not exist: /r/repo-1',
      },
    ];

    expect(formatCheckTable(results)).toEqual([
      'REPO    BRANCH  REMOTE  LOCAL AHEAD  DIRTY LINES',
      'repo-1  -       ✗ failed: path does not exist: /r/repo-1',
    ]);
  });
});
