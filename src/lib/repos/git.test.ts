import { describe, expect, it, vi } from 'vitest';
import {
  countAheadUpstream,
  countBehindUpstream,
  countCommitsSince,
  countDirtyLines,
  errorMessage,
  fetchUpstream,
  getBranchName,
  getUpstreamRef,
  isConflictError,
  isNetworkError,
  isWorkingTreeDirty,
  mergeAbort,
  mergeUpstream,
  stashPop,
  stashPush,
} from './git.js';

describe('repos git helpers', () => {
  it('getBranchName returns the current branch', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'main\n', stderr: '' });
    await expect(getBranchName({ execFile, cwd: '/repo' })).resolves.toBe('main');
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('getUpstreamRef resolves @{u}', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'origin/main\n', stderr: '' });
    await expect(getUpstreamRef({ execFile })).resolves.toBe('origin/main');
  });

  it('fetchUpstream runs git fetch --prune', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await fetchUpstream({ execFile, cwd: '/repo' });
    expect(execFile).toHaveBeenCalledWith('git', ['fetch', '--prune'], expect.any(Object));
  });

  it('countBehindUpstream parses rev-list count', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '3\n', stderr: '' });
    await expect(countBehindUpstream({ execFile })).resolves.toBe(3);
  });

  it('countAheadUpstream parses rev-list count for local commits', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '2\n', stderr: '' });
    await expect(countAheadUpstream({ execFile })).resolves.toBe(2);
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['rev-list', '--count', '@{u}..HEAD'],
      expect.any(Object),
    );
  });

  it('countCommitsSince counts commits since N days ago', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '5\n', stderr: '' });
    await expect(countCommitsSince({ execFile, cwd: '/repo' }, 7)).resolves.toBe(5);
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['rev-list', '--count', '--since=7 days ago', 'HEAD'],
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('countDirtyLines sums tracked numstat and untracked file lines', async () => {
    const readFile = vi.fn(async (path: string) => {
      if (path.endsWith('new.ts')) {
        return 'a\nb\nc\n';
      }
      throw new Error(`unexpected path: ${path}`);
    });
    const execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'diff --numstat HEAD') {
        return { stdout: '3\t1\ta.ts\n0\t2\tb.ts\n', stderr: '' };
      }
      if (joined === 'ls-files -o --exclude-standard') {
        return { stdout: 'new.ts\n', stderr: '' };
      }
      throw new Error(`unexpected git args: ${joined}`);
    });

    await expect(countDirtyLines({ execFile, cwd: '/repo', readFile })).resolves.toBe(9);
  });

  it('isWorkingTreeDirty is true when porcelain is non-empty', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: ' M a.ts\n', stderr: '' });
    await expect(isWorkingTreeDirty({ execFile })).resolves.toBe(true);
  });

  it('stash/merge helpers invoke expected git args', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const deps = { execFile, cwd: '/repo' };
    await stashPush(deps, 'repos');
    await mergeUpstream(deps);
    await stashPop(deps);
    await mergeAbort(deps);
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['stash', 'push', '--include-untracked', '-m', 'repos'],
      expect.any(Object),
    );
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['merge', '--no-edit', '@{u}'],
      expect.any(Object),
    );
    expect(execFile).toHaveBeenCalledWith('git', ['stash', 'pop'], expect.any(Object));
    expect(execFile).toHaveBeenCalledWith('git', ['merge', '--abort'], expect.any(Object));
  });
});

describe('error classifiers', () => {
  it('detects network errors by code and message', () => {
    expect(isNetworkError(Object.assign(new Error('fail'), { code: 'ENOTFOUND' }))).toBe(true);
    expect(isNetworkError(new Error('Could not resolve host: github.com'))).toBe(true);
    expect(isNetworkError(new Error('merge conflict in a.ts'))).toBe(false);
  });

  it('detects conflict errors', () => {
    expect(isConflictError(new Error('Automatic merge failed; fix conflicts'))).toBe(true);
    expect(isConflictError(new Error('local changes would be overwritten by merge'))).toBe(true);
    expect(isConflictError(new Error('Could not resolve host'))).toBe(false);
  });

  it('prefers stderr in errorMessage', () => {
    const err = Object.assign(new Error('Command failed'), {
      stderr: 'fatal: unable to access\n',
    });
    expect(errorMessage(err)).toBe('fatal: unable to access');
  });
});
