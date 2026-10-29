import { describe, expect, it, vi } from 'vitest';
import {
  countBehindUpstream,
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

describe('repo-sync git helpers', () => {
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

  it('isWorkingTreeDirty is true when porcelain is non-empty', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: ' M a.ts\n', stderr: '' });
    await expect(isWorkingTreeDirty({ execFile })).resolves.toBe(true);
  });

  it('stash/merge helpers invoke expected git args', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const deps = { execFile, cwd: '/repo' };
    await stashPush(deps, 'repo-sync');
    await mergeUpstream(deps);
    await stashPop(deps);
    await mergeAbort(deps);
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['stash', 'push', '--include-untracked', '-m', 'repo-sync'],
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
