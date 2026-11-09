import { spawn, type ChildProcess } from 'node:child_process';
import { constants } from 'node:os';
import {
  ConfigError,
  defaultSettingsPath,
  resolveOpenPath,
  type LoadSettingsDeps,
} from './config.js';

export interface OpenOptions {
  path: string;
  reuseWindow: boolean;
}

export function buildCodeArgs(resolvedPath: string, reuseWindow: boolean): string[] {
  return [reuseWindow ? '-r' : '-n', resolvedPath];
}

interface CodeChild {
  once(event: 'error', listener: (error: Error) => void): void;
  once(
    event: 'close',
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): void;
}

export type CodeSpawn = (
  command: string,
  args: readonly string[],
  options: { stdio: 'inherit' },
) => CodeChild;

export function defaultCodeSpawn(
  command: string,
  args: readonly string[],
  options: { stdio: 'inherit' },
): ChildProcess {
  return spawn(command, [...args], options);
}

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

function runCodeCommand(
  args: readonly string[],
  spawnFn: CodeSpawn,
): Promise<{ exitCode: number; spawnError?: Error }> {
  return new Promise((resolve) => {
    const child = spawnFn('code', args, { stdio: 'inherit' });
    let settled = false;
    const finish = (result: { exitCode: number; spawnError?: Error }) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    child.once('error', (error) => {
      finish({ exitCode: 1, spawnError: error });
    });
    child.once('close', (code, signal) => {
      finish({ exitCode: exitCodeFromClose(code, signal) });
    });
  });
}

export interface RunOpenDeps {
  home?: string;
  settingsPath?: string;
  readFile?: (path: string) => string;
  spawn?: CodeSpawn;
  error?: (message: string) => void;
}

export interface RunOpenResult {
  exitCode: number;
}

export async function runOpen(
  options: OpenOptions,
  deps: RunOpenDeps = {},
): Promise<RunOpenResult> {
  const error = deps.error ?? ((message) => console.error(message));
  const settingsPath = deps.settingsPath ?? defaultSettingsPath(deps.home);
  const loadDeps: LoadSettingsDeps = {
    settingsPath,
    home: deps.home,
    readFile: deps.readFile,
  };

  let resolvedPath: string;
  try {
    resolvedPath = resolveOpenPath(options.path, loadDeps);
  } catch (err) {
    error(err instanceof ConfigError || err instanceof Error ? err.message : String(err));
    return { exitCode: 1 };
  }

  const args = buildCodeArgs(resolvedPath, options.reuseWindow);
  const spawnFn = deps.spawn ?? defaultCodeSpawn;
  const result = await runCodeCommand(args, spawnFn);

  if (result.spawnError !== undefined) {
    const code =
      result.spawnError && typeof result.spawnError === 'object' && 'code' in result.spawnError
        ? (result.spawnError as NodeJS.ErrnoException).code
        : undefined;
    if (code === 'ENOENT') {
      error('code CLI not found on PATH. Install VS Code and enable the shell command "code".');
    } else {
      error(result.spawnError.message);
    }
    return { exitCode: 1 };
  }

  return { exitCode: result.exitCode };
}
