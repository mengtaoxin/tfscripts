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

function createGitMock(options?: { stagedDiff?: string; branch?: string }) {
  const stagedDiff = options?.stagedDiff ?? 'diff --git a/a.ts\n+line\n';
  const branch = options?.branch ?? 'main';
  const execFile = vi.fn(async (_file: string, args: readonly string[]) => {
    const joined = args.join(' ');
    if (joined === 'rev-parse --show-toplevel') {
      return { stdout: '/repo\n', stderr: '' };
    }
    if (joined === 'rev-parse --abbrev-ref HEAD') {
      return { stdout: `${branch}\n`, stderr: '' };
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
    if (joined.startsWith('checkout -b ')) {
      return { stdout: '', stderr: '' };
    }
    if (joined === 'push' || joined === 'push -u origin HEAD') {
      return { stdout: '', stderr: '' };
    }
    return { stdout: '', stderr: '' };
  });
  const execFileWithStdin = vi.fn().mockResolvedValue(undefined);
  return { execFile, execFileWithStdin, cwd: '/repo' };
}

const fixedNow = () => new Date(2026, 10, 15, 15, 30, 45);
const fixedRandomBytes = () => Buffer.from([0, 10, 25, 26, 27]);

describe('runSubmit', () => {
  it('fails when not inside a git repository', async () => {
    const execFile = vi.fn().mockRejectedValue(new Error('fatal: not a git repository'));
    const error = vi.fn();

    const result = await runSubmit(
      { add: false, push: false, protectMain: false },
      {
        git: { execFile },
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: vi.fn(),
        log: vi.fn(),
        error,
        sleep: vi.fn(),
      },
    );

    expect(result.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith('Not a git repository (or any of the parent directories).');
  });

  it('fails when there are no staged changes', async () => {
    const git = createGitMock({ stagedDiff: '' });
    const error = vi.fn();

    const result = await runSubmit(
      { add: false, push: false, protectMain: false },
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
      { add: true, push: false, protectMain: false },
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

  it('on main with protectMain creates a feature branch then commits', async () => {
    const git = createGitMock({ branch: 'main' });
    const generate = vi.fn().mockResolvedValue('feat: protected');

    const result = await runSubmit(
      { add: false, push: false, protectMain: true },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: generate,
        log: vi.fn(),
        error: vi.fn(),
        sleep: vi.fn(),
        now: fixedNow,
        randomBytes: fixedRandomBytes,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(git.execFile).toHaveBeenCalledWith(
      'git',
      ['checkout', '-b', 'feature/20261115-153045-akz01'],
      expect.any(Object),
    );
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ branchName: 'feature/20261115-153045-akz01' }),
      baseConfig,
      undefined,
    );
  });

  it('on main with protectMain and push uses push -u origin HEAD', async () => {
    const git = createGitMock({ branch: 'master' });

    const result = await runSubmit(
      { add: false, push: true, protectMain: true },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: vi.fn().mockResolvedValue('feat: push feature'),
        log: vi.fn(),
        error: vi.fn(),
        sleep: vi.fn(),
        now: fixedNow,
        randomBytes: fixedRandomBytes,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(git.execFile).toHaveBeenCalledWith(
      'git',
      ['push', '-u', 'origin', 'HEAD'],
      expect.any(Object),
    );
    expect(git.execFile).not.toHaveBeenCalledWith('git', ['push'], expect.any(Object));
  });

  it('does not create a feature branch when protectMain is false on main', async () => {
    const git = createGitMock({ branch: 'main' });

    const result = await runSubmit(
      { add: false, push: true, protectMain: false },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: vi.fn().mockResolvedValue('feat: direct'),
        log: vi.fn(),
        error: vi.fn(),
        sleep: vi.fn(),
      },
    );

    expect(result.exitCode).toBe(0);
    expect(git.execFile).not.toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['checkout', '-b']),
      expect.any(Object),
    );
    expect(git.execFile).toHaveBeenCalledWith('git', ['push'], expect.any(Object));
  });

  it('does not create a feature branch when already on a feature branch', async () => {
    const git = createGitMock({ branch: 'feature/existing' });
    const generate = vi.fn().mockResolvedValue('feat: keep');

    const result = await runSubmit(
      { add: false, push: false, protectMain: true },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: generate,
        log: vi.fn(),
        error: vi.fn(),
        sleep: vi.fn(),
      },
    );

    expect(result.exitCode).toBe(0);
    expect(git.execFile).not.toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['checkout', '-b']),
      expect.any(Object),
    );
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ branchName: 'feature/existing' }),
      baseConfig,
      undefined,
    );
  });

  it('retries push on network errors with exponential backoff then succeeds', async () => {
    const git = createGitMock({ branch: 'feature/x' });
    let pushCalls = 0;
    git.execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'rev-parse --show-toplevel') {
        return { stdout: '/repo\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'feature/x\n', stderr: '' };
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
          throw Object.assign(new Error('Could not resolve host'), { code: 'ENOTFOUND' });
        }
        return { stdout: '', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const sleep = vi.fn().mockResolvedValue(undefined);
    const log = vi.fn();

    const result = await runSubmit(
      { add: false, push: true, protectMain: true },
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

  it('does not retry git push on remote reject', async () => {
    const git = createGitMock({ branch: 'feature/x' });
    let pushCalls = 0;
    git.execFile = vi.fn(async (_file: string, args: readonly string[]) => {
      const joined = args.join(' ');
      if (joined === 'rev-parse --show-toplevel') {
        return { stdout: '/repo\n', stderr: '' };
      }
      if (joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'feature/x\n', stderr: '' };
      }
      if (joined === 'diff --cached') {
        return { stdout: 'diff --git a/a.ts\n+line\n', stderr: '' };
      }
      if (joined === 'diff --cached --stat') {
        return { stdout: ' a.ts | 1 +\n', stderr: '' };
      }
      if (joined === 'push') {
        pushCalls += 1;
        throw new Error('[rejected] main -> main (non-fast-forward)');
      }
      return { stdout: '', stderr: '' };
    });

    const sleep = vi.fn().mockResolvedValue(undefined);
    const error = vi.fn();

    const result = await runSubmit(
      { add: false, push: true, protectMain: false },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: vi.fn().mockResolvedValue('fix: bug'),
        log: vi.fn(),
        error,
        sleep,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(pushCalls).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('non-fast-forward'));
  });

  it('retries LLM generation on network failure', async () => {
    const git = createGitMock({ branch: 'feature/x' });
    const generate = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new TypeError('fetch failed'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce('chore: retry worked');
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await runSubmit(
      { add: false, push: false, protectMain: true },
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

  it('does not retry LLM generation on non-network API errors', async () => {
    const git = createGitMock({ branch: 'feature/x' });
    const generate = vi
      .fn()
      .mockRejectedValue(new Error('LLM request failed with status 402: insufficient balance'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const error = vi.fn();

    const result = await runSubmit(
      { add: false, push: false, protectMain: true },
      {
        git,
        resolveConfigFn: () => baseConfig,
        generateCommitMessageFn: generate,
        log: vi.fn(),
        error,
        sleep,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('status 402'));
  });
});
