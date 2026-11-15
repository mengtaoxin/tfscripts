import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export function defaultRunLockPath(home: string = homedir()): string {
  return join(home, '.tfscripts', 'run.lock');
}

export class RunLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunLockError';
  }
}

export interface RunLockHandle {
  release(): void;
}

export interface AcquireRunLockDeps {
  lockPath?: string;
  pid?: number;
  mkdir?: (path: string, options: { recursive: boolean }) => void;
  openExclusive?: (path: string) => number;
  writeFd?: (fd: number, data: string) => void;
  closeFd?: (fd: number) => void;
  readFile?: (path: string) => string;
  removeFile?: (path: string) => void;
  isAlive?: (pid: number) => boolean;
}

function isErrnoCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code);
}

function defaultIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function defaultRemoveFile(path: string): void {
  try {
    unlinkSync(path);
  } catch (error) {
    if (isErrnoCode(error, 'ENOENT')) {
      return;
    }
    throw error;
  }
}

function parseLockPid(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const pid = Number(trimmed);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
}

function tryCreateLock(
  lockPath: string,
  pid: number,
  deps: Required<Pick<AcquireRunLockDeps, 'openExclusive' | 'writeFd' | 'closeFd'>>,
): void {
  const fd = deps.openExclusive(lockPath);
  try {
    deps.writeFd(fd, `${pid}\n`);
  } finally {
    deps.closeFd(fd);
  }
}

function throwHeld(holderPid?: number): never {
  const message =
    holderPid === undefined
      ? 'Another tfscripts command is already running.'
      : `Another tfscripts command is already running (pid ${holderPid}).`;
  throw new RunLockError(message);
}

/**
 * Acquire the process-wide tfscripts run lock (`~/.tfscripts/run.lock`).
 * Throws {@link RunLockError} when another live process already holds it.
 */
export function acquireRunLock(deps: AcquireRunLockDeps = {}): RunLockHandle {
  const lockPath = deps.lockPath ?? defaultRunLockPath();
  const pid = deps.pid ?? process.pid;
  const mkdir = deps.mkdir ?? ((path, options) => mkdirSync(path, options));
  const openExclusive = deps.openExclusive ?? ((path) => openSync(path, 'wx'));
  const writeFd = deps.writeFd ?? ((fd, data) => writeSync(fd, data));
  const closeFd = deps.closeFd ?? ((fd) => closeSync(fd));
  const readFile = deps.readFile ?? ((path) => readFileSync(path, 'utf8'));
  const removeFile = deps.removeFile ?? defaultRemoveFile;
  const isAlive = deps.isAlive ?? defaultIsAlive;

  mkdir(dirname(lockPath), { recursive: true });

  const create = () => tryCreateLock(lockPath, pid, { openExclusive, writeFd, closeFd });

  const readHolderPid = (): number | undefined => {
    try {
      return parseLockPid(readFile(lockPath));
    } catch (error) {
      if (isErrnoCode(error, 'ENOENT')) {
        return undefined;
      }
      throw error;
    }
  };

  const createOrThrowIfRace = (): void => {
    try {
      create();
    } catch (error) {
      if (!isErrnoCode(error, 'EEXIST')) {
        throw error;
      }
      const holderPid = readHolderPid();
      if (holderPid !== undefined && isAlive(holderPid)) {
        throwHeld(holderPid);
      }
      throwHeld();
    }
  };

  try {
    create();
  } catch (error) {
    if (!isErrnoCode(error, 'EEXIST')) {
      throw error;
    }

    const holderPid = readHolderPid();
    if (holderPid !== undefined && isAlive(holderPid)) {
      throwHeld(holderPid);
    }

    // Missing, invalid, or stale (dead pid): reclaim.
    removeFile(lockPath);
    createOrThrowIfRace();
  }

  return { release: () => removeFile(lockPath) };
}
