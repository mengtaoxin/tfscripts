import { describe, expect, it } from 'vitest';
import {
  formatCheckTable,
  formatListTable,
  formatProgressLine,
  formatResultTable,
  formatSummary,
  statusLabel,
} from './format.js';
import type { CheckOneResult } from './check-one.js';
import type { SyncOneResult } from './sync-one.js';
import type { RepoEntry } from './config.js';

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

  it('formats a list table with recent commit counts', () => {
    const repos: RepoEntry[] = [
      { name: 'repo-1', path: '/a' },
      { name: 'my-long-repo', path: '/Users/me/repos/my-long-repo' },
      { name: 'broken', path: '/missing' },
    ];

    expect(
      formatListTable(repos, {
        showCommitCountDays: 7,
        commitCounts: [0, 12, null],
      }),
    ).toEqual([
      'REPO          PATH                          COMMITS (7d)',
      'repo-1        /a                            0',
      'my-long-repo  /Users/me/repos/my-long-repo  12',
      'broken        /missing                      -',
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
      'REPO          REMOTE  LOCAL AHEAD  DIRTY LINES',
      'repo-1        -       -            -',
      'my-long-repo  3       1            12',
      'repo-3        ✗ failed: current branch has no upstream',
    ]);
  });
});
