import { describe, expect, it } from 'vitest';
import { formatProgressLine, formatResultTable, formatSummary, statusLabel } from './format.js';
import type { SyncOneResult } from './sync-one.js';

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
    expect(formatProgressLine(0, 23)).toBe('repo-sync processing: 0/23');
    expect(formatProgressLine(1, 20)).toBe('repo-sync processing: 1/20');
    expect(formatProgressLine(3, 20)).toBe('repo-sync processing: 3/20');
    expect(formatProgressLine(19, 20)).toBe('repo-sync processing: 19/20');
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
});
