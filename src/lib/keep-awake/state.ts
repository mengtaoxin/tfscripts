import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export interface KeepAwakeState {
  pid: number;
  hours: number;
  screen: boolean;
  startedAt: string;
  endsAt: string;
}

export function defaultStatePath(home: string = homedir()): string {
  return join(home, '.tfscripts', 'keep-awake', 'keep-awake.json');
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isKeepAwakeState(value: unknown): value is KeepAwakeState {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.pid === 'number' &&
    typeof record.hours === 'number' &&
    typeof record.screen === 'boolean' &&
    typeof record.startedAt === 'string' &&
    typeof record.endsAt === 'string'
  );
}

export interface ReadActiveKeepAwakeStateDeps {
  statePath: string;
  readFile?: (path: string) => string;
  isAlive?: (pid: number) => boolean;
  removeFile?: (path: string) => void;
}

export function readActiveKeepAwakeState(
  deps: ReadActiveKeepAwakeStateDeps,
): KeepAwakeState | null {
  const readFile = deps.readFile ?? ((path) => readFileSync(path, 'utf8'));
  const isAlive = deps.isAlive ?? isProcessAlive;
  const removeFile =
    deps.removeFile ??
    ((path) => {
      try {
        unlinkSync(path);
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          return;
        }
        throw error;
      }
    });

  let raw: string;
  try {
    raw = readFile(deps.statePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeFile(deps.statePath);
    return null;
  }

  if (!isKeepAwakeState(parsed)) {
    removeFile(deps.statePath);
    return null;
  }

  if (!isAlive(parsed.pid)) {
    removeFile(deps.statePath);
    return null;
  }

  return parsed;
}

export interface WriteKeepAwakeStateDeps {
  statePath: string;
  state: KeepAwakeState;
  mkdir?: (path: string, options: { recursive: boolean }) => void;
  writeFile?: (path: string, data: string, encoding: 'utf8') => void;
}

export function writeKeepAwakeState(deps: WriteKeepAwakeStateDeps): void {
  const mkdir = deps.mkdir ?? ((path, options) => mkdirSync(path, options));
  const writeFile =
    deps.writeFile ?? ((path, data, encoding) => writeFileSync(path, data, encoding));

  mkdir(dirname(deps.statePath), { recursive: true });
  writeFile(deps.statePath, `${JSON.stringify(deps.state, null, 2)}\n`, 'utf8');
}

export interface ClearKeepAwakeStateDeps {
  statePath: string;
  removeFile?: (path: string) => void;
}

export function clearKeepAwakeState(deps: ClearKeepAwakeStateDeps): void {
  const removeFile =
    deps.removeFile ??
    ((path) => {
      try {
        unlinkSync(path);
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          return;
        }
        throw error;
      }
    });

  removeFile(deps.statePath);
}
