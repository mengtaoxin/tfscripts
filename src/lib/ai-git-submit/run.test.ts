import { describe, expect, it, vi } from 'vitest';
import type { AiGitSubmitConfig } from './config.js';
import { runSubmit } from './run.js';

const baseConfig: AiGitSubmitConfig = {
  apiKey: 'key',
  baseUrl: 'https://api.example.com/v1',
  model: 'gpt-test',
  maxInputTokens: 8000,
  maxOutputTokens: 1024,
  maxRetries: 2,
  retryBaseMs: 10,
};

function createGitMock(options?: { stagedDiff?: string }) {
  const stagedDiff = options?.stagedDiff ?? 'diff --git a/a.ts\n+line\n';
  const execFile = vi.fn(async (_file: string, args: readonly string[]) => {
    const joined = args.join(' ');
    if (joined === 'rev-parse --show-toplevel') {
      return { stdout: '/repo\n', stderr: '' };
    }
    if (joined === 'rev-parse --abbrev-ref HEAD') {
      return { stdout: 'main\n', stderr: '' };
    }
    if (joined === 'diff --cached') {
      return { stdout: stagedDiff, stderr: '' };
    }
    if (joined === 'diff --cached --stat') {
      return { stdout: ' a.ts | 1 +\n', stderr: '' };
    }
    if (joined === 'add .') {
      return { stdout: '', stderr: '' };
    }
    if (joined === 'push') {
      return { stdout: '', stderr: '' };
    }
    return { stdout: '', stderr: '' };
  });
  const execFileWithStdin = vi.fn().mockResolvedValue(undefined);
  return { execFile, execFileWithStdin, cwd: '/repo' };
}

describe('runSubmit', () => {
  it('fails when there are no staged changes', async () => {
    const git = createGitMock({ stagedDiff: '' });
    const error = vi.fn();

    const result = await runSubmit(
      { add: false, push: false },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: vi.fn(),
        log: vi.fn(),
        error,
        sleep: vi.fn(),
      },
    );

    expect(result.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith('No staged changes to commit.');
  });

  it('runs git add when requested, commits, and skips push by default', async () => {
    const git = createGitMock();
    const generate = vi.fn().mockResolvedValue('feat: add thing');
    const log = vi.fn();

    const result = await runSubmit(
      { add: true, push: false },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: generate,
        log,
        error: vi.fn(),
        sleep: vi.fn(),
      },
    );

    expect(result).toEqual({ exitCode: 0, commitMessage: 'feat: add thing' });
    expect(git.execFile).toHaveBeenCalledWith('git', ['add', '.'], expect.any(Object));
    expect(git.execFileWithStdin).toHaveBeenCalledWith(
      'git',
      ['commit', '-F', '-'],
      'feat: add thing',
      expect.any(Object),
    );
    expect(git.execFile).not.toHaveBeenCalledWith('git', ['push'], expect.any(Object));
  });

  it('retries push with exponential backoff then succeeds', async () => {
    const git = createGitMock();
    let pushCalls = 0;
    git.execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'rev-parse --show-toplevel') {
        return { stdout: '/repo\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (joined === 'diff --cached') {
        return { stdout: 'diff --git a/a.ts\n+line\n', stderr: '' };
      }
      if (joined === 'diff --cached --stat') {
        return { stdout: ' a.ts | 1 +\n', stderr: '' };
      }
      if (joined === 'push') {
        pushCalls += 1;
        if (pushCalls < 2) {
          throw new Error('network');
        }
        return { stdout: '', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const sleep = vi.fn().mockResolvedValue(undefined);
    const log = vi.fn();

    const result = await runSubmit(
      { add: false, push: true },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: vi.fn().mockResolvedValue('fix: bug'),
        log,
        error: vi.fn(),
        sleep,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(pushCalls).toBe(2);
    expect(sleep).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('git push failed'));
  });

  it('retries LLM generation on failure', async () => {
    const git = createGitMock();
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('chore: retry worked');
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await runSubmit(
      { add: false, push: false },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: generate,
        log: vi.fn(),
        error: vi.fn(),
        sleep,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalled();
  });
});
