import { access } from 'node:fs/promises';
import type { RepoEntry } from './config.js';
import {
  countBehindUpstream,
  errorMessage,
  fetchUpstream,
  getBranchName,
  getUpstreamRef,
  isConflictError,
  isNetworkError,
  isWorkingTreeDirty,
  mergeAbort,
  mergeUpstream,
  stashPop,
  stashPush,
  type GitDeps,
} from './git.js';

export type SyncStatus = 'up-to-date' | 'updated' | 'failed';

export interface SyncOneResult {
  name: string;
  path: string;
  branch: string;
  status: SyncStatus;
  reason?: string;
}

export interface SyncOneDeps {
  git?: GitDeps;
  accessPath?: (path: string) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  maxRetries?: number;
  retryBaseMs?: number;
}

const STASH_MESSAGE = 'repo-sync autostash';

async function ensurePathExists(
  path: string,
  accessPath: (path: string) => Promise<void>,
): Promise<void> {
  try {
    await accessPath(path);
  } catch {
    throw new Error(`路径不存在: ${path}`);
  }
}

async function fetchWithRetry(deps: SyncOneDeps, git: GitDeps): Promise<void> {
  const maxRetries = deps.maxRetries ?? 3;
  const baseMs = deps.retryBaseMs ?? 1000;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = deps.random ?? Math.random;

  const attemptOnce = async (attempt: number): Promise<void> => {
    try {
      await fetchUpstream(git);
    } catch (error) {
      if (!isNetworkError(error) || attempt >= maxRetries) {
        throw error;
      }
      const delayMs = baseMs * 2 ** attempt + Math.floor(random() * baseMs);
      await sleep(delayMs);
      await attemptOnce(attempt + 1);
    }
  };

  await attemptOnce(0);
}

function failResult(entry: RepoEntry, branch: string, reason: string): SyncOneResult {
  return {
    name: entry.name,
    path: entry.path,
    branch,
    status: 'failed',
    reason,
  };
}

export async function syncOne(entry: RepoEntry, deps: SyncOneDeps = {}): Promise<SyncOneResult> {
  const accessPath = deps.accessPath ?? ((path) => access(path));
  const git: GitDeps = { ...deps.git, cwd: deps.git?.cwd ?? entry.path };
  let branch = '';

  try {
    await ensurePathExists(entry.path, accessPath);
  } catch (error) {
    return failResult(entry, branch, errorMessage(error));
  }

  try {
    branch = await getBranchName(git);
  } catch (error) {
    return failResult(entry, branch, `不是 git 仓库: ${errorMessage(error)}`);
  }

  try {
    await getUpstreamRef(git);
  } catch {
    return failResult(entry, branch, '当前分支没有设置 upstream');
  }

  try {
    await fetchWithRetry(deps, git);
  } catch (error) {
    return failResult(
      entry,
      branch,
      isNetworkError(error) ? `网络错误: ${errorMessage(error)}` : errorMessage(error),
    );
  }

  let behind: number;
  try {
    behind = await countBehindUpstream(git);
  } catch (error) {
    return failResult(entry, branch, errorMessage(error));
  }

  if (behind === 0) {
    return {
      name: entry.name,
      path: entry.path,
      branch,
      status: 'up-to-date',
    };
  }

  let stashed = false;
  try {
    const dirty = await isWorkingTreeDirty(git);
    if (dirty) {
      await stashPush(git, STASH_MESSAGE);
      stashed = true;
    }

    try {
      await mergeUpstream(git);
    } catch (error) {
      if (isConflictError(error)) {
        try {
          await mergeAbort(git);
        } catch {
          // ignore abort failures; still report conflict
        }
        if (stashed) {
          try {
            await stashPop(git);
          } catch {
            // leave stash if pop fails after abort
          }
        }
        return failResult(entry, branch, '本地与云端冲突');
      }
      throw error;
    }

    if (stashed) {
      try {
        await stashPop(git);
      } catch (error) {
        if (isConflictError(error)) {
          return failResult(entry, branch, '本地与云端冲突');
        }
        return failResult(entry, branch, `恢复本地改动失败: ${errorMessage(error)}`);
      }
    }

    return {
      name: entry.name,
      path: entry.path,
      branch,
      status: 'updated',
    };
  } catch (error) {
    return failResult(entry, branch, errorMessage(error));
  }
}
