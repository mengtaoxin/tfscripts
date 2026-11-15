import { describe, expect, it, vi } from 'vitest';
import {
  getBranchName,
  getRepoName,
  getStagedDiff,
  gitAddAll,
  gitCheckoutNewBranch,
  gitCommitWithMessage,
  gitPush,
  resolveRepoRoot,
} from './git.js';

describe('git helpers', () => {
  it('resolveRepoRoot returns trimmed toplevel path', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '/repo/root\n', stderr: '' });
    await expect(resolveRepoRoot({ execFile })).resolves.toBe('/repo/root');
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--show-toplevel'],
      expect.any(Object),
    );
  });

  it('resolveRepoRoot throws a clear error when not a repo', async () => {
    const execFile = vi.fn().mockRejectedValue(new Error('fatal'));
    await expect(resolveRepoRoot({ execFile })).rejects.toThrow('Not a git repository');
  });

  it('getRepoName uses basename', () => {
    expect(getRepoName('/Users/me/repos/tfscripts')).toBe('tfscripts');
  });

  it('getBranchName returns the current branch', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'feature/x\n', stderr: '' });
    await expect(getBranchName({ execFile })).resolves.toBe('feature/x');
  });

  it('gitAddAll runs git add .', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await gitAddAll({ execFile, cwd: '/repo' });
    expect(execFile).toHaveBeenCalledWith('git', ['add', '.'], { cwd: '/repo' });
  });

  it('getStagedDiff returns cached diff', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'diff data', stderr: '' });
    await expect(getStagedDiff({ execFile })).resolves.toBe('diff data');
    expect(execFile).toHaveBeenCalledWith('git', ['diff', '--cached'], expect.any(Object));
  });

  it('gitCommitWithMessage pipes the message on stdin', async () => {
    const execFileWithStdin = vi.fn().mockResolvedValue(undefined);
    await gitCommitWithMessage('feat: x', {
      execFile: vi.fn(),
      execFileWithStdin,
      cwd: '/repo',
    });
    expect(execFileWithStdin).toHaveBeenCalledWith('git', ['commit', '-F', '-'], 'feat: x', {
      cwd: '/repo',
    });
  });

  it('gitPush runs git push', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await gitPush({ execFile });
    expect(execFile).toHaveBeenCalledWith('git', ['push'], expect.any(Object));
  });

  it('gitCheckoutNewBranch runs git checkout -b', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await gitCheckoutNewBranch('feature/20261115-153045-ab12c', { execFile, cwd: '/repo' });
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['checkout', '-b', 'feature/20261115-153045-ab12c'],
      { cwd: '/repo' },
    );
  });

  it('gitPush with setUpstream runs git push -u origin HEAD', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await gitPush({ execFile }, { setUpstream: true });
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['push', '-u', 'origin', 'HEAD'],
      expect.any(Object),
    );
  });
});
