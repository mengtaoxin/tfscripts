import { describe, expect, it } from 'vitest';
import { formatResultLine, formatSummary, statusLabel } from './format.js';
import type { SyncOneResult } from './sync-one.js';

describe('format', () => {
  it('maps statuses to Chinese labels with markers', () => {
    expect(statusLabel('up-to-date')).toBe('✓ 无需更新');
    expect(statusLabel('updated')).toBe('↑ 成功拉取更新');
    expect(statusLabel('failed')).toBe('✗ 拉取失败');
  });

  it('formats a result line with reason on failure', () => {
    const ok: SyncOneResult = {
      name: 'repo-1',
      path: '/r/repo-1',
      branch: 'main',
      status: 'up-to-date',
    };
    expect(formatResultLine(ok)).toBe('repo-1    main    ✓ 无需更新');

    const failed: SyncOneResult = {
      name: 'repo-3',
      path: '/r/repo-3',
      branch: 'feature',
      status: 'failed',
      reason: '本地与云端冲突',
    };
    expect(formatResultLine(failed)).toBe('repo-3    feature    ✗ 拉取失败: 本地与云端冲突');
  });

  it('formats a summary line', () => {
    expect(
      formatSummary([
        { name: 'a', path: '/a', branch: 'main', status: 'up-to-date' },
        { name: 'b', path: '/b', branch: 'main', status: 'updated' },
        { name: 'c', path: '/c', branch: 'main', status: 'failed', reason: 'x' },
        { name: 'd', path: '/d', branch: 'main', status: 'failed', reason: 'y' },
      ]),
    ).toBe('汇总: 1 无需更新 / 1 已更新 / 2 失败');
  });
});
