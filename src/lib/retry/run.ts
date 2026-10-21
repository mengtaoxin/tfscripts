import { spawn, type ChildProcess } from 'node:child_process';
import { constants } from 'node:os';

export interface RetryNotice {
  attempt: number;
  exitCode: number;
  delaySeconds: number;
}

export interface RunRetryOptions {
  command: string;
  times: number;
  intervalSeconds: number;
  run: (command: string) => Promise<number>;
  sleep: (ms: number) => Promise<void>;
  onRetry?: (info: RetryNotice) => void;
}

export async function runRetry(options: RunRetryOptions): Promise<number> {
  const attemptOnce = async (attempt: number): Promise<number> => {
    const exitCode = await options.run(options.command);
    if (exitCode === 0 || attempt >= options.times) {
      return exitCode;
    }
    options.onRetry?.({
      attempt,
      exitCode,
      delaySeconds: options.intervalSeconds,
    });
    await options.sleep(options.intervalSeconds * 1000);
    return attemptOnce(attempt + 1);
  };

  return attemptOnce(1);
}

export function formatRetryNotice(info: RetryNotice): string {
  return `Attempt ${info.attempt} failed with exit code ${info.exitCode}. Retrying in ${info.delaySeconds}s.`;
}

interface ShellChild {
  once(event: 'error', listener: (error: Error) => void): void;
  once(
    event: 'close',
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): void;
}

export type ShellSpawn = (
  command: string,
  args: readonly string[],
  options: { stdio: 'inherit' },
) => ShellChild;

function exitCodeFromClose(code: number | null, signal: NodeJS.Signals | null): number {
  if (code !== null) {
    return code;
  }
  if (signal !== null) {
    const signalNumber = constants.signals[signal];
    if (typeof signalNumber === 'number') {
      return 128 + signalNumber;
    }
  }
  return 1;
}

export function defaultShellSpawn(
  command: string,
  args: readonly string[],
  options: { stdio: 'inherit' },
): ChildProcess {
  return spawn(command, [...args], options);
}

export function runShellCommand(
  command: string,
  spawnFn: ShellSpawn = defaultShellSpawn,
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawnFn('sh', ['-c', command], { stdio: 'inherit' });
    let settled = false;
    const finish = (code: number) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(code);
    };

    child.once('error', () => {
      finish(1);
    });
    child.once('close', (code, signal) => {
      finish(exitCodeFromClose(code, signal));
    });
  });
}
