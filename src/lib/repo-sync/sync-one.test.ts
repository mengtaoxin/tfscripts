import { describe, expect, it, vi } from 'vitest';
import { syncOne } from './sync-one.js';
import type { ExecFileFn } from './git.js';

function createExecFile(handler: (joined: string) => { stdout: string; stderr: string } | void) {
  const execFile: ExecFileFn = vi.fn(async (_file, args) => {
    const joined = args.join(' ');
    const result = handler(joined);
    if (result) {
      return result;
    }
    return { stdout: '', stderr: '' };
  });
  return execFile;
}

describe('syncOne', () => {
  const entry = { name: 'repo-1', path: '/repos/repo-1' };

  it('reports up-to-date when not behind after fetch', async () => {
    const execFile = createExecFile((joined) => {
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        return { stdout: 'origin/main\n', stderr: '' };
      }
      if (joined === 'rev-list --count HEAD..@{u}') {
        return { stdout: '0\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await syncOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result).toEqual({
      name: 'repo-1',
      path: '/repos/repo-1',
      branch: 'main',
      status: 'up-to-date',
    });
  });

  it('merges when behind and reports updated', async () => {
    const execFile = createExecFile((joined) => {
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'develop\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        return { stdout: 'origin/develop\n', stderr: '' };
      }
      if (joined === 'rev-list --count HEAD..@{u}') {
        return { stdout: '2\n', stderr: '' };
      }
      if (joined === 'status --porcelain') {
        return { stdout: '', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await syncOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result.status).toBe('updated');
    expect(result.branch).toBe('develop');
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['merge', '--no-edit', '@{u}'],
      expect.any(Object),
    );
  });

  it('stashes dirty tree before merge and pops after', async () => {
    const execFile = createExecFile((joined) => {
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        return { stdout: 'origin/main\n', stderr: '' };
      }
      if (joined === 'rev-list --count HEAD..@{u}') {
        return { stdout: '1\n', stderr: '' };
      }
      if (joined === 'status --porcelain') {
        return { stdout: ' M a.ts\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await syncOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result.status).toBe('updated');
    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['stash', 'push', '--include-untracked', '-m', 'repo-sync autostash'],
      expect.any(Object),
    );
    expect(execFile).toHaveBeenCalledWith('git', ['stash', 'pop'], expect.any(Object));
  });

  it('aborts merge and reports conflict failure', async () => {
    const execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        return { stdout: 'origin/main\n', stderr: '' };
      }
      if (joined === 'rev-list --count HEAD..@{u}') {
        return { stdout: '1\n', stderr: '' };
      }
      if (joined === 'status --porcelain') {
        return { stdout: '', stderr: '' };
      }
      if (joined === 'merge --no-edit @{u}') {
        throw new Error('Automatic merge failed; fix conflicts and then commit the result.');
      }
      return { stdout: '', stderr: '' };
    });

    const result = await syncOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result).toMatchObject({
      status: 'failed',
      reason: 'local and remote conflict',
    });
    expect(execFile).toHaveBeenCalledWith('git', ['merge', '--abort'], expect.any(Object));
  });

  it('fails when upstream is missing', async () => {
    const execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        throw new Error('no upstream');
      }
      return { stdout: '', stderr: '' };
    });

    const result = await syncOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result).toMatchObject({
      status: 'failed',
      reason: 'current branch has no upstream',
    });
  });

  it('retries network fetch errors with exponential backoff then succeeds', async () => {
    let fetchCount = 0;
    const sleep = vi.fn().mockResolvedValue(undefined);
    const execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        return { stdout: 'origin/main\n', stderr: '' };
      }
      if (joined === 'fetch --prune') {
        fetchCount += 1;
        if (fetchCount < 3) {
          throw Object.assign(new Error('Could not resolve host'), { code: 'ENOTFOUND' });
        }
        return { stdout: '', stderr: '' };
      }
      if (joined === 'rev-list --count HEAD..@{u}') {
        return { stdout: '0\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await syncOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
      sleep,
      random: () => 0,
      retryBaseMs: 100,
    });

    expect(result.status).toBe('up-to-date');
    expect(fetchCount).toBe(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it('does not retry non-network fetch errors', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let fetchCount = 0;
    const execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        return { stdout: 'origin/main\n', stderr: '' };
      }
      if (joined === 'fetch --prune') {
        fetchCount += 1;
        throw new Error('remote: Repository not found');
      }
      return { stdout: '', stderr: '' };
    });

    const result = await syncOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
      sleep,
    });

    expect(result.status).toBe('failed');
    expect(fetchCount).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('fails when path does not exist', async () => {
    const result = await syncOne(entry, {
      accessPath: async () => {
        throw new Error('ENOENT');
      },
    });

    expect(result).toMatchObject({
      status: 'failed',
      reason: 'path does not exist: /repos/repo-1',
    });
  });
});
