import { describe, expect, it, vi } from 'vitest';
import { checkOne } from './check-one.js';
import type { ExecFileFn } from './git.js';
import { REMOTE_OPERATION_THROTTLED_REASON } from './remote-operation-throttle.js';
import type { ReposState } from './state.js';

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
  const entry = { name: 'repo-1', path: '/repos/repo-1', environment: 'local' as const };

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

  it('counts recent commits when showCommitCountDays is set', async () => {
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
      if (joined === 'rev-list --count --since=7 days ago HEAD') {
        return { stdout: '4\n', stderr: '' };
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
      showCommitCountDays: 7,
    });

    expect(result).toEqual({
      name: 'repo-1',
      path: '/repos/repo-1',
      branch: 'main',
      status: 'ok',
      remoteBehind: 0,
      localAhead: 0,
      dirtyLines: 0,
      commitCount: 4,
    });
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

  it('reports SSH fingerprint failures as a per-repo failed row reason', async () => {
    const { SSH_FINGERPRINT_REASON } = await import('./ssh.js');
    const result = await checkOne(
      {
        name: 'remote-repo',
        path: '~/code/remote-repo',
        environment: 'ssh',
        sshHost: 'devbox',
      },
      {
        resolveRemoteHome: async () => {
          throw new Error(SSH_FINGERPRINT_REASON);
        },
      },
    );

    expect(result).toMatchObject({
      name: 'remote-repo',
      status: 'failed',
      reason: SSH_FINGERPRINT_REASON,
    });
  });

  it('fails as throttled without calling git when inside the cooldown window', async () => {
    let stored: ReposState = {
      '/repos/repo-1': { 'last-remote-operation-time': '2026-11-15T14:01:05.000Z' },
    };
    const writeFile = vi.fn((_path: string, data: string) => {
      stored = JSON.parse(data) as ReposState;
    });
    const execFile = vi.fn();
    const resolveRemoteHome = vi.fn();

    const result = await checkOne(entry, {
      git: { execFile },
      accessPath: async () => undefined,
      resolveRemoteHome,
      remoteOperationThrottlingSeconds: 10,
      statePath: '/tmp/repos-state.json',
      now: () => new Date('2026-11-15T14:01:10.000Z'),
      readStateFile: () => JSON.stringify(stored),
      writeStateFile: writeFile,
      mkdirState: () => undefined,
    });

    expect(result).toEqual({
      name: 'repo-1',
      path: '/repos/repo-1',
      branch: '',
      status: 'failed',
      remoteBehind: 0,
      localAhead: 0,
      dirtyLines: 0,
      reason: REMOTE_OPERATION_THROTTLED_REASON,
    });
    expect(execFile).not.toHaveBeenCalled();
    expect(resolveRemoteHome).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('stamps last-remote-operation-time before fetching when allowed', async () => {
    let stored: ReposState = {};
    const writeFile = vi.fn((_path: string, data: string) => {
      stored = JSON.parse(data) as ReposState;
    });
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
      remoteOperationThrottlingSeconds: 10,
      statePath: '/tmp/repos-state.json',
      now: () => new Date('2026-11-15T14:01:10.000Z'),
      readStateFile: () => JSON.stringify(stored),
      writeStateFile: writeFile,
      mkdirState: () => undefined,
    });

    expect(result.status).toBe('ok');
    expect(stored['/repos/repo-1']).toEqual({
      'last-remote-operation-time': '2026-11-15T14:01:10.000Z',
    });
    expect(execFile).toHaveBeenCalledWith('git', ['fetch', '--prune'], expect.any(Object));
  });
});
