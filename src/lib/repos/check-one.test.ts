import { describe, expect, it, vi } from 'vitest';
import { checkOne } from './check-one.js';
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

describe('checkOne', () => {
  const entry = { name: 'repo-1', path: '/repos/repo-1' };

  it('reports behind, ahead, and dirty line counts after fetch', async () => {
    const execFile = createExecFile((joined) => {
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        return { stdout: 'origin/main\n', stderr: '' };
      }
      if (joined === 'rev-list --count HEAD..@{u}') {
        return { stdout: '3\n', stderr: '' };
      }
      if (joined === 'rev-list --count @{u}..HEAD') {
        return { stdout: '1\n', stderr: '' };
      }
      if (joined === 'diff --numstat HEAD') {
        return { stdout: '2\t1\ta.ts\n', stderr: '' };
      }
      if (joined === 'ls-files -o --exclude-standard') {
        return { stdout: '', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await checkOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result).toEqual({
      name: 'repo-1',
      path: '/repos/repo-1',
      branch: 'main',
      status: 'ok',
      remoteBehind: 3,
      localAhead: 1,
      dirtyLines: 3,
    });
    expect(execFile).toHaveBeenCalledWith('git', ['fetch', '--prune'], expect.any(Object));
  });

  it('reports zeros when clean and in sync', async () => {
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
      if (joined === 'rev-list --count @{u}..HEAD') {
        return { stdout: '0\n', stderr: '' };
      }
      if (joined === 'diff --numstat HEAD') {
        return { stdout: '', stderr: '' };
      }
      if (joined === 'ls-files -o --exclude-standard') {
        return { stdout: '', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await checkOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result).toEqual({
      name: 'repo-1',
      path: '/repos/repo-1',
      branch: 'main',
      status: 'ok',
      remoteBehind: 0,
      localAhead: 0,
      dirtyLines: 0,
    });
  });

  it('fails when the path does not exist', async () => {
    const result = await checkOne(entry, {
      accessPath: async () => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      },
      git: { execFile: vi.fn() },
    });

    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/path does not exist/);
  });

  it('fails when there is no upstream', async () => {
    const execFile = createExecFile((joined) => {
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref @{u}') {
        throw Object.assign(new Error('no upstream'), { stderr: 'fatal: no upstream' });
      }
      return { stdout: '', stderr: '' };
    });

    const result = await checkOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
    });

    expect(result).toMatchObject({
      name: 'repo-1',
      branch: 'main',
      status: 'failed',
      reason: 'current branch has no upstream',
    });
  });
});
