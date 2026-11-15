import { describe, expect, it, vi } from 'vitest';
import {
  SSH_FINGERPRINT_REASON,
  classifySshFailureReason,
  createSshAccessPath,
  createSshGitDeps,
  createSshExecEnv,
  resolveRemoteHome,
  sshInvocationArgs,
} from './ssh.js';
import type { ExecFileFn } from '../../git/exec.js';

describe('ssh helpers', () => {
  it('builds BatchMode key-only ssh args without accepting new host keys', () => {
    expect(sshInvocationArgs('devbox', ['git', '-C', '/repos/a', 'status'])).toEqual([
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=yes',
      '-o',
      'PasswordAuthentication=no',
      '-o',
      'KbdInteractiveAuthentication=no',
      '-o',
      'PreferredAuthentications=publickey',
      '-o',
      'NumberOfPasswordPrompts=0',
      'devbox',
      '--',
      "'git'",
      "'-C'",
      "'/repos/a'",
      "'status'",
    ]);
  });

  it('shell-quotes remote args so spaces and embedded quotes survive SSH join', () => {
    expect(
      sshInvocationArgs('devbox', [
        'git',
        '-C',
        '/repos/a',
        'rev-list',
        '--count',
        '--since=7 days ago',
        'HEAD',
      ]),
    ).toEqual([
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=yes',
      '-o',
      'PasswordAuthentication=no',
      '-o',
      'KbdInteractiveAuthentication=no',
      '-o',
      'PreferredAuthentications=publickey',
      '-o',
      'NumberOfPasswordPrompts=0',
      'devbox',
      '--',
      "'git'",
      "'-C'",
      "'/repos/a'",
      "'rev-list'",
      "'--count'",
      "'--since=7 days ago'",
      "'HEAD'",
    ]);
    expect(sshInvocationArgs('devbox', ["it's", 'ok'])).toEqual([
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=yes',
      '-o',
      'PasswordAuthentication=no',
      '-o',
      'KbdInteractiveAuthentication=no',
      '-o',
      'PreferredAuthentications=publickey',
      '-o',
      'NumberOfPasswordPrompts=0',
      'devbox',
      '--',
      "'it'\\''s'",
      "'ok'",
    ]);
  });

  it('sets env so SSH never prompts for a password', () => {
    expect(createSshExecEnv({ DISPLAY: ':0', SSH_ASKPASS: '/bin/askpass' })).toMatchObject({
      SSH_ASKPASS_REQUIRE: 'never',
      GIT_TERMINAL_PROMPT: '0',
    });
  });

  it('classifies fingerprint verification failures', () => {
    expect(
      classifySshFailureReason(
        Object.assign(new Error('ssh failed'), {
          stderr: 'Host key verification failed.\r\n',
        }),
      ),
    ).toBe(SSH_FINGERPRINT_REASON);
    expect(
      classifySshFailureReason(
        Object.assign(new Error('ssh failed'), {
          stderr: 'WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!\n',
        }),
      ),
    ).toBe(SSH_FINGERPRINT_REASON);
  });

  it('classifies key auth failures without treating them as fingerprint issues', () => {
    expect(
      classifySshFailureReason(
        Object.assign(new Error('ssh failed'), {
          stderr: 'devbox: Permission denied (publickey).\n',
        }),
      ),
    ).toBe('SSH authentication failed (key-based login required)');
  });

  it('runs git over ssh with -C remote path and no local cwd', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'main\n', stderr: '' });
    const git = createSshGitDeps('devbox', { execFile: execFile as ExecFileFn });

    await git.execFile!('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: '/remote/repo' });

    expect(execFile).toHaveBeenCalledWith(
      'ssh',
      sshInvocationArgs('devbox', [
        'git',
        '-C',
        '/remote/repo',
        'rev-parse',
        '--abbrev-ref',
        'HEAD',
      ]),
      expect.objectContaining({
        env: expect.objectContaining({ SSH_ASKPASS_REQUIRE: 'never' }),
      }),
    );
    const options = execFile.mock.calls[0]?.[2] as { cwd?: string };
    expect(options.cwd).toBeUndefined();
  });

  it('runs git commit over ssh with stdin for -F -', async () => {
    const execFileWithStdin = vi.fn().mockResolvedValue(undefined);
    const git = createSshGitDeps('devbox', { execFileWithStdin });

    await git.execFileWithStdin!('git', ['commit', '-F', '-'], 'feat: hello\n', {
      cwd: '/remote/repo',
    });

    expect(execFileWithStdin).toHaveBeenCalledWith(
      'ssh',
      sshInvocationArgs('devbox', ['git', '-C', '/remote/repo', 'commit', '-F', '-']),
      'feat: hello\n',
      expect.objectContaining({
        env: expect.objectContaining({ SSH_ASKPASS_REQUIRE: 'never' }),
      }),
    );
    const options = execFileWithStdin.mock.calls[0]?.[3] as { cwd?: string };
    expect(options.cwd).toBeUndefined();
  });

  it('maps fingerprint errors from git-over-ssh into a stable reason', async () => {
    const execFile = vi.fn().mockRejectedValue(
      Object.assign(new Error('ssh failed'), {
        stderr: 'Host key verification failed.\n',
      }),
    );
    const git = createSshGitDeps('devbox', { execFile: execFile as ExecFileFn });

    await expect(git.execFile!('git', ['status'], { cwd: '/remote/repo' })).rejects.toThrow(
      SSH_FINGERPRINT_REASON,
    );
  });

  it('checks remote paths with test -e over ssh', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const accessPath = createSshAccessPath('devbox', { execFile: execFile as ExecFileFn });

    await accessPath('/remote/repo');

    expect(execFile).toHaveBeenCalledWith(
      'ssh',
      sshInvocationArgs('devbox', ['test', '-e', '/remote/repo']),
      expect.objectContaining({
        env: expect.objectContaining({ SSH_ASKPASS_REQUIRE: 'never' }),
      }),
    );
  });

  it('resolves remote HOME over ssh', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '/home/me\n', stderr: '' });
    await expect(resolveRemoteHome('devbox', { execFile: execFile as ExecFileFn })).resolves.toBe(
      '/home/me',
    );
    expect(execFile).toHaveBeenCalledWith(
      'ssh',
      sshInvocationArgs('devbox', ['printenv', 'HOME']),
      expect.any(Object),
    );
  });

  it('reads remote files with cat over ssh', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: 'line1\nline2\n', stderr: '' });
    const git = createSshGitDeps('devbox', { execFile: execFile as ExecFileFn });

    await expect(git.readFile!('/remote/repo/a.txt')).resolves.toBe('line1\nline2\n');
    expect(execFile).toHaveBeenCalledWith(
      'ssh',
      sshInvocationArgs('devbox', ['cat', '--', '/remote/repo/a.txt']),
      expect.any(Object),
    );
  });
});
