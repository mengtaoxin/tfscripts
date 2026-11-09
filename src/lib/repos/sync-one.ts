import { access } from 'node:fs/promises';
import type { RepoEntry } from './config.js';
import { fetchWithRetry, type FetchWithRetryDeps } from './fetch-retry.js';
import {
  countBehindUpstream,
  errorMessage,
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

export interface SyncOneDeps extends FetchWithRetryDeps {
  git?: GitDeps;
  accessPath?: (path: string) => Promise<void>;
}

const STASH_MESSAGE = 'repos autostash';

async function ensurePathExists(
  path: string,
  accessPath: (path: string) => Promise<void>,
): Promise<void> {
  try {
    await accessPath(path);
  } catch {
    throw new Error(`path does not exist: ${path}`);
  }
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
    return failResult(entry, branch, `not a git repository: ${errorMessage(error)}`);
  }

  try {
    await getUpstreamRef(git);
  } catch {
    return failResult(entry, branch, 'current branch has no upstream');
  }

  try {
    await fetchWithRetry(git, deps);
  } catch (error) {
    return failResult(
      entry,
      branch,
      isNetworkError(error) ? `network error: ${errorMessage(error)}` : errorMessage(error),
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
        return failResult(entry, branch, 'local and remote conflict');
      }
      throw error;
    }

    if (stashed) {
      try {
        await stashPop(git);
      } catch (error) {
        if (isConflictError(error)) {
          return failResult(entry, branch, 'local and remote conflict');
        }
        return failResult(entry, branch, `failed to restore local changes: ${errorMessage(error)}`);
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
