import { randomBytes as defaultRandomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir as osTmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultExecFile, type ExecFileFn } from '../../git/exec.js';
import type { RepoEntry } from '../infra/config.js';
import { createSshExecEnv, sshInvocationArgs } from '../infra/ssh.js';

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomAlphanumeric(
  length: number,
  randomBytes: (size: number) => Buffer = defaultRandomBytes,
): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i] ?? 0;
    result += ALPHANUMERIC[byte % ALPHANUMERIC.length];
  }
  return result;
}

export const AFTER_UPDATE_SHORT_MESSAGE_MAX = 80;

export type AfterUpdateOutcome =
  | { kind: 'success' }
  | { kind: 'failed'; shortMessage: string; logPath: string };

export interface AfterUpdateDeps {
  execFile?: ExecFileFn;
  writeFile?: (path: string, data: string) => void;
  tmpdir?: () => string;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
}

export function shortErrorMessage(
  output: string,
  maxLength: number = AFTER_UPDATE_SHORT_MESSAGE_MAX,
): string {
  const line =
    output
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find((part) => part.length > 0) ?? 'command failed';
  if (line.length <= maxLength) {
    return line;
  }
  return line.slice(0, maxLength);
}

export function formatAfterUpdateLogPath(
  directory: string,
  timestamp: string,
  randomStr: string,
): string {
  return join(directory, `${timestamp}-${randomStr}.log`);
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function extractOutput(error: unknown): { stdout: string; stderr: string; message: string } {
  if (error && typeof error === 'object') {
    const record = error as {
      stdout?: unknown;
      stderr?: unknown;
      message?: unknown;
    };
    return {
      stdout: typeof record.stdout === 'string' ? record.stdout : '',
      stderr: typeof record.stderr === 'string' ? record.stderr : '',
      message: typeof record.message === 'string' ? record.message : String(error),
    };
  }
  return { stdout: '', stderr: '', message: String(error) };
}

function combineCommandLog(
  command: string,
  stdout: string,
  stderr: string,
  message: string,
): string {
  const parts = [`$ ${command}`];
  if (stdout.trim() !== '') {
    parts.push(stdout.replace(/\s+$/, ''));
  }
  if (stderr.trim() !== '') {
    parts.push(stderr.replace(/\s+$/, ''));
  }
  if (stdout.trim() === '' && stderr.trim() === '' && message.trim() !== '') {
    parts.push(message.trim());
  }
  return `${parts.join('\n')}\n`;
}

async function runOneCommand(
  entry: RepoEntry,
  command: string,
  execFile: ExecFileFn,
): Promise<{ stdout: string; stderr: string }> {
  if (entry.environment === 'ssh') {
    const host = entry.sshHost;
    if (host === undefined || host === '') {
      throw new Error('ssh-host is required for after-update-commands on ssh repos');
    }
    const script = `cd -- ${shellSingleQuote(entry.path)} && ${command}`;
    return execFile('ssh', sshInvocationArgs(host, ['sh', '-c', script]), {
      env: createSshExecEnv(),
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  return execFile('sh', ['-c', command], {
    cwd: entry.path,
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function runAfterUpdateCommands(
  entry: RepoEntry,
  deps: AfterUpdateDeps = {},
): Promise<AfterUpdateOutcome> {
  const commands = entry.afterUpdateCommands ?? [];
  if (commands.length === 0) {
    return { kind: 'success' };
  }

  const execFile = deps.execFile ?? defaultExecFile;
  const writeFile = deps.writeFile ?? ((path, data) => writeFileSync(path, data, 'utf8'));
  const tmpdir = deps.tmpdir ?? osTmpdir;
  const now = deps.now ?? (() => new Date());
  const logChunks: string[] = [];

  const runNext = async (index: number): Promise<AfterUpdateOutcome> => {
    if (index >= commands.length) {
      return { kind: 'success' };
    }
    const command = commands[index]!;
    try {
      const { stdout, stderr } = await runOneCommand(entry, command, execFile);
      if (stdout.trim() !== '' || stderr.trim() !== '') {
        logChunks.push(combineCommandLog(command, stdout, stderr, ''));
      }
      return runNext(index + 1);
    } catch (error) {
      const { stdout, stderr, message } = extractOutput(error);
      logChunks.push(combineCommandLog(command, stdout, stderr, message));
      const combined = logChunks.join('\n');
      const timestamp = String(now().getTime());
      const randomStr = randomAlphanumeric(5, deps.randomBytes);
      const logPath = formatAfterUpdateLogPath(tmpdir(), timestamp, randomStr);
      writeFile(logPath, combined);
      return {
        kind: 'failed',
        shortMessage: shortErrorMessage(`${stderr}\n${stdout}\n${message}`),
        logPath,
      };
    }
  };

  return runNext(0);
}
