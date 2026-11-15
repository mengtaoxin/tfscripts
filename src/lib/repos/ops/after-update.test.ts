import { describe, expect, it, vi } from 'vitest';
import {
  formatAfterUpdateLogPath,
  runAfterUpdateCommands,
  shortErrorMessage,
  type AfterUpdateDeps,
} from './after-update.js';
import type { RepoEntry } from '../infra/config.js';
import type { ExecFileFn } from '../../git/exec.js';

function localEntry(overrides: Partial<RepoEntry> = {}): RepoEntry {
  return {
    name: 'foo',
    path: '/repos/foo',
    environment: 'local',
    afterUpdateCommands: ['npm install', 'npm run build'],
    ...overrides,
  };
}

function sshEntry(overrides: Partial<RepoEntry> = {}): RepoEntry {
  return {
    name: 'foo',
    path: '/remote/foo',
    environment: 'ssh',
    sshHost: 'devbox',
    afterUpdateCommands: ['npm install'],
    ...overrides,
  };
}

const failingInstall: ExecFileFn = async (_file, args) => {
  const command = args[1] ?? '';
  if (command === 'npm install') {
    const err = Object.assign(new Error('Command failed: npm install'), {
      code: 1,
      stdout: '',
      stderr: 'npm ERR! code ELIFECYCLE\nnpm ERR! errno 1\n',
    });
    throw err;
  }
  return { stdout: '', stderr: '' };
};

describe('shortErrorMessage', () => {
  it('takes the first non-empty line and truncates long text', () => {
    expect(shortErrorMessage('  \n  npm ERR! missing script\nmore')).toBe(
      'npm ERR! missing script',
    );
    const long = 'x'.repeat(100);
    expect(shortErrorMessage(long).length).toBe(80);
    expect(shortErrorMessage('')).toBe('command failed');
  });
});

describe('formatAfterUpdateLogPath', () => {
  it('joins tmpdir with timestamp-random.log', () => {
    expect(formatAfterUpdateLogPath('/tmp', '1700000000000', 'abc12')).toBe(
      '/tmp/1700000000000-abc12.log',
    );
  });
});

describe('runAfterUpdateCommands', () => {
  it('runs local commands sequentially with cwd and returns success', async () => {
    const calls: { file: string; args: readonly string[]; cwd?: string }[] = [];
    const execFile: ExecFileFn = async (file, args, options) => {
      calls.push({ file, args: [...args], cwd: options?.cwd });
      return { stdout: 'ok\n', stderr: '' };
    };

    const outcome = await runAfterUpdateCommands(localEntry(), {
      execFile,
    });

    expect(outcome).toEqual({ kind: 'success' });
    expect(calls).toEqual([
      { file: 'sh', args: ['-c', 'npm install'], cwd: '/repos/foo' },
      { file: 'sh', args: ['-c', 'npm run build'], cwd: '/repos/foo' },
    ]);
  });

  it('stops on first failure, writes a log, and returns a short message', async () => {
    const written: { path: string; data: string }[] = [];

    const outcome = await runAfterUpdateCommands(localEntry(), {
      execFile: failingInstall,
      tmpdir: () => '/tmp',
      now: () => new Date(1_700_000_000_000),
      randomBytes: () => Buffer.from([0, 1, 2, 3, 4]),
      writeFile: (path, data) => {
        written.push({ path, data });
      },
    });

    expect(outcome).toEqual({
      kind: 'failed',
      shortMessage: 'npm ERR! code ELIFECYCLE',
      logPath: '/tmp/1700000000000-abcde.log',
    });
    expect(written).toHaveLength(1);
    expect(written[0]?.path).toBe('/tmp/1700000000000-abcde.log');
    expect(written[0]?.data).toContain('$ npm install');
    expect(written[0]?.data).toContain('npm ERR! code ELIFECYCLE');
    expect(written[0]?.data).not.toContain('npm run build');
  });

  it('runs ssh commands via sh -c with cd into the remote path', async () => {
    const execFile = vi.fn<ExecFileFn>(async () => ({ stdout: '', stderr: '' }));

    const outcome = await runAfterUpdateCommands(sshEntry(), {
      execFile,
    } satisfies AfterUpdateDeps);

    expect(outcome).toEqual({ kind: 'success' });
    expect(execFile).toHaveBeenCalledTimes(1);
    const [file, args, options] = execFile.mock.calls[0]!;
    expect(file).toBe('ssh');
    expect(args).toContain('devbox');
    expect(args).toContain('--');
    const shIndex = args.indexOf("'sh'");
    expect(args[shIndex]).toBe("'sh'");
    expect(args[shIndex + 1]).toBe("'-c'");
    expect(args[shIndex + 2]).toBe("'cd -- '\\''/remote/foo'\\'' && npm install'");
    expect(options?.env).toMatchObject({
      SSH_ASKPASS_REQUIRE: 'never',
      GIT_TERMINAL_PROMPT: '0',
    });
  });

  it('returns failed when commands are empty after filtering is not applicable', async () => {
    const outcome = await runAfterUpdateCommands(localEntry({ afterUpdateCommands: undefined }), {
      execFile: async () => ({ stdout: '', stderr: '' }),
    });
    expect(outcome).toEqual({ kind: 'success' });
  });
});
