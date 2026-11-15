import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { RepoEntry } from './config.js';

export const LAST_REMOTE_OPERATION_TIME_KEY = 'last-remote-operation-time';

export interface RepoRemoteState {
  readonly [LAST_REMOTE_OPERATION_TIME_KEY]: string;
}

export type ReposState = Readonly<Record<string, RepoRemoteState>>;

export function defaultStatePath(home: string = homedir()): string {
  return join(home, '.tfscripts', 'repos', 'state.json');
}

export function repoStateKey(entry: RepoEntry): string {
  if (entry.environment === 'ssh' && entry.sshHost !== undefined) {
    return `${entry.sshHost}:${entry.path}`;
  }
  return entry.path;
}

function isRepoRemoteState(value: unknown): value is RepoRemoteState {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record[LAST_REMOTE_OPERATION_TIME_KEY] === 'string';
}

export interface ReadReposStateDeps {
  statePath: string;
  readFile?: (path: string) => string;
}

export function readReposState(deps: ReadReposStateDeps): ReposState {
  const readFile = deps.readFile ?? ((path) => readFileSync(path, 'utf8'));

  let raw: string;
  try {
    raw = readFile(deps.statePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return {};
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  const result: Record<string, RepoRemoteState> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (isRepoRemoteState(value)) {
      result[key] = { [LAST_REMOTE_OPERATION_TIME_KEY]: value[LAST_REMOTE_OPERATION_TIME_KEY] };
    }
  }
  return result;
}

export interface WriteReposStateDeps {
  statePath: string;
  state: ReposState;
  mkdir?: (path: string, options: { recursive: boolean }) => void;
  writeFile?: (path: string, data: string, encoding: 'utf8') => void;
}

export function writeReposState(deps: WriteReposStateDeps): void {
  const mkdir = deps.mkdir ?? ((path, options) => mkdirSync(path, options));
  const writeFile =
    deps.writeFile ?? ((path, data, encoding) => writeFileSync(path, data, encoding));

  mkdir(dirname(deps.statePath), { recursive: true });
  writeFile(deps.statePath, `${JSON.stringify(deps.state, null, 2)}\n`, 'utf8');
}

export function getLastRemoteOperationTime(state: ReposState, key: string): string | undefined {
  return state[key]?.[LAST_REMOTE_OPERATION_TIME_KEY];
}

export interface SetLastRemoteOperationTimeDeps {
  statePath: string;
  key: string;
  isoTime: string;
  readFile?: (path: string) => string;
  mkdir?: (path: string, options: { recursive: boolean }) => void;
  writeFile?: (path: string, data: string, encoding: 'utf8') => void;
}

export function setLastRemoteOperationTime(deps: SetLastRemoteOperationTimeDeps): void {
  const current = readReposState({
    statePath: deps.statePath,
    ...(deps.readFile !== undefined ? { readFile: deps.readFile } : {}),
  });
  const next: ReposState = {
    ...current,
    [deps.key]: { [LAST_REMOTE_OPERATION_TIME_KEY]: deps.isoTime },
  };
  writeReposState({
    statePath: deps.statePath,
    state: next,
    ...(deps.mkdir !== undefined ? { mkdir: deps.mkdir } : {}),
    ...(deps.writeFile !== undefined ? { writeFile: deps.writeFile } : {}),
  });
}
