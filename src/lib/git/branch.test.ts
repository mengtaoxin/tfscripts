import { describe, expect, it, vi } from 'vitest';
import { getBranchName, getBranchNameOrEmpty } from './branch.js';

describe('getBranchName', () => {
  it('returns the current branch', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'main\n', stderr: '' });
    await expect(getBranchName({ execFile, cwd: '/repo' })).resolves.toBe('main');
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('throws when git fails', async () => {
    const execFile = vi.fn().mockRejectedValue(new Error('fatal'));
    await expect(getBranchName({ execFile })).rejects.toThrow('fatal');
  });
});

describe('getBranchNameOrEmpty', () => {
  it('returns the branch on success', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'feature/x\n', stderr: '' });
    await expect(getBranchNameOrEmpty({ execFile })).resolves.toBe('feature/x');
  });

  it('returns empty string when git fails', async () => {
    const execFile = vi.fn().mockRejectedValue(new Error('fatal'));
    await expect(getBranchNameOrEmpty({ execFile })).resolves.toBe('');
  });
});
