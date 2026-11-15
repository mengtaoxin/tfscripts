import { describe, expect, it, vi } from 'vitest';
import { submitOne } from './submit-one.js';
import type { RepoEntry } from './config.js';

describe('submitOne', () => {
  it('runs executeSubmit with local cwd and parsed parameters', async () => {
    const executeSubmitFn = vi.fn().mockResolvedValue(0);
    const entry: RepoEntry = {
      path: '/local/tfscripts',
      name: 'tfscripts',
      environment: 'local',
      aiGitSubmitParameters: ['--add yes', '--push yes'],
    };

    const exitCode = await submitOne(entry, {
      accessPath: async () => undefined,
      executeSubmitFn,
      error: vi.fn(),
    });

    expect(exitCode).toBe(0);
    expect(executeSubmitFn).toHaveBeenCalledWith(
      { add: true, push: true, noInput: true },
      expect.objectContaining({
        git: expect.objectContaining({ cwd: '/local/tfscripts' }),
        isTTY: false,
      }),
    );
  });

  it('runs executeSubmit with SSH git deps for remote entries', async () => {
    const executeSubmitFn = vi.fn().mockResolvedValue(0);
    const execFile = vi.fn();
    const execFileWithStdin = vi.fn();
    const entry: RepoEntry = {
      path: '~/repos/tfscripts',
      name: 'tfscripts',
      environment: 'ssh',
      sshHost: 'dev-server-1',
      aiGitSubmitParameters: ['--add yes'],
    };

    const exitCode = await submitOne(entry, {
      resolveRemoteHome: async () => '/home/me',
      accessPath: async () => undefined,
      git: { execFile, execFileWithStdin },
      executeSubmitFn,
      error: vi.fn(),
    });

    expect(exitCode).toBe(0);
    expect(executeSubmitFn).toHaveBeenCalledWith(
      { add: true, push: undefined, noInput: true },
      expect.objectContaining({
        git: expect.objectContaining({
          cwd: '/home/me/repos/tfscripts',
          execFile,
          execFileWithStdin,
        }),
      }),
    );
  });

  it('returns usage exit when ai-git-submit-parameters are invalid', async () => {
    const error = vi.fn();
    const executeSubmitFn = vi.fn();
    const entry: RepoEntry = {
      path: '/local/app',
      name: 'app',
      environment: 'local',
      aiGitSubmitParameters: ['--bogus'],
    };

    const exitCode = await submitOne(entry, {
      executeSubmitFn,
      error,
    });

    expect(exitCode).toBe(2);
    expect(executeSubmitFn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'Unknown option "--bogus". Run "ai-git-submit help" for usage.',
    );
  });

  it('fails when the repo path does not exist', async () => {
    const error = vi.fn();
    const executeSubmitFn = vi.fn();
    const entry: RepoEntry = {
      path: '/missing',
      name: 'missing',
      environment: 'local',
    };

    const exitCode = await submitOne(entry, {
      accessPath: async () => {
        throw new Error('ENOENT');
      },
      executeSubmitFn,
      error,
    });

    expect(exitCode).toBe(1);
    expect(executeSubmitFn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('path does not exist: /missing');
  });
});
