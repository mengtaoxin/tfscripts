import { describe, expect, it, vi } from 'vitest';
import { resolveRepoTarget } from './repo-target.js';
import { sshInvocationArgs } from './ssh.js';
import type { ExecFileFn } from '../../git/exec.js';

describe('resolveRepoTarget', () => {
  it('keeps local repos on the local filesystem', async () => {
    const accessPath = vi.fn().mockResolvedValue(undefined);
    const resolved = await resolveRepoTarget(
      { name: 'app', path: '/local/app', environment: 'local' },
      { accessPath },
    );

    expect(resolved.entry.path).toBe('/local/app');
    expect(resolved.git.cwd).toBe('/local/app');
    await resolved.accessPath('/local/app');
    expect(accessPath).toHaveBeenCalledWith('/local/app');
  });

  it('expands ~ against remote HOME and builds ssh git deps', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const resolved = await resolveRepoTarget(
      {
        name: 'foo',
        path: '~/code/foo',
        environment: 'ssh',
        sshHost: 'devbox',
      },
      {
        execFile: execFile as ExecFileFn,
        resolveRemoteHome: async () => '/home/me',
      },
    );

    expect(resolved.entry.path).toBe('/home/me/code/foo');
    expect(resolved.git.cwd).toBe('/home/me/code/foo');

    await resolved.git.execFile!('git', ['status'], { cwd: resolved.entry.path });
    expect(execFile).toHaveBeenCalledWith(
      'ssh',
      sshInvocationArgs('devbox', ['git', '-C', '/home/me/code/foo', 'status']),
      expect.any(Object),
    );
  });
});
