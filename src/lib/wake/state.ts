import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export interface WakeState {
  pid: number;
  hours: number;
  screen: boolean;
  startedAt: string;
  endsAt: string;
}

export function defaultStatePath(home: string = homedir()): string {
  return join(home, '.tfscripts', 'wake', 'wake.json');
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isWakeState(value: unknown): value is WakeState {
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

export interface ReadActiveWakeStateDeps {
  statePath: string;
  readFile?: (path: string) => string;
  isAlive?: (pid: number) => boolean;
  removeFile?: (path: string) => void;
}

export function readActiveWakeState(deps: ReadActiveWakeStateDeps): WakeState | null {
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

  if (!isWakeState(parsed)) {
    removeFile(deps.statePath);
    return null;
  }

  if (!isAlive(parsed.pid)) {
    removeFile(deps.statePath);
    return null;
  }

  return parsed;
}

export interface WriteWakeStateDeps {
  statePath: string;
  state: WakeState;
  mkdir?: (path: string, options: { recursive: boolean }) => void;
  writeFile?: (path: string, data: string, encoding: 'utf8') => void;
}

export function writeWakeState(deps: WriteWakeStateDeps): void {
  const mkdir = deps.mkdir ?? ((path, options) => mkdirSync(path, options));
  const writeFile =
    deps.writeFile ?? ((path, data, encoding) => writeFileSync(path, data, encoding));

  mkdir(dirname(deps.statePath), { recursive: true });
  writeFile(deps.statePath, `${JSON.stringify(deps.state, null, 2)}\n`, 'utf8');
}

export interface ClearWakeStateDeps {
  statePath: string;
  removeFile?: (path: string) => void;
}

export function clearWakeState(deps: ClearWakeStateDeps): void {
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
